import type { CapabilityBrokerAdapterClass } from "./capability-broker-request.js";
import {
  adapterInvocationPreflightContract,
  defaultAdapterInvocationPreflight,
} from "./adapter-invocation-preflight.js";
import type {
  AdapterInvocationPreflightIdentityInput,
  AdapterInvocationPreflightSourceInput,
} from "./adapter-invocation-preflight.js";
import type {
  SubstrateControlIntentActorInput,
  SubstrateControlIntentApprovalRefInput,
  SubstrateControlIntentPolicyGateInput,
  SubstrateControlIntentRollbackExpectationInput,
} from "./substrate-control-intent.js";
import type { SubstrateAdapterManifestIdentityInput } from "./substrate-adapter-manifest.js";
import type { SubstrateControlMode, SubstrateKind } from "./substrate-taxonomy.js";

export const ADAPTER_INVOCATION_RESULT_STATUS = "source_only";

export const adapterInvocationResultContract = {
  contract_id: "lnsat.platform.adapter_invocation_result.v0_1",
  authority: ["@lnsat/packets", "source-backed-adapter-invocation-result"],
  result_version: "0.1",
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
  ],
  result_authority: "result_evidence_only_no_execution",
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type AdapterInvocationResultIdentityInput = {
  result_ref: string;
  result_name: string;
  owner_ref: string;
};

export type AdapterInvocationResultPreflightRefInput = {
  preflight_ref: string;
  evidence_ref: string;
  contract_id: typeof adapterInvocationPreflightContract.contract_id;
  summary: string;
};

export type AdapterInvocationResultExpectedResultRefInput = {
  result_ref: string;
  evidence_ref: string;
  summary: string;
};

export type AdapterInvocationResultAuditRefInput = {
  audit_ref: string;
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
  evidence_ref: string;
  summary: string;
};

export type AdapterInvocationResultEvidenceRefInput = {
  evidence_ref: string;
  summary: string;
};

export type AdapterInvocationObservedStatus =
  "completed" | "failed" | "denied" | "rolled_back";

export type AdapterInvocationResultRequest = {
  result_version?: typeof adapterInvocationResultContract.result_version;
  result_identity?: AdapterInvocationResultIdentityInput;
  adapter_invocation_preflight_refs?: AdapterInvocationResultPreflightRefInput[];
  adapter_identity?: SubstrateAdapterManifestIdentityInput;
  adapter_class?: CapabilityBrokerAdapterClass;
  requested_actor?: SubstrateControlIntentActorInput;
  capability?: string;
  risk_level?: number;
  target_substrate_kind?: SubstrateKind;
  requested_control_mode?: SubstrateControlMode;
  expected_result_refs?: AdapterInvocationResultExpectedResultRefInput[];
  rollback_refs?: SubstrateControlIntentRollbackExpectationInput[];
  audit_event_refs?: AdapterInvocationResultAuditRefInput[];
  policy_gate_refs?: SubstrateControlIntentPolicyGateInput[];
  approval_refs?: SubstrateControlIntentApprovalRefInput[];
  observed_status?: AdapterInvocationObservedStatus;
  output_evidence_refs?: AdapterInvocationResultEvidenceRefInput[];
  error_evidence_refs?: AdapterInvocationResultEvidenceRefInput[];
  source_refs?: AdapterInvocationPreflightSourceInput[];
  denied_live_behavior?: string[];
  result_authority?: typeof adapterInvocationResultContract.result_authority;
  live_adapter_invocation_allowed?: false;
  live_broker_dispatch_allowed?: false;
  live_execution_allowed?: false;
  side_effects?: [];
};

export type AdapterInvocationResultErrorCode =
  | "adapter_invocation_result.invalid_request"
  | "adapter_invocation_result.unexpected_field"
  | "adapter_invocation_result.invalid_version"
  | "adapter_invocation_result.invalid_result_identity"
  | "adapter_invocation_result.preflight_ref_required"
  | "adapter_invocation_result.invalid_preflight_ref"
  | "adapter_invocation_result.invalid_adapter_identity"
  | "adapter_invocation_result.invalid_adapter_class"
  | "adapter_invocation_result.invalid_actor"
  | "adapter_invocation_result.invalid_capability"
  | "adapter_invocation_result.invalid_risk_level"
  | "adapter_invocation_result.invalid_substrate_kind"
  | "adapter_invocation_result.invalid_control_mode"
  | "adapter_invocation_result.expected_result_ref_required"
  | "adapter_invocation_result.invalid_expected_result_ref"
  | "adapter_invocation_result.rollback_ref_required"
  | "adapter_invocation_result.invalid_rollback_ref"
  | "adapter_invocation_result.audit_ref_required"
  | "adapter_invocation_result.invalid_audit_ref"
  | "adapter_invocation_result.policy_gate_required"
  | "adapter_invocation_result.invalid_policy_gate"
  | "adapter_invocation_result.approval_required"
  | "adapter_invocation_result.invalid_approval_ref"
  | "adapter_invocation_result.invalid_observed_status"
  | "adapter_invocation_result.output_or_error_evidence_required"
  | "adapter_invocation_result.output_evidence_required"
  | "adapter_invocation_result.error_evidence_required"
  | "adapter_invocation_result.invalid_output_evidence_ref"
  | "adapter_invocation_result.invalid_error_evidence_ref"
  | "adapter_invocation_result.source_ref_required"
  | "adapter_invocation_result.invalid_source_ref"
  | "adapter_invocation_result.denied_live_behavior_required"
  | "adapter_invocation_result.invalid_denied_live_behavior"
  | "adapter_invocation_result.unsafe_result_authority"
  | "adapter_invocation_result.secret_value_forbidden"
  | "adapter_invocation_result.live_adapter_invocation_forbidden"
  | "adapter_invocation_result.live_broker_dispatch_forbidden"
  | "adapter_invocation_result.live_execution_forbidden"
  | "adapter_invocation_result.side_effects_forbidden";

