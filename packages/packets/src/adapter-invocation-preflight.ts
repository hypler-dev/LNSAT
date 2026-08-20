import type { CapabilityBrokerAdapterClass } from "./capability-broker-request.js";
import {
  capabilityBrokerRequestContract,
  defaultCapabilityBrokerRequest,
} from "./capability-broker-request.js";
import type {
  SubstrateControlIntentActorInput,
  SubstrateControlIntentApprovalRefInput,
  SubstrateControlIntentAuditEventInput,
  SubstrateControlIntentPolicyGateInput,
  SubstrateControlIntentResultExpectationInput,
  SubstrateControlIntentRollbackExpectationInput,
} from "./substrate-control-intent.js";
import { substrateControlIntentContract } from "./substrate-control-intent.js";
import type {
  SubstrateAdapterManifestIdentityInput,
  SubstrateAdapterRequiredInputEvidenceRefInput,
} from "./substrate-adapter-manifest.js";
import {
  defaultSubstrateAdapterManifest,
  substrateAdapterManifestContract,
} from "./substrate-adapter-manifest.js";
import type { SubstrateControlMode, SubstrateKind } from "./substrate-taxonomy.js";

export const ADAPTER_INVOCATION_PREFLIGHT_STATUS = "source_only";

export const adapterInvocationPreflightContract = {
  contract_id: "lnsat.platform.adapter_invocation_preflight.v0_1",
  authority: ["@lnsat/packets", "source-backed-adapter-invocation-preflight"],
  preflight_version: "0.1",
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
  adapter_authority: "preflight_only_no_invocation",
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type AdapterInvocationPreflightIdentityInput = {
  preflight_ref: string;
  preflight_name: string;
  owner_ref: string;
};

export type AdapterInvocationPreflightBrokerRequestRefInput = {
  request_ref: string;
  evidence_ref: string;
  contract_id: typeof capabilityBrokerRequestContract.contract_id;
  summary: string;
};

export type AdapterInvocationPreflightManifestRefInput = {
  manifest_ref: string;
  evidence_ref: string;
  contract_id: typeof substrateAdapterManifestContract.contract_id;
  summary: string;
};

export type AdapterInvocationPreflightInputEvidenceRefInput = {
  evidence_ref: string;
  contract_id:
    | typeof substrateControlIntentContract.contract_id
    | typeof capabilityBrokerRequestContract.contract_id
    | typeof substrateAdapterManifestContract.contract_id;
  summary: string;
};

export type AdapterInvocationPreflightSourceInput = {
  source_ref: string;
  summary: string;
};

export type AdapterInvocationPreflightRequest = {
  preflight_version?: typeof adapterInvocationPreflightContract.preflight_version;
  preflight_identity?: AdapterInvocationPreflightIdentityInput;
  requested_actor?: SubstrateControlIntentActorInput;
  capability?: string;
  risk_level?: number;
  target_substrate_kind?: SubstrateKind;
  requested_control_mode?: SubstrateControlMode;
  substrate_control_intent_refs?: typeof defaultCapabilityBrokerRequest.substrate_control_intent_refs;
  capability_broker_request_refs?: AdapterInvocationPreflightBrokerRequestRefInput[];
  substrate_adapter_manifest_refs?: AdapterInvocationPreflightManifestRefInput[];
  adapter_identity?: SubstrateAdapterManifestIdentityInput;
  adapter_class?: CapabilityBrokerAdapterClass;
  required_input_evidence_refs?: AdapterInvocationPreflightInputEvidenceRefInput[];
  source_refs?: AdapterInvocationPreflightSourceInput[];
  policy_gate_refs?: SubstrateControlIntentPolicyGateInput[];
  approval_refs?: SubstrateControlIntentApprovalRefInput[];
  audit_event_plan?: SubstrateControlIntentAuditEventInput[];
  result_expectations?: SubstrateControlIntentResultExpectationInput;
  rollback_expectations?: SubstrateControlIntentRollbackExpectationInput[];
  denied_adapter_behavior?: string[];
  denied_live_behavior?: string[];
  live_adapter_invocation_allowed?: false;
  live_broker_dispatch_allowed?: false;
  live_execution_allowed?: false;
  side_effects?: [];
};

export type AdapterInvocationPreflightErrorCode =
  | "adapter_invocation_preflight.invalid_request"
  | "adapter_invocation_preflight.unexpected_field"
  | "adapter_invocation_preflight.invalid_version"
  | "adapter_invocation_preflight.invalid_preflight_identity"
  | "adapter_invocation_preflight.invalid_actor"
  | "adapter_invocation_preflight.invalid_capability"
  | "adapter_invocation_preflight.invalid_risk_level"
  | "adapter_invocation_preflight.invalid_substrate_kind"
  | "adapter_invocation_preflight.invalid_control_mode"
  | "adapter_invocation_preflight.substrate_control_intent_ref_required"
  | "adapter_invocation_preflight.invalid_substrate_control_intent_ref"
  | "adapter_invocation_preflight.broker_request_ref_required"
  | "adapter_invocation_preflight.invalid_broker_request_ref"
  | "adapter_invocation_preflight.adapter_manifest_ref_required"
  | "adapter_invocation_preflight.invalid_adapter_manifest_ref"
  | "adapter_invocation_preflight.invalid_adapter_identity"
  | "adapter_invocation_preflight.invalid_adapter_class"
  | "adapter_invocation_preflight.input_evidence_required"
  | "adapter_invocation_preflight.invalid_input_evidence_ref"
  | "adapter_invocation_preflight.source_ref_required"
  | "adapter_invocation_preflight.invalid_source_ref"
  | "adapter_invocation_preflight.policy_gate_required"
  | "adapter_invocation_preflight.invalid_policy_gate"
  | "adapter_invocation_preflight.approval_required"
  | "adapter_invocation_preflight.invalid_approval_ref"
  | "adapter_invocation_preflight.audit_event_required"
  | "adapter_invocation_preflight.invalid_audit_event"
  | "adapter_invocation_preflight.result_expectation_required"
  | "adapter_invocation_preflight.invalid_result_expectation"
  | "adapter_invocation_preflight.rollback_expectation_required"
  | "adapter_invocation_preflight.invalid_rollback_expectation"
  | "adapter_invocation_preflight.denied_adapter_behavior_required"
  | "adapter_invocation_preflight.invalid_denied_adapter_behavior"
  | "adapter_invocation_preflight.denied_live_behavior_required"
  | "adapter_invocation_preflight.invalid_denied_live_behavior"
  | "adapter_invocation_preflight.unsafe_adapter_authority"
  | "adapter_invocation_preflight.secret_value_forbidden"
  | "adapter_invocation_preflight.live_adapter_invocation_forbidden"
  | "adapter_invocation_preflight.live_broker_dispatch_forbidden"
  | "adapter_invocation_preflight.live_execution_forbidden"
  | "adapter_invocation_preflight.side_effects_forbidden";

export type AdapterInvocationPreflightError = {
  code: AdapterInvocationPreflightErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AdapterInvocationPreflightEvidence = {
  contract_id: typeof adapterInvocationPreflightContract.contract_id;
  preflight_version: typeof adapterInvocationPreflightContract.preflight_version;
  preflight_identity: AdapterInvocationPreflightIdentityInput;
  requested_actor: SubstrateControlIntentActorInput;
  capability: string;
  risk_level: number;
  target_substrate_kind: SubstrateKind;
  requested_control_mode: SubstrateControlMode;
  substrate_control_intent_refs: typeof defaultCapabilityBrokerRequest.substrate_control_intent_refs;
  capability_broker_request_refs: AdapterInvocationPreflightBrokerRequestRefInput[];
  substrate_adapter_manifest_refs: AdapterInvocationPreflightManifestRefInput[];
  adapter_identity: SubstrateAdapterManifestIdentityInput;
  adapter_class: CapabilityBrokerAdapterClass;
  required_input_evidence_refs: AdapterInvocationPreflightInputEvidenceRefInput[];
  required_policy_gates: string[];
  policy_gate_refs: SubstrateControlIntentPolicyGateInput[];
  required_approvals: string[];
  approval_refs: SubstrateControlIntentApprovalRefInput[];
  audit_event_plan: SubstrateControlIntentAuditEventInput[];
  required_audit_events: string[];
  result_expectations: SubstrateControlIntentResultExpectationInput;
  rollback_expectations: SubstrateControlIntentRollbackExpectationInput[];
  denied_adapter_behavior: string[];
  denied_live_behavior: string[];
  source_refs: string[];
  adapter_authority: typeof adapterInvocationPreflightContract.adapter_authority;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type AdapterInvocationPreflightResult =
  | {
      ok: true;
      adapter_invocation_preflight: AdapterInvocationPreflightEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      adapter_invocation_preflight: null;
      errors: AdapterInvocationPreflightError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedAdapterInvocationPreflight =
  | {
      ok: true;
      preflight: Omit<
        AdapterInvocationPreflightEvidence,
        "contract_id" | "preflight_version" | "side_effects"
      >;
    }
  | {
      ok: false;
      errors: AdapterInvocationPreflightError[];
    };

const requestKeys = new Set([
  "preflight_version",
  "preflight_identity",
  "requested_actor",
  "capability",
  "risk_level",
  "target_substrate_kind",
  "requested_control_mode",
  "substrate_control_intent_refs",
  "capability_broker_request_refs",
  "substrate_adapter_manifest_refs",
  "adapter_identity",
  "adapter_class",
  "required_input_evidence_refs",
  "source_refs",
  "policy_gate_refs",
  "approval_refs",
  "audit_event_plan",
  "result_expectations",
  "rollback_expectations",
  "denied_adapter_behavior",
  "denied_live_behavior",
  "live_adapter_invocation_allowed",
  "live_broker_dispatch_allowed",
  "live_execution_allowed",
  "side_effects",
]);
const identityKeys = new Set(["preflight_ref", "preflight_name", "owner_ref"]);
const actorKeys = new Set(["actor_ref", "actor_type", "role_ref"]);
const evidenceRefKeys = new Set(["evidence_ref", "contract_id", "summary"]);
const brokerRequestRefKeys = new Set([
  "request_ref",
  "evidence_ref",
  "contract_id",
  "summary",
]);
const manifestRefKeys = new Set([
  "manifest_ref",
  "evidence_ref",
  "contract_id",
  "summary",
]);
const adapterIdentityKeys = new Set(["adapter_ref", "adapter_name", "owner_ref"]);
const sourceKeys = new Set(["source_ref", "summary"]);
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
const supportedInputContractIds: ReadonlySet<string> = new Set([
  substrateControlIntentContract.contract_id,
  capabilityBrokerRequestContract.contract_id,
  substrateAdapterManifestContract.contract_id,
]);

const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const refPattern = /^[a-z][a-z0-9_-]*:[\w./:@#_-]{3,180}$/;
const capabilityPattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,6}$/;
const policyGatePattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,7}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|API_KEY|SECRET=|TOKEN=|PASSWORD|PRIVATE KEY|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]|AKIA[A-Z0-9]|secret:)/i;
const unsafeAuthorityPattern =
  /\b(root|sudo|shell|ssh\.raw|secret\.read|credential\.read|write\.execute|delete\.execute|drop|destroy\.execute|restart\.execute|deploy\.execute|dns\.write|cloudflare\.write|database\.write|db\.write|queue\.purge|docker\.socket|docker_socket|privileged|unrestricted|node_agent\.exec|rm -rf|live_dispatch|dispatch\.execute|adapter\.invoke|adapter_invocation|broker\.dispatch|invoke\.execute|runtime\.execution)\b/i;

const defaultDeniedAdapterBehavior = [
  "preflight classifies adapter invocation only",
  "preflight does not instantiate adapter",
  "preflight does not invoke substrate control",
  "preflight requires manifest and broker evidence before future use",
  "preflight fails closed without policy and approval evidence",
];

export const defaultAdapterInvocationPreflight: AdapterInvocationPreflightEvidence = {
  contract_id: adapterInvocationPreflightContract.contract_id,
  preflight_version: adapterInvocationPreflightContract.preflight_version,
  preflight_identity: {
    preflight_ref: "preflight:service-control-adapter-invocation",
    preflight_name: "Service control adapter invocation preflight",
    owner_ref: "owner:lnsat-platform",
  },
  requested_actor: defaultCapabilityBrokerRequest.requested_actor,
  capability: defaultCapabilityBrokerRequest.capability,
  risk_level: defaultCapabilityBrokerRequest.risk_level,
  target_substrate_kind: defaultCapabilityBrokerRequest.target_substrate_kind,
  requested_control_mode: defaultCapabilityBrokerRequest.requested_control_mode,
  substrate_control_intent_refs:
    defaultCapabilityBrokerRequest.substrate_control_intent_refs,
  capability_broker_request_refs: [
    {
      request_ref: "request:bp0102-capability-broker-request",
      evidence_ref: "evidence:bp0102-capability-broker-request",
      contract_id: capabilityBrokerRequestContract.contract_id,
      summary: "BP-0102 source-only capability broker request evidence",
    },
  ],
  substrate_adapter_manifest_refs: [
    {
      manifest_ref: "manifest:bp0108-substrate-adapter-manifest",
      evidence_ref: "evidence:bp0108-substrate-adapter-manifest",
      contract_id: substrateAdapterManifestContract.contract_id,
      summary: "BP-0108 source-only substrate adapter manifest evidence",
    },
  ],
  adapter_identity: defaultSubstrateAdapterManifest.adapter_identity,
  adapter_class: defaultSubstrateAdapterManifest.adapter_class,
  required_input_evidence_refs: [
    {
      evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
      contract_id: substrateControlIntentContract.contract_id,
      summary: "BP-0096 substrate control intent evidence required before preflight",
    },
    {
      evidence_ref: "evidence:bp0102-capability-broker-request",
      contract_id: capabilityBrokerRequestContract.contract_id,
      summary: "BP-0102 broker request evidence required before preflight",
    },
    {
      evidence_ref: "evidence:bp0108-substrate-adapter-manifest",
      contract_id: substrateAdapterManifestContract.contract_id,
      summary: "BP-0108 adapter manifest evidence required before preflight",
    },
  ],
  required_policy_gates: [
    "substrate.adapter.invocation.preflight.review",
    ...defaultSubstrateAdapterManifest.required_policy_gates,
  ].sort(),
  policy_gate_refs: [
    {
      gate_ref: "substrate.adapter.invocation.preflight.review",
      decision_ref: "policy_decision:adapter-invocation-preflight-source-only",
      required: true,
    },
    ...defaultSubstrateAdapterManifest.policy_gate_refs,
  ],
  required_approvals: defaultSubstrateAdapterManifest.required_approvals,
  approval_refs: defaultSubstrateAdapterManifest.approval_refs,
  audit_event_plan: defaultSubstrateAdapterManifest.audit_event_plan,
  required_audit_events: defaultSubstrateAdapterManifest.required_audit_events,
  result_expectations: {
    result_packet_ref: "result_packet:adapter-invocation-preflight",
    expected_statuses: ["approved", "denied", "completed", "failed", "rolled_back"],
    artifact_refs: ["artifact:operator-visible-adapter-preflight-evidence"],
    operator_visible_summary:
      "operator can inspect preflight identity, actor, capability, substrate intent, broker request, adapter manifest, input evidence, policy, approval, audit, result, rollback, and denied invocation behavior before any live adapter exists",
  },
  rollback_expectations: [
    {
      rollback_ref: "rollback:adapter-invocation-preflight-review",
      required_for_risk_level_at_or_above: 4,
      owner_ref: "owner:lnsat-platform",
      evidence_refs: [
        "doc:docs/architecture/POLICY_AND_AUDIT.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
      ],
    },
  ],
  denied_adapter_behavior: defaultDeniedAdapterBehavior,
  denied_live_behavior: [
    ...defaultSubstrateAdapterManifest.denied_live_behavior,
    "no adapter invocation from preflight",
  ],
  source_refs: [
    "doc:docs/architecture/PACKET_MODEL.md",
    "doc:docs/architecture/POLICY_AND_AUDIT.md",
    "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
    "doc:docs/reference/CONTRACT_PROVENANCE.md",
    "ticket:BP-0114: source-only adapter invocation preflight contract",
  ],
  adapter_authority: adapterInvocationPreflightContract.adapter_authority,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
};

export function createAdapterInvocationPreflight(
  input: unknown = {},
): AdapterInvocationPreflightResult {
  const normalized = normalizeAdapterInvocationPreflight(input);

  if (!normalized.ok) {
    return failAdapterInvocationPreflight(normalized.errors);
  }

  return {
    ok: true,
    adapter_invocation_preflight: {
      contract_id: adapterInvocationPreflightContract.contract_id,
      preflight_version: adapterInvocationPreflightContract.preflight_version,
      ...normalized.preflight,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeAdapterInvocationPreflight(
  input: unknown,
): NormalizedAdapterInvocationPreflight {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        preflightError(
          "adapter_invocation_preflight.invalid_request",
          "",
          "Adapter invocation preflight request must be an object.",
        ),
      ],
    };
  }

  const errors: AdapterInvocationPreflightError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.unexpected_field",
          jsonPointer(key),
          "Unexpected adapter invocation preflight field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "preflight_version") &&
    input.preflight_version !== adapterInvocationPreflightContract.preflight_version
  ) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.invalid_version",
        "/preflight_version",
        "Adapter invocation preflight version is unsupported.",
      ),
    );
  }

  const preflightIdentity = Object.hasOwn(input, "preflight_identity")
    ? normalizePreflightIdentity(input.preflight_identity, errors)
    : defaultAdapterInvocationPreflight.preflight_identity;
  const requestedActor = Object.hasOwn(input, "requested_actor")
    ? normalizeActor(input.requested_actor, errors)
    : defaultAdapterInvocationPreflight.requested_actor;
  const capability = Object.hasOwn(input, "capability")
    ? normalizeCapability(input.capability, errors)
    : defaultAdapterInvocationPreflight.capability;
  const riskLevel = Object.hasOwn(input, "risk_level")
    ? normalizeRiskLevel(input.risk_level, errors)
    : defaultAdapterInvocationPreflight.risk_level;
  const substrateKind = Object.hasOwn(input, "target_substrate_kind")
    ? normalizeSubstrateKind(input.target_substrate_kind, errors)
    : defaultAdapterInvocationPreflight.target_substrate_kind;
  const controlMode = Object.hasOwn(input, "requested_control_mode")
    ? normalizeControlMode(input.requested_control_mode, errors)
    : defaultAdapterInvocationPreflight.requested_control_mode;
  const substrateIntentRefs = Object.hasOwn(input, "substrate_control_intent_refs")
    ? normalizeSubstrateIntentRefs(input.substrate_control_intent_refs, errors)
    : [...defaultAdapterInvocationPreflight.substrate_control_intent_refs];
  const brokerRequestRefs = Object.hasOwn(input, "capability_broker_request_refs")
    ? normalizeBrokerRequestRefs(input.capability_broker_request_refs, errors)
    : [...defaultAdapterInvocationPreflight.capability_broker_request_refs];
  const manifestRefs = Object.hasOwn(input, "substrate_adapter_manifest_refs")
    ? normalizeManifestRefs(input.substrate_adapter_manifest_refs, errors)
    : [...defaultAdapterInvocationPreflight.substrate_adapter_manifest_refs];
  const adapterIdentity = Object.hasOwn(input, "adapter_identity")
    ? normalizeAdapterIdentity(input.adapter_identity, errors)
    : defaultAdapterInvocationPreflight.adapter_identity;
  const adapterClass = Object.hasOwn(input, "adapter_class")
    ? normalizeAdapterClass(input.adapter_class, errors)
    : defaultAdapterInvocationPreflight.adapter_class;
  const inputEvidenceRefs = Object.hasOwn(input, "required_input_evidence_refs")
    ? normalizeInputEvidenceRefs(input.required_input_evidence_refs, errors)
    : [...defaultAdapterInvocationPreflight.required_input_evidence_refs];
  const sourceRefs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, errors)
    : [...defaultAdapterInvocationPreflight.source_refs];
  const policyGateRefs = Object.hasOwn(input, "policy_gate_refs")
    ? normalizePolicyGateRefs(input.policy_gate_refs, errors)
    : [...defaultAdapterInvocationPreflight.policy_gate_refs];
  const approvalRefs = Object.hasOwn(input, "approval_refs")
    ? normalizeApprovalRefs(input.approval_refs, errors)
    : [...defaultAdapterInvocationPreflight.approval_refs];
  const auditEventPlan = Object.hasOwn(input, "audit_event_plan")
    ? normalizeAuditEventPlan(input.audit_event_plan, errors)
    : [...defaultAdapterInvocationPreflight.audit_event_plan];
  const resultExpectations = Object.hasOwn(input, "result_expectations")
    ? normalizeResultExpectations(input.result_expectations, errors)
    : defaultAdapterInvocationPreflight.result_expectations;
  const rollbackExpectations = Object.hasOwn(input, "rollback_expectations")
    ? normalizeRollbackExpectations(input.rollback_expectations, errors)
    : [...defaultAdapterInvocationPreflight.rollback_expectations];
  const deniedAdapterBehavior = Object.hasOwn(input, "denied_adapter_behavior")
    ? normalizeSafeStrings(
        input.denied_adapter_behavior,
        "/denied_adapter_behavior",
        "Adapter invocation preflight requires denied adapter behavior.",
        "adapter_invocation_preflight.invalid_denied_adapter_behavior",
        errors,
      )
    : [...defaultAdapterInvocationPreflight.denied_adapter_behavior];
  const deniedLiveBehavior = Object.hasOwn(input, "denied_live_behavior")
    ? normalizeSafeStrings(
        input.denied_live_behavior,
        "/denied_live_behavior",
        "Adapter invocation preflight requires denied live behavior.",
        "adapter_invocation_preflight.invalid_denied_live_behavior",
        errors,
      )
    : [...defaultAdapterInvocationPreflight.denied_live_behavior];

  if (
    Object.hasOwn(input, "live_adapter_invocation_allowed") &&
    input.live_adapter_invocation_allowed !== false
  ) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.live_adapter_invocation_forbidden",
        "/live_adapter_invocation_allowed",
        "Adapter invocation preflight cannot enable live adapter invocation.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_broker_dispatch_allowed") &&
    input.live_broker_dispatch_allowed !== false
  ) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.live_broker_dispatch_forbidden",
        "/live_broker_dispatch_allowed",
        "Adapter invocation preflight cannot enable live broker dispatch.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_execution_allowed") &&
    input.live_execution_allowed !== false
  ) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.live_execution_forbidden",
        "/live_execution_allowed",
        "Adapter invocation preflight cannot enable live execution.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.side_effects_forbidden",
        "/side_effects",
        "Adapter invocation preflight must preserve side_effects: [].",
      ),
    );
  }

  if (substrateIntentRefs.length === 0) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.substrate_control_intent_ref_required",
        "/substrate_control_intent_refs",
        "Adapter invocation preflight requires substrate control intent refs.",
      ),
    );
  }
  if (brokerRequestRefs.length === 0) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.broker_request_ref_required",
        "/capability_broker_request_refs",
        "Adapter invocation preflight requires capability broker request refs.",
      ),
    );
  }
  if (manifestRefs.length === 0) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.adapter_manifest_ref_required",
        "/substrate_adapter_manifest_refs",
        "Adapter invocation preflight requires substrate adapter manifest refs.",
      ),
    );
  }
  if (inputEvidenceRefs.length === 0) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.input_evidence_required",
        "/required_input_evidence_refs",
        "Adapter invocation preflight requires input evidence refs.",
      ),
    );
  }
  if (sourceRefs.length === 0) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.source_ref_required",
        "/source_refs",
        "Adapter invocation preflight requires source refs.",
      ),
    );
  }
  if (policyGateRefs.length === 0) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.policy_gate_required",
        "/policy_gate_refs",
        "Adapter invocation preflight requires policy gate refs.",
      ),
    );
  }
  if (
    requiresApproval(controlMode, riskLevel, adapterClass) &&
    approvalRefs.length === 0
  ) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.approval_required",
        "/approval_refs",
        "Approval-gated or risky adapter invocation preflight requires approval refs.",
      ),
    );
  }

  const requiredAuditEvents = uniqueStrings(
    auditEventPlan.map((event) => event.event_type),
  );
  for (const eventType of defaultAdapterInvocationPreflight.required_audit_events as SubstrateControlIntentAuditEventInput["event_type"][]) {
    if (!requiredAuditEvents.includes(eventType)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.audit_event_required",
          `/audit_event_plan/${eventType}`,
          `Adapter invocation preflight requires ${eventType} audit event.`,
        ),
      );
    }
  }

  if (
    requiresRollback(controlMode, riskLevel, adapterClass) &&
    rollbackExpectations.length === 0
  ) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.rollback_expectation_required",
        "/rollback_expectations",
        "Risky adapter invocation preflight requires rollback expectations.",
      ),
    );
  }
  if (deniedAdapterBehavior.length === 0) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.denied_adapter_behavior_required",
        "/denied_adapter_behavior",
        "Adapter invocation preflight requires denied adapter behavior.",
      ),
    );
  }
  if (deniedLiveBehavior.length === 0) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.denied_live_behavior_required",
        "/denied_live_behavior",
        "Adapter invocation preflight requires denied live behavior.",
      ),
    );
  }
  if (controlMode === "forbidden_mutation") {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.unsafe_adapter_authority",
        "/requested_control_mode",
        "Forbidden mutation cannot be preflighted for adapter invocation.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    preflight: {
      preflight_identity: preflightIdentity,
      requested_actor: requestedActor,
      capability,
      risk_level: riskLevel,
      target_substrate_kind: substrateKind,
      requested_control_mode: controlMode,
      substrate_control_intent_refs: substrateIntentRefs,
      capability_broker_request_refs: brokerRequestRefs,
      substrate_adapter_manifest_refs: manifestRefs,
      adapter_identity: adapterIdentity,
      adapter_class: adapterClass,
      required_input_evidence_refs: inputEvidenceRefs,
      required_policy_gates: uniqueStrings([
        "substrate.adapter.invocation.preflight.review",
        ...policyGateRefs.map((gate) => gate.gate_ref),
      ]),
      policy_gate_refs: policyGateRefs,
      required_approvals: uniqueStrings(approvalRefs.map((ref) => ref.approval_ref)),
      approval_refs: approvalRefs,
      audit_event_plan: auditEventPlan,
      required_audit_events: requiredAuditEvents,
      result_expectations: resultExpectations,
      rollback_expectations: rollbackExpectations,
      denied_adapter_behavior: uniqueStrings(deniedAdapterBehavior),
      denied_live_behavior: uniqueStrings(deniedLiveBehavior),
      source_refs: sourceRefs,
      adapter_authority: adapterInvocationPreflightContract.adapter_authority,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
    },
  };
}

