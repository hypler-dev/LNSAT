import {
  adapterInvocationPreflightContract,
  defaultAdapterInvocationPreflight,
} from "./adapter-invocation-preflight.js";
import {
  adapterInvocationResultContract,
  defaultAdapterInvocationResult,
} from "./adapter-invocation-result.js";
import type {
  AdapterInvocationResultAuditRefInput,
  AdapterInvocationResultExpectedResultRefInput,
} from "./adapter-invocation-result.js";
import {
  adapterInvocationAuthorizationBundleContract,
  defaultAdapterInvocationAuthorizationBundle,
} from "./adapter-invocation-authorization-bundle.js";
import { capabilityBrokerRequestContract } from "./capability-broker-request.js";
import type {
  SubstrateControlIntentActorInput,
  SubstrateControlIntentApprovalRefInput,
  SubstrateControlIntentPolicyGateInput,
  SubstrateControlIntentRollbackExpectationInput,
} from "./substrate-control-intent.js";
import { substrateControlIntentContract } from "./substrate-control-intent.js";
import { substrateAdapterManifestContract } from "./substrate-adapter-manifest.js";
import type { SubstrateControlMode, SubstrateKind } from "./substrate-taxonomy.js";

export const RUNTIME_ADAPTER_READINESS_GATE_STATUS = "source_only";

export const runtimeAdapterReadinessGateContract = {
  contract_id: "lnsat.platform.runtime_adapter_readiness_gate.v0_1",
  authority: ["@lnsat/packets", "source-backed-runtime-adapter-readiness-gate"],
  readiness_version: "0.1",
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
  ],
  readiness_authority: "readiness_gate_only_no_runtime_invocation",
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type RuntimeAdapterReadinessGateIdentityInput = {
  readiness_ref: string;
  readiness_name: string;
  owner_ref: string;
};

export type AdapterInvocationAuthorizationSubstrateIntentRefInput = {
  intent_ref: string;
  evidence_ref: string;
  contract_id: typeof substrateControlIntentContract.contract_id;
  summary: string;
};

export type AdapterInvocationAuthorizationBrokerRequestRefInput = {
  request_ref: string;
  evidence_ref: string;
  contract_id: typeof capabilityBrokerRequestContract.contract_id;
  summary: string;
};

export type AdapterInvocationAuthorizationManifestRefInput = {
  manifest_ref: string;
  evidence_ref: string;
  contract_id: typeof substrateAdapterManifestContract.contract_id;
  summary: string;
};

export type AdapterInvocationAuthorizationPreflightRefInput = {
  preflight_ref: string;
  evidence_ref: string;
  contract_id: typeof adapterInvocationPreflightContract.contract_id;
  summary: string;
};

export type RuntimeAdapterReadinessAuthorizationBundleRefInput = {
  bundle_ref: string;
  evidence_ref: string;
  contract_id: typeof adapterInvocationAuthorizationBundleContract.contract_id;
  summary: string;
};

export type AdapterInvocationAuthorizationSourceInput = {
  source_ref: string;
  summary: string;
};

export type AdapterInvocationAuthorizationCrossRefConsistencyInput = {
  actor_ref: string;
  capability: string;
  risk_level: number;
  target_substrate_kind: SubstrateKind;
  requested_control_mode: SubstrateControlMode;
  evidence_refs: string[];
};

export type RuntimeAdapterReadinessGateRequest = {
  readiness_version?: typeof runtimeAdapterReadinessGateContract.readiness_version;
  readiness_identity?: RuntimeAdapterReadinessGateIdentityInput;
  requested_actor?: SubstrateControlIntentActorInput;
  capability?: string;
  risk_level?: number;
  target_substrate_kind?: SubstrateKind;
  requested_control_mode?: SubstrateControlMode;
  substrate_control_intent_refs?: AdapterInvocationAuthorizationSubstrateIntentRefInput[];
  capability_broker_request_refs?: AdapterInvocationAuthorizationBrokerRequestRefInput[];
  substrate_adapter_manifest_refs?: AdapterInvocationAuthorizationManifestRefInput[];
  adapter_invocation_preflight_refs?: AdapterInvocationAuthorizationPreflightRefInput[];
  expected_result_refs?: AdapterInvocationResultExpectedResultRefInput[];
  adapter_invocation_authorization_bundle_refs?: RuntimeAdapterReadinessAuthorizationBundleRefInput[];
  rollback_refs?: SubstrateControlIntentRollbackExpectationInput[];
  policy_gate_refs?: SubstrateControlIntentPolicyGateInput[];
  approval_refs?: SubstrateControlIntentApprovalRefInput[];
  audit_event_refs?: AdapterInvocationResultAuditRefInput[];
  source_refs?: AdapterInvocationAuthorizationSourceInput[];
  cross_ref_consistency?: AdapterInvocationAuthorizationCrossRefConsistencyInput;
  denied_live_behavior?: string[];
  readiness_authority?: typeof runtimeAdapterReadinessGateContract.readiness_authority;
  runtime_adapter_dispatch_allowed?: false;
  live_adapter_invocation_allowed?: false;
  live_broker_dispatch_allowed?: false;
  live_execution_allowed?: false;
  side_effects?: [];
};

