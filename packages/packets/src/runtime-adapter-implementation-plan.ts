import type { CapabilityBrokerAdapterClass } from "./capability-broker-request.js";
import type { AdapterInvocationResultAuditRefInput } from "./adapter-invocation-result.js";
import {
  defaultRuntimeAdapterImplementationScope,
  runtimeAdapterImplementationScopeContract,
} from "./runtime-adapter-implementation-scope.js";
import type {
  RuntimeAdapterImplementationScopeAdapterIdentityInput,
  RuntimeAdapterImplementationScopeEvidence,
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

export const RUNTIME_ADAPTER_IMPLEMENTATION_PLAN_STATUS = "source_only";

export const runtimeAdapterImplementationPlanContract = {
  contract_id: "lnsat.platform.runtime_adapter_implementation_plan.v0_1",
  authority: ["@lnsat/packets", "source-backed-runtime-adapter-implementation-plan"],
  implementation_plan_version: "0.1",
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
  implementation_plan_authority: "implementation_plan_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type RuntimeAdapterImplementationPlanIdentityInput = {
  plan_ref: string;
  plan_name: string;
  owner_ref: string;
  future_packet_ref: string;
};

export type RuntimeAdapterImplementationPlanScopeRefInput = {
  scope_ref: string;
  evidence_ref: string;
  contract_id: typeof runtimeAdapterImplementationScopeContract.contract_id;
  summary: string;
};

export type RuntimeAdapterImplementationPlanFileInput = {
  file_ref: string;
  path_ref: string;
  module_ref: string;
  purpose: string;
};

export type RuntimeAdapterImplementationStepInput = {
  step_ref: string;
  summary: string;
  evidence_ref: string;
};

export type RuntimeAdapterImplementationValidationCommandInput = {
  validation_ref: string;
  command_ref: string;
  expected_artifact_ref: string;
  summary: string;
};

export type RuntimeAdapterImplementationDryRunPlanInput = {
  dry_run_ref: string;
  expected_artifact_ref: string;
  summary: string;
};

export type RuntimeAdapterImplementationPlanSourceInput = {
  source_ref: string;
  summary: string;
};

export type RuntimeAdapterImplementationPlanRequest = {
  implementation_plan_version?: typeof runtimeAdapterImplementationPlanContract.implementation_plan_version;
  plan_identity?: RuntimeAdapterImplementationPlanIdentityInput;
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
  implementation_plan_authority?: typeof runtimeAdapterImplementationPlanContract.implementation_plan_authority;
  runtime_adapter_implementation_allowed?: false;
  runtime_adapter_dispatch_allowed?: false;
  live_adapter_invocation_allowed?: false;
  live_broker_dispatch_allowed?: false;
  live_execution_allowed?: false;
  side_effects?: [];
};

export type RuntimeAdapterImplementationPlanErrorCode =
  | "runtime_adapter_implementation_plan.invalid_request"
  | "runtime_adapter_implementation_plan.unexpected_field"
  | "runtime_adapter_implementation_plan.invalid_version"
  | "runtime_adapter_implementation_plan.invalid_plan_identity"
  | "runtime_adapter_implementation_plan.scope_ref_required"
  | "runtime_adapter_implementation_plan.invalid_scope_ref"
  | "runtime_adapter_implementation_plan.readiness_ref_required"
  | "runtime_adapter_implementation_plan.invalid_readiness_ref"
  | "runtime_adapter_implementation_plan.invalid_actor"
  | "runtime_adapter_implementation_plan.invalid_capability"
  | "runtime_adapter_implementation_plan.invalid_risk_level"
  | "runtime_adapter_implementation_plan.invalid_substrate_kind"
  | "runtime_adapter_implementation_plan.invalid_control_mode"
  | "runtime_adapter_implementation_plan.invalid_adapter_identity"
  | "runtime_adapter_implementation_plan.invalid_adapter_class"
  | "runtime_adapter_implementation_plan.planned_file_required"
  | "runtime_adapter_implementation_plan.invalid_planned_file"
  | "runtime_adapter_implementation_plan.implementation_step_required"
  | "runtime_adapter_implementation_plan.invalid_implementation_step"
  | "runtime_adapter_implementation_plan.validation_command_required"
  | "runtime_adapter_implementation_plan.invalid_validation_command"
  | "runtime_adapter_implementation_plan.dry_run_plan_required"
  | "runtime_adapter_implementation_plan.invalid_dry_run_plan"
  | "runtime_adapter_implementation_plan.rollback_ref_required"
  | "runtime_adapter_implementation_plan.invalid_rollback_ref"
  | "runtime_adapter_implementation_plan.policy_gate_required"
  | "runtime_adapter_implementation_plan.invalid_policy_gate"
  | "runtime_adapter_implementation_plan.approval_required"
  | "runtime_adapter_implementation_plan.invalid_approval_ref"
  | "runtime_adapter_implementation_plan.audit_ref_required"
  | "runtime_adapter_implementation_plan.invalid_audit_ref"
  | "runtime_adapter_implementation_plan.source_ref_required"
  | "runtime_adapter_implementation_plan.invalid_source_ref"
  | "runtime_adapter_implementation_plan.unsafe_implementation_authority"
  | "runtime_adapter_implementation_plan.secret_value_forbidden"
  | "runtime_adapter_implementation_plan.runtime_adapter_implementation_forbidden"
  | "runtime_adapter_implementation_plan.runtime_adapter_dispatch_forbidden"
  | "runtime_adapter_implementation_plan.live_adapter_invocation_forbidden"
  | "runtime_adapter_implementation_plan.live_broker_dispatch_forbidden"
  | "runtime_adapter_implementation_plan.live_execution_forbidden"
  | "runtime_adapter_implementation_plan.side_effects_forbidden";

export type RuntimeAdapterImplementationPlanError = {
  code: RuntimeAdapterImplementationPlanErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type RuntimeAdapterImplementationPlanEvidence = {
  contract_id: typeof runtimeAdapterImplementationPlanContract.contract_id;
  implementation_plan_version: typeof runtimeAdapterImplementationPlanContract.implementation_plan_version;
  plan_identity: RuntimeAdapterImplementationPlanIdentityInput;
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
  scope_evidence_snapshot: Pick<
    RuntimeAdapterImplementationScopeEvidence,
    | "contract_id"
    | "scope_identity"
    | "implementation_authority"
    | "runtime_adapter_implementation_allowed"
    | "runtime_adapter_dispatch_allowed"
    | "live_adapter_invocation_allowed"
    | "live_broker_dispatch_allowed"
    | "live_execution_allowed"
    | "side_effects"
  >;
  readiness_evidence_snapshot: RuntimeAdapterImplementationScopeEvidence["readiness_evidence_snapshot"];
  denied_runtime_behavior: string[];
  implementation_plan_authority: typeof runtimeAdapterImplementationPlanContract.implementation_plan_authority;
  runtime_adapter_implementation_allowed: false;
  runtime_adapter_dispatch_allowed: false;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type RuntimeAdapterImplementationPlanResult =
  | {
      ok: true;
      runtime_adapter_implementation_plan: RuntimeAdapterImplementationPlanEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      runtime_adapter_implementation_plan: null;
      errors: RuntimeAdapterImplementationPlanError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedRuntimeAdapterImplementationPlan =
  | {
      ok: true;
      plan: Omit<
        RuntimeAdapterImplementationPlanEvidence,
        "contract_id" | "implementation_plan_version" | "side_effects"
      >;
    }
  | {
      ok: false;
      errors: RuntimeAdapterImplementationPlanError[];
    };

const requestKeys = new Set([
  "implementation_plan_version",
  "plan_identity",
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
  "implementation_plan_authority",
  "runtime_adapter_implementation_allowed",
  "runtime_adapter_dispatch_allowed",
  "live_adapter_invocation_allowed",
  "live_broker_dispatch_allowed",
  "live_execution_allowed",
  "side_effects",
]);

const identityKeys = new Set([
  "plan_ref",
  "plan_name",
  "owner_ref",
  "future_packet_ref",
]);
const scopeRefKeys = new Set(["scope_ref", "evidence_ref", "contract_id", "summary"]);
const readinessRefKeys = new Set([
  "readiness_ref",
  "evidence_ref",
  "contract_id",
  "summary",
]);
const actorKeys = new Set(["actor_ref", "actor_type", "role_ref"]);
const adapterIdentityKeys = new Set(["adapter_ref", "adapter_name", "owner_ref"]);
const plannedFileKeys = new Set(["file_ref", "path_ref", "module_ref", "purpose"]);
const stepKeys = new Set(["step_ref", "summary", "evidence_ref"]);
const validationKeys = new Set([
  "validation_ref",
  "command_ref",
  "expected_artifact_ref",
  "summary",
]);
const dryRunKeys = new Set(["dry_run_ref", "expected_artifact_ref", "summary"]);
const rollbackRefKeys = new Set([
  "rollback_ref",
  "required_for_risk_level_at_or_above",
  "owner_ref",
  "evidence_refs",
]);
const policyGateKeys = new Set(["gate_ref", "decision_ref", "required"]);
const approvalRefKeys = new Set(["approval_ref", "approval_type", "required"]);
const auditRefKeys = new Set(["audit_ref", "event_type", "evidence_ref", "summary"]);
const sourceKeys = new Set(["source_ref", "summary"]);

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

export const defaultRuntimeAdapterImplementationPlan: RuntimeAdapterImplementationPlanEvidence =
  {
    contract_id: runtimeAdapterImplementationPlanContract.contract_id,
    implementation_plan_version:
      runtimeAdapterImplementationPlanContract.implementation_plan_version,
    plan_identity: {
      plan_ref: "implementation_plan:service-control-adapter-runtime",
      plan_name: "Service control runtime adapter implementation plan",
      owner_ref: "owner:lnsat-platform",
      future_packet_ref: "packet:future-runtime-adapter-implementation",
    },
    runtime_adapter_implementation_scope_refs: [
      {
        scope_ref: defaultRuntimeAdapterImplementationScope.scope_identity.scope_ref,
        evidence_ref: "evidence:bp0138-runtime-adapter-implementation-scope",
        contract_id: runtimeAdapterImplementationScopeContract.contract_id,
        summary: "BP-0138 source-only runtime adapter implementation scope evidence",
      },
    ],
    runtime_adapter_readiness_gate_refs:
      defaultRuntimeAdapterImplementationScope.runtime_adapter_readiness_gate_refs,
    requested_actor: defaultRuntimeAdapterImplementationScope.requested_actor,
    capability: defaultRuntimeAdapterImplementationScope.capability,
    risk_level: defaultRuntimeAdapterImplementationScope.risk_level,
    target_substrate_kind:
      defaultRuntimeAdapterImplementationScope.target_substrate_kind,
    requested_control_mode:
      defaultRuntimeAdapterImplementationScope.requested_control_mode,
    adapter_identity: defaultRuntimeAdapterImplementationScope.adapter_identity,
    adapter_class: defaultRuntimeAdapterImplementationScope.adapter_class,
    planned_files_modules: [
      {
        file_ref: "file:packages-runtime-adapters-service-control",
        path_ref: "src:packages/runtime-adapters/service-control",
        module_ref: "module:future-service-control-runtime-adapter",
        purpose: "Future adapter implementation module after later approved packet",
      },
      {
        file_ref: "file:packages-packets-runtime-adapter-plan",
        path_ref: "src:packages/packets/runtime-adapter-implementation-plan.ts",
        module_ref: "module:runtime-adapter-implementation-plan-contract",
        purpose: "Source-only plan evidence for BP-0144",
      },
    ],
    implementation_steps: [
      {
        step_ref: "step:define-adapter-interface",
        summary: "Define future adapter interface from BP-0138 scope evidence",
        evidence_ref: "evidence:bp0144-source-only-plan-step",
      },
      {
        step_ref: "step:wire-dry-run-contract",
        summary: "Plan dry-run artifact before any adapter implementation",
        evidence_ref: "evidence:bp0144-dry-run-plan-step",
      },
    ],
    validation_commands: [
      {
        validation_ref: "validation:packets-runtime-adapter-implementation-plan",
        command_ref:
          "script:npm-workspace-packets-test-runtime-adapter-implementation-plan",
        expected_artifact_ref: "artifact:bp0144-packets-test-output",
        summary: "Run packet workspace test through named package script",
      },
      {
        validation_ref: "validation:packets-typecheck",
        command_ref: "script:npm-workspace-packets-typecheck",
        expected_artifact_ref: "artifact:bp0144-packets-typecheck-output",
        summary: "Run packet workspace typecheck through named package script",
      },
    ],
    dry_run_plan: [
      {
        dry_run_ref: "dry_run:future-runtime-adapter-plan-noop",
        expected_artifact_ref: "artifact:future-runtime-adapter-dry-run-plan",
        summary:
          "Future implementation packet must produce dry-run artifact before code path opens",
      },
    ],
    rollback_refs: defaultRuntimeAdapterImplementationScope.rollback_refs,
    policy_gate_refs: [
      {
        gate_ref: "substrate.adapter.implementation_plan.review",
        decision_ref: "policy_decision:runtime-adapter-implementation-plan-source-only",
        required: true,
      },
      ...defaultRuntimeAdapterImplementationScope.policy_gate_refs,
    ],
    required_policy_gates: [
      "substrate.adapter.implementation_plan.review",
      ...defaultRuntimeAdapterImplementationScope.required_policy_gates,
    ].sort(),
    approval_refs: defaultRuntimeAdapterImplementationScope.approval_refs,
    required_approvals: defaultRuntimeAdapterImplementationScope.required_approvals,
    audit_event_refs: defaultRuntimeAdapterImplementationScope.audit_event_refs,
    required_audit_events:
      defaultRuntimeAdapterImplementationScope.required_audit_events,
    source_refs: [
      "doc:docs/architecture/PACKET_MODEL.md",
      "doc:docs/architecture/POLICY_AND_AUDIT.md",
      "doc:docs/architecture/SYSTEM_ARCHITECTURE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "ticket:BP-0144: source-only runtime adapter implementation plan contract",
    ],
    scope_evidence_snapshot: {
      contract_id: defaultRuntimeAdapterImplementationScope.contract_id,
      scope_identity: defaultRuntimeAdapterImplementationScope.scope_identity,
      implementation_authority:
        defaultRuntimeAdapterImplementationScope.implementation_authority,
      runtime_adapter_implementation_allowed:
        defaultRuntimeAdapterImplementationScope.runtime_adapter_implementation_allowed,
      runtime_adapter_dispatch_allowed:
        defaultRuntimeAdapterImplementationScope.runtime_adapter_dispatch_allowed,
      live_adapter_invocation_allowed:
        defaultRuntimeAdapterImplementationScope.live_adapter_invocation_allowed,
      live_broker_dispatch_allowed:
        defaultRuntimeAdapterImplementationScope.live_broker_dispatch_allowed,
      live_execution_allowed:
        defaultRuntimeAdapterImplementationScope.live_execution_allowed,
      side_effects: [],
    },
    readiness_evidence_snapshot:
      defaultRuntimeAdapterImplementationScope.readiness_evidence_snapshot,
    denied_runtime_behavior: [
      "implementation plan does not create runtime adapter implementation",
      "implementation plan does not register dispatcher",
      "implementation plan does not dispatch broker request",
      "implementation plan does not invoke adapter",
      "implementation plan does not execute live runtime path",
    ],
    implementation_plan_authority:
      runtimeAdapterImplementationPlanContract.implementation_plan_authority,
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    side_effects: [],
  };

export function createRuntimeAdapterImplementationPlan(
  input: unknown = {},
): RuntimeAdapterImplementationPlanResult {
  const normalized = normalizeRuntimeAdapterImplementationPlan(input);

  if (!normalized.ok) {
    return failRuntimeAdapterImplementationPlan(normalized.errors);
  }

  return {
    ok: true,
    runtime_adapter_implementation_plan: {
      contract_id: runtimeAdapterImplementationPlanContract.contract_id,
      implementation_plan_version:
        runtimeAdapterImplementationPlanContract.implementation_plan_version,
      ...normalized.plan,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeRuntimeAdapterImplementationPlan(
  input: unknown,
): NormalizedRuntimeAdapterImplementationPlan {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        planError(
          "runtime_adapter_implementation_plan.invalid_request",
          "",
          "Runtime adapter implementation plan request must be an object.",
        ),
      ],
    };
  }

  const errors: RuntimeAdapterImplementationPlanError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        planError(
          "runtime_adapter_implementation_plan.unexpected_field",
          jsonPointer(key),
          "Unexpected runtime adapter implementation plan field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "implementation_plan_version") &&
    input.implementation_plan_version !==
      runtimeAdapterImplementationPlanContract.implementation_plan_version
  ) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.invalid_version",
        "/implementation_plan_version",
        "Runtime adapter implementation plan version is unsupported.",
      ),
    );
  }

  const planIdentity = Object.hasOwn(input, "plan_identity")
    ? normalizeIdentity(input.plan_identity, errors)
    : defaultRuntimeAdapterImplementationPlan.plan_identity;
  const scopeRefs = Object.hasOwn(input, "runtime_adapter_implementation_scope_refs")
    ? normalizeScopeRefs(input.runtime_adapter_implementation_scope_refs, errors)
    : [
        ...defaultRuntimeAdapterImplementationPlan.runtime_adapter_implementation_scope_refs,
      ];
  const readinessRefs = Object.hasOwn(input, "runtime_adapter_readiness_gate_refs")
    ? normalizeReadinessRefs(input.runtime_adapter_readiness_gate_refs, errors)
    : [...defaultRuntimeAdapterImplementationPlan.runtime_adapter_readiness_gate_refs];
  const requestedActor = Object.hasOwn(input, "requested_actor")
    ? normalizeActor(input.requested_actor, errors)
    : defaultRuntimeAdapterImplementationPlan.requested_actor;
  const capability = Object.hasOwn(input, "capability")
    ? normalizeCapability(input.capability, errors)
    : defaultRuntimeAdapterImplementationPlan.capability;
  const riskLevel = Object.hasOwn(input, "risk_level")
    ? normalizeRiskLevel(input.risk_level, errors)
    : defaultRuntimeAdapterImplementationPlan.risk_level;
  const substrateKind = Object.hasOwn(input, "target_substrate_kind")
    ? normalizeSubstrateKind(input.target_substrate_kind, errors)
    : defaultRuntimeAdapterImplementationPlan.target_substrate_kind;
  const controlMode = Object.hasOwn(input, "requested_control_mode")
    ? normalizeControlMode(input.requested_control_mode, errors)
    : defaultRuntimeAdapterImplementationPlan.requested_control_mode;
  const adapterIdentity = Object.hasOwn(input, "adapter_identity")
    ? normalizeAdapterIdentity(input.adapter_identity, errors)
    : defaultRuntimeAdapterImplementationPlan.adapter_identity;
  const adapterClass = Object.hasOwn(input, "adapter_class")
    ? normalizeAdapterClass(input.adapter_class, errors)
    : defaultRuntimeAdapterImplementationPlan.adapter_class;
  const plannedFiles = Object.hasOwn(input, "planned_files_modules")
    ? normalizePlannedFiles(input.planned_files_modules, errors)
    : [...defaultRuntimeAdapterImplementationPlan.planned_files_modules];
  const implementationSteps = Object.hasOwn(input, "implementation_steps")
    ? normalizeImplementationSteps(input.implementation_steps, errors)
    : [...defaultRuntimeAdapterImplementationPlan.implementation_steps];
  const validationCommands = Object.hasOwn(input, "validation_commands")
    ? normalizeValidationCommands(input.validation_commands, errors)
    : [...defaultRuntimeAdapterImplementationPlan.validation_commands];
  const dryRunPlan = Object.hasOwn(input, "dry_run_plan")
    ? normalizeDryRunPlan(input.dry_run_plan, errors)
    : [...defaultRuntimeAdapterImplementationPlan.dry_run_plan];
  const rollbackRefs = Object.hasOwn(input, "rollback_refs")
    ? normalizeRollbackRefs(input.rollback_refs, errors)
    : [...defaultRuntimeAdapterImplementationPlan.rollback_refs];
  const policyGateRefs = Object.hasOwn(input, "policy_gate_refs")
    ? normalizePolicyGateRefs(input.policy_gate_refs, errors)
    : [...defaultRuntimeAdapterImplementationPlan.policy_gate_refs];
  const approvalRefs = Object.hasOwn(input, "approval_refs")
    ? normalizeApprovalRefs(input.approval_refs, errors)
    : [...defaultRuntimeAdapterImplementationPlan.approval_refs];
  const auditEventRefs = Object.hasOwn(input, "audit_event_refs")
    ? normalizeAuditEventRefs(input.audit_event_refs, errors)
    : [...defaultRuntimeAdapterImplementationPlan.audit_event_refs];
  const sourceRefs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, errors)
    : [...defaultRuntimeAdapterImplementationPlan.source_refs];

  addAuthorityErrors(input, errors);
  addRequiredArrayErrors(
    {
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
    plan: {
      plan_identity: planIdentity,
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
        "substrate.adapter.implementation_plan.review",
        ...policyGateRefs.map((gate) => gate.gate_ref),
      ]),
      approval_refs: approvalRefs,
      required_approvals: uniqueStrings(approvalRefs.map((ref) => ref.approval_ref)),
      audit_event_refs: auditEventRefs,
      required_audit_events: uniqueStrings(
        auditEventRefs.map((event) => event.event_type),
      ),
      source_refs: sourceRefs,
      scope_evidence_snapshot:
        defaultRuntimeAdapterImplementationPlan.scope_evidence_snapshot,
      readiness_evidence_snapshot:
        defaultRuntimeAdapterImplementationPlan.readiness_evidence_snapshot,
      denied_runtime_behavior: [
        ...defaultRuntimeAdapterImplementationPlan.denied_runtime_behavior,
      ],
      implementation_plan_authority:
        runtimeAdapterImplementationPlanContract.implementation_plan_authority,
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
    },
  };
}