function normalizePreflightIdentity(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): AdapterInvocationPreflightIdentityInput {
  if (!isPlainObject(value)) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.invalid_preflight_identity",
        "/preflight_identity",
        "Adapter invocation preflight requires preflight identity.",
      ),
    );
    return defaultAdapterInvocationPreflight.preflight_identity;
  }
  for (const key of Object.keys(value)) {
    if (!identityKeys.has(key)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.unexpected_field",
          `/preflight_identity/${escapeJsonPointerSegment(key)}`,
          "Unexpected preflight identity field.",
        ),
      );
    }
  }
  const preflightRef =
    typeof value.preflight_ref === "string" && safeRef(value.preflight_ref)
      ? value.preflight_ref
      : null;
  const preflightName =
    typeof value.preflight_name === "string" && safeString(value.preflight_name)
      ? value.preflight_name
      : null;
  const ownerRef =
    typeof value.owner_ref === "string" && safeRef(value.owner_ref)
      ? value.owner_ref
      : null;

  if (preflightRef === null || preflightName === null || ownerRef === null) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.invalid_preflight_identity",
        "/preflight_identity",
        "Preflight identity requires safe preflight_ref, preflight_name, and owner_ref.",
      ),
    );
  }
  return {
    preflight_ref:
      preflightRef ??
      defaultAdapterInvocationPreflight.preflight_identity.preflight_ref,
    preflight_name:
      preflightName ??
      defaultAdapterInvocationPreflight.preflight_identity.preflight_name,
    owner_ref:
      ownerRef ?? defaultAdapterInvocationPreflight.preflight_identity.owner_ref,
  };
}