export type RuntimeAdapterReadinessGateErrorCode =
  | "runtime_adapter_readiness_gate.invalid_request"
  | "runtime_adapter_readiness_gate.unexpected_field"
  | "runtime_adapter_readiness_gate.invalid_version"
  | "runtime_adapter_readiness_gate.invalid_readiness_identity"
  | "runtime_adapter_readiness_gate.invalid_actor"
  | "runtime_adapter_readiness_gate.invalid_capability"
  | "runtime_adapter_readiness_gate.invalid_risk_level"
  | "runtime_adapter_readiness_gate.invalid_substrate_kind"
  | "runtime_adapter_readiness_gate.invalid_control_mode"
  | "runtime_adapter_readiness_gate.substrate_control_intent_ref_required"
  | "runtime_adapter_readiness_gate.invalid_substrate_control_intent_ref"
  | "runtime_adapter_readiness_gate.broker_request_ref_required"
  | "runtime_adapter_readiness_gate.invalid_broker_request_ref"
  | "runtime_adapter_readiness_gate.adapter_manifest_ref_required"
  | "runtime_adapter_readiness_gate.invalid_adapter_manifest_ref"
  | "runtime_adapter_readiness_gate.preflight_ref_required"
  | "runtime_adapter_readiness_gate.invalid_preflight_ref"
  | "runtime_adapter_readiness_gate.expected_result_ref_required"
  | "runtime_adapter_readiness_gate.invalid_expected_result_ref"
  | "runtime_adapter_readiness_gate.rollback_ref_required"
  | "runtime_adapter_readiness_gate.invalid_rollback_ref"
  | "runtime_adapter_readiness_gate.policy_gate_required"
  | "runtime_adapter_readiness_gate.invalid_policy_gate"
  | "runtime_adapter_readiness_gate.approval_required"
  | "runtime_adapter_readiness_gate.invalid_approval_ref"
  | "runtime_adapter_readiness_gate.audit_ref_required"
  | "runtime_adapter_readiness_gate.invalid_audit_ref"
  | "runtime_adapter_readiness_gate.source_ref_required"
  | "runtime_adapter_readiness_gate.invalid_source_ref"
  | "runtime_adapter_readiness_gate.cross_ref_consistency_required"
  | "runtime_adapter_readiness_gate.invalid_cross_ref_consistency"
  | "runtime_adapter_readiness_gate.mismatched_actor"
  | "runtime_adapter_readiness_gate.mismatched_capability"
  | "runtime_adapter_readiness_gate.mismatched_risk_level"
  | "runtime_adapter_readiness_gate.mismatched_substrate_kind"
  | "runtime_adapter_readiness_gate.mismatched_control_mode"
  | "runtime_adapter_readiness_gate.denied_live_behavior_required"
  | "runtime_adapter_readiness_gate.invalid_denied_live_behavior"
  | "runtime_adapter_readiness_gate.unsafe_readiness_authority"
  | "runtime_adapter_readiness_gate.secret_value_forbidden"
  | "runtime_adapter_readiness_gate.authorization_bundle_ref_required"
  | "runtime_adapter_readiness_gate.invalid_authorization_bundle_ref"
  | "runtime_adapter_readiness_gate.runtime_adapter_dispatch_forbidden"
  | "runtime_adapter_readiness_gate.live_adapter_invocation_forbidden"
  | "runtime_adapter_readiness_gate.live_broker_dispatch_forbidden"
  | "runtime_adapter_readiness_gate.live_execution_forbidden"
  | "runtime_adapter_readiness_gate.side_effects_forbidden";