function normalizeIdentity(
  value: unknown,
  errors: RuntimeAdapterImplementationPlanError[],
): RuntimeAdapterImplementationPlanIdentityInput {
  if (!isPlainObject(value)) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.invalid_plan_identity",
        "/plan_identity",
        "Runtime adapter implementation plan requires plan identity.",
      ),
    );
    return defaultRuntimeAdapterImplementationPlan.plan_identity;
  }
  checkUnexpected(
    value,
    identityKeys,
    "/plan_identity",
    "Unexpected plan identity field.",
    errors,
  );
  const planRef = safeRefValue(value.plan_ref);
  const planName = safeStringValue(value.plan_name);
  const ownerRef = safeRefValue(value.owner_ref);
  const futurePacketRef = safeRefValue(value.future_packet_ref);
  if (
    planRef === null ||
    planName === null ||
    ownerRef === null ||
    futurePacketRef === null
  ) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.invalid_plan_identity",
        "/plan_identity",
        "Plan identity requires safe plan_ref, plan_name, owner_ref, and future_packet_ref.",
      ),
    );
  }
  return {
    plan_ref: planRef ?? defaultRuntimeAdapterImplementationPlan.plan_identity.plan_ref,
    plan_name:
      planName ?? defaultRuntimeAdapterImplementationPlan.plan_identity.plan_name,
    owner_ref:
      ownerRef ?? defaultRuntimeAdapterImplementationPlan.plan_identity.owner_ref,
    future_packet_ref:
      futurePacketRef ??
      defaultRuntimeAdapterImplementationPlan.plan_identity.future_packet_ref,
  };
}

function normalizeScopeRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationPlanError[],
): RuntimeAdapterImplementationPlanScopeRefInput[] {
  return normalizeArray(
    value,
    "/runtime_adapter_implementation_scope_refs",
    "runtime_adapter_implementation_plan.scope_ref_required",
    "Runtime adapter implementation plan requires implementation scope refs.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_scope_ref",
            path,
            "Implementation scope ref must be an object.",
          ),
        );
        return null;
      }
      checkUnexpected(
        item,
        scopeRefKeys,
        path,
        "Unexpected implementation scope ref field.",
        errors,
      );
      if (containsSecret(item) || unsafeAuthority(item)) {
        errors.push(
          secretOrUnsafeError(path, "Implementation scope refs", containsSecret(item)),
        );
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
          planError(
            "runtime_adapter_implementation_plan.invalid_scope_ref",
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
  errors: RuntimeAdapterImplementationPlanError[],
): RuntimeAdapterImplementationScopeReadinessRefInput[] {
  return normalizeArray(
    value,
    "/runtime_adapter_readiness_gate_refs",
    "runtime_adapter_implementation_plan.readiness_ref_required",
    "Runtime adapter implementation plan requires readiness gate refs.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_readiness_ref",
            path,
            "Readiness ref must be an object.",
          ),
        );
        return null;
      }
      checkUnexpected(
        item,
        readinessRefKeys,
        path,
        "Unexpected readiness ref field.",
        errors,
      );
      if (containsSecret(item) || unsafeAuthority(item)) {
        errors.push(secretOrUnsafeError(path, "Readiness refs", containsSecret(item)));
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
          planError(
            "runtime_adapter_implementation_plan.invalid_readiness_ref",
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
  errors: RuntimeAdapterImplementationPlanError[],
): SubstrateControlIntentActorInput {
  if (!isPlainObject(value)) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.invalid_actor",
        "/requested_actor",
        "Runtime adapter implementation plan requires requested actor.",
      ),
    );
    return defaultRuntimeAdapterImplementationPlan.requested_actor;
  }
  checkUnexpected(
    value,
    actorKeys,
    "/requested_actor",
    "Unexpected requested actor field.",
    errors,
  );
  const actorRef = safeRefValue(value.actor_ref);
  const actorType =
    typeof value.actor_type === "string" &&
    actorTypes.has(value.actor_type as SubstrateControlIntentActorInput["actor_type"])
      ? (value.actor_type as SubstrateControlIntentActorInput["actor_type"])
      : null;
  const roleRef = safeRefValue(value.role_ref);
  if (actorRef === null || actorType === null || roleRef === null) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.invalid_actor",
        "/requested_actor",
        "Requested actor requires safe actor_ref, actor_type, and role_ref.",
      ),
    );
  }
  return {
    actor_ref:
      actorRef ?? defaultRuntimeAdapterImplementationPlan.requested_actor.actor_ref,
    actor_type:
      actorType ?? defaultRuntimeAdapterImplementationPlan.requested_actor.actor_type,
    role_ref:
      roleRef ?? defaultRuntimeAdapterImplementationPlan.requested_actor.role_ref,
  };
}