function normalizeActor(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): SubstrateControlIntentActorInput {
  if (!isPlainObject(value)) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.invalid_actor",
        "/requested_actor",
        "Adapter invocation preflight requires requested actor.",
      ),
    );
    return defaultAdapterInvocationPreflight.requested_actor;
  }
  for (const key of Object.keys(value)) {
    if (!actorKeys.has(key)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.unexpected_field",
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
      preflightError(
        "adapter_invocation_preflight.invalid_actor",
        "/requested_actor",
        "Requested actor requires safe actor_ref, actor_type, and role_ref.",
      ),
    );
  }
  return {
    actor_ref: actorRef ?? defaultAdapterInvocationPreflight.requested_actor.actor_ref,
    actor_type:
      actorType ?? defaultAdapterInvocationPreflight.requested_actor.actor_type,
    role_ref: roleRef ?? defaultAdapterInvocationPreflight.requested_actor.role_ref,
  };
}

function normalizeCapability(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): string {
  if (typeof value !== "string" || !safeCapability(value)) {
    errors.push(
      preflightError(
        unsafeAuthority(value)
          ? "adapter_invocation_preflight.unsafe_adapter_authority"
          : "adapter_invocation_preflight.invalid_capability",
        "/capability",
        unsafeAuthority(value)
          ? "Adapter invocation preflight capability asks for unsafe authority."
          : "Adapter invocation preflight capability must be safe dotted capability text.",
      ),
    );
    return defaultAdapterInvocationPreflight.capability;
  }
  return value;
}