export type RuntimeAdapterReadinessGateError = {
  code: RuntimeAdapterReadinessGateErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type RuntimeAdapterReadinessGateEvidence = {
  contract_id: typeof runtimeAdapterReadinessGateContract.contract_id;
  readiness_version: typeof runtimeAdapterReadinessGateContract.readiness_version;
  readiness_identity: RuntimeAdapterReadinessGateIdentityInput;
  requested_actor: SubstrateControlIntentActorInput;
  capability: string;
  risk_level: number;
  target_substrate_kind: SubstrateKind;
  requested_control_mode: SubstrateControlMode;
  substrate_control_intent_refs: AdapterInvocationAuthorizationSubstrateIntentRefInput[];
  capability_broker_request_refs: AdapterInvocationAuthorizationBrokerRequestRefInput[];
  substrate_adapter_manifest_refs: AdapterInvocationAuthorizationManifestRefInput[];
  adapter_invocation_preflight_refs: AdapterInvocationAuthorizationPreflightRefInput[];
  expected_result_refs: AdapterInvocationResultExpectedResultRefInput[];
  adapter_invocation_authorization_bundle_refs: RuntimeAdapterReadinessAuthorizationBundleRefInput[];
  rollback_refs: SubstrateControlIntentRollbackExpectationInput[];
  policy_gate_refs: SubstrateControlIntentPolicyGateInput[];
  required_policy_gates: string[];
  approval_refs: SubstrateControlIntentApprovalRefInput[];
  required_approvals: string[];
  audit_event_refs: AdapterInvocationResultAuditRefInput[];
  required_audit_events: string[];
  source_refs: string[];
  consistency_requirements: string[];
  cross_ref_consistency: AdapterInvocationAuthorizationCrossRefConsistencyInput;
  denied_live_behavior: string[];
  readiness_authority: typeof runtimeAdapterReadinessGateContract.readiness_authority;
  runtime_adapter_dispatch_allowed: false;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type RuntimeAdapterReadinessGateResult =
  | {
      ok: true;
      runtime_adapter_readiness_gate: RuntimeAdapterReadinessGateEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      runtime_adapter_readiness_gate: null;
      errors: RuntimeAdapterReadinessGateError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedRuntimeAdapterReadinessGate =
  | {
      ok: true;
      bundle: Omit<
        RuntimeAdapterReadinessGateEvidence,
        "contract_id" | "readiness_version" | "side_effects"
      >;
    }
  | {
      ok: false;
      errors: RuntimeAdapterReadinessGateError[];
    };

const requestKeys = new Set([
  "readiness_version",
  "readiness_identity",
  "requested_actor",
  "capability",
  "risk_level",
  "target_substrate_kind",
  "requested_control_mode",
  "substrate_control_intent_refs",
  "capability_broker_request_refs",
  "substrate_adapter_manifest_refs",
  "adapter_invocation_preflight_refs",
  "expected_result_refs",
  "adapter_invocation_authorization_bundle_refs",
  "rollback_refs",
  "policy_gate_refs",
  "approval_refs",
  "audit_event_refs",
  "source_refs",
  "cross_ref_consistency",
  "denied_live_behavior",
  "readiness_authority",
  "runtime_adapter_dispatch_allowed",
  "live_adapter_invocation_allowed",
  "live_broker_dispatch_allowed",
  "live_execution_allowed",
  "side_effects",
]);
const identityKeys = new Set(["readiness_ref", "readiness_name", "owner_ref"]);
const actorKeys = new Set(["actor_ref", "actor_type", "role_ref"]);
const sourceKeys = new Set(["source_ref", "summary"]);
const intentRefKeys = new Set(["intent_ref", "evidence_ref", "contract_id", "summary"]);
const brokerRefKeys = new Set([
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
const preflightRefKeys = new Set([
  "preflight_ref",
  "evidence_ref",
  "contract_id",
  "summary",
]);
const authorizationBundleRefKeys = new Set([
  "bundle_ref",
  "evidence_ref",
  "contract_id",
  "summary",
]);
const expectedResultRefKeys = new Set(["result_ref", "evidence_ref", "summary"]);
const rollbackRefKeys = new Set([
  "rollback_ref",
  "required_for_risk_level_at_or_above",
  "owner_ref",
  "evidence_refs",
]);
const policyGateKeys = new Set(["gate_ref", "decision_ref", "required"]);
const approvalRefKeys = new Set(["approval_ref", "approval_type", "required"]);
const auditRefKeys = new Set(["audit_ref", "event_type", "evidence_ref", "summary"]);
const consistencyKeys = new Set([
  "actor_ref",
  "capability",
  "risk_level",
  "target_substrate_kind",
  "requested_control_mode",
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
const capabilityPattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,6}$/;
const policyGatePattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,7}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|API_KEY|SECRET=|TOKEN=|PASSWORD|PRIVATE KEY|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]|AKIA[A-Z0-9]|secret:)/i;
const unsafeAuthorityPattern =
  /\b(root|sudo|shell|ssh\.raw|secret\.read|credential\.read|write\.execute|delete\.execute|drop|destroy\.execute|restart\.execute|deploy\.execute|dns\.write|cloudflare\.write|database\.write|db\.write|queue\.purge|docker\.socket|docker_socket|privileged|unrestricted|node_agent\.exec|rm -rf|live_dispatch|dispatch\.execute|adapter\.invoke|adapter_invocation|broker\.dispatch|invoke\.execute|runtime\.execution|runtime_adapter_dispatch|runtime_adapter\.dispatch|readiness\.execute|readiness_grants_execution)\b/i;

export const defaultRuntimeAdapterReadinessGate: RuntimeAdapterReadinessGateEvidence = {
  contract_id: runtimeAdapterReadinessGateContract.contract_id,
  readiness_version: runtimeAdapterReadinessGateContract.readiness_version,
  readiness_identity: {
    readiness_ref: "readiness_gate:service-control-adapter-runtime-readiness",
    readiness_name: "Service control runtime adapter readiness gate",
    owner_ref: "owner:lnsat-platform",
  },
  requested_actor: defaultAdapterInvocationPreflight.requested_actor,
  capability: defaultAdapterInvocationPreflight.capability,
  risk_level: defaultAdapterInvocationPreflight.risk_level,
  target_substrate_kind: defaultAdapterInvocationPreflight.target_substrate_kind,
  requested_control_mode: defaultAdapterInvocationPreflight.requested_control_mode,
  substrate_control_intent_refs:
    defaultAdapterInvocationPreflight.substrate_control_intent_refs.map((ref) => ({
      intent_ref: ref.intent_ref,
      evidence_ref: ref.evidence_ref,
      contract_id: substrateControlIntentContract.contract_id,
      summary: ref.summary,
    })),
  capability_broker_request_refs:
    defaultAdapterInvocationPreflight.capability_broker_request_refs,
  substrate_adapter_manifest_refs:
    defaultAdapterInvocationPreflight.substrate_adapter_manifest_refs,
  adapter_invocation_preflight_refs:
    defaultAdapterInvocationResult.adapter_invocation_preflight_refs,
  expected_result_refs: defaultAdapterInvocationResult.expected_result_refs,
  adapter_invocation_authorization_bundle_refs: [
    {
      bundle_ref:
        defaultAdapterInvocationAuthorizationBundle.bundle_identity.bundle_ref,
      evidence_ref: "evidence:bp0126-adapter-invocation-authorization-bundle",
      contract_id: adapterInvocationAuthorizationBundleContract.contract_id,
      summary: "BP-0126 source-only adapter invocation authorization bundle evidence",
    },
  ],
  rollback_refs: defaultAdapterInvocationResult.rollback_refs,
  policy_gate_refs: [
    {
      gate_ref: "substrate.adapter.runtime_readiness_gate.review",
      decision_ref: "policy_decision:runtime-adapter-readiness-gate-source-only",
      required: true,
    },
    ...defaultAdapterInvocationResult.policy_gate_refs,
  ],
  required_policy_gates: [
    "substrate.adapter.runtime_readiness_gate.review",
    ...defaultAdapterInvocationResult.required_policy_gates,
  ].sort(),
  approval_refs: defaultAdapterInvocationResult.approval_refs,
  required_approvals: defaultAdapterInvocationResult.required_approvals,
  audit_event_refs: defaultAdapterInvocationResult.audit_event_refs,
  required_audit_events: defaultAdapterInvocationResult.required_audit_events,
  source_refs: [
    "doc:docs/architecture/PACKET_MODEL.md",
    "doc:docs/architecture/POLICY_AND_AUDIT.md",
    "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
    "doc:docs/reference/CONTRACT_PROVENANCE.md",
    "ticket:BP-0132: source-only runtime adapter readiness gate contract",
  ],
  consistency_requirements: [
    "requested actor matches substrate intent, broker request, manifest, preflight, and expected result evidence",
    "capability matches substrate intent, broker request, manifest accepted capabilities, preflight, and expected result evidence",
    "risk level matches substrate intent, broker request, preflight, policy, approval, audit, result, and rollback evidence",
    "target substrate kind matches substrate intent, broker request, manifest, and preflight evidence",
    "requested control mode matches substrate intent, broker request, manifest, and preflight evidence",
  ],
  cross_ref_consistency: {
    actor_ref: defaultAdapterInvocationPreflight.requested_actor.actor_ref,
    capability: defaultAdapterInvocationPreflight.capability,
    risk_level: defaultAdapterInvocationPreflight.risk_level,
    target_substrate_kind: defaultAdapterInvocationPreflight.target_substrate_kind,
    requested_control_mode: defaultAdapterInvocationPreflight.requested_control_mode,
    evidence_refs: [
      "evidence:bp0096-source-only-substrate-control-intent",
      "evidence:bp0102-capability-broker-request",
      "evidence:bp0108-substrate-adapter-manifest",
      "evidence:bp0114-adapter-invocation-preflight",
      "evidence:bp0120-adapter-invocation-result",
      "evidence:bp0126-adapter-invocation-authorization-bundle",
    ],
  },
  denied_live_behavior: [
    ...defaultAdapterInvocationResult.denied_live_behavior,
    "readiness gate does not invoke adapter",
    "readiness gate does not dispatch broker request",
    "readiness gate does not execute runtime path",
  ],
  readiness_authority: runtimeAdapterReadinessGateContract.readiness_authority,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
};

export function createRuntimeAdapterReadinessGate(
  input: unknown = {},
): RuntimeAdapterReadinessGateResult {
  const normalized = normalizeRuntimeAdapterReadinessGate(input);

  if (!normalized.ok) {
    return failRuntimeAdapterReadinessGate(normalized.errors);
  }

  return {
    ok: true,
    runtime_adapter_readiness_gate: {
      contract_id: runtimeAdapterReadinessGateContract.contract_id,
      readiness_version: runtimeAdapterReadinessGateContract.readiness_version,
      ...normalized.bundle,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeRuntimeAdapterReadinessGate(
  input: unknown,
): NormalizedRuntimeAdapterReadinessGate {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        bundleError(
          "runtime_adapter_readiness_gate.invalid_request",
          "",
          "Runtime adapter readiness gate request must be an object.",
        ),
      ],
    };
  }

  const errors: RuntimeAdapterReadinessGateError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        bundleError(
          "runtime_adapter_readiness_gate.unexpected_field",
          jsonPointer(key),
          "Unexpected runtime adapter readiness gate field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "readiness_version") &&
    input.readiness_version !== runtimeAdapterReadinessGateContract.readiness_version
  ) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.invalid_version",
        "/readiness_version",
        "Runtime adapter readiness gate version is unsupported.",
      ),
    );
  }

  const bundleIdentity = Object.hasOwn(input, "readiness_identity")
    ? normalizeBundleIdentity(input.readiness_identity, errors)
    : defaultRuntimeAdapterReadinessGate.readiness_identity;
  const requestedActor = Object.hasOwn(input, "requested_actor")
    ? normalizeActor(input.requested_actor, errors)
    : defaultRuntimeAdapterReadinessGate.requested_actor;
  const capability = Object.hasOwn(input, "capability")
    ? normalizeCapability(input.capability, errors)
    : defaultRuntimeAdapterReadinessGate.capability;
  const riskLevel = Object.hasOwn(input, "risk_level")
    ? normalizeRiskLevel(input.risk_level, errors)
    : defaultRuntimeAdapterReadinessGate.risk_level;
  const substrateKind = Object.hasOwn(input, "target_substrate_kind")
    ? normalizeSubstrateKind(input.target_substrate_kind, errors)
    : defaultRuntimeAdapterReadinessGate.target_substrate_kind;
  const controlMode = Object.hasOwn(input, "requested_control_mode")
    ? normalizeControlMode(input.requested_control_mode, errors)
    : defaultRuntimeAdapterReadinessGate.requested_control_mode;
  const substrateIntentRefs = Object.hasOwn(input, "substrate_control_intent_refs")
    ? normalizeSubstrateIntentRefs(input.substrate_control_intent_refs, errors)
    : [...defaultRuntimeAdapterReadinessGate.substrate_control_intent_refs];
  const brokerRequestRefs = Object.hasOwn(input, "capability_broker_request_refs")
    ? normalizeBrokerRequestRefs(input.capability_broker_request_refs, errors)
    : [...defaultRuntimeAdapterReadinessGate.capability_broker_request_refs];
  const manifestRefs = Object.hasOwn(input, "substrate_adapter_manifest_refs")
    ? normalizeManifestRefs(input.substrate_adapter_manifest_refs, errors)
    : [...defaultRuntimeAdapterReadinessGate.substrate_adapter_manifest_refs];
  const preflightRefs = Object.hasOwn(input, "adapter_invocation_preflight_refs")
    ? normalizePreflightRefs(input.adapter_invocation_preflight_refs, errors)
    : [...defaultRuntimeAdapterReadinessGate.adapter_invocation_preflight_refs];
  const expectedResultRefs = Object.hasOwn(input, "expected_result_refs")
    ? normalizeExpectedResultRefs(input.expected_result_refs, errors)
    : [...defaultRuntimeAdapterReadinessGate.expected_result_refs];
  const authorizationBundleRefs = Object.hasOwn(
    input,
    "adapter_invocation_authorization_bundle_refs",
  )
    ? normalizeAuthorizationBundleRefs(
        input.adapter_invocation_authorization_bundle_refs,
        errors,
      )
    : [
        ...defaultRuntimeAdapterReadinessGate.adapter_invocation_authorization_bundle_refs,
      ];
  const rollbackRefs = Object.hasOwn(input, "rollback_refs")
    ? normalizeRollbackRefs(input.rollback_refs, errors)
    : [...defaultRuntimeAdapterReadinessGate.rollback_refs];
  const policyGateRefs = Object.hasOwn(input, "policy_gate_refs")
    ? normalizePolicyGateRefs(input.policy_gate_refs, errors)
    : [...defaultRuntimeAdapterReadinessGate.policy_gate_refs];
  const approvalRefs = Object.hasOwn(input, "approval_refs")
    ? normalizeApprovalRefs(input.approval_refs, errors)
    : [...defaultRuntimeAdapterReadinessGate.approval_refs];
  const auditEventRefs = Object.hasOwn(input, "audit_event_refs")
    ? normalizeAuditEventRefs(input.audit_event_refs, errors)
    : [...defaultRuntimeAdapterReadinessGate.audit_event_refs];
  const sourceRefs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, errors)
    : [...defaultRuntimeAdapterReadinessGate.source_refs];
  const consistency = Object.hasOwn(input, "cross_ref_consistency")
    ? normalizeConsistency(input.cross_ref_consistency, errors)
    : defaultRuntimeAdapterReadinessGate.cross_ref_consistency;
  const deniedLiveBehavior = Object.hasOwn(input, "denied_live_behavior")
    ? normalizeSafeStrings(
        input.denied_live_behavior,
        "/denied_live_behavior",
        "Runtime adapter readiness gate requires denied live behavior.",
        "runtime_adapter_readiness_gate.invalid_denied_live_behavior",
        errors,
      )
    : [...defaultRuntimeAdapterReadinessGate.denied_live_behavior];

  if (
    Object.hasOwn(input, "readiness_authority") &&
    input.readiness_authority !==
      runtimeAdapterReadinessGateContract.readiness_authority
  ) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.unsafe_readiness_authority",
        "/readiness_authority",
        "Runtime adapter readiness gate cannot grant invocation authority.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "runtime_adapter_dispatch_allowed") &&
    input.runtime_adapter_dispatch_allowed !== false
  ) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.runtime_adapter_dispatch_forbidden",
        "/runtime_adapter_dispatch_allowed",
        "Runtime adapter readiness gate cannot enable runtime adapter dispatch.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_adapter_invocation_allowed") &&
    input.live_adapter_invocation_allowed !== false
  ) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.live_adapter_invocation_forbidden",
        "/live_adapter_invocation_allowed",
        "Runtime adapter readiness gate cannot enable live adapter invocation.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_broker_dispatch_allowed") &&
    input.live_broker_dispatch_allowed !== false
  ) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.live_broker_dispatch_forbidden",
        "/live_broker_dispatch_allowed",
        "Runtime adapter readiness gate cannot enable live broker dispatch.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_execution_allowed") &&
    input.live_execution_allowed !== false
  ) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.live_execution_forbidden",
        "/live_execution_allowed",
        "Runtime adapter readiness gate cannot enable live execution.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.side_effects_forbidden",
        "/side_effects",
        "Runtime adapter readiness gate must preserve side_effects: [].",
      ),
    );
  }

  if (substrateIntentRefs.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.substrate_control_intent_ref_required",
        "/substrate_control_intent_refs",
        "Runtime adapter readiness gate requires substrate control intent refs.",
      ),
    );
  }
  if (brokerRequestRefs.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.broker_request_ref_required",
        "/capability_broker_request_refs",
        "Runtime adapter readiness gate requires capability broker request refs.",
      ),
    );
  }
  if (manifestRefs.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.adapter_manifest_ref_required",
        "/substrate_adapter_manifest_refs",
        "Runtime adapter readiness gate requires substrate adapter manifest refs.",
      ),
    );
  }
  if (preflightRefs.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.preflight_ref_required",
        "/adapter_invocation_preflight_refs",
        "Runtime adapter readiness gate requires preflight refs.",
      ),
    );
  }
  if (expectedResultRefs.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.expected_result_ref_required",
        "/expected_result_refs",
        "Runtime adapter readiness gate requires expected result refs.",
      ),
    );
  }
  if (authorizationBundleRefs.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.authorization_bundle_ref_required",
        "/adapter_invocation_authorization_bundle_refs",
        "Runtime adapter readiness gate requires authorization bundle refs.",
      ),
    );
  }
  if (rollbackRefs.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.rollback_ref_required",
        "/rollback_refs",
        "Runtime adapter readiness gate requires rollback refs.",
      ),
    );
  }
  if (policyGateRefs.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.policy_gate_required",
        "/policy_gate_refs",
        "Runtime adapter readiness gate requires policy gate refs.",
      ),
    );
  }
  if (approvalRefs.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.approval_required",
        "/approval_refs",
        "Runtime adapter readiness gate requires approval refs.",
      ),
    );
  }
  if (auditEventRefs.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.audit_ref_required",
        "/audit_event_refs",
        "Runtime adapter readiness gate requires audit refs.",
      ),
    );
  }
  if (sourceRefs.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.source_ref_required",
        "/source_refs",
        "Runtime adapter readiness gate requires source refs.",
      ),
    );
  }
  if (consistency.evidence_refs.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.cross_ref_consistency_required",
        "/cross_ref_consistency/evidence_refs",
        "Runtime adapter readiness gate requires consistency evidence refs.",
      ),
    );
  }
  if (deniedLiveBehavior.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.denied_live_behavior_required",
        "/denied_live_behavior",
        "Runtime adapter readiness gate requires denied live behavior.",
      ),
    );
  }

  checkConsistency(
    consistency,
    requestedActor,
    capability,
    riskLevel,
    substrateKind,
    controlMode,
    errors,
  );

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    bundle: {
      readiness_identity: bundleIdentity,
      requested_actor: requestedActor,
      capability,
      risk_level: riskLevel,
      target_substrate_kind: substrateKind,
      requested_control_mode: controlMode,
      substrate_control_intent_refs: substrateIntentRefs,
      capability_broker_request_refs: brokerRequestRefs,
      substrate_adapter_manifest_refs: manifestRefs,
      adapter_invocation_preflight_refs: preflightRefs,
      expected_result_refs: expectedResultRefs,
      adapter_invocation_authorization_bundle_refs: authorizationBundleRefs,
      rollback_refs: rollbackRefs,
      policy_gate_refs: policyGateRefs,
      required_policy_gates: uniqueStrings([
        "substrate.adapter.runtime_readiness_gate.review",
        ...policyGateRefs.map((gate) => gate.gate_ref),
      ]),
      approval_refs: approvalRefs,
      required_approvals: uniqueStrings(approvalRefs.map((ref) => ref.approval_ref)),
      audit_event_refs: auditEventRefs,
      required_audit_events: uniqueStrings(
        auditEventRefs.map((event) => event.event_type),
      ),
      source_refs: sourceRefs,
      consistency_requirements: [
        ...defaultRuntimeAdapterReadinessGate.consistency_requirements,
      ],
      cross_ref_consistency: consistency,
      denied_live_behavior: uniqueStrings(deniedLiveBehavior),
      readiness_authority: runtimeAdapterReadinessGateContract.readiness_authority,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
    },
  };
}