function normalizeCapability(
  value: unknown,
  errors: RuntimeAdapterImplementationPlanError[],
): string {
  if (typeof value !== "string" || !safeCapability(value)) {
    errors.push(
      planError(
        unsafeAuthority(value)
          ? "runtime_adapter_implementation_plan.unsafe_implementation_authority"
          : "runtime_adapter_implementation_plan.invalid_capability",
        "/capability",
        unsafeAuthority(value)
          ? "Runtime adapter implementation plan capability asks for unsafe authority."
          : "Runtime adapter implementation plan capability must be safe dotted capability text.",
      ),
    );
    return defaultRuntimeAdapterImplementationPlan.capability;
  }
  return value;
}

function normalizeRiskLevel(
  value: unknown,
  errors: RuntimeAdapterImplementationPlanError[],
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 8) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.invalid_risk_level",
        "/risk_level",
        "Runtime adapter implementation plan risk level must be an integer from 0 to 8.",
      ),
    );
    return defaultRuntimeAdapterImplementationPlan.risk_level;
  }
  return value;
}

function normalizeSubstrateKind(
  value: unknown,
  errors: RuntimeAdapterImplementationPlanError[],
): SubstrateKind {
  if (typeof value !== "string" || !substrateKinds.has(value as SubstrateKind)) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.invalid_substrate_kind",
        "/target_substrate_kind",
        "Runtime adapter implementation plan target substrate kind is unsupported.",
      ),
    );
    return defaultRuntimeAdapterImplementationPlan.target_substrate_kind;
  }
  return value as SubstrateKind;
}