function normalizeRiskLevel(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 8) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.invalid_risk_level",
        "/risk_level",
        "Adapter invocation preflight risk level must be an integer from 0 to 8.",
      ),
    );
    return defaultAdapterInvocationPreflight.risk_level;
  }
  return value;
}

function normalizeSubstrateKind(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): SubstrateKind {
  if (typeof value !== "string" || !substrateKinds.has(value as SubstrateKind)) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.invalid_substrate_kind",
        "/target_substrate_kind",
        "Adapter invocation preflight target substrate kind is unsupported.",
      ),
    );
    return defaultAdapterInvocationPreflight.target_substrate_kind;
  }
  return value as SubstrateKind;
}

function normalizeControlMode(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): SubstrateControlMode {
  if (typeof value !== "string" || !controlModes.has(value as SubstrateControlMode)) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.invalid_control_mode",
        "/requested_control_mode",
        "Adapter invocation preflight control mode is unsupported.",
      ),
    );
    return defaultAdapterInvocationPreflight.requested_control_mode;
  }
  return value as SubstrateControlMode;
}

function normalizeSubstrateIntentRefs(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): AdapterInvocationPreflightEvidence["substrate_control_intent_refs"] {
  if (!Array.isArray(value)) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.substrate_control_intent_ref_required",
        "/substrate_control_intent_refs",
        "Adapter invocation preflight requires substrate control intent refs.",
      ),
    );
    return [];
  }
  const result: AdapterInvocationPreflightEvidence["substrate_control_intent_refs"] =
    [];
  value.forEach((item, index) => {
    const path = `/substrate_control_intent_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.invalid_substrate_control_intent_ref",
          path,
          "Substrate control intent ref must be an object.",
        ),
      );
      return;
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        preflightError(
          containsSecret(item)
            ? "adapter_invocation_preflight.secret_value_forbidden"
            : "adapter_invocation_preflight.unsafe_adapter_authority",
          path,
          containsSecret(item)
            ? "Substrate control intent refs cannot contain secret-like values."
            : "Substrate control intent refs ask for unsafe adapter authority.",
        ),
      );
      return;
    }
    const intentRef =
      typeof item.intent_ref === "string" && safeRef(item.intent_ref)
        ? item.intent_ref
        : null;
    const evidenceRef =
      typeof item.evidence_ref === "string" && safeRef(item.evidence_ref)
        ? item.evidence_ref
        : null;
    const contractId =
      item.contract_id === substrateControlIntentContract.contract_id
        ? substrateControlIntentContract.contract_id
        : null;
    const summary =
      typeof item.summary === "string" && safeString(item.summary)
        ? item.summary
        : null;
    if (
      intentRef === null ||
      evidenceRef === null ||
      contractId === null ||
      summary === null
    ) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.invalid_substrate_control_intent_ref",
          path,
          "Substrate control intent ref requires safe refs, supported contract_id, and summary.",
        ),
      );
      return;
    }
    result.push({
      intent_ref: intentRef,
      evidence_ref: evidenceRef,
      contract_id: contractId,
      summary,
    });
  });
  return result;
}

function normalizeBrokerRequestRefs(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): AdapterInvocationPreflightBrokerRequestRefInput[] {
  return normalizeRefObjects(
    value,
    "/capability_broker_request_refs",
    brokerRequestRefKeys,
    capabilityBrokerRequestContract.contract_id,
    "request_ref",
    "adapter_invocation_preflight.broker_request_ref_required",
    "adapter_invocation_preflight.invalid_broker_request_ref",
    "Adapter invocation preflight requires capability broker request refs.",
    errors,
  ) as AdapterInvocationPreflightBrokerRequestRefInput[];
}

function normalizeManifestRefs(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): AdapterInvocationPreflightManifestRefInput[] {
  return normalizeRefObjects(
    value,
    "/substrate_adapter_manifest_refs",
    manifestRefKeys,
    substrateAdapterManifestContract.contract_id,
    "manifest_ref",
    "adapter_invocation_preflight.adapter_manifest_ref_required",
    "adapter_invocation_preflight.invalid_adapter_manifest_ref",
    "Adapter invocation preflight requires substrate adapter manifest refs.",
    errors,
  ) as AdapterInvocationPreflightManifestRefInput[];
}

function normalizeRefObjects(
  value: unknown,
  basePath: string,
  allowedKeys: Set<string>,
  contractId: string,
  refKey: "request_ref" | "manifest_ref",
  requiredCode: AdapterInvocationPreflightErrorCode,
  invalidCode: AdapterInvocationPreflightErrorCode,
  requiredMessage: string,
  errors: AdapterInvocationPreflightError[],
): unknown[] {
  if (!Array.isArray(value)) {
    errors.push(preflightError(requiredCode, basePath, requiredMessage));
    return [];
  }
  const result: unknown[] = [];
  value.forEach((item, index) => {
    const path = `${basePath}/${index}`;
    if (!isPlainObject(item)) {
      errors.push(preflightError(invalidCode, path, "Reference must be an object."));
      return;
    }
    for (const key of Object.keys(item)) {
      if (!allowedKeys.has(key)) {
        errors.push(
          preflightError(
            "adapter_invocation_preflight.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected reference field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        preflightError(
          containsSecret(item)
            ? "adapter_invocation_preflight.secret_value_forbidden"
            : "adapter_invocation_preflight.unsafe_adapter_authority",
          path,
          containsSecret(item)
            ? "Reference cannot contain secret-like values."
            : "Reference asks for unsafe adapter authority.",
        ),
      );
      return;
    }
    const primaryRef = item[refKey];
    const safePrimaryRef =
      typeof primaryRef === "string" && safeRef(primaryRef) ? primaryRef : null;
    const evidenceRef =
      typeof item.evidence_ref === "string" && safeRef(item.evidence_ref)
        ? item.evidence_ref
        : null;
    const summary =
      typeof item.summary === "string" && safeString(item.summary)
        ? item.summary
        : null;
    if (
      safePrimaryRef === null ||
      evidenceRef === null ||
      item.contract_id !== contractId ||
      summary === null
    ) {
      errors.push(
        preflightError(
          invalidCode,
          path,
          "Reference requires safe refs, supported contract_id, and summary.",
        ),
      );
      return;
    }
    result.push({
      [refKey]: safePrimaryRef,
      evidence_ref: evidenceRef,
      contract_id: contractId,
      summary,
    });
  });
  return result;
}

function normalizeAdapterIdentity(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): SubstrateAdapterManifestIdentityInput {
  if (!isPlainObject(value)) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.invalid_adapter_identity",
        "/adapter_identity",
        "Adapter invocation preflight requires adapter identity.",
      ),
    );
    return defaultAdapterInvocationPreflight.adapter_identity;
  }
  for (const key of Object.keys(value)) {
    if (!adapterIdentityKeys.has(key)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.unexpected_field",
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
      preflightError(
        "adapter_invocation_preflight.invalid_adapter_identity",
        "/adapter_identity",
        "Adapter identity requires safe adapter_ref, adapter_name, and owner_ref.",
      ),
    );
  }
  return {
    adapter_ref:
      adapterRef ?? defaultAdapterInvocationPreflight.adapter_identity.adapter_ref,
    adapter_name:
      adapterName ?? defaultAdapterInvocationPreflight.adapter_identity.adapter_name,
    owner_ref: ownerRef ?? defaultAdapterInvocationPreflight.adapter_identity.owner_ref,
  };
}

function normalizeAdapterClass(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): CapabilityBrokerAdapterClass {
  if (
    typeof value !== "string" ||
    !adapterClasses.has(value as CapabilityBrokerAdapterClass)
  ) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.invalid_adapter_class",
        "/adapter_class",
        "Adapter invocation preflight adapter class is unsupported.",
      ),
    );
    if (unsafeAuthority(value)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.unsafe_adapter_authority",
          "/adapter_class",
          "Adapter invocation preflight adapter class asks for unsafe authority.",
        ),
      );
    }
    return defaultAdapterInvocationPreflight.adapter_class;
  }
  return value as CapabilityBrokerAdapterClass;
}

function normalizeInputEvidenceRefs(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): AdapterInvocationPreflightInputEvidenceRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.input_evidence_required",
        "/required_input_evidence_refs",
        "Adapter invocation preflight requires input evidence refs.",
      ),
    );
    return [];
  }
  const result: AdapterInvocationPreflightInputEvidenceRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/required_input_evidence_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.invalid_input_evidence_ref",
          path,
          "Input evidence ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!evidenceRefKeys.has(key)) {
        errors.push(
          preflightError(
            "adapter_invocation_preflight.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected input evidence ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        preflightError(
          containsSecret(item)
            ? "adapter_invocation_preflight.secret_value_forbidden"
            : "adapter_invocation_preflight.unsafe_adapter_authority",
          path,
          containsSecret(item)
            ? "Input evidence refs cannot contain secret-like values."
            : "Input evidence refs ask for unsafe adapter authority.",
        ),
      );
      return;
    }
    const evidenceRef =
      typeof item.evidence_ref === "string" && safeRef(item.evidence_ref)
        ? item.evidence_ref
        : null;
    const contractId =
      typeof item.contract_id === "string" &&
      supportedInputContractIds.has(item.contract_id)
        ? item.contract_id
        : null;
    const summary =
      typeof item.summary === "string" && safeString(item.summary)
        ? item.summary
        : null;
    if (evidenceRef === null || contractId === null || summary === null) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.invalid_input_evidence_ref",
          path,
          "Input evidence ref requires safe evidence_ref, supported contract_id, and summary.",
        ),
      );
      return;
    }
    result.push({
      evidence_ref: evidenceRef,
      contract_id:
        contractId as AdapterInvocationPreflightInputEvidenceRefInput["contract_id"],
      summary,
    });
  });
  return result;
}

function normalizeSourceRefs(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.source_ref_required",
        "/source_refs",
        "Adapter invocation preflight requires source refs.",
      ),
    );
    return [];
  }
  const result: string[] = [];
  value.forEach((item, index) => {
    const path = `/source_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.invalid_source_ref",
          path,
          "Source ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          preflightError(
            "adapter_invocation_preflight.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected source ref field.",
          ),
        );
      }
    }
    if (containsSecret(item)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.secret_value_forbidden",
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
        preflightError(
          "adapter_invocation_preflight.invalid_source_ref",
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

function normalizePolicyGateRefs(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): SubstrateControlIntentPolicyGateInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.policy_gate_required",
        "/policy_gate_refs",
        "Adapter invocation preflight requires policy gate refs.",
      ),
    );
    return [];
  }
  const result: SubstrateControlIntentPolicyGateInput[] = [];
  value.forEach((item, index) => {
    const path = `/policy_gate_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.invalid_policy_gate",
          path,
          "Policy gate ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!policyGateKeys.has(key)) {
        errors.push(
          preflightError(
            "adapter_invocation_preflight.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected policy gate field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        preflightError(
          containsSecret(item)
            ? "adapter_invocation_preflight.secret_value_forbidden"
            : "adapter_invocation_preflight.unsafe_adapter_authority",
          path,
          containsSecret(item)
            ? "Policy gate refs cannot contain secret-like values."
            : "Policy gate refs ask for unsafe adapter authority.",
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
        preflightError(
          "adapter_invocation_preflight.invalid_policy_gate",
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
  errors: AdapterInvocationPreflightError[],
): SubstrateControlIntentApprovalRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.approval_required",
        "/approval_refs",
        "Adapter invocation preflight requires approval refs.",
      ),
    );
    return [];
  }
  const result: SubstrateControlIntentApprovalRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/approval_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.invalid_approval_ref",
          path,
          "Approval ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!approvalRefKeys.has(key)) {
        errors.push(
          preflightError(
            "adapter_invocation_preflight.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected approval ref field.",
          ),
        );
      }
    }
    if (containsSecret(item)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.secret_value_forbidden",
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
        preflightError(
          "adapter_invocation_preflight.invalid_approval_ref",
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

function normalizeAuditEventPlan(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): SubstrateControlIntentAuditEventInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.audit_event_required",
        "/audit_event_plan",
        "Adapter invocation preflight requires audit event plan.",
      ),
    );
    return [];
  }
  const result: SubstrateControlIntentAuditEventInput[] = [];
  value.forEach((item, index) => {
    const path = `/audit_event_plan/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.invalid_audit_event",
          path,
          "Audit event must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!auditEventKeys.has(key)) {
        errors.push(
          preflightError(
            "adapter_invocation_preflight.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected audit event field.",
          ),
        );
      }
    }
    const eventType =
      typeof item.event_type === "string" &&
      auditEventTypes.has(
        item.event_type as SubstrateControlIntentAuditEventInput["event_type"],
      )
        ? (item.event_type as SubstrateControlIntentAuditEventInput["event_type"])
        : null;
    const packetFamily =
      typeof item.packet_family === "string" && packetFamilies.has(item.packet_family)
        ? (item.packet_family as SubstrateControlIntentAuditEventInput["packet_family"])
        : null;
    if (eventType === null || packetFamily === null || item.required !== true) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.invalid_audit_event",
          path,
          "Audit event requires supported event_type, packet_family, and required: true.",
        ),
      );
      return;
    }
    result.push({ event_type: eventType, required: true, packet_family: packetFamily });
  });
  return result;
}