function normalizeBundleIdentity(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): RuntimeAdapterReadinessGateIdentityInput {
  if (!isPlainObject(value)) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.invalid_readiness_identity",
        "/readiness_identity",
        "Runtime adapter readiness gate requires bundle identity.",
      ),
    );
    return defaultRuntimeAdapterReadinessGate.readiness_identity;
  }
  for (const key of Object.keys(value)) {
    if (!identityKeys.has(key)) {
      errors.push(
        bundleError(
          "runtime_adapter_readiness_gate.unexpected_field",
          `/readiness_identity/${escapeJsonPointerSegment(key)}`,
          "Unexpected bundle identity field.",
        ),
      );
    }
  }
  const bundleRef =
    typeof value.readiness_ref === "string" && safeRef(value.readiness_ref)
      ? value.readiness_ref
      : null;
  const bundleName =
    typeof value.readiness_name === "string" && safeString(value.readiness_name)
      ? value.readiness_name
      : null;
  const ownerRef =
    typeof value.owner_ref === "string" && safeRef(value.owner_ref)
      ? value.owner_ref
      : null;
  if (bundleRef === null || bundleName === null || ownerRef === null) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.invalid_readiness_identity",
        "/readiness_identity",
        "Bundle identity requires safe readiness_ref, readiness_name, and owner_ref.",
      ),
    );
  }
  return {
    readiness_ref:
      bundleRef ?? defaultRuntimeAdapterReadinessGate.readiness_identity.readiness_ref,
    readiness_name:
      bundleName ??
      defaultRuntimeAdapterReadinessGate.readiness_identity.readiness_name,
    owner_ref:
      ownerRef ?? defaultRuntimeAdapterReadinessGate.readiness_identity.owner_ref,
  };
}

