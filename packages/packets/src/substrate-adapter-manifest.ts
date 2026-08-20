import type { CapabilityBrokerAdapterClass } from "./capability-broker-request.js";
import {
  capabilityBrokerRequestContract,
  defaultCapabilityBrokerRequest,
} from "./capability-broker-request.js";
import type {
  SubstrateControlIntentApprovalRefInput,
  SubstrateControlIntentAuditEventInput,
  SubstrateControlIntentPolicyGateInput,
  SubstrateControlIntentResultExpectationInput,
  SubstrateControlIntentRollbackExpectationInput,
} from "./substrate-control-intent.js";
import { substrateControlIntentContract } from "./substrate-control-intent.js";
import type { SubstrateControlMode, SubstrateKind } from "./substrate-taxonomy.js";

export const SUBSTRATE_ADAPTER_MANIFEST_STATUS = "source_only";

export const substrateAdapterManifestContract = {
  contract_id: "lnsat.platform.substrate_adapter_manifest.v0_1",
  authority: ["@lnsat/packets", "source-backed-substrate-adapter-manifest"],
  manifest_version: "0.1",
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
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  adapter_authority: "manifest_only_no_invocation",
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type SubstrateAdapterManifestIdentityInput = {
  adapter_ref: string;
  adapter_name: string;
  owner_ref: string;
};

export type SubstrateAdapterCapabilityRefInput = {
  capability_ref: string;
  capability: string;
  evidence_ref: string;
  summary: string;
};

export type SubstrateAdapterRequiredInputEvidenceRefInput = {
  evidence_ref: string;
  contract_id:
    | typeof substrateControlIntentContract.contract_id
    | typeof capabilityBrokerRequestContract.contract_id;
  summary: string;
};

export type SubstrateAdapterManifestSourceInput = {
  source_ref: string;
  summary: string;
};

export type SubstrateAdapterManifestRequest = {
  manifest_version?: typeof substrateAdapterManifestContract.manifest_version;
  adapter_identity?: SubstrateAdapterManifestIdentityInput;
  adapter_class?: CapabilityBrokerAdapterClass;
  supported_substrate_kinds?: SubstrateKind[];
  supported_control_modes?: SubstrateControlMode[];
  accepted_capability_refs?: SubstrateAdapterCapabilityRefInput[];
  required_input_evidence_refs?: SubstrateAdapterRequiredInputEvidenceRefInput[];
  source_refs?: SubstrateAdapterManifestSourceInput[];
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

export type SubstrateAdapterManifestErrorCode =
  | "substrate_adapter_manifest.invalid_request"
  | "substrate_adapter_manifest.unexpected_field"
  | "substrate_adapter_manifest.invalid_version"
  | "substrate_adapter_manifest.invalid_adapter_identity"
  | "substrate_adapter_manifest.invalid_adapter_class"
  | "substrate_adapter_manifest.supported_substrate_kind_required"
  | "substrate_adapter_manifest.invalid_supported_substrate_kind"
  | "substrate_adapter_manifest.supported_control_mode_required"
  | "substrate_adapter_manifest.invalid_supported_control_mode"
  | "substrate_adapter_manifest.accepted_capability_required"
  | "substrate_adapter_manifest.invalid_accepted_capability"
  | "substrate_adapter_manifest.input_evidence_required"
  | "substrate_adapter_manifest.invalid_input_evidence_ref"
  | "substrate_adapter_manifest.source_ref_required"
  | "substrate_adapter_manifest.invalid_source_ref"
  | "substrate_adapter_manifest.policy_gate_required"
  | "substrate_adapter_manifest.invalid_policy_gate"
  | "substrate_adapter_manifest.approval_required"
  | "substrate_adapter_manifest.invalid_approval_ref"
  | "substrate_adapter_manifest.audit_event_required"
  | "substrate_adapter_manifest.invalid_audit_event"
  | "substrate_adapter_manifest.result_expectation_required"
  | "substrate_adapter_manifest.invalid_result_expectation"
  | "substrate_adapter_manifest.rollback_expectation_required"
  | "substrate_adapter_manifest.invalid_rollback_expectation"
  | "substrate_adapter_manifest.denied_adapter_behavior_required"
  | "substrate_adapter_manifest.invalid_denied_adapter_behavior"
  | "substrate_adapter_manifest.denied_live_behavior_required"
  | "substrate_adapter_manifest.invalid_denied_live_behavior"
  | "substrate_adapter_manifest.unsafe_adapter_authority"
  | "substrate_adapter_manifest.secret_value_forbidden"
  | "substrate_adapter_manifest.live_adapter_invocation_forbidden"
  | "substrate_adapter_manifest.live_broker_dispatch_forbidden"
  | "substrate_adapter_manifest.live_execution_forbidden"
  | "substrate_adapter_manifest.side_effects_forbidden";

export type SubstrateAdapterManifestError = {
  code: SubstrateAdapterManifestErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type SubstrateAdapterManifestEvidence = {
  contract_id: typeof substrateAdapterManifestContract.contract_id;
  manifest_version: typeof substrateAdapterManifestContract.manifest_version;
  adapter_identity: SubstrateAdapterManifestIdentityInput;
  adapter_class: CapabilityBrokerAdapterClass;
  supported_substrate_kinds: SubstrateKind[];
  supported_control_modes: SubstrateControlMode[];
  accepted_capability_refs: SubstrateAdapterCapabilityRefInput[];
  required_input_evidence_refs: SubstrateAdapterRequiredInputEvidenceRefInput[];
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
  adapter_authority: typeof substrateAdapterManifestContract.adapter_authority;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type SubstrateAdapterManifestResult =
  | {
      ok: true;
      substrate_adapter_manifest: SubstrateAdapterManifestEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      substrate_adapter_manifest: null;
      errors: SubstrateAdapterManifestError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedSubstrateAdapterManifest =
  | {
      ok: true;
      manifest: Omit<
        SubstrateAdapterManifestEvidence,
        "contract_id" | "manifest_version" | "side_effects"
      >;
    }
  | {
      ok: false;
      errors: SubstrateAdapterManifestError[];
    };

const requestKeys = new Set([
  "manifest_version",
  "adapter_identity",
  "adapter_class",
  "supported_substrate_kinds",
  "supported_control_modes",
  "accepted_capability_refs",
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
const adapterIdentityKeys = new Set(["adapter_ref", "adapter_name", "owner_ref"]);
const capabilityRefKeys = new Set([
  "capability_ref",
  "capability",
  "evidence_ref",
  "summary",
]);
const inputEvidenceRefKeys = new Set(["evidence_ref", "contract_id", "summary"]);
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
]);

const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const refPattern = /^[a-z][a-z0-9_-]*:[\w./:@#_-]{3,180}$/;
const capabilityPattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,6}$/;
const policyGatePattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,7}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|API_KEY|SECRET=|TOKEN=|PASSWORD|PRIVATE KEY|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]|AKIA[A-Z0-9]|secret:)/i;
const unsafeAuthorityPattern =
  /\b(root|sudo|shell|ssh\.raw|secret\.read|credential\.read|write\.execute|delete\.execute|drop|destroy\.execute|restart\.execute|deploy\.execute|dns\.write|cloudflare\.write|database\.write|db\.write|queue\.purge|docker\.socket|docker_socket|privileged|unrestricted|node_agent\.exec|rm -rf|live_dispatch|dispatch\.execute|adapter\.invoke|adapter_invocation|broker\.dispatch)\b/i;

const defaultDeniedAdapterBehavior = [
  "manifest describes adapter only",
  "manifest does not instantiate adapter",
  "manifest does not invoke substrate control",
  "manifest requires broker request evidence before future use",
  "manifest fails closed without policy and approval evidence",
];

export const defaultSubstrateAdapterManifest: SubstrateAdapterManifestEvidence = {
  contract_id: substrateAdapterManifestContract.contract_id,
  manifest_version: substrateAdapterManifestContract.manifest_version,
  adapter_identity: {
    adapter_ref: "adapter:service-control-manifest",
    adapter_name: "Service control proposal adapter manifest",
    owner_ref: "owner:lnsat-platform",
  },
  adapter_class: defaultCapabilityBrokerRequest.proposed_adapter_class,
  supported_substrate_kinds: ["services"],
  supported_control_modes: ["observation", "proposal", "approval_gated_mutation"],
  accepted_capability_refs: [
    {
      capability_ref: "capability:service-restart-request",
      capability: defaultCapabilityBrokerRequest.capability,
      evidence_ref: "evidence:bp0102-capability-broker-request",
      summary: "BP-0102 source-only capability broker request evidence",
    },
  ],
  required_input_evidence_refs: [
    {
      evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
      contract_id: substrateControlIntentContract.contract_id,
      summary: "BP-0096 substrate control intent evidence required before adapters",
    },
    {
      evidence_ref: "evidence:bp0102-capability-broker-request",
      contract_id: capabilityBrokerRequestContract.contract_id,
      summary: "BP-0102 broker request evidence required before adapter selection",
    },
  ],
  required_policy_gates: [
    "substrate.adapter.manifest.review",
    ...defaultCapabilityBrokerRequest.required_policy_gates,
  ].sort(),
  policy_gate_refs: [
    {
      gate_ref: "substrate.adapter.manifest.review",
      decision_ref: "policy_decision:substrate-adapter-manifest-source-only",
      required: true,
    },
    ...defaultCapabilityBrokerRequest.policy_gate_refs,
  ],
  required_approvals: defaultCapabilityBrokerRequest.required_approvals,
  approval_refs: defaultCapabilityBrokerRequest.approval_refs,
  audit_event_plan: defaultCapabilityBrokerRequest.audit_event_plan,
  required_audit_events: defaultCapabilityBrokerRequest.required_audit_events,
  result_expectations: {
    result_packet_ref: "result_packet:substrate-adapter-manifest",
    expected_statuses: ["approved", "denied", "completed", "failed", "rolled_back"],
    artifact_refs: ["artifact:operator-visible-adapter-manifest-evidence"],
    operator_visible_summary:
      "operator can inspect adapter identity, class, supported substrates, modes, accepted capabilities, input evidence, policy, approval, audit, result, rollback, and denied invocation behavior before any live adapter exists",
  },
  rollback_expectations: [
    {
      rollback_ref: "rollback:substrate-adapter-manifest-review",
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
    ...defaultCapabilityBrokerRequest.denied_live_behavior,
    "no live adapter invocation",
  ],
  source_refs: [
    "doc:docs/architecture/PACKET_MODEL.md",
    "doc:docs/architecture/POLICY_AND_AUDIT.md",
    "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
    "doc:docs/reference/CONTRACT_PROVENANCE.md",
    "ticket:BP-0108: source-only substrate adapter manifest contract",
  ],
  adapter_authority: substrateAdapterManifestContract.adapter_authority,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
};

export function createSubstrateAdapterManifest(
  input: unknown = {},
): SubstrateAdapterManifestResult {
  const normalized = normalizeSubstrateAdapterManifest(input);

  if (!normalized.ok) {
    return failSubstrateAdapterManifest(normalized.errors);
  }

  return {
    ok: true,
    substrate_adapter_manifest: {
      contract_id: substrateAdapterManifestContract.contract_id,
      manifest_version: substrateAdapterManifestContract.manifest_version,
      ...normalized.manifest,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeSubstrateAdapterManifest(
  input: unknown,
): NormalizedSubstrateAdapterManifest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        manifestError(
          "substrate_adapter_manifest.invalid_request",
          "",
          "Substrate adapter manifest request must be an object.",
        ),
      ],
    };
  }

  const errors: SubstrateAdapterManifestError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.unexpected_field",
          jsonPointer(key),
          "Unexpected substrate adapter manifest field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "manifest_version") &&
    input.manifest_version !== substrateAdapterManifestContract.manifest_version
  ) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.invalid_version",
        "/manifest_version",
        "Substrate adapter manifest version is unsupported.",
      ),
    );
  }

  const adapterIdentity = Object.hasOwn(input, "adapter_identity")
    ? normalizeAdapterIdentity(input.adapter_identity, errors)
    : defaultSubstrateAdapterManifest.adapter_identity;
  const adapterClass = Object.hasOwn(input, "adapter_class")
    ? normalizeAdapterClass(input.adapter_class, errors)
    : defaultSubstrateAdapterManifest.adapter_class;
  const supportedSubstrateKinds = Object.hasOwn(input, "supported_substrate_kinds")
    ? normalizeSubstrateKinds(input.supported_substrate_kinds, errors)
    : [...defaultSubstrateAdapterManifest.supported_substrate_kinds];
  const supportedControlModes = Object.hasOwn(input, "supported_control_modes")
    ? normalizeControlModes(input.supported_control_modes, errors)
    : [...defaultSubstrateAdapterManifest.supported_control_modes];
  const acceptedCapabilityRefs = Object.hasOwn(input, "accepted_capability_refs")
    ? normalizeCapabilityRefs(input.accepted_capability_refs, errors)
    : [...defaultSubstrateAdapterManifest.accepted_capability_refs];
  const requiredInputEvidenceRefs = Object.hasOwn(input, "required_input_evidence_refs")
    ? normalizeInputEvidenceRefs(input.required_input_evidence_refs, errors)
    : [...defaultSubstrateAdapterManifest.required_input_evidence_refs];
  const sourceRefs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, errors)
    : [...defaultSubstrateAdapterManifest.source_refs];
  const policyGateRefs = Object.hasOwn(input, "policy_gate_refs")
    ? normalizePolicyGateRefs(input.policy_gate_refs, errors)
    : [...defaultSubstrateAdapterManifest.policy_gate_refs];
  const approvalRefs = Object.hasOwn(input, "approval_refs")
    ? normalizeApprovalRefs(input.approval_refs, errors)
    : [...defaultSubstrateAdapterManifest.approval_refs];
  const auditEventPlan = Object.hasOwn(input, "audit_event_plan")
    ? normalizeAuditEventPlan(input.audit_event_plan, errors)
    : [...defaultSubstrateAdapterManifest.audit_event_plan];
  const resultExpectations = Object.hasOwn(input, "result_expectations")
    ? normalizeResultExpectations(input.result_expectations, errors)
    : defaultSubstrateAdapterManifest.result_expectations;
  const rollbackExpectations = Object.hasOwn(input, "rollback_expectations")
    ? normalizeRollbackExpectations(input.rollback_expectations, errors)
    : [...defaultSubstrateAdapterManifest.rollback_expectations];
  const deniedAdapterBehavior = Object.hasOwn(input, "denied_adapter_behavior")
    ? normalizeSafeStrings(
        input.denied_adapter_behavior,
        "/denied_adapter_behavior",
        "Substrate adapter manifest requires denied adapter behavior.",
        "substrate_adapter_manifest.invalid_denied_adapter_behavior",
        errors,
      )
    : [...defaultSubstrateAdapterManifest.denied_adapter_behavior];
  const deniedLiveBehavior = Object.hasOwn(input, "denied_live_behavior")
    ? normalizeSafeStrings(
        input.denied_live_behavior,
        "/denied_live_behavior",
        "Substrate adapter manifest requires denied live behavior.",
        "substrate_adapter_manifest.invalid_denied_live_behavior",
        errors,
      )
    : [...defaultSubstrateAdapterManifest.denied_live_behavior];

  if (
    Object.hasOwn(input, "live_adapter_invocation_allowed") &&
    input.live_adapter_invocation_allowed !== false
  ) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.live_adapter_invocation_forbidden",
        "/live_adapter_invocation_allowed",
        "Substrate adapter manifest cannot enable live adapter invocation.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "live_broker_dispatch_allowed") &&
    input.live_broker_dispatch_allowed !== false
  ) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.live_broker_dispatch_forbidden",
        "/live_broker_dispatch_allowed",
        "Substrate adapter manifest cannot enable live broker dispatch.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "live_execution_allowed") &&
    input.live_execution_allowed !== false
  ) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.live_execution_forbidden",
        "/live_execution_allowed",
        "Substrate adapter manifest cannot enable live execution.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.side_effects_forbidden",
        "/side_effects",
        "Substrate adapter manifest must preserve side_effects: [].",
      ),
    );
  }

  if (supportedSubstrateKinds.length === 0) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.supported_substrate_kind_required",
        "/supported_substrate_kinds",
        "Substrate adapter manifest requires supported substrate kinds.",
      ),
    );
  }

  if (supportedControlModes.length === 0) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.supported_control_mode_required",
        "/supported_control_modes",
        "Substrate adapter manifest requires supported control modes.",
      ),
    );
  }

  if (acceptedCapabilityRefs.length === 0) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.accepted_capability_required",
        "/accepted_capability_refs",
        "Substrate adapter manifest requires accepted capability refs.",
      ),
    );
  }

  if (requiredInputEvidenceRefs.length === 0) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.input_evidence_required",
        "/required_input_evidence_refs",
        "Substrate adapter manifest requires input evidence refs.",
      ),
    );
  }

  if (sourceRefs.length === 0) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.source_ref_required",
        "/source_refs",
        "Substrate adapter manifest requires source refs.",
      ),
    );
  }

  if (policyGateRefs.length === 0) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.policy_gate_required",
        "/policy_gate_refs",
        "Substrate adapter manifest requires policy gate refs.",
      ),
    );
  }

  if (
    requiresApproval(supportedControlModes, adapterClass) &&
    approvalRefs.length === 0
  ) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.approval_required",
        "/approval_refs",
        "Approval-gated or risky substrate adapter manifest requires approval refs.",
      ),
    );
  }

  const requiredAuditEvents = uniqueStrings(
    auditEventPlan.map((event) => event.event_type),
  );
  for (const eventType of defaultSubstrateAdapterManifest.required_audit_events as SubstrateControlIntentAuditEventInput["event_type"][]) {
    if (!requiredAuditEvents.includes(eventType)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.audit_event_required",
          `/audit_event_plan/${eventType}`,
          `Substrate adapter manifest requires ${eventType} audit event.`,
        ),
      );
    }
  }

  if (
    requiresRollback(supportedControlModes, adapterClass) &&
    rollbackExpectations.length === 0
  ) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.rollback_expectation_required",
        "/rollback_expectations",
        "Risky substrate adapter manifest requires rollback expectations.",
      ),
    );
  }

  if (deniedAdapterBehavior.length === 0) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.denied_adapter_behavior_required",
        "/denied_adapter_behavior",
        "Substrate adapter manifest requires denied adapter behavior.",
      ),
    );
  }

  if (deniedLiveBehavior.length === 0) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.denied_live_behavior_required",
        "/denied_live_behavior",
        "Substrate adapter manifest requires denied live behavior.",
      ),
    );
  }

  if (supportedControlModes.includes("forbidden_mutation")) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.unsafe_adapter_authority",
        "/supported_control_modes",
        "Forbidden mutation cannot be supported by substrate adapter manifest.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    manifest: {
      adapter_identity: adapterIdentity,
      adapter_class: adapterClass,
      supported_substrate_kinds: uniqueStrings(supportedSubstrateKinds),
      supported_control_modes: uniqueStrings(supportedControlModes),
      accepted_capability_refs: acceptedCapabilityRefs,
      required_input_evidence_refs: requiredInputEvidenceRefs,
      required_policy_gates: uniqueStrings([
        "substrate.adapter.manifest.review",
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
      adapter_authority: substrateAdapterManifestContract.adapter_authority,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
    },
  };
}