function normalizeControlMode(
  value: unknown,
  errors: RuntimeAdapterImplementationPlanError[],
): SubstrateControlMode {
  if (typeof value !== "string" || !controlModes.has(value as SubstrateControlMode)) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.invalid_control_mode",
        "/requested_control_mode",
        "Runtime adapter implementation plan requested control mode is unsupported.",
      ),
    );
    return defaultRuntimeAdapterImplementationPlan.requested_control_mode;
  }
  return value as SubstrateControlMode;
}

function normalizeAdapterIdentity(
  value: unknown,
  errors: RuntimeAdapterImplementationPlanError[],
): RuntimeAdapterImplementationScopeAdapterIdentityInput {
  if (!isPlainObject(value)) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.invalid_adapter_identity",
        "/adapter_identity",
        "Runtime adapter implementation plan requires adapter identity.",
      ),
    );
    return defaultRuntimeAdapterImplementationPlan.adapter_identity;
  }
  checkUnexpected(
    value,
    adapterIdentityKeys,
    "/adapter_identity",
    "Unexpected adapter identity field.",
    errors,
  );
  const adapterRef = safeRefValue(value.adapter_ref);
  const adapterName = safeStringValue(value.adapter_name);
  const ownerRef = safeRefValue(value.owner_ref);
  if (adapterRef === null || adapterName === null || ownerRef === null) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.invalid_adapter_identity",
        "/adapter_identity",
        "Adapter identity requires safe adapter_ref, adapter_name, and owner_ref.",
      ),
    );
  }
  return {
    adapter_ref:
      adapterRef ??
      defaultRuntimeAdapterImplementationPlan.adapter_identity.adapter_ref,
    adapter_name:
      adapterName ??
      defaultRuntimeAdapterImplementationPlan.adapter_identity.adapter_name,
    owner_ref:
      ownerRef ?? defaultRuntimeAdapterImplementationPlan.adapter_identity.owner_ref,
  };
}

function normalizeAdapterClass(
  value: unknown,
  errors: RuntimeAdapterImplementationPlanError[],
): CapabilityBrokerAdapterClass {
  if (
    typeof value !== "string" ||
    !adapterClasses.has(value as CapabilityBrokerAdapterClass)
  ) {
    errors.push(
      planError(
        unsafeAuthority(value)
          ? "runtime_adapter_implementation_plan.unsafe_implementation_authority"
          : "runtime_adapter_implementation_plan.invalid_adapter_class",
        "/adapter_class",
        unsafeAuthority(value)
          ? "Runtime adapter implementation plan adapter class asks for unsafe authority."
          : "Runtime adapter implementation plan adapter class is unsupported.",
      ),
    );
    return defaultRuntimeAdapterImplementationPlan.adapter_class;
  }
  return value as CapabilityBrokerAdapterClass;
}