export type AdapterInvocationResultError = {
  code: AdapterInvocationResultErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AdapterInvocationResultEvidence = {
  contract_id: typeof adapterInvocationResultContract.contract_id;
  result_version: typeof adapterInvocationResultContract.result_version;
  result_identity: AdapterInvocationResultIdentityInput;
  adapter_invocation_preflight_refs: AdapterInvocationResultPreflightRefInput[];
  adapter_identity: SubstrateAdapterManifestIdentityInput;
  adapter_class: CapabilityBrokerAdapterClass;
  requested_actor: SubstrateControlIntentActorInput;
  capability: string;
  risk_level: number;
  target_substrate_kind: SubstrateKind;
  requested_control_mode: SubstrateControlMode;
  expected_result_refs: AdapterInvocationResultExpectedResultRefInput[];
  rollback_refs: SubstrateControlIntentRollbackExpectationInput[];
  audit_event_refs: AdapterInvocationResultAuditRefInput[];
  required_audit_events: string[];
  policy_gate_refs: SubstrateControlIntentPolicyGateInput[];
  required_policy_gates: string[];
  approval_refs: SubstrateControlIntentApprovalRefInput[];
  required_approvals: string[];
  observed_status: AdapterInvocationObservedStatus;
  output_evidence_refs: AdapterInvocationResultEvidenceRefInput[];
  error_evidence_refs: AdapterInvocationResultEvidenceRefInput[];
  denied_live_behavior: string[];
  source_refs: string[];
  result_authority: typeof adapterInvocationResultContract.result_authority;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type AdapterInvocationResult =
  | {
      ok: true;
      adapter_invocation_result: AdapterInvocationResultEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      adapter_invocation_result: null;
      errors: AdapterInvocationResultError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedAdapterInvocationResult =
  | {
      ok: true;
      result: Omit<
        AdapterInvocationResultEvidence,
        "contract_id" | "result_version" | "side_effects"
      >;
    }
  | {
      ok: false;
      errors: AdapterInvocationResultError[];
    };

const requestKeys = new Set([
  "result_version",
  "result_identity",
  "adapter_invocation_preflight_refs",
  "adapter_identity",
  "adapter_class",
  "requested_actor",
  "capability",
  "risk_level",
  "target_substrate_kind",
  "requested_control_mode",
  "expected_result_refs",
  "rollback_refs",
  "audit_event_refs",
  "policy_gate_refs",
  "approval_refs",
  "observed_status",
  "output_evidence_refs",
  "error_evidence_refs",
  "source_refs",
  "denied_live_behavior",
  "result_authority",
  "live_adapter_invocation_allowed",
  "live_broker_dispatch_allowed",
  "live_execution_allowed",
  "side_effects",
]);
const identityKeys = new Set(["result_ref", "result_name", "owner_ref"]);
const preflightRefKeys = new Set([
  "preflight_ref",
  "evidence_ref",
  "contract_id",
  "summary",
]);
const adapterIdentityKeys = new Set(["adapter_ref", "adapter_name", "owner_ref"]);
const actorKeys = new Set(["actor_ref", "actor_type", "role_ref"]);
const expectedResultRefKeys = new Set(["result_ref", "evidence_ref", "summary"]);
const rollbackRefKeys = new Set([
  "rollback_ref",
  "required_for_risk_level_at_or_above",
  "owner_ref",
  "evidence_refs",
]);
const auditRefKeys = new Set(["audit_ref", "event_type", "evidence_ref", "summary"]);
const evidenceRefKeys = new Set(["evidence_ref", "summary"]);
const sourceKeys = new Set(["source_ref", "summary"]);
const policyGateKeys = new Set(["gate_ref", "decision_ref", "required"]);
const approvalRefKeys = new Set(["approval_ref", "approval_type", "required"]);

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
const approvalTypes = new Set<SubstrateControlIntentApprovalRefInput["approval_type"]>([
  "human",
  "policy",
  "runbook",
  "rollback_owner",
]);
const observedStatuses = new Set<AdapterInvocationObservedStatus>([
  "completed",
  "failed",
  "denied",
  "rolled_back",
]);

const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const refPattern = /^[a-z][a-z0-9_-]*:[\w./:@#_-]{3,180}$/;
const capabilityPattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,6}$/;
const policyGatePattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,7}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|API_KEY|SECRET=|TOKEN=|PASSWORD|PRIVATE KEY|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]|AKIA[A-Z0-9]|secret:)/i;
const unsafeAuthorityPattern =
  /\b(root|sudo|shell|ssh\.raw|secret\.read|credential\.read|write\.execute|delete\.execute|drop|destroy\.execute|restart\.execute|deploy\.execute|dns\.write|cloudflare\.write|database\.write|db\.write|queue\.purge|docker\.socket|docker_socket|privileged|unrestricted|node_agent\.exec|rm -rf|live_dispatch|dispatch\.execute|adapter\.invoke|adapter_invocation|broker\.dispatch|invoke\.execute|runtime\.execution)\b/i;