function normalizeAdapterIdentity(
  value: unknown,
  errors: SubstrateAdapterManifestError[],
): SubstrateAdapterManifestIdentityInput {
  if (!isPlainObject(value)) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.invalid_adapter_identity",
        "/adapter_identity",
        "Substrate adapter manifest requires adapter identity.",
      ),
    );
    return defaultSubstrateAdapterManifest.adapter_identity;
  }

  for (const key of Object.keys(value)) {
    if (!adapterIdentityKeys.has(key)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.unexpected_field",
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

  if (adapterRef === null) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.invalid_adapter_identity",
        "/adapter_identity/adapter_ref",
        "Adapter ref must be a safe reference.",
      ),
    );
  }
  if (adapterName === null) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.invalid_adapter_identity",
        "/adapter_identity/adapter_name",
        "Adapter name must be safe text.",
      ),
    );
  }
  if (ownerRef === null) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.invalid_adapter_identity",
        "/adapter_identity/owner_ref",
        "Adapter owner ref must be a safe reference.",
      ),
    );
  }

  return {
    adapter_ref:
      adapterRef ?? defaultSubstrateAdapterManifest.adapter_identity.adapter_ref,
    adapter_name:
      adapterName ?? defaultSubstrateAdapterManifest.adapter_identity.adapter_name,
    owner_ref: ownerRef ?? defaultSubstrateAdapterManifest.adapter_identity.owner_ref,
  };
}