function normalizePlannedFiles(
  value: unknown,
  errors: RuntimeAdapterImplementationPlanError[],
): RuntimeAdapterImplementationPlanFileInput[] {
  return normalizeArray(
    value,
    "/planned_files_modules",
    "runtime_adapter_implementation_plan.planned_file_required",
    "Runtime adapter implementation plan requires planned files/modules.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_planned_file",
            path,
            "Planned file/module must be an object.",
          ),
        );
        return null;
      }
      checkUnexpected(
        item,
        plannedFileKeys,
        path,
        "Unexpected planned file/module field.",
        errors,
      );
      if (containsSecret(item) || unsafeAuthority(item)) {
        errors.push(
          secretOrUnsafeError(path, "Planned files/modules", containsSecret(item)),
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
          planError(
            "runtime_adapter_implementation_plan.invalid_planned_file",
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
  errors: RuntimeAdapterImplementationPlanError[],
): RuntimeAdapterImplementationStepInput[] {
  return normalizeArray(
    value,
    "/implementation_steps",
    "runtime_adapter_implementation_plan.implementation_step_required",
    "Runtime adapter implementation plan requires implementation steps.",
    (item, path) =>
      normalizeStepLike(item, path, stepKeys, "implementation_step", errors),
    errors,
  );
}

function normalizeValidationCommands(
  value: unknown,
  errors: RuntimeAdapterImplementationPlanError[],
): RuntimeAdapterImplementationValidationCommandInput[] {
  return normalizeArray(
    value,
    "/validation_commands",
    "runtime_adapter_implementation_plan.validation_command_required",
    "Runtime adapter implementation plan requires validation command refs.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_validation_command",
            path,
            "Validation command ref must be an object.",
          ),
        );
        return null;
      }
      checkUnexpected(
        item,
        validationKeys,
        path,
        "Unexpected validation command field.",
        errors,
      );
      if (containsSecret(item) || unsafeAuthority(item) || rawCommand(item)) {
        errors.push(
          planError(
            containsSecret(item)
              ? "runtime_adapter_implementation_plan.secret_value_forbidden"
              : "runtime_adapter_implementation_plan.unsafe_implementation_authority",
            path,
            containsSecret(item)
              ? "Validation command refs cannot contain secret-like values."
              : "Validation command refs cannot contain raw command or runtime authority.",
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
          planError(
            "runtime_adapter_implementation_plan.invalid_validation_command",
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
  errors: RuntimeAdapterImplementationPlanError[],
): RuntimeAdapterImplementationDryRunPlanInput[] {
  return normalizeArray(
    value,
    "/dry_run_plan",
    "runtime_adapter_implementation_plan.dry_run_plan_required",
    "Runtime adapter implementation plan requires dry-run plan refs.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_dry_run_plan",
            path,
            "Dry-run plan must be an object.",
          ),
        );
        return null;
      }
      checkUnexpected(item, dryRunKeys, path, "Unexpected dry-run plan field.", errors);
      if (containsSecret(item) || unsafeAuthority(item) || rawCommand(item)) {
        errors.push(
          planError(
            containsSecret(item)
              ? "runtime_adapter_implementation_plan.secret_value_forbidden"
              : "runtime_adapter_implementation_plan.unsafe_implementation_authority",
            path,
            containsSecret(item)
              ? "Dry-run plan cannot contain secret-like values."
              : "Dry-run plan cannot contain raw command or runtime authority.",
          ),
        );
        return null;
      }
      const dryRunRef = safeRefValue(item.dry_run_ref);
      const expectedArtifactRef = safeRefValue(item.expected_artifact_ref);
      const summary = safeStringValue(item.summary);
      if (dryRunRef === null || expectedArtifactRef === null || summary === null) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_dry_run_plan",
            path,
            "Dry-run plan requires safe dry_run_ref, expected_artifact_ref, and summary.",
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
  errors: RuntimeAdapterImplementationPlanError[],
): SubstrateControlIntentRollbackExpectationInput[] {
  return normalizeArray(
    value,
    "/rollback_refs",
    "runtime_adapter_implementation_plan.rollback_ref_required",
    "Runtime adapter implementation plan requires rollback refs.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_rollback_ref",
            path,
            "Rollback ref must be an object.",
          ),
        );
        return null;
      }
      checkUnexpected(
        item,
        rollbackRefKeys,
        path,
        "Unexpected rollback ref field.",
        errors,
      );
      if (containsSecret(item) || unsafeAuthority(item)) {
        errors.push(secretOrUnsafeError(path, "Rollback refs", containsSecret(item)));
        return null;
      }
      const rollbackRef = safeRefValue(item.rollback_ref);
      const ownerRef = safeRefValue(item.owner_ref);
      const evidenceRefs = Array.isArray(item.evidence_refs)
        ? item.evidence_refs.filter((ref): ref is string => safeRefValue(ref) !== null)
        : [];
      if (
        rollbackRef === null ||
        ownerRef === null ||
        typeof item.required_for_risk_level_at_or_above !== "number" ||
        !Number.isInteger(item.required_for_risk_level_at_or_above) ||
        item.required_for_risk_level_at_or_above < 0 ||
        item.required_for_risk_level_at_or_above > 8 ||
        evidenceRefs.length === 0 ||
        evidenceRefs.length !==
          (Array.isArray(item.evidence_refs) ? item.evidence_refs.length : 0)
      ) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_rollback_ref",
            path,
            "Rollback ref requires safe refs and risk threshold.",
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
  errors: RuntimeAdapterImplementationPlanError[],
): SubstrateControlIntentPolicyGateInput[] {
  return normalizeArray(
    value,
    "/policy_gate_refs",
    "runtime_adapter_implementation_plan.policy_gate_required",
    "Runtime adapter implementation plan requires policy gate refs.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_policy_gate",
            path,
            "Policy gate ref must be an object.",
          ),
        );
        return null;
      }
      checkUnexpected(
        item,
        policyGateKeys,
        path,
        "Unexpected policy gate field.",
        errors,
      );
      const gateRef =
        typeof item.gate_ref === "string" && safePolicyGate(item.gate_ref)
          ? item.gate_ref
          : null;
      const decisionRef = safeRefValue(item.decision_ref);
      if (gateRef === null || decisionRef === null || item.required !== true) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_policy_gate",
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
  errors: RuntimeAdapterImplementationPlanError[],
): SubstrateControlIntentApprovalRefInput[] {
  return normalizeArray(
    value,
    "/approval_refs",
    "runtime_adapter_implementation_plan.approval_required",
    "Runtime adapter implementation plan requires approval refs.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_approval_ref",
            path,
            "Approval ref must be an object.",
          ),
        );
        return null;
      }
      checkUnexpected(
        item,
        approvalRefKeys,
        path,
        "Unexpected approval ref field.",
        errors,
      );
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
          planError(
            "runtime_adapter_implementation_plan.invalid_approval_ref",
            path,
            "Approval ref requires safe approval_ref, approval_type, and required true.",
          ),
        );
        return null;
      }
      return {
        approval_ref: approvalRef,
        approval_type: approvalType,
        required: true,
      };
    },
    errors,
  );
}

function normalizeAuditEventRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationPlanError[],
): AdapterInvocationResultAuditRefInput[] {
  return normalizeArray(
    value,
    "/audit_event_refs",
    "runtime_adapter_implementation_plan.audit_ref_required",
    "Runtime adapter implementation plan requires audit refs.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_audit_ref",
            path,
            "Audit ref must be an object.",
          ),
        );
        return null;
      }
      checkUnexpected(item, auditRefKeys, path, "Unexpected audit ref field.", errors);
      const auditRef = safeRefValue(item.audit_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const eventType =
        typeof item.event_type === "string" &&
        auditEventTypes.has(
          item.event_type as AdapterInvocationResultAuditRefInput["event_type"],
        )
          ? (item.event_type as AdapterInvocationResultAuditRefInput["event_type"])
          : null;
      const summary = safeStringValue(item.summary);
      if (
        auditRef === null ||
        evidenceRef === null ||
        eventType === null ||
        summary === null
      ) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_audit_ref",
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
  errors: RuntimeAdapterImplementationPlanError[],
): string[] {
  return normalizeArray(
    value,
    "/source_refs",
    "runtime_adapter_implementation_plan.source_ref_required",
    "Runtime adapter implementation plan requires source refs.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_source_ref",
            path,
            "Source ref must be an object.",
          ),
        );
        return null;
      }
      checkUnexpected(item, sourceKeys, path, "Unexpected source ref field.", errors);
      if (containsSecret(item) || unsafeAuthority(item) || rawCommand(item)) {
        errors.push(
          planError(
            containsSecret(item)
              ? "runtime_adapter_implementation_plan.secret_value_forbidden"
              : "runtime_adapter_implementation_plan.unsafe_implementation_authority",
            path,
            containsSecret(item)
              ? "Source refs cannot contain secret-like values."
              : "Source refs cannot contain raw command or runtime authority.",
          ),
        );
        return null;
      }
      const sourceRef = safeRefValue(item.source_ref);
      const summary = safeStringValue(item.summary);
      if (sourceRef === null || summary === null) {
        errors.push(
          planError(
            "runtime_adapter_implementation_plan.invalid_source_ref",
            path,
            "Source ref requires safe source_ref and summary.",
          ),
        );
        return null;
      }
      return sourceRef;
    },
    errors,
  );
}

function normalizeStepLike(
  item: unknown,
  path: string,
  keys: Set<string>,
  kind: "implementation_step",
  errors: RuntimeAdapterImplementationPlanError[],
): RuntimeAdapterImplementationStepInput | null {
  if (!isPlainObject(item)) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.invalid_implementation_step",
        path,
        "Implementation step must be an object.",
      ),
    );
    return null;
  }
  checkUnexpected(item, keys, path, "Unexpected implementation step field.", errors);
  if (containsSecret(item) || unsafeAuthority(item) || rawCommand(item)) {
    errors.push(
      planError(
        containsSecret(item)
          ? "runtime_adapter_implementation_plan.secret_value_forbidden"
          : "runtime_adapter_implementation_plan.unsafe_implementation_authority",
        path,
        containsSecret(item)
          ? "Implementation steps cannot contain secret-like values."
          : "Implementation steps cannot contain raw command or runtime authority.",
      ),
    );
    return null;
  }
  const stepRef = safeRefValue(item.step_ref);
  const summary = safeStringValue(item.summary);
  const evidenceRef = safeRefValue(item.evidence_ref);
  if (stepRef === null || summary === null || evidenceRef === null) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.invalid_implementation_step",
        path,
        `Invalid ${kind}.`,
      ),
    );
    return null;
  }
  return { step_ref: stepRef, summary, evidence_ref: evidenceRef };
}

function addAuthorityErrors(
  input: Record<string, unknown>,
  errors: RuntimeAdapterImplementationPlanError[],
): void {
  if (
    Object.hasOwn(input, "implementation_plan_authority") &&
    input.implementation_plan_authority !==
      runtimeAdapterImplementationPlanContract.implementation_plan_authority
  ) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.unsafe_implementation_authority",
        "/implementation_plan_authority",
        "Runtime adapter implementation plan cannot grant runtime adapter authority.",
      ),
    );
  }
  const forbiddenFlags = [
    [
      "runtime_adapter_implementation_allowed",
      "runtime_adapter_implementation_plan.runtime_adapter_implementation_forbidden",
      "Runtime adapter implementation plan cannot enable runtime adapter implementation.",
    ],
    [
      "runtime_adapter_dispatch_allowed",
      "runtime_adapter_implementation_plan.runtime_adapter_dispatch_forbidden",
      "Runtime adapter implementation plan cannot enable runtime adapter dispatch.",
    ],
    [
      "live_adapter_invocation_allowed",
      "runtime_adapter_implementation_plan.live_adapter_invocation_forbidden",
      "Runtime adapter implementation plan cannot enable live adapter invocation.",
    ],
    [
      "live_broker_dispatch_allowed",
      "runtime_adapter_implementation_plan.live_broker_dispatch_forbidden",
      "Runtime adapter implementation plan cannot enable live broker dispatch.",
    ],
    [
      "live_execution_allowed",
      "runtime_adapter_implementation_plan.live_execution_forbidden",
      "Runtime adapter implementation plan cannot enable live execution.",
    ],
  ] as const;
  for (const [key, code, message] of forbiddenFlags) {
    if (Object.hasOwn(input, key) && input[key] !== false) {
      errors.push(planError(code, `/${key}`, message));
    }
  }
  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      planError(
        "runtime_adapter_implementation_plan.side_effects_forbidden",
        "/side_effects",
        "Runtime adapter implementation plan must preserve side_effects: [].",
      ),
    );
  }
}