function normalizeActor(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): SubstrateControlIntentActorInput {
  if (!isPlainObject(value)) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.invalid_actor",
        "/requested_actor",
        "Runtime adapter readiness gate requires requested actor.",
      ),
    );
    return defaultRuntimeAdapterReadinessGate.requested_actor;
  }
  for (const key of Object.keys(value)) {
    if (!actorKeys.has(key)) {
      errors.push(
        bundleError(
          "runtime_adapter_readiness_gate.unexpected_field",
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
      bundleError(
        "runtime_adapter_readiness_gate.invalid_actor",
        "/requested_actor",
        "Requested actor requires safe actor_ref, actor_type, and role_ref.",
      ),
    );
  }
  return {
    actor_ref: actorRef ?? defaultRuntimeAdapterReadinessGate.requested_actor.actor_ref,
    actor_type:
      actorType ?? defaultRuntimeAdapterReadinessGate.requested_actor.actor_type,
    role_ref: roleRef ?? defaultRuntimeAdapterReadinessGate.requested_actor.role_ref,
  };
}

function normalizeCapability(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): string {
  if (typeof value !== "string" || !safeCapability(value)) {
    errors.push(
      bundleError(
        unsafeAuthority(value)
          ? "runtime_adapter_readiness_gate.unsafe_readiness_authority"
          : "runtime_adapter_readiness_gate.invalid_capability",
        "/capability",
        unsafeAuthority(value)
          ? "Runtime adapter readiness gate capability asks for unsafe authority."
          : "Runtime adapter readiness gate capability must be safe dotted capability text.",
      ),
    );
    return defaultRuntimeAdapterReadinessGate.capability;
  }
  return value;
}

function normalizeRiskLevel(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 8) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.invalid_risk_level",
        "/risk_level",
        "Runtime adapter readiness gate risk level must be an integer from 0 to 8.",
      ),
    );
    return defaultRuntimeAdapterReadinessGate.risk_level;
  }
  return value;
}

function normalizeSubstrateKind(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): SubstrateKind {
  if (typeof value !== "string" || !substrateKinds.has(value as SubstrateKind)) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.invalid_substrate_kind",
        "/target_substrate_kind",
        "Runtime adapter readiness gate target substrate kind is unsupported.",
      ),
    );
    return defaultRuntimeAdapterReadinessGate.target_substrate_kind;
  }
  return value as SubstrateKind;
}