export const defaultAdapterInvocationResult: AdapterInvocationResultEvidence = {
  contract_id: adapterInvocationResultContract.contract_id,
  result_version: adapterInvocationResultContract.result_version,
  result_identity: {
    result_ref: "result:service-control-adapter-invocation",
    result_name: "Service control adapter invocation result evidence",
    owner_ref: "owner:lnsat-platform",
  },
  adapter_invocation_preflight_refs: [
    {
      preflight_ref: defaultAdapterInvocationPreflight.preflight_identity.preflight_ref,
      evidence_ref: "evidence:bp0114-adapter-invocation-preflight",
      contract_id: adapterInvocationPreflightContract.contract_id,
      summary: "BP-0114 source-only adapter invocation preflight evidence",
    },
  ],
  adapter_identity: defaultAdapterInvocationPreflight.adapter_identity,
  adapter_class: defaultAdapterInvocationPreflight.adapter_class,
  requested_actor: defaultAdapterInvocationPreflight.requested_actor,
  capability: defaultAdapterInvocationPreflight.capability,
  risk_level: defaultAdapterInvocationPreflight.risk_level,
  target_substrate_kind: defaultAdapterInvocationPreflight.target_substrate_kind,
  requested_control_mode: defaultAdapterInvocationPreflight.requested_control_mode,
  expected_result_refs: [
    {
      result_ref:
        defaultAdapterInvocationPreflight.result_expectations.result_packet_ref,
      evidence_ref: "evidence:bp0114-result-expectations",
      summary: "BP-0114 expected result evidence before any runtime adapter exists",
    },
  ],
  rollback_refs: defaultAdapterInvocationPreflight.rollback_expectations,
  audit_event_refs: defaultAdapterInvocationPreflight.audit_event_plan.map((event) => ({
    audit_ref: `audit:adapter-invocation-result:${event.event_type}`,
    event_type: event.event_type,
    evidence_ref: `evidence:bp0120:${event.event_type}`,
    summary: `BP-0120 result evidence preserves ${event.event_type} audit ref`,
  })),
  required_audit_events: defaultAdapterInvocationPreflight.required_audit_events,
  policy_gate_refs: [
    {
      gate_ref: "substrate.adapter.invocation.result.review",
      decision_ref: "policy_decision:adapter-invocation-result-source-only",
      required: true,
    },
    ...defaultAdapterInvocationPreflight.policy_gate_refs,
  ],
  required_policy_gates: [
    "substrate.adapter.invocation.result.review",
    ...defaultAdapterInvocationPreflight.required_policy_gates,
  ].sort(),
  approval_refs: defaultAdapterInvocationPreflight.approval_refs,
  required_approvals: defaultAdapterInvocationPreflight.required_approvals,
  observed_status: "completed",
  output_evidence_refs: [
    {
      evidence_ref: "evidence:operator-visible-adapter-result-output",
      summary: "source-only output evidence ref, no live adapter output included",
    },
  ],
  error_evidence_refs: [
    {
      evidence_ref: "evidence:operator-visible-adapter-result-error-state",
      summary: "source-only error evidence ref, no raw runtime error included",
    },
  ],
  denied_live_behavior: [
    ...defaultAdapterInvocationPreflight.denied_live_behavior,
    "result evidence does not invoke adapter",
    "result evidence does not execute rollback",
  ],
  source_refs: [
    "doc:docs/architecture/PACKET_MODEL.md",
    "doc:docs/architecture/POLICY_AND_AUDIT.md",
    "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
    "doc:docs/reference/CONTRACT_PROVENANCE.md",
    "ticket:BP-0120: source-only adapter invocation result contract",
  ],
  result_authority: adapterInvocationResultContract.result_authority,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
};