function addRequiredArrayErrors(
  values: {
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
  errors: RuntimeAdapterImplementationPlanError[],
): void {
  const required = [
    [
      values.scopeRefs,
      "runtime_adapter_implementation_plan.scope_ref_required",
      "/runtime_adapter_implementation_scope_refs",
      "Runtime adapter implementation plan requires implementation scope refs.",
    ],
    [
      values.readinessRefs,
      "runtime_adapter_implementation_plan.readiness_ref_required",
      "/runtime_adapter_readiness_gate_refs",
      "Runtime adapter implementation plan requires readiness gate refs.",
    ],
    [
      values.plannedFiles,
      "runtime_adapter_implementation_plan.planned_file_required",
      "/planned_files_modules",
      "Runtime adapter implementation plan requires planned files/modules.",
    ],
    [
      values.implementationSteps,
      "runtime_adapter_implementation_plan.implementation_step_required",
      "/implementation_steps",
      "Runtime adapter implementation plan requires implementation steps.",
    ],
    [
      values.validationCommands,
      "runtime_adapter_implementation_plan.validation_command_required",
      "/validation_commands",
      "Runtime adapter implementation plan requires validation command refs.",
    ],
    [
      values.dryRunPlan,
      "runtime_adapter_implementation_plan.dry_run_plan_required",
      "/dry_run_plan",
      "Runtime adapter implementation plan requires dry-run plan refs.",
    ],
    [
      values.rollbackRefs,
      "runtime_adapter_implementation_plan.rollback_ref_required",
      "/rollback_refs",
      "Runtime adapter implementation plan requires rollback refs.",
    ],
    [
      values.policyGateRefs,
      "runtime_adapter_implementation_plan.policy_gate_required",
      "/policy_gate_refs",
      "Runtime adapter implementation plan requires policy gate refs.",
    ],
    [
      values.approvalRefs,
      "runtime_adapter_implementation_plan.approval_required",
      "/approval_refs",
      "Runtime adapter implementation plan requires approval refs.",
    ],
    [
      values.auditEventRefs,
      "runtime_adapter_implementation_plan.audit_ref_required",
      "/audit_event_refs",
      "Runtime adapter implementation plan requires audit refs.",
    ],
    [
      values.sourceRefs,
      "runtime_adapter_implementation_plan.source_ref_required",
      "/source_refs",
      "Runtime adapter implementation plan requires source refs.",
    ],
  ] as const;
  for (const [array, code, path, message] of required) {
    if (array.length === 0) {
      errors.push(planError(code, path, message));
    }
  }
}

function normalizeArray<T>(
  value: unknown,
  path: string,
  code: RuntimeAdapterImplementationPlanErrorCode,
  message: string,
  normalizeItem: (item: unknown, path: string) => T | null,
  errors: RuntimeAdapterImplementationPlanError[],
): T[] {
  if (!Array.isArray(value)) {
    errors.push(planError(code, path, message));
    return [];
  }
  const result: T[] = [];
  value.forEach((item, index) => {
    const normalized = normalizeItem(item, `${path}/${index}`);
    if (normalized !== null) {
      result.push(normalized);
    }
  });
  return result;
}

function checkUnexpected(
  value: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  message: string,
  errors: RuntimeAdapterImplementationPlanError[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      errors.push(
        planError(
          "runtime_adapter_implementation_plan.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          message,
        ),
      );
    }
  }
}

function failRuntimeAdapterImplementationPlan(
  errors: RuntimeAdapterImplementationPlanError[],
): RuntimeAdapterImplementationPlanResult {
  return {
    ok: false,
    runtime_adapter_implementation_plan: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function planError(
  code: RuntimeAdapterImplementationPlanErrorCode,
  path: string,
  message: string,
): RuntimeAdapterImplementationPlanError {
  return { code, path, message, severity: "error" };
}

function secretOrUnsafeError(
  path: string,
  label: string,
  secret: boolean,
): RuntimeAdapterImplementationPlanError {
  return planError(
    secret
      ? "runtime_adapter_implementation_plan.secret_value_forbidden"
      : "runtime_adapter_implementation_plan.unsafe_implementation_authority",
    path,
    secret
      ? `${label} cannot contain secret-like values.`
      : `${label} cannot contain runtime authority.`,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeRefValue(value: unknown): string | null {
  return typeof value === "string" && safeRef(value) ? value : null;
}

function safePathRefValue(value: unknown): string | null {
  return typeof value === "string" && pathRefPattern.test(value) ? value : null;
}

function safeStringValue(value: unknown): string | null {
  return typeof value === "string" && safeString(value) ? value : null;
}

function safeString(value: string): boolean {
  return (
    safeStringPattern.test(value) &&
    !secretLikePattern.test(value) &&
    !unsafeAuthorityPattern.test(value) &&
    !rawCommandPattern.test(value)
  );
}

function safeRef(value: string): boolean {
  return (
    refPattern.test(value) &&
    !secretLikePattern.test(value) &&
    !unsafeAuthorityPattern.test(value) &&
    !rawCommandPattern.test(value)
  );
}

function safeCapability(value: string): boolean {
  return (
    capabilityPattern.test(value) &&
    !secretLikePattern.test(value) &&
    !unsafeAuthorityPattern.test(value) &&
    !rawCommandPattern.test(value)
  );
}

function safePolicyGate(value: string): boolean {
  return (
    policyGatePattern.test(value) &&
    !secretLikePattern.test(value) &&
    !unsafeAuthorityPattern.test(value) &&
    !rawCommandPattern.test(value)
  );
}

function containsSecret(value: unknown): boolean {
  return secretLikePattern.test(JSON.stringify(value));
}

function unsafeAuthority(value: unknown): boolean {
  return unsafeAuthorityPattern.test(JSON.stringify(value));
}

function rawCommand(value: unknown): boolean {
  return rawCommandPattern.test(JSON.stringify(value));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function dedupeErrors(
  errors: RuntimeAdapterImplementationPlanError[],
): RuntimeAdapterImplementationPlanError[] {
  const seen = new Set<string>();
  const result: RuntimeAdapterImplementationPlanError[] = [];
  for (const error of errors) {
    const key = `${error.code}:${error.path}:${error.message}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(error);
    }
  }
  return result;
}

function jsonPointer(key: string): string {
  return `/${escapeJsonPointerSegment(key)}`;
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