function normalizeResultExpectations(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): SubstrateControlIntentResultExpectationInput {
  if (!isPlainObject(value)) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.result_expectation_required",
        "/result_expectations",
        "Adapter invocation preflight requires result expectations.",
      ),
    );
    return defaultAdapterInvocationPreflight.result_expectations;
  }
  for (const key of Object.keys(value)) {
    if (!resultExpectationKeys.has(key)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.unexpected_field",
          `/result_expectations/${escapeJsonPointerSegment(key)}`,
          "Unexpected result expectation field.",
        ),
      );
    }
  }
  if (containsSecret(value) || unsafeAuthority(value)) {
    errors.push(
      preflightError(
        containsSecret(value)
          ? "adapter_invocation_preflight.secret_value_forbidden"
          : "adapter_invocation_preflight.unsafe_adapter_authority",
        "/result_expectations",
        containsSecret(value)
          ? "Adapter invocation preflight result expectations cannot contain secrets."
          : "Adapter invocation preflight result expectations ask for unsafe authority.",
      ),
    );
    return defaultAdapterInvocationPreflight.result_expectations;
  }
  const resultPacketRef =
    typeof value.result_packet_ref === "string" && safeRef(value.result_packet_ref)
      ? value.result_packet_ref
      : null;
  const artifactRefs = normalizeRefStringArray(value.artifact_refs);
  const statuses = Array.isArray(value.expected_statuses)
    ? value.expected_statuses.filter(
        (
          status,
        ): status is SubstrateControlIntentResultExpectationInput["expected_statuses"][number] =>
          typeof status === "string" &&
          resultStatuses.has(
            status as SubstrateControlIntentResultExpectationInput["expected_statuses"][number],
          ),
      )
    : [];
  const summary =
    typeof value.operator_visible_summary === "string" &&
    safeString(value.operator_visible_summary)
      ? value.operator_visible_summary
      : null;
  if (
    resultPacketRef === null ||
    artifactRefs.length === 0 ||
    statuses.length === 0 ||
    summary === null
  ) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.invalid_result_expectation",
        "/result_expectations",
        "Result expectations require safe result packet ref, statuses, artifact refs, and summary.",
      ),
    );
    return defaultAdapterInvocationPreflight.result_expectations;
  }
  return {
    result_packet_ref: resultPacketRef,
    expected_statuses: uniqueStrings(statuses),
    artifact_refs: uniqueStrings(artifactRefs),
    operator_visible_summary: summary,
  };
}