export function createAdapterInvocationResult(
  input: unknown = {},
): AdapterInvocationResult {
  const normalized = normalizeAdapterInvocationResult(input);

  if (!normalized.ok) {
    return failAdapterInvocationResult(normalized.errors);
  }

  return {
    ok: true,
    adapter_invocation_result: {
      contract_id: adapterInvocationResultContract.contract_id,
      result_version: adapterInvocationResultContract.result_version,
      ...normalized.result,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeAdapterInvocationResult(
  input: unknown,
): NormalizedAdapterInvocationResult {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        resultError(
          "adapter_invocation_result.invalid_request",
          "",
          "Adapter invocation result request must be an object.",
        ),
      ],
    };
  }

  const errors: AdapterInvocationResultError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        resultError(
          "adapter_invocation_result.unexpected_field",
          jsonPointer(key),
          "Unexpected adapter invocation result field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "result_version") &&
    input.result_version !== adapterInvocationResultContract.result_version
  ) {
    errors.push(
      resultError(
        "adapter_invocation_result.invalid_version",
        "/result_version",
        "Adapter invocation result version is unsupported.",
      ),
    );
  }

  const resultIdentity = Object.hasOwn(input, "result_identity")
    ? normalizeResultIdentity(input.result_identity, errors)
    : defaultAdapterInvocationResult.result_identity;
  const preflightRefs = Object.hasOwn(input, "adapter_invocation_preflight_refs")
    ? normalizePreflightRefs(input.adapter_invocation_preflight_refs, errors)
    : [...defaultAdapterInvocationResult.adapter_invocation_preflight_refs];
  const adapterIdentity = Object.hasOwn(input, "adapter_identity")
    ? normalizeAdapterIdentity(input.adapter_identity, errors)
    : defaultAdapterInvocationResult.adapter_identity;
  const adapterClass = Object.hasOwn(input, "adapter_class")
    ? normalizeAdapterClass(input.adapter_class, errors)
    : defaultAdapterInvocationResult.adapter_class;
  const requestedActor = Object.hasOwn(input, "requested_actor")
    ? normalizeActor(input.requested_actor, errors)
    : defaultAdapterInvocationResult.requested_actor;
  const capability = Object.hasOwn(input, "capability")
    ? normalizeCapability(input.capability, errors)
    : defaultAdapterInvocationResult.capability;
  const riskLevel = Object.hasOwn(input, "risk_level")
    ? normalizeRiskLevel(input.risk_level, errors)
    : defaultAdapterInvocationResult.risk_level;
  const substrateKind = Object.hasOwn(input, "target_substrate_kind")
    ? normalizeSubstrateKind(input.target_substrate_kind, errors)
    : defaultAdapterInvocationResult.target_substrate_kind;
  const controlMode = Object.hasOwn(input, "requested_control_mode")
    ? normalizeControlMode(input.requested_control_mode, errors)
    : defaultAdapterInvocationResult.requested_control_mode;
  const expectedResultRefs = Object.hasOwn(input, "expected_result_refs")
    ? normalizeExpectedResultRefs(input.expected_result_refs, errors)
    : [...defaultAdapterInvocationResult.expected_result_refs];
  const rollbackRefs = Object.hasOwn(input, "rollback_refs")
    ? normalizeRollbackRefs(input.rollback_refs, errors)
    : [...defaultAdapterInvocationResult.rollback_refs];
  const auditEventRefs = Object.hasOwn(input, "audit_event_refs")
    ? normalizeAuditEventRefs(input.audit_event_refs, errors)
    : [...defaultAdapterInvocationResult.audit_event_refs];
  const policyGateRefs = Object.hasOwn(input, "policy_gate_refs")
    ? normalizePolicyGateRefs(input.policy_gate_refs, errors)
    : [...defaultAdapterInvocationResult.policy_gate_refs];
  const approvalRefs = Object.hasOwn(input, "approval_refs")
    ? normalizeApprovalRefs(input.approval_refs, errors)
    : [...defaultAdapterInvocationResult.approval_refs];
  const observedStatus = Object.hasOwn(input, "observed_status")
    ? normalizeObservedStatus(input.observed_status, errors)
    : defaultAdapterInvocationResult.observed_status;
  const outputEvidenceRefs = Object.hasOwn(input, "output_evidence_refs")
    ? normalizeEvidenceRefs(
        input.output_evidence_refs,
        "/output_evidence_refs",
        "adapter_invocation_result.output_evidence_required",
        "adapter_invocation_result.invalid_output_evidence_ref",
        "Adapter invocation result requires output evidence refs.",
        errors,
      )
    : [...defaultAdapterInvocationResult.output_evidence_refs];
  const errorEvidenceRefs = Object.hasOwn(input, "error_evidence_refs")
    ? normalizeEvidenceRefs(
        input.error_evidence_refs,
        "/error_evidence_refs",
        "adapter_invocation_result.error_evidence_required",
        "adapter_invocation_result.invalid_error_evidence_ref",
        "Adapter invocation result requires error evidence refs.",
        errors,
      )
    : [...defaultAdapterInvocationResult.error_evidence_refs];
  const sourceRefs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, errors)
    : [...defaultAdapterInvocationResult.source_refs];
  const deniedLiveBehavior = Object.hasOwn(input, "denied_live_behavior")
    ? normalizeSafeStrings(
        input.denied_live_behavior,
        "/denied_live_behavior",
        "Adapter invocation result requires denied live behavior.",
        "adapter_invocation_result.invalid_denied_live_behavior",
        errors,
      )
    : [...defaultAdapterInvocationResult.denied_live_behavior];

  if (
    Object.hasOwn(input, "result_authority") &&
    input.result_authority !== adapterInvocationResultContract.result_authority
  ) {
    errors.push(
      resultError(
        "adapter_invocation_result.unsafe_result_authority",
        "/result_authority",
        "Adapter invocation result cannot grant execution authority.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_adapter_invocation_allowed") &&
    input.live_adapter_invocation_allowed !== false
  ) {
    errors.push(
      resultError(
        "adapter_invocation_result.live_adapter_invocation_forbidden",
        "/live_adapter_invocation_allowed",
        "Adapter invocation result cannot enable live adapter invocation.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_broker_dispatch_allowed") &&
    input.live_broker_dispatch_allowed !== false
  ) {
    errors.push(
      resultError(
        "adapter_invocation_result.live_broker_dispatch_forbidden",
        "/live_broker_dispatch_allowed",
        "Adapter invocation result cannot enable live broker dispatch.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_execution_allowed") &&
    input.live_execution_allowed !== false
  ) {
    errors.push(
      resultError(
        "adapter_invocation_result.live_execution_forbidden",
        "/live_execution_allowed",
        "Adapter invocation result cannot enable live execution.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      resultError(
        "adapter_invocation_result.side_effects_forbidden",
        "/side_effects",
        "Adapter invocation result must preserve side_effects: [].",
      ),
    );
  }

  if (preflightRefs.length === 0) {
    errors.push(
      resultError(
        "adapter_invocation_result.preflight_ref_required",
        "/adapter_invocation_preflight_refs",
        "Adapter invocation result requires preflight refs.",
      ),
    );
  }
  if (expectedResultRefs.length === 0) {
    errors.push(
      resultError(
        "adapter_invocation_result.expected_result_ref_required",
        "/expected_result_refs",
        "Adapter invocation result requires expected result refs.",
      ),
    );
  }
  if (auditEventRefs.length === 0) {
    errors.push(
      resultError(
        "adapter_invocation_result.audit_ref_required",
        "/audit_event_refs",
        "Adapter invocation result requires audit event refs.",
      ),
    );
  }
  if (policyGateRefs.length === 0) {
    errors.push(
      resultError(
        "adapter_invocation_result.policy_gate_required",
        "/policy_gate_refs",
        "Adapter invocation result requires policy gate refs.",
      ),
    );
  }
  if (
    requiresApproval(controlMode, riskLevel, adapterClass) &&
    approvalRefs.length === 0
  ) {
    errors.push(
      resultError(
        "adapter_invocation_result.approval_required",
        "/approval_refs",
        "Approval-gated or risky adapter invocation result requires approval refs.",
      ),
    );
  }
  if (outputEvidenceRefs.length === 0 && errorEvidenceRefs.length === 0) {
    errors.push(
      resultError(
        "adapter_invocation_result.output_or_error_evidence_required",
        "/output_evidence_refs",
        "Adapter invocation result requires output or error evidence refs.",
      ),
    );
  }
  if (observedStatus === "completed" && outputEvidenceRefs.length === 0) {
    errors.push(
      resultError(
        "adapter_invocation_result.output_evidence_required",
        "/output_evidence_refs",
        "Completed adapter invocation result requires output evidence refs.",
      ),
    );
  }
  if (
    (observedStatus === "failed" ||
      observedStatus === "denied" ||
      observedStatus === "rolled_back") &&
    errorEvidenceRefs.length === 0
  ) {
    errors.push(
      resultError(
        "adapter_invocation_result.error_evidence_required",
        "/error_evidence_refs",
        "Failed, denied, or rolled back adapter invocation result requires error evidence refs.",
      ),
    );
  }
  if (
    (observedStatus === "failed" || observedStatus === "rolled_back") &&
    rollbackRefs.length === 0
  ) {
    errors.push(
      resultError(
        "adapter_invocation_result.rollback_ref_required",
        "/rollback_refs",
        "Failure-path adapter invocation result requires rollback refs.",
      ),
    );
  }
  if (sourceRefs.length === 0) {
    errors.push(
      resultError(
        "adapter_invocation_result.source_ref_required",
        "/source_refs",
        "Adapter invocation result requires source refs.",
      ),
    );
  }
  if (deniedLiveBehavior.length === 0) {
    errors.push(
      resultError(
        "adapter_invocation_result.denied_live_behavior_required",
        "/denied_live_behavior",
        "Adapter invocation result requires denied live behavior.",
      ),
    );
  }

  const requiredAuditEvents = uniqueStrings(
    auditEventRefs.map((event) => event.event_type),
  );

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    result: {
      result_identity: resultIdentity,
      adapter_invocation_preflight_refs: preflightRefs,
      adapter_identity: adapterIdentity,
      adapter_class: adapterClass,
      requested_actor: requestedActor,
      capability,
      risk_level: riskLevel,
      target_substrate_kind: substrateKind,
      requested_control_mode: controlMode,
      expected_result_refs: expectedResultRefs,
      rollback_refs: rollbackRefs,
      audit_event_refs: auditEventRefs,
      required_audit_events: requiredAuditEvents,
      policy_gate_refs: policyGateRefs,
      required_policy_gates: uniqueStrings([
        "substrate.adapter.invocation.result.review",
        ...policyGateRefs.map((gate) => gate.gate_ref),
      ]),
      approval_refs: approvalRefs,
      required_approvals: uniqueStrings(approvalRefs.map((ref) => ref.approval_ref)),
      observed_status: observedStatus,
      output_evidence_refs: outputEvidenceRefs,
      error_evidence_refs: errorEvidenceRefs,
      denied_live_behavior: uniqueStrings(deniedLiveBehavior),
      source_refs: sourceRefs,
      result_authority: adapterInvocationResultContract.result_authority,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
    },
  };
}

function normalizeResultIdentity(
  value: unknown,
  errors: AdapterInvocationResultError[],
): AdapterInvocationResultIdentityInput {
  if (!isPlainObject(value)) {
    errors.push(
      resultError(
        "adapter_invocation_result.invalid_result_identity",
        "/result_identity",
        "Adapter invocation result requires result identity.",
      ),
    );
    return defaultAdapterInvocationResult.result_identity;
  }
  for (const key of Object.keys(value)) {
    if (!identityKeys.has(key)) {
      errors.push(
        resultError(
          "adapter_invocation_result.unexpected_field",
          `/result_identity/${escapeJsonPointerSegment(key)}`,
          "Unexpected result identity field.",
        ),
      );
    }
  }
  const resultRef =
    typeof value.result_ref === "string" && safeRef(value.result_ref)
      ? value.result_ref
      : null;
  const resultName =
    typeof value.result_name === "string" && safeString(value.result_name)
      ? value.result_name
      : null;
  const ownerRef =
    typeof value.owner_ref === "string" && safeRef(value.owner_ref)
      ? value.owner_ref
      : null;
  if (resultRef === null || resultName === null || ownerRef === null) {
    errors.push(
      resultError(
        "adapter_invocation_result.invalid_result_identity",
        "/result_identity",
        "Result identity requires safe result_ref, result_name, and owner_ref.",
      ),
    );
  }
  return {
    result_ref: resultRef ?? defaultAdapterInvocationResult.result_identity.result_ref,
    result_name:
      resultName ?? defaultAdapterInvocationResult.result_identity.result_name,
    owner_ref: ownerRef ?? defaultAdapterInvocationResult.result_identity.owner_ref,
  };
}

function normalizePreflightRefs(
  value: unknown,
  errors: AdapterInvocationResultError[],
): AdapterInvocationResultPreflightRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      resultError(
        "adapter_invocation_result.preflight_ref_required",
        "/adapter_invocation_preflight_refs",
        "Adapter invocation result requires preflight refs.",
      ),
    );
    return [];
  }
  const result: AdapterInvocationResultPreflightRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/adapter_invocation_preflight_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_preflight_ref",
          path,
          "Preflight ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!preflightRefKeys.has(key)) {
        errors.push(
          resultError(
            "adapter_invocation_result.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected preflight ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        resultError(
          containsSecret(item)
            ? "adapter_invocation_result.secret_value_forbidden"
            : "adapter_invocation_result.unsafe_result_authority",
          path,
          containsSecret(item)
            ? "Preflight refs cannot contain secret-like values."
            : "Preflight refs ask for unsafe result authority.",
        ),
      );
      return;
    }
    const preflightRef =
      typeof item.preflight_ref === "string" && safeRef(item.preflight_ref)
        ? item.preflight_ref
        : null;
    const evidenceRef =
      typeof item.evidence_ref === "string" && safeRef(item.evidence_ref)
        ? item.evidence_ref
        : null;
    const summary =
      typeof item.summary === "string" && safeString(item.summary)
        ? item.summary
        : null;
    if (
      preflightRef === null ||
      evidenceRef === null ||
      item.contract_id !== adapterInvocationPreflightContract.contract_id ||
      summary === null
    ) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_preflight_ref",
          path,
          "Preflight ref requires safe refs, supported contract_id, and summary.",
        ),
      );
      return;
    }
    result.push({
      preflight_ref: preflightRef,
      evidence_ref: evidenceRef,
      contract_id: adapterInvocationPreflightContract.contract_id,
      summary,
    });
  });
  return result;
}