function normalizeControlMode(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): SubstrateControlMode {
  if (typeof value !== "string" || !controlModes.has(value as SubstrateControlMode)) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.invalid_control_mode",
        "/requested_control_mode",
        "Runtime adapter readiness gate control mode is unsupported.",
      ),
    );
    return defaultRuntimeAdapterReadinessGate.requested_control_mode;
  }
  return value as SubstrateControlMode;
}

function normalizeSubstrateIntentRefs(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): AdapterInvocationAuthorizationSubstrateIntentRefInput[] {
  return normalizeContractRefs(
    value,
    "/substrate_control_intent_refs",
    "intent_ref",
    intentRefKeys,
    substrateControlIntentContract.contract_id,
    "runtime_adapter_readiness_gate.substrate_control_intent_ref_required",
    "runtime_adapter_readiness_gate.invalid_substrate_control_intent_ref",
    "Runtime adapter readiness gate requires substrate control intent refs.",
    "Substrate control intent ref requires safe refs, supported contract_id, and summary.",
    errors,
  ) as AdapterInvocationAuthorizationSubstrateIntentRefInput[];
}

function normalizeBrokerRequestRefs(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): AdapterInvocationAuthorizationBrokerRequestRefInput[] {
  return normalizeContractRefs(
    value,
    "/capability_broker_request_refs",
    "request_ref",
    brokerRefKeys,
    capabilityBrokerRequestContract.contract_id,
    "runtime_adapter_readiness_gate.broker_request_ref_required",
    "runtime_adapter_readiness_gate.invalid_broker_request_ref",
    "Runtime adapter readiness gate requires capability broker request refs.",
    "Capability broker request ref requires safe refs, supported contract_id, and summary.",
    errors,
  ) as AdapterInvocationAuthorizationBrokerRequestRefInput[];
}

function normalizeManifestRefs(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): AdapterInvocationAuthorizationManifestRefInput[] {
  return normalizeContractRefs(
    value,
    "/substrate_adapter_manifest_refs",
    "manifest_ref",
    manifestRefKeys,
    substrateAdapterManifestContract.contract_id,
    "runtime_adapter_readiness_gate.adapter_manifest_ref_required",
    "runtime_adapter_readiness_gate.invalid_adapter_manifest_ref",
    "Runtime adapter readiness gate requires substrate adapter manifest refs.",
    "Substrate adapter manifest ref requires safe refs, supported contract_id, and summary.",
    errors,
  ) as AdapterInvocationAuthorizationManifestRefInput[];
}

function normalizePreflightRefs(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): AdapterInvocationAuthorizationPreflightRefInput[] {
  return normalizeContractRefs(
    value,
    "/adapter_invocation_preflight_refs",
    "preflight_ref",
    preflightRefKeys,
    adapterInvocationPreflightContract.contract_id,
    "runtime_adapter_readiness_gate.preflight_ref_required",
    "runtime_adapter_readiness_gate.invalid_preflight_ref",
    "Runtime adapter readiness gate requires preflight refs.",
    "Adapter invocation preflight ref requires safe refs, supported contract_id, and summary.",
    errors,
  ) as AdapterInvocationAuthorizationPreflightRefInput[];
}

function normalizeAuthorizationBundleRefs(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): RuntimeAdapterReadinessAuthorizationBundleRefInput[] {
  return normalizeContractRefs(
    value,
    "/adapter_invocation_authorization_bundle_refs",
    "bundle_ref",
    authorizationBundleRefKeys,
    adapterInvocationAuthorizationBundleContract.contract_id,
    "runtime_adapter_readiness_gate.authorization_bundle_ref_required",
    "runtime_adapter_readiness_gate.invalid_authorization_bundle_ref",
    "Runtime adapter readiness gate requires authorization bundle refs.",
    "Authorization bundle ref requires safe refs, supported contract_id, and summary.",
    errors,
  ) as RuntimeAdapterReadinessAuthorizationBundleRefInput[];
}

type ContractRefOutput =
  | AdapterInvocationAuthorizationSubstrateIntentRefInput
  | AdapterInvocationAuthorizationBrokerRequestRefInput
  | AdapterInvocationAuthorizationManifestRefInput
  | AdapterInvocationAuthorizationPreflightRefInput
  | RuntimeAdapterReadinessAuthorizationBundleRefInput;