function normalizeRollbackExpectations(
  value: unknown,
  errors: AdapterInvocationPreflightError[],
): SubstrateControlIntentRollbackExpectationInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      preflightError(
        "adapter_invocation_preflight.rollback_expectation_required",
        "/rollback_expectations",
        "Adapter invocation preflight requires rollback expectations.",
      ),
    );
    return [];
  }
  const result: SubstrateControlIntentRollbackExpectationInput[] = [];
  value.forEach((item, index) => {
    const path = `/rollback_expectations/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        preflightError(
          "adapter_invocation_preflight.invalid_rollback_expectation",
          path,
          "Rollback expectation must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!rollbackExpectationKeys.has(key)) {
        errors.push(
          preflightError(
            "adapter_invocation_preflight.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected rollback expectation field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        preflightError(
          containsSecret(item)
            ? "adapter_invocation_preflight.secret_value_forbidden"
            : "adapter_invocation_preflight.unsafe_adapter_authority",
          path,
          containsSecret(item)
            ? "Rollback expectations cannot contain secret-like values."
            : "Rollback expectations ask for unsafe adapter authority.",
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
        preflightError(
          "adapter_invocation_preflight.invalid_rollback_expectation",
          path,
          "Rollback expectation requires rollback_ref, risk threshold, owner_ref, and evidence refs.",
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

function normalizeSafeStrings(
  value: unknown,
  path: string,
  emptyMessage: string,
  invalidCode: AdapterInvocationPreflightErrorCode,
  errors: AdapterInvocationPreflightError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(preflightError(invalidCode, path, emptyMessage));
    return [];
  }
  const result: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string" || !safeString(item)) {
      errors.push(
        preflightError(
          invalidCode,
          `${path}/${index}`,
          "Adapter invocation preflight behavior text must be safe text.",
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

function requiresRollback(
  controlMode: SubstrateControlMode,
  riskLevel: number,
  adapterClass: CapabilityBrokerAdapterClass,
): boolean {
  return requiresApproval(controlMode, riskLevel, adapterClass);
}

function failAdapterInvocationPreflight(
  errors: AdapterInvocationPreflightError[],
): AdapterInvocationPreflightResult {
  return {
    ok: false,
    adapter_invocation_preflight: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function preflightError(
  code: AdapterInvocationPreflightErrorCode,
  path: string,
  message: string,
): AdapterInvocationPreflightError {
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
  errors: AdapterInvocationPreflightError[],
): AdapterInvocationPreflightError[] {
  const seen = new Set<string>();
  const result: AdapterInvocationPreflightError[] = [];
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