function normalizeAdapterIdentity(
  value: unknown,
  errors: AdapterInvocationResultError[],
): SubstrateAdapterManifestIdentityInput {
  if (!isPlainObject(value)) {
    errors.push(
      resultError(
        "adapter_invocation_result.invalid_adapter_identity",
        "/adapter_identity",
        "Adapter invocation result requires adapter identity.",
      ),
    );
    return defaultAdapterInvocationResult.adapter_identity;
  }
  for (const key of Object.keys(value)) {
    if (!adapterIdentityKeys.has(key)) {
      errors.push(
        resultError(
          "adapter_invocation_result.unexpected_field",
          `/adapter_identity/${escapeJsonPointerSegment(key)}`,
          "Unexpected adapter identity field.",
        ),
      );
    }
  }
  const adapterRef =
    typeof value.adapter_ref === "string" && safeRef(value.adapter_ref)
      ? value.adapter_ref
      : null;
  const adapterName =
    typeof value.adapter_name === "string" && safeString(value.adapter_name)
      ? value.adapter_name
      : null;
  const ownerRef =
    typeof value.owner_ref === "string" && safeRef(value.owner_ref)
      ? value.owner_ref
      : null;
  if (adapterRef === null || adapterName === null || ownerRef === null) {
    errors.push(
      resultError(
        "adapter_invocation_result.invalid_adapter_identity",
        "/adapter_identity",
        "Adapter identity requires safe adapter_ref, adapter_name, and owner_ref.",
      ),
    );
  }
  return {
    adapter_ref:
      adapterRef ?? defaultAdapterInvocationResult.adapter_identity.adapter_ref,
    adapter_name:
      adapterName ?? defaultAdapterInvocationResult.adapter_identity.adapter_name,
    owner_ref: ownerRef ?? defaultAdapterInvocationResult.adapter_identity.owner_ref,
  };
}

function normalizeAdapterClass(
  value: unknown,
  errors: AdapterInvocationResultError[],
): CapabilityBrokerAdapterClass {
  if (
    typeof value !== "string" ||
    !adapterClasses.has(value as CapabilityBrokerAdapterClass)
  ) {
    errors.push(
      resultError(
        "adapter_invocation_result.invalid_adapter_class",
        "/adapter_class",
        "Adapter invocation result adapter class is unsupported.",
      ),
    );
    if (unsafeAuthority(value)) {
      errors.push(
        resultError(
          "adapter_invocation_result.unsafe_result_authority",
          "/adapter_class",
          "Adapter invocation result adapter class asks for unsafe authority.",
        ),
      );
    }
    return defaultAdapterInvocationResult.adapter_class;
  }
  return value as CapabilityBrokerAdapterClass;
}