function normalizeAdapterClass(
  value: unknown,
  errors: SubstrateAdapterManifestError[],
): CapabilityBrokerAdapterClass {
  if (
    typeof value !== "string" ||
    !adapterClasses.has(value as CapabilityBrokerAdapterClass)
  ) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.invalid_adapter_class",
        "/adapter_class",
        "Substrate adapter manifest adapter class is unsupported.",
      ),
    );
    if (typeof value === "string" && unsafeAuthority(value)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.unsafe_adapter_authority",
          "/adapter_class",
          "Substrate adapter manifest adapter class asks for unsafe authority.",
        ),
      );
    }
    return defaultSubstrateAdapterManifest.adapter_class;
  }

  if (unsafeAuthority(value)) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.unsafe_adapter_authority",
        "/adapter_class",
        "Substrate adapter manifest adapter class asks for unsafe authority.",
      ),
    );
  }

  return value as CapabilityBrokerAdapterClass;
}

function normalizeSubstrateKinds(
  value: unknown,
  errors: SubstrateAdapterManifestError[],
): SubstrateKind[] {
  if (!Array.isArray(value)) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.supported_substrate_kind_required",
        "/supported_substrate_kinds",
        "Substrate adapter manifest requires supported substrate kinds.",
      ),
    );
    return [];
  }

  const result: SubstrateKind[] = [];
  value.forEach((item, index) => {
    if (typeof item === "string" && substrateKinds.has(item as SubstrateKind)) {
      result.push(item as SubstrateKind);
      return;
    }
    errors.push(
      manifestError(
        "substrate_adapter_manifest.invalid_supported_substrate_kind",
        `/supported_substrate_kinds/${index}`,
        "Substrate adapter manifest supported substrate kind is unsupported.",
      ),
    );
  });
  return uniqueStrings(result);
}