function normalizeContractRefs(
  value: unknown,
  basePath: string,
  primaryKey:
    "intent_ref" | "request_ref" | "manifest_ref" | "preflight_ref" | "bundle_ref",
  allowedKeys: ReadonlySet<string>,
  contractId: string,
  requiredCode: RuntimeAdapterReadinessGateErrorCode,
  invalidCode: RuntimeAdapterReadinessGateErrorCode,
  requiredMessage: string,
  invalidMessage: string,
  errors: RuntimeAdapterReadinessGateError[],
): ContractRefOutput[] {
  if (!Array.isArray(value)) {
    errors.push(bundleError(requiredCode, basePath, requiredMessage));
    return [];
  }
  const result: ContractRefOutput[] = [];
  value.forEach((item, index) => {
    const path = `${basePath}/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        bundleError(invalidCode, path, "Authorization ref must be an object."),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!allowedKeys.has(key)) {
        errors.push(
          bundleError(
            "runtime_adapter_readiness_gate.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected readiness ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        bundleError(
          containsSecret(item)
            ? "runtime_adapter_readiness_gate.secret_value_forbidden"
            : "runtime_adapter_readiness_gate.unsafe_readiness_authority",
          path,
          containsSecret(item)
            ? "Authorization refs cannot contain secret-like values."
            : "Authorization refs ask for unsafe authority.",
        ),
      );
      return;
    }
    const primaryValue = item[primaryKey];
    const primaryRef =
      typeof primaryValue === "string" && safeRef(primaryValue) ? primaryValue : null;
    const evidenceRef =
      typeof item.evidence_ref === "string" && safeRef(item.evidence_ref)
        ? item.evidence_ref
        : null;
    const summary =
      typeof item.summary === "string" && safeString(item.summary)
        ? item.summary
        : null;
    if (
      primaryRef === null ||
      evidenceRef === null ||
      item.contract_id !== contractId ||
      summary === null
    ) {
      errors.push(bundleError(invalidCode, path, invalidMessage));
      return;
    }
    result.push({
      [primaryKey]: primaryRef,
      evidence_ref: evidenceRef,
      contract_id: contractId,
      summary,
    } as ContractRefOutput);
  });
  return result;
}

function normalizeExpectedResultRefs(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): AdapterInvocationResultExpectedResultRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.expected_result_ref_required",
        "/expected_result_refs",
        "Runtime adapter readiness gate requires expected result refs.",
      ),
    );
    return [];
  }
  const result: AdapterInvocationResultExpectedResultRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/expected_result_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        bundleError(
          "runtime_adapter_readiness_gate.invalid_expected_result_ref",
          path,
          "Expected result ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!expectedResultRefKeys.has(key)) {
        errors.push(
          bundleError(
            "runtime_adapter_readiness_gate.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected expected result ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        bundleError(
          containsSecret(item)
            ? "runtime_adapter_readiness_gate.secret_value_forbidden"
            : "runtime_adapter_readiness_gate.unsafe_readiness_authority",
          path,
          containsSecret(item)
            ? "Expected result refs cannot contain secret-like values."
            : "Expected result refs ask for unsafe authority.",
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
        bundleError(
          "runtime_adapter_readiness_gate.invalid_expected_result_ref",
          path,
          "Expected result ref requires safe refs and summary.",
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
  errors: RuntimeAdapterReadinessGateError[],
): SubstrateControlIntentRollbackExpectationInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.rollback_ref_required",
        "/rollback_refs",
        "Runtime adapter readiness gate requires rollback refs.",
      ),
    );
    return [];
  }
  const result: SubstrateControlIntentRollbackExpectationInput[] = [];
  value.forEach((item, index) => {
    const path = `/rollback_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        bundleError(
          "runtime_adapter_readiness_gate.invalid_rollback_ref",
          path,
          "Rollback ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!rollbackRefKeys.has(key)) {
        errors.push(
          bundleError(
            "runtime_adapter_readiness_gate.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected rollback ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        bundleError(
          containsSecret(item)
            ? "runtime_adapter_readiness_gate.secret_value_forbidden"
            : "runtime_adapter_readiness_gate.unsafe_readiness_authority",
          path,
          containsSecret(item)
            ? "Rollback refs cannot contain secret-like values."
            : "Rollback refs ask for unsafe authority.",
        ),
      );
      return;
    }
    const rollbackRef =
      typeof item.rollback_ref === "string" && safeRef(item.rollback_ref)
        ? item.rollback_ref
        : null;
    const ownerRef =
      typeof item.owner_ref === "string" && safeRef(item.owner_ref)
        ? item.owner_ref
        : null;
    const risk =
      typeof item.required_for_risk_level_at_or_above === "number" &&
      Number.isInteger(item.required_for_risk_level_at_or_above) &&
      item.required_for_risk_level_at_or_above >= 0 &&
      item.required_for_risk_level_at_or_above <= 8
        ? item.required_for_risk_level_at_or_above
        : null;
    const evidenceRefs = normalizeStringRefs(item.evidence_refs);
    if (
      rollbackRef === null ||
      ownerRef === null ||
      risk === null ||
      evidenceRefs.length === 0
    ) {
      errors.push(
        bundleError(
          "runtime_adapter_readiness_gate.invalid_rollback_ref",
          path,
          "Rollback ref requires safe rollback_ref, owner_ref, risk threshold, and evidence refs.",
        ),
      );
      return;
    }
    result.push({
      rollback_ref: rollbackRef,
      required_for_risk_level_at_or_above: risk,
      owner_ref: ownerRef,
      evidence_refs: evidenceRefs,
    });
  });
  return result;
}

function normalizePolicyGateRefs(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): SubstrateControlIntentPolicyGateInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.policy_gate_required",
        "/policy_gate_refs",
        "Runtime adapter readiness gate requires policy gate refs.",
      ),
    );
    return [];
  }
  const result: SubstrateControlIntentPolicyGateInput[] = [];
  value.forEach((item, index) => {
    const path = `/policy_gate_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        bundleError(
          "runtime_adapter_readiness_gate.invalid_policy_gate",
          path,
          "Policy gate ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!policyGateKeys.has(key)) {
        errors.push(
          bundleError(
            "runtime_adapter_readiness_gate.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected policy gate ref field.",
          ),
        );
      }
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
        bundleError(
          "runtime_adapter_readiness_gate.invalid_policy_gate",
          path,
          "Policy gate ref requires safe gate_ref, decision_ref, and required true.",
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
  errors: RuntimeAdapterReadinessGateError[],
): SubstrateControlIntentApprovalRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.approval_required",
        "/approval_refs",
        "Runtime adapter readiness gate requires approval refs.",
      ),
    );
    return [];
  }
  const result: SubstrateControlIntentApprovalRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/approval_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        bundleError(
          "runtime_adapter_readiness_gate.invalid_approval_ref",
          path,
          "Approval ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!approvalRefKeys.has(key)) {
        errors.push(
          bundleError(
            "runtime_adapter_readiness_gate.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected approval ref field.",
          ),
        );
      }
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
        bundleError(
          "runtime_adapter_readiness_gate.invalid_approval_ref",
          path,
          "Approval ref requires safe approval_ref, approval_type, and required true.",
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

function normalizeAuditEventRefs(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): AdapterInvocationResultAuditRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.audit_ref_required",
        "/audit_event_refs",
        "Runtime adapter readiness gate requires audit refs.",
      ),
    );
    return [];
  }
  const result: AdapterInvocationResultAuditRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/audit_event_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        bundleError(
          "runtime_adapter_readiness_gate.invalid_audit_ref",
          path,
          "Audit ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!auditRefKeys.has(key)) {
        errors.push(
          bundleError(
            "runtime_adapter_readiness_gate.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected audit ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        bundleError(
          containsSecret(item)
            ? "runtime_adapter_readiness_gate.secret_value_forbidden"
            : "runtime_adapter_readiness_gate.unsafe_readiness_authority",
          path,
          containsSecret(item)
            ? "Audit refs cannot contain secret-like values."
            : "Audit refs ask for unsafe authority.",
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
        bundleError(
          "runtime_adapter_readiness_gate.invalid_audit_ref",
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

function normalizeSourceRefs(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.source_ref_required",
        "/source_refs",
        "Runtime adapter readiness gate requires source refs.",
      ),
    );
    return [];
  }
  const result: string[] = [];
  value.forEach((item, index) => {
    const path = `/source_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        bundleError(
          "runtime_adapter_readiness_gate.invalid_source_ref",
          path,
          "Source ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          bundleError(
            "runtime_adapter_readiness_gate.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected source ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        bundleError(
          containsSecret(item)
            ? "runtime_adapter_readiness_gate.secret_value_forbidden"
            : "runtime_adapter_readiness_gate.unsafe_readiness_authority",
          path,
          containsSecret(item)
            ? "Source refs cannot contain secret-like values."
            : "Source refs ask for unsafe authority.",
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
        bundleError(
          "runtime_adapter_readiness_gate.invalid_source_ref",
          path,
          "Source ref requires safe source_ref and summary.",
        ),
      );
      return;
    }
    result.push(sourceRef);
  });
  return result;
}