function normalizeActor(
  value: unknown,
  errors: AdapterInvocationResultError[],
): SubstrateControlIntentActorInput {
  if (!isPlainObject(value)) {
    errors.push(
      resultError(
        "adapter_invocation_result.invalid_actor",
        "/requested_actor",
        "Adapter invocation result requires requested actor.",
      ),
    );
    return defaultAdapterInvocationResult.requested_actor;
  }
  for (const key of Object.keys(value)) {
    if (!actorKeys.has(key)) {
      errors.push(
        resultError(
          "adapter_invocation_result.unexpected_field",
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
  const actorType =
    typeof value.actor_type === "string" &&
    actorTypes.has(value.actor_type as SubstrateControlIntentActorInput["actor_type"])
      ? (value.actor_type as SubstrateControlIntentActorInput["actor_type"])
      : null;
  const roleRef =
    typeof value.role_ref === "string" && safeRef(value.role_ref)
      ? value.role_ref
      : null;
  if (actorRef === null || actorType === null || roleRef === null) {
    errors.push(
      resultError(
        "adapter_invocation_result.invalid_actor",
        "/requested_actor",
        "Requested actor requires safe actor_ref, actor_type, and role_ref.",
      ),
    );
  }
  return {
    actor_ref: actorRef ?? defaultAdapterInvocationResult.requested_actor.actor_ref,
    actor_type: actorType ?? defaultAdapterInvocationResult.requested_actor.actor_type,
    role_ref: roleRef ?? defaultAdapterInvocationResult.requested_actor.role_ref,
  };
}

function normalizeCapability(
  value: unknown,
  errors: AdapterInvocationResultError[],
): string {
  if (typeof value !== "string" || !safeCapability(value)) {
    errors.push(
      resultError(
        unsafeAuthority(value)
          ? "adapter_invocation_result.unsafe_result_authority"
          : "adapter_invocation_result.invalid_capability",
        "/capability",
        unsafeAuthority(value)
          ? "Adapter invocation result capability asks for unsafe authority."
          : "Adapter invocation result capability must be safe dotted capability text.",
      ),
    );
    return defaultAdapterInvocationResult.capability;
  }
  return value;
}

function normalizeRiskLevel(
  value: unknown,
  errors: AdapterInvocationResultError[],
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 8) {
    errors.push(
      resultError(
        "adapter_invocation_result.invalid_risk_level",
        "/risk_level",
        "Adapter invocation result risk level must be an integer from 0 to 8.",
      ),
    );
    return defaultAdapterInvocationResult.risk_level;
  }
  return value;
}

function normalizeSubstrateKind(
  value: unknown,
  errors: AdapterInvocationResultError[],
): SubstrateKind {
  if (typeof value !== "string" || !substrateKinds.has(value as SubstrateKind)) {
    errors.push(
      resultError(
        "adapter_invocation_result.invalid_substrate_kind",
        "/target_substrate_kind",
        "Adapter invocation result target substrate kind is unsupported.",
      ),
    );
    return defaultAdapterInvocationResult.target_substrate_kind;
  }
  return value as SubstrateKind;
}

function normalizeControlMode(
  value: unknown,
  errors: AdapterInvocationResultError[],
): SubstrateControlMode {
  if (typeof value !== "string" || !controlModes.has(value as SubstrateControlMode)) {
    errors.push(
      resultError(
        "adapter_invocation_result.invalid_control_mode",
        "/requested_control_mode",
        "Adapter invocation result control mode is unsupported.",
      ),
    );
    return defaultAdapterInvocationResult.requested_control_mode;
  }
  return value as SubstrateControlMode;
}

function normalizeExpectedResultRefs(
  value: unknown,
  errors: AdapterInvocationResultError[],
): AdapterInvocationResultExpectedResultRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      resultError(
        "adapter_invocation_result.expected_result_ref_required",
        "/expected_result_refs",
        "Adapter invocation result requires expected result refs.",
      ),
    );
    return [];
  }
  const result: AdapterInvocationResultExpectedResultRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/expected_result_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_expected_result_ref",
          path,
          "Expected result ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!expectedResultRefKeys.has(key)) {
        errors.push(
          resultError(
            "adapter_invocation_result.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected expected result ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        resultError(
          containsSecret(item)
            ? "adapter_invocation_result.secret_value_forbidden"
            : "adapter_invocation_result.unsafe_result_authority",
          path,
          containsSecret(item)
            ? "Expected result refs cannot contain secret-like values."
            : "Expected result refs ask for unsafe result authority.",
        ),
      );
      return;
    }
    const resultRef =
      typeof item.result_ref === "string" && safeRef(item.result_ref)
        ? item.result_ref
        : null;
    const evidenceRef =
      typeof item.evidence_ref === "string" && safeRef(item.evidence_ref)
        ? item.evidence_ref
        : null;
    const summary =
      typeof item.summary === "string" && safeString(item.summary)
        ? item.summary
        : null;
    if (resultRef === null || evidenceRef === null || summary === null) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_expected_result_ref",
          path,
          "Expected result ref requires safe result_ref, evidence_ref, and summary.",
        ),
      );
      return;
    }
    result.push({ result_ref: resultRef, evidence_ref: evidenceRef, summary });
  });
  return result;
}