function normalizeControlModes(
  value: unknown,
  errors: SubstrateAdapterManifestError[],
): SubstrateControlMode[] {
  if (!Array.isArray(value)) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.supported_control_mode_required",
        "/supported_control_modes",
        "Substrate adapter manifest requires supported control modes.",
      ),
    );
    return [];
  }

  const result: SubstrateControlMode[] = [];
  value.forEach((item, index) => {
    if (typeof item === "string" && controlModes.has(item as SubstrateControlMode)) {
      result.push(item as SubstrateControlMode);
      return;
    }
    errors.push(
      manifestError(
        "substrate_adapter_manifest.invalid_supported_control_mode",
        `/supported_control_modes/${index}`,
        "Substrate adapter manifest supported control mode is unsupported.",
      ),
    );
  });
  return uniqueStrings(result);
}

function normalizeCapabilityRefs(
  value: unknown,
  errors: SubstrateAdapterManifestError[],
): SubstrateAdapterCapabilityRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.accepted_capability_required",
        "/accepted_capability_refs",
        "Substrate adapter manifest requires accepted capability refs.",
      ),
    );
    return [];
  }

  const result: SubstrateAdapterCapabilityRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/accepted_capability_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.invalid_accepted_capability",
          path,
          "Accepted capability ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(item)) {
      if (!capabilityRefKeys.has(key)) {
        errors.push(
          manifestError(
            "substrate_adapter_manifest.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected accepted capability field.",
          ),
        );
      }
    }

    if (containsSecret(item)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.secret_value_forbidden",
          path,
          "Accepted capability refs cannot contain secret-like values.",
        ),
      );
      return;
    }
    if (unsafeAuthority(item)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.unsafe_adapter_authority",
          path,
          "Accepted capability refs ask for unsafe adapter authority.",
        ),
      );
      return;
    }

    const capabilityRef =
      typeof item.capability_ref === "string" && safeRef(item.capability_ref)
        ? item.capability_ref
        : null;
    const capability =
      typeof item.capability === "string" && safeCapability(item.capability)
        ? item.capability
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
      capabilityRef === null ||
      capability === null ||
      evidenceRef === null ||
      summary === null
    ) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.invalid_accepted_capability",
          path,
          "Accepted capability ref requires safe capability_ref, capability, evidence_ref, and summary.",
        ),
      );
      return;
    }

    result.push({
      capability_ref: capabilityRef,
      capability,
      evidence_ref: evidenceRef,
      summary,
    });
  });
  return result;
}