function normalizeConsistency(
  value: unknown,
  errors: RuntimeAdapterReadinessGateError[],
): AdapterInvocationAuthorizationCrossRefConsistencyInput {
  if (!isPlainObject(value)) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.cross_ref_consistency_required",
        "/cross_ref_consistency",
        "Runtime adapter readiness gate requires cross-ref consistency evidence.",
      ),
    );
    return defaultRuntimeAdapterReadinessGate.cross_ref_consistency;
  }
  for (const key of Object.keys(value)) {
    if (!consistencyKeys.has(key)) {
      errors.push(
        bundleError(
          "runtime_adapter_readiness_gate.unexpected_field",
          `/cross_ref_consistency/${escapeJsonPointerSegment(key)}`,
          "Unexpected cross-ref consistency field.",
        ),
      );
    }
  }
  if (containsSecret(value) || unsafeAuthority(value)) {
    errors.push(
      bundleError(
        containsSecret(value)
          ? "runtime_adapter_readiness_gate.secret_value_forbidden"
          : "runtime_adapter_readiness_gate.unsafe_readiness_authority",
        "/cross_ref_consistency",
        containsSecret(value)
          ? "Cross-ref consistency cannot contain secret-like values."
          : "Cross-ref consistency asks for unsafe authority.",
      ),
    );
  }
  const actorRef =
    typeof value.actor_ref === "string" && safeRef(value.actor_ref)
      ? value.actor_ref
      : defaultRuntimeAdapterReadinessGate.cross_ref_consistency.actor_ref;
  const capability =
    typeof value.capability === "string" && safeCapability(value.capability)
      ? value.capability
      : defaultRuntimeAdapterReadinessGate.cross_ref_consistency.capability;
  const riskLevel =
    typeof value.risk_level === "number" &&
    Number.isInteger(value.risk_level) &&
    value.risk_level >= 0 &&
    value.risk_level <= 8
      ? value.risk_level
      : defaultRuntimeAdapterReadinessGate.cross_ref_consistency.risk_level;
  const substrateKind =
    typeof value.target_substrate_kind === "string" &&
    substrateKinds.has(value.target_substrate_kind as SubstrateKind)
      ? (value.target_substrate_kind as SubstrateKind)
      : defaultRuntimeAdapterReadinessGate.cross_ref_consistency.target_substrate_kind;
  const controlMode =
    typeof value.requested_control_mode === "string" &&
    controlModes.has(value.requested_control_mode as SubstrateControlMode)
      ? (value.requested_control_mode as SubstrateControlMode)
      : defaultRuntimeAdapterReadinessGate.cross_ref_consistency.requested_control_mode;
  const evidenceRefs = normalizeStringRefs(value.evidence_refs);
  if (evidenceRefs.length === 0) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.invalid_cross_ref_consistency",
        "/cross_ref_consistency/evidence_refs",
        "Cross-ref consistency requires evidence refs.",
      ),
    );
  }
  return {
    actor_ref: actorRef,
    capability,
    risk_level: riskLevel,
    target_substrate_kind: substrateKind,
    requested_control_mode: controlMode,
    evidence_refs: evidenceRefs,
  };
}

function checkConsistency(
  consistency: AdapterInvocationAuthorizationCrossRefConsistencyInput,
  requestedActor: SubstrateControlIntentActorInput,
  capability: string,
  riskLevel: number,
  substrateKind: SubstrateKind,
  controlMode: SubstrateControlMode,
  errors: RuntimeAdapterReadinessGateError[],
): void {
  if (consistency.actor_ref !== requestedActor.actor_ref) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.mismatched_actor",
        "/cross_ref_consistency/actor_ref",
        "Readiness gate actor must match cross-ref evidence.",
      ),
    );
  }
  if (consistency.capability !== capability) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.mismatched_capability",
        "/cross_ref_consistency/capability",
        "Readiness gate capability must match cross-ref evidence.",
      ),
    );
  }
  if (consistency.risk_level !== riskLevel) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.mismatched_risk_level",
        "/cross_ref_consistency/risk_level",
        "Readiness gate risk level must match cross-ref evidence.",
      ),
    );
  }
  if (consistency.target_substrate_kind !== substrateKind) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.mismatched_substrate_kind",
        "/cross_ref_consistency/target_substrate_kind",
        "Readiness gate substrate kind must match cross-ref evidence.",
      ),
    );
  }
  if (consistency.requested_control_mode !== controlMode) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.mismatched_control_mode",
        "/cross_ref_consistency/requested_control_mode",
        "Readiness gate control mode must match cross-ref evidence.",
      ),
    );
  }
}

function normalizeSafeStrings(
  value: unknown,
  path: string,
  requiredMessage: string,
  invalidCode: RuntimeAdapterReadinessGateErrorCode,
  errors: RuntimeAdapterReadinessGateError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "runtime_adapter_readiness_gate.denied_live_behavior_required",
        path,
        requiredMessage,
      ),
    );
    return [];
  }
  const result: string[] = [];
  value.forEach((item, index) => {
    if (
      typeof item !== "string" ||
      !safeString(item) ||
      containsSecret(item) ||
      unsafeAuthority(item)
    ) {
      errors.push(
        bundleError(
          containsSecret(item)
            ? "runtime_adapter_readiness_gate.secret_value_forbidden"
            : unsafeAuthority(item)
              ? "runtime_adapter_readiness_gate.unsafe_readiness_authority"
              : invalidCode,
          `${path}/${index}`,
          containsSecret(item)
            ? "Denied live behavior cannot contain secret-like values."
            : unsafeAuthority(item)
              ? "Denied live behavior asks for unsafe authority."
              : "Denied live behavior entry must be safe text.",
        ),
      );
      return;
    }
    result.push(item);
  });
  return result;
}

function normalizeStringRefs(value: unknown): string[] {
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
): boolean {
  return controlMode === "approval_gated_mutation" || riskLevel >= 4;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function dedupeErrors(
  errors: RuntimeAdapterReadinessGateError[],
): RuntimeAdapterReadinessGateError[] {
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

function failRuntimeAdapterReadinessGate(
  errors: RuntimeAdapterReadinessGateError[],
): RuntimeAdapterReadinessGateResult {
  return {
    ok: false,
    runtime_adapter_readiness_gate: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function bundleError(
  code: RuntimeAdapterReadinessGateErrorCode,
  path: string,
  message: string,
): RuntimeAdapterReadinessGateError {
  return { code, path, message, severity: "error" };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: string): boolean {
  return safeStringPattern.test(value) && !secretLikePattern.test(value);
}

function safeRef(value: string): boolean {
  return refPattern.test(value) && !secretLikePattern.test(value);
}

function safeCapability(value: string): boolean {
  return (
    capabilityPattern.test(value) &&
    !secretLikePattern.test(value) &&
    !unsafeAuthorityPattern.test(value)
  );
}

function safePolicyGate(value: string): boolean {
  return policyGatePattern.test(value) && !secretLikePattern.test(value);
}

function containsSecret(value: unknown): boolean {
  return secretLikePattern.test(JSON.stringify(value));
}

function unsafeAuthority(value: unknown): boolean {
  return unsafeAuthorityPattern.test(JSON.stringify(value));
}

function jsonPointer(key: string): string {
  return `/${escapeJsonPointerSegment(key)}`;
}

function escapeJsonPointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