function normalizeRollbackRefs(
  value: unknown,
  errors: AdapterInvocationResultError[],
): SubstrateControlIntentRollbackExpectationInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      resultError(
        "adapter_invocation_result.rollback_ref_required",
        "/rollback_refs",
        "Adapter invocation result requires rollback refs.",
      ),
    );
    return [];
  }
  const result: SubstrateControlIntentRollbackExpectationInput[] = [];
  value.forEach((item, index) => {
    const path = `/rollback_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_rollback_ref",
          path,
          "Rollback ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!rollbackRefKeys.has(key)) {
        errors.push(
          resultError(
            "adapter_invocation_result.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected rollback ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        resultError(
          containsSecret(item)
            ? "adapter_invocation_result.secret_value_forbidden"
            : "adapter_invocation_result.unsafe_result_authority",
          path,
          containsSecret(item)
            ? "Rollback refs cannot contain secret-like values."
            : "Rollback refs ask for unsafe result authority.",
        ),
      );
      return;
    }
    const rollbackRef =
      typeof item.rollback_ref === "string" && safeRef(item.rollback_ref)
        ? item.rollback_ref
        : null;
    const threshold =
      typeof item.required_for_risk_level_at_or_above === "number" &&
      Number.isInteger(item.required_for_risk_level_at_or_above) &&
      item.required_for_risk_level_at_or_above >= 0 &&
      item.required_for_risk_level_at_or_above <= 8
        ? item.required_for_risk_level_at_or_above
        : null;
    const ownerRef =
      typeof item.owner_ref === "string" && safeRef(item.owner_ref)
        ? item.owner_ref
        : null;
    const evidenceRefs = normalizeRefStringArray(item.evidence_refs);
    if (
      rollbackRef === null ||
      threshold === null ||
      ownerRef === null ||
      evidenceRefs.length === 0
    ) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_rollback_ref",
          path,
          "Rollback ref requires rollback_ref, risk threshold, owner_ref, and evidence refs.",
        ),
      );
      return;
    }
    result.push({
      rollback_ref: rollbackRef,
      required_for_risk_level_at_or_above: threshold,
      owner_ref: ownerRef,
      evidence_refs: evidenceRefs,
    });
  });
  return result;
}

function normalizeAuditEventRefs(
  value: unknown,
  errors: AdapterInvocationResultError[],
): AdapterInvocationResultAuditRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      resultError(
        "adapter_invocation_result.audit_ref_required",
        "/audit_event_refs",
        "Adapter invocation result requires audit event refs.",
      ),
    );
    return [];
  }
  const result: AdapterInvocationResultAuditRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/audit_event_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_audit_ref",
          path,
          "Audit ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!auditRefKeys.has(key)) {
        errors.push(
          resultError(
            "adapter_invocation_result.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected audit ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        resultError(
          containsSecret(item)
            ? "adapter_invocation_result.secret_value_forbidden"
            : "adapter_invocation_result.unsafe_result_authority",
          path,
          containsSecret(item)
            ? "Audit refs cannot contain secret-like values."
            : "Audit refs ask for unsafe result authority.",
        ),
      );
      return;
    }
    const auditRef =
      typeof item.audit_ref === "string" && safeRef(item.audit_ref)
        ? item.audit_ref
        : null;
    const eventType =
      typeof item.event_type === "string" &&
      auditEventTypes.has(
        item.event_type as AdapterInvocationResultAuditRefInput["event_type"],
      )
        ? (item.event_type as AdapterInvocationResultAuditRefInput["event_type"])
        : null;
    const evidenceRef =
      typeof item.evidence_ref === "string" && safeRef(item.evidence_ref)
        ? item.evidence_ref
        : null;
    const summary =
      typeof item.summary === "string" && safeString(item.summary)
        ? item.summary
        : null;
    if (
      auditRef === null ||
      eventType === null ||
      evidenceRef === null ||
      summary === null
    ) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_audit_ref",
          path,
          "Audit ref requires safe audit_ref, event_type, evidence_ref, and summary.",
        ),
      );
      return;
    }
    result.push({
      audit_ref: auditRef,
      event_type: eventType,
      evidence_ref: evidenceRef,
      summary,
    });
  });
  return result;
}

function normalizePolicyGateRefs(
  value: unknown,
  errors: AdapterInvocationResultError[],
): SubstrateControlIntentPolicyGateInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      resultError(
        "adapter_invocation_result.policy_gate_required",
        "/policy_gate_refs",
        "Adapter invocation result requires policy gate refs.",
      ),
    );
    return [];
  }
  const result: SubstrateControlIntentPolicyGateInput[] = [];
  value.forEach((item, index) => {
    const path = `/policy_gate_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_policy_gate",
          path,
          "Policy gate ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!policyGateKeys.has(key)) {
        errors.push(
          resultError(
            "adapter_invocation_result.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected policy gate field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        resultError(
          containsSecret(item)
            ? "adapter_invocation_result.secret_value_forbidden"
            : "adapter_invocation_result.unsafe_result_authority",
          path,
          containsSecret(item)
            ? "Policy gate refs cannot contain secret-like values."
            : "Policy gate refs ask for unsafe result authority.",
        ),
      );
      return;
    }
    const gateRef =
      typeof item.gate_ref === "string" && safePolicyGate(item.gate_ref)
        ? item.gate_ref
        : null;
    const decisionRef =
      typeof item.decision_ref === "string" && safeRef(item.decision_ref)
        ? item.decision_ref
        : null;
    if (gateRef === null || decisionRef === null || item.required !== true) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_policy_gate",
          path,
          "Policy gate ref requires safe gate_ref, decision_ref, and required: true.",
        ),
      );
      return;
    }
    result.push({ gate_ref: gateRef, decision_ref: decisionRef, required: true });
  });
  return result;
}

function normalizeApprovalRefs(
  value: unknown,
  errors: AdapterInvocationResultError[],
): SubstrateControlIntentApprovalRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      resultError(
        "adapter_invocation_result.approval_required",
        "/approval_refs",
        "Adapter invocation result requires approval refs.",
      ),
    );
    return [];
  }
  const result: SubstrateControlIntentApprovalRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/approval_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_approval_ref",
          path,
          "Approval ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!approvalRefKeys.has(key)) {
        errors.push(
          resultError(
            "adapter_invocation_result.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected approval ref field.",
          ),
        );
      }
    }
    if (containsSecret(item)) {
      errors.push(
        resultError(
          "adapter_invocation_result.secret_value_forbidden",
          path,
          "Approval refs cannot contain secret-like values.",
        ),
      );
      return;
    }
    const approvalRef =
      typeof item.approval_ref === "string" && safeRef(item.approval_ref)
        ? item.approval_ref
        : null;
    const approvalType =
      typeof item.approval_type === "string" &&
      approvalTypes.has(
        item.approval_type as SubstrateControlIntentApprovalRefInput["approval_type"],
      )
        ? (item.approval_type as SubstrateControlIntentApprovalRefInput["approval_type"])
        : null;
    if (approvalRef === null || approvalType === null || item.required !== true) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_approval_ref",
          path,
          "Approval ref requires safe approval_ref, supported approval_type, and required: true.",
        ),
      );
      return;
    }
    result.push({
      approval_ref: approvalRef,
      approval_type: approvalType,
      required: true,
    });
  });
  return result;
}