function normalizeInputEvidenceRefs(
  value: unknown,
  errors: SubstrateAdapterManifestError[],
): SubstrateAdapterRequiredInputEvidenceRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.input_evidence_required",
        "/required_input_evidence_refs",
        "Substrate adapter manifest requires input evidence refs.",
      ),
    );
    return [];
  }

  const result: SubstrateAdapterRequiredInputEvidenceRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/required_input_evidence_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.invalid_input_evidence_ref",
          path,
          "Input evidence ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(item)) {
      if (!inputEvidenceRefKeys.has(key)) {
        errors.push(
          manifestError(
            "substrate_adapter_manifest.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected input evidence ref field.",
          ),
        );
      }
    }

    if (containsSecret(item)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.secret_value_forbidden",
          path,
          "Input evidence refs cannot contain secret-like values.",
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
        manifestError(
          "substrate_adapter_manifest.invalid_input_evidence_ref",
          path,
          "Input evidence ref requires safe evidence_ref, supported contract_id, and summary.",
        ),
      );
      return;
    }

    result.push({
      evidence_ref: evidenceRef,
      contract_id:
        contractId as SubstrateAdapterRequiredInputEvidenceRefInput["contract_id"],
      summary,
    });
  });
  return result;
}

function normalizeSourceRefs(
  value: unknown,
  errors: SubstrateAdapterManifestError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.source_ref_required",
        "/source_refs",
        "Substrate adapter manifest requires source refs.",
      ),
    );
    return [];
  }

  const result: string[] = [];
  value.forEach((item, index) => {
    const path = `/source_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.invalid_source_ref",
          path,
          "Source ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(item)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          manifestError(
            "substrate_adapter_manifest.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected source ref field.",
          ),
        );
      }
    }

    if (containsSecret(item)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.secret_value_forbidden",
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
        manifestError(
          "substrate_adapter_manifest.invalid_source_ref",
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
  errors: SubstrateAdapterManifestError[],
): SubstrateControlIntentPolicyGateInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.policy_gate_required",
        "/policy_gate_refs",
        "Substrate adapter manifest requires policy gate refs.",
      ),
    );
    return [];
  }

  const result: SubstrateControlIntentPolicyGateInput[] = [];
  value.forEach((item, index) => {
    const path = `/policy_gate_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.invalid_policy_gate",
          path,
          "Policy gate ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(item)) {
      if (!policyGateKeys.has(key)) {
        errors.push(
          manifestError(
            "substrate_adapter_manifest.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected policy gate field.",
          ),
        );
      }
    }

    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        manifestError(
          containsSecret(item)
            ? "substrate_adapter_manifest.secret_value_forbidden"
            : "substrate_adapter_manifest.unsafe_adapter_authority",
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
        manifestError(
          "substrate_adapter_manifest.invalid_policy_gate",
          path,
          "Policy gate ref requires safe gate_ref, decision_ref, and required: true.",
        ),
      );
      return;
    }

    result.push({
      gate_ref: gateRef,
      decision_ref: decisionRef,
      required: true,
    });
  });
  return result;
}