function normalizeObservedStatus(
  value: unknown,
  errors: AdapterInvocationResultError[],
): AdapterInvocationObservedStatus {
  if (
    typeof value !== "string" ||
    !observedStatuses.has(value as AdapterInvocationObservedStatus)
  ) {
    errors.push(
      resultError(
        "adapter_invocation_result.invalid_observed_status",
        "/observed_status",
        "Adapter invocation result observed status is unsupported.",
      ),
    );
    return defaultAdapterInvocationResult.observed_status;
  }
  return value as AdapterInvocationObservedStatus;
}

function normalizeEvidenceRefs(
  value: unknown,
  basePath: "/output_evidence_refs" | "/error_evidence_refs",
  requiredCode: AdapterInvocationResultErrorCode,
  invalidCode: AdapterInvocationResultErrorCode,
  requiredMessage: string,
  errors: AdapterInvocationResultError[],
): AdapterInvocationResultEvidenceRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(resultError(requiredCode, basePath, requiredMessage));
    return [];
  }
  const result: AdapterInvocationResultEvidenceRefInput[] = [];
  value.forEach((item, index) => {
    const path = `${basePath}/${index}`;
    if (!isPlainObject(item)) {
      errors.push(resultError(invalidCode, path, "Evidence ref must be an object."));
      return;
    }
    for (const key of Object.keys(item)) {
      if (!evidenceRefKeys.has(key)) {
        errors.push(
          resultError(
            "adapter_invocation_result.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected evidence ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        resultError(
          containsSecret(item)
            ? "adapter_invocation_result.secret_value_forbidden"
            : "adapter_invocation_result.unsafe_result_authority",
          path,
          containsSecret(item)
            ? "Evidence refs cannot contain secret-like values."
            : "Evidence refs ask for unsafe result authority.",
        ),
      );
      return;
    }
    const evidenceRef =
      typeof item.evidence_ref === "string" && safeRef(item.evidence_ref)
        ? item.evidence_ref
        : null;
    const summary =
      typeof item.summary === "string" && safeString(item.summary)
        ? item.summary
        : null;
    if (evidenceRef === null || summary === null) {
      errors.push(
        resultError(
          invalidCode,
          path,
          "Evidence ref requires safe evidence_ref and summary.",
        ),
      );
      return;
    }
    result.push({ evidence_ref: evidenceRef, summary });
  });
  return result;
}

function normalizeSourceRefs(
  value: unknown,
  errors: AdapterInvocationResultError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      resultError(
        "adapter_invocation_result.source_ref_required",
        "/source_refs",
        "Adapter invocation result requires source refs.",
      ),
    );
    return [];
  }
  const result: string[] = [];
  value.forEach((item, index) => {
    const path = `/source_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_source_ref",
          path,
          "Source ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          resultError(
            "adapter_invocation_result.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected source ref field.",
          ),
        );
      }
    }
    if (containsSecret(item)) {
      errors.push(
        resultError(
          "adapter_invocation_result.secret_value_forbidden",
          path,
          "Source refs cannot contain secret-like values.",
        ),
      );
      return;
    }
    const sourceRef =
      typeof item.source_ref === "string" && safeRef(item.source_ref)
        ? item.source_ref
        : null;
    const summary =
      typeof item.summary === "string" && safeString(item.summary)
        ? item.summary
        : null;
    if (sourceRef === null || summary === null) {
      errors.push(
        resultError(
          "adapter_invocation_result.invalid_source_ref",
          path,
          "Source ref requires safe source_ref and summary.",
        ),
      );
      return;
    }
    result.push(`${sourceRef}: ${summary}`);
  });
  return uniqueStrings(result);
}

function normalizeSafeStrings(
  value: unknown,
  path: string,
  emptyMessage: string,
  invalidCode: AdapterInvocationResultErrorCode,
  errors: AdapterInvocationResultError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(resultError(invalidCode, path, emptyMessage));
    return [];
  }
  const result: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string" || !safeString(item)) {
      errors.push(
        resultError(
          invalidCode,
          `${path}/${index}`,
          "Adapter invocation result behavior text must be safe text.",
        ),
      );
      return;
    }
    result.push(item);
  });
  return uniqueStrings(result);
}

function normalizeRefStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is string => typeof item === "string" && safeRef(item),
  );
}

function requiresApproval(
  controlMode: SubstrateControlMode,
  riskLevel: number,
  adapterClass: CapabilityBrokerAdapterClass,
): boolean {
  return (
    controlMode === "approval_gated_mutation" ||
    riskLevel >= 4 ||
    adapterClass !== "no_adapter_dispatch"
  );
}

function failAdapterInvocationResult(
  errors: AdapterInvocationResultError[],
): AdapterInvocationResult {
  return {
    ok: false,
    adapter_invocation_result: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function resultError(
  code: AdapterInvocationResultErrorCode,
  path: string,
  message: string,
): AdapterInvocationResultError {
  return { code, path, message, severity: "error" };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: string): boolean {
  return (
    safeStringPattern.test(value) && !containsSecret(value) && !unsafeAuthority(value)
  );
}

function safeRef(value: string): boolean {
  return refPattern.test(value) && !containsSecret(value) && !unsafeAuthority(value);
}

function safeCapability(value: string): boolean {
  return (
    capabilityPattern.test(value) && !containsSecret(value) && !unsafeAuthority(value)
  );
}

function safePolicyGate(value: string): boolean {
  return (
    policyGatePattern.test(value) && !containsSecret(value) && !unsafeAuthority(value)
  );
}

function containsSecret(value: unknown): boolean {
  return secretLikePattern.test(JSON.stringify(value));
}

function unsafeAuthority(value: unknown): boolean {
  return unsafeAuthorityPattern.test(JSON.stringify(value));
}

function uniqueStrings<T extends string>(values: T[]): T[] {
  return [...new Set(values)].sort();
}

function dedupeErrors(
  errors: AdapterInvocationResultError[],
): AdapterInvocationResultError[] {
  const seen = new Set<string>();
  const result: AdapterInvocationResultError[] = [];
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