function normalizeApprovalRefs(
  value: unknown,
  errors: SubstrateAdapterManifestError[],
): SubstrateControlIntentApprovalRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.approval_required",
        "/approval_refs",
        "Substrate adapter manifest requires approval refs.",
      ),
    );
    return [];
  }

  const result: SubstrateControlIntentApprovalRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/approval_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.invalid_approval_ref",
          path,
          "Approval ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(item)) {
      if (!approvalRefKeys.has(key)) {
        errors.push(
          manifestError(
            "substrate_adapter_manifest.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected approval ref field.",
          ),
        );
      }
    }

    if (containsSecret(item)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.secret_value_forbidden",
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
        manifestError(
          "substrate_adapter_manifest.invalid_approval_ref",
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
  errors: SubstrateAdapterManifestError[],
): SubstrateControlIntentAuditEventInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.audit_event_required",
        "/audit_event_plan",
        "Substrate adapter manifest requires audit event plan.",
      ),
    );
    return [];
  }

  const result: SubstrateControlIntentAuditEventInput[] = [];
  value.forEach((item, index) => {
    const path = `/audit_event_plan/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.invalid_audit_event",
          path,
          "Audit event must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(item)) {
      if (!auditEventKeys.has(key)) {
        errors.push(
          manifestError(
            "substrate_adapter_manifest.unexpected_field",
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
        manifestError(
          "substrate_adapter_manifest.invalid_audit_event",
          path,
          "Audit event requires supported event_type, packet_family, and required: true.",
        ),
      );
      return;
    }

    result.push({
      event_type: eventType,
      required: true,
      packet_family: packetFamily,
    });
  });
  return result;
}

function normalizeResultExpectations(
  value: unknown,
  errors: SubstrateAdapterManifestError[],
): SubstrateControlIntentResultExpectationInput {
  if (!isPlainObject(value)) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.result_expectation_required",
        "/result_expectations",
        "Substrate adapter manifest requires result expectations.",
      ),
    );
    return defaultSubstrateAdapterManifest.result_expectations;
  }

  for (const key of Object.keys(value)) {
    if (!resultExpectationKeys.has(key)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.unexpected_field",
          `/result_expectations/${escapeJsonPointerSegment(key)}`,
          "Unexpected result expectation field.",
        ),
      );
    }
  }

  if (containsSecret(value) || unsafeAuthority(value)) {
    errors.push(
      manifestError(
        containsSecret(value)
          ? "substrate_adapter_manifest.secret_value_forbidden"
          : "substrate_adapter_manifest.unsafe_adapter_authority",
        "/result_expectations",
        containsSecret(value)
          ? "Substrate adapter manifest result expectations cannot contain secrets."
          : "Substrate adapter manifest result expectations ask for unsafe authority.",
      ),
    );
    return defaultSubstrateAdapterManifest.result_expectations;
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
      manifestError(
        "substrate_adapter_manifest.invalid_result_expectation",
        "/result_expectations",
        "Result expectations require safe result packet ref, statuses, artifact refs, and summary.",
      ),
    );
    return defaultSubstrateAdapterManifest.result_expectations;
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
  errors: SubstrateAdapterManifestError[],
): SubstrateControlIntentRollbackExpectationInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      manifestError(
        "substrate_adapter_manifest.rollback_expectation_required",
        "/rollback_expectations",
        "Substrate adapter manifest requires rollback expectations.",
      ),
    );
    return [];
  }

  const result: SubstrateControlIntentRollbackExpectationInput[] = [];
  value.forEach((item, index) => {
    const path = `/rollback_expectations/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        manifestError(
          "substrate_adapter_manifest.invalid_rollback_expectation",
          path,
          "Rollback expectation must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(item)) {
      if (!rollbackExpectationKeys.has(key)) {
        errors.push(
          manifestError(
            "substrate_adapter_manifest.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected rollback expectation field.",
          ),
        );
      }
    }

    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        manifestError(
          containsSecret(item)
            ? "substrate_adapter_manifest.secret_value_forbidden"
            : "substrate_adapter_manifest.unsafe_adapter_authority",
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
        manifestError(
          "substrate_adapter_manifest.invalid_rollback_expectation",
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
  invalidCode: SubstrateAdapterManifestErrorCode,
  errors: SubstrateAdapterManifestError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(manifestError(invalidCode, path, emptyMessage));
    return [];
  }

  const result: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string" || !safeString(item)) {
      errors.push(
        manifestError(
          invalidCode,
          `${path}/${index}`,
          "Substrate adapter manifest behavior text must be safe text.",
        ),
      );
      return;
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        manifestError(
          containsSecret(item)
            ? "substrate_adapter_manifest.secret_value_forbidden"
            : "substrate_adapter_manifest.unsafe_adapter_authority",
          `${path}/${index}`,
          containsSecret(item)
            ? "Behavior text cannot contain secret-like values."
            : "Behavior text asks for unsafe adapter authority.",
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
  supportedControlModes: SubstrateControlMode[],
  adapterClass: CapabilityBrokerAdapterClass,
): boolean {
  return (
    supportedControlModes.includes("approval_gated_mutation") ||
    adapterClass !== "no_adapter_dispatch"
  );
}

function requiresRollback(
  supportedControlModes: SubstrateControlMode[],
  adapterClass: CapabilityBrokerAdapterClass,
): boolean {
  return (
    supportedControlModes.includes("approval_gated_mutation") ||
    [
      "host_control_adapter",
      "container_control_adapter",
      "service_control_adapter",
      "database_control_adapter",
      "queue_control_adapter",
      "tunnel_control_adapter",
      "cloud_account_control_adapter",
      "agent_control_adapter",
      "model_control_adapter",
    ].includes(adapterClass)
  );
}

function failSubstrateAdapterManifest(
  errors: SubstrateAdapterManifestError[],
): SubstrateAdapterManifestResult {
  return {
    ok: false,
    substrate_adapter_manifest: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function manifestError(
  code: SubstrateAdapterManifestErrorCode,
  path: string,
  message: string,
): SubstrateAdapterManifestError {
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
  errors: SubstrateAdapterManifestError[],
): SubstrateAdapterManifestError[] {
  const seen = new Set<string>();
  const result: SubstrateAdapterManifestError[] = [];
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
