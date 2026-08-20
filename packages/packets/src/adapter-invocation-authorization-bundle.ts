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

export const ADAPTER_INVOCATION_AUTHORIZATION_BUNDLE_STATUS = "source_only";

export const adapterInvocationAuthorizationBundleContract = {
  contract_id: "lnsat.platform.adapter_invocation_authorization_bundle.v0_1",
  authority: [
    "@lnsat/packets",
    "source-backed-adapter-invocation-authorization-bundle",
  ],
  bundle_version: "0.1",
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
  authorization_authority: "authorization_bundle_only_no_invocation",
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type AdapterInvocationAuthorizationBundleIdentityInput = {
  bundle_ref: string;
  bundle_name: string;
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

export type AdapterInvocationAuthorizationBundleRequest = {
  bundle_version?: typeof adapterInvocationAuthorizationBundleContract.bundle_version;
  bundle_identity?: AdapterInvocationAuthorizationBundleIdentityInput;
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
  rollback_refs?: SubstrateControlIntentRollbackExpectationInput[];
  policy_gate_refs?: SubstrateControlIntentPolicyGateInput[];
  approval_refs?: SubstrateControlIntentApprovalRefInput[];
  audit_event_refs?: AdapterInvocationResultAuditRefInput[];
  source_refs?: AdapterInvocationAuthorizationSourceInput[];
  cross_ref_consistency?: AdapterInvocationAuthorizationCrossRefConsistencyInput;
  denied_live_behavior?: string[];
  authorization_authority?: typeof adapterInvocationAuthorizationBundleContract.authorization_authority;
  live_adapter_invocation_allowed?: false;
  live_broker_dispatch_allowed?: false;
  live_execution_allowed?: false;
  side_effects?: [];
};

export type AdapterInvocationAuthorizationBundleErrorCode =
  | "adapter_invocation_authorization_bundle.invalid_request"
  | "adapter_invocation_authorization_bundle.unexpected_field"
  | "adapter_invocation_authorization_bundle.invalid_version"
  | "adapter_invocation_authorization_bundle.invalid_bundle_identity"
  | "adapter_invocation_authorization_bundle.invalid_actor"
  | "adapter_invocation_authorization_bundle.invalid_capability"
  | "adapter_invocation_authorization_bundle.invalid_risk_level"
  | "adapter_invocation_authorization_bundle.invalid_substrate_kind"
  | "adapter_invocation_authorization_bundle.invalid_control_mode"
  | "adapter_invocation_authorization_bundle.substrate_control_intent_ref_required"
  | "adapter_invocation_authorization_bundle.invalid_substrate_control_intent_ref"
  | "adapter_invocation_authorization_bundle.broker_request_ref_required"
  | "adapter_invocation_authorization_bundle.invalid_broker_request_ref"
  | "adapter_invocation_authorization_bundle.adapter_manifest_ref_required"
  | "adapter_invocation_authorization_bundle.invalid_adapter_manifest_ref"
  | "adapter_invocation_authorization_bundle.preflight_ref_required"
  | "adapter_invocation_authorization_bundle.invalid_preflight_ref"
  | "adapter_invocation_authorization_bundle.expected_result_ref_required"
  | "adapter_invocation_authorization_bundle.invalid_expected_result_ref"
  | "adapter_invocation_authorization_bundle.rollback_ref_required"
  | "adapter_invocation_authorization_bundle.invalid_rollback_ref"
  | "adapter_invocation_authorization_bundle.policy_gate_required"
  | "adapter_invocation_authorization_bundle.invalid_policy_gate"
  | "adapter_invocation_authorization_bundle.approval_required"
  | "adapter_invocation_authorization_bundle.invalid_approval_ref"
  | "adapter_invocation_authorization_bundle.audit_ref_required"
  | "adapter_invocation_authorization_bundle.invalid_audit_ref"
  | "adapter_invocation_authorization_bundle.source_ref_required"
  | "adapter_invocation_authorization_bundle.invalid_source_ref"
  | "adapter_invocation_authorization_bundle.cross_ref_consistency_required"
  | "adapter_invocation_authorization_bundle.invalid_cross_ref_consistency"
  | "adapter_invocation_authorization_bundle.mismatched_actor"
  | "adapter_invocation_authorization_bundle.mismatched_capability"
  | "adapter_invocation_authorization_bundle.mismatched_risk_level"
  | "adapter_invocation_authorization_bundle.mismatched_substrate_kind"
  | "adapter_invocation_authorization_bundle.mismatched_control_mode"
  | "adapter_invocation_authorization_bundle.denied_live_behavior_required"
  | "adapter_invocation_authorization_bundle.invalid_denied_live_behavior"
  | "adapter_invocation_authorization_bundle.unsafe_authorization_authority"
  | "adapter_invocation_authorization_bundle.secret_value_forbidden"
  | "adapter_invocation_authorization_bundle.live_adapter_invocation_forbidden"
  | "adapter_invocation_authorization_bundle.live_broker_dispatch_forbidden"
  | "adapter_invocation_authorization_bundle.live_execution_forbidden"
  | "adapter_invocation_authorization_bundle.side_effects_forbidden";

export type AdapterInvocationAuthorizationBundleError = {
  code: AdapterInvocationAuthorizationBundleErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AdapterInvocationAuthorizationBundleEvidence = {
  contract_id: typeof adapterInvocationAuthorizationBundleContract.contract_id;
  bundle_version: typeof adapterInvocationAuthorizationBundleContract.bundle_version;
  bundle_identity: AdapterInvocationAuthorizationBundleIdentityInput;
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
  authorization_authority: typeof adapterInvocationAuthorizationBundleContract.authorization_authority;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type AdapterInvocationAuthorizationBundleResult =
  | {
      ok: true;
      adapter_invocation_authorization_bundle: AdapterInvocationAuthorizationBundleEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      adapter_invocation_authorization_bundle: null;
      errors: AdapterInvocationAuthorizationBundleError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedAdapterInvocationAuthorizationBundle =
  | {
      ok: true;
      bundle: Omit<
        AdapterInvocationAuthorizationBundleEvidence,
        "contract_id" | "bundle_version" | "side_effects"
      >;
    }
  | {
      ok: false;
      errors: AdapterInvocationAuthorizationBundleError[];
    };

const requestKeys = new Set([
  "bundle_version",
  "bundle_identity",
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
  "rollback_refs",
  "policy_gate_refs",
  "approval_refs",
  "audit_event_refs",
  "source_refs",
  "cross_ref_consistency",
  "denied_live_behavior",
  "authorization_authority",
  "live_adapter_invocation_allowed",
  "live_broker_dispatch_allowed",
  "live_execution_allowed",
  "side_effects",
]);
const identityKeys = new Set(["bundle_ref", "bundle_name", "owner_ref"]);
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
  /\b(root|sudo|shell|ssh\.raw|secret\.read|credential\.read|write\.execute|delete\.execute|drop|destroy\.execute|restart\.execute|deploy\.execute|dns\.write|cloudflare\.write|database\.write|db\.write|queue\.purge|docker\.socket|docker_socket|privileged|unrestricted|node_agent\.exec|rm -rf|live_dispatch|dispatch\.execute|adapter\.invoke|adapter_invocation|broker\.dispatch|invoke\.execute|runtime\.execution|authorization\.execute|authorization_grants_execution)\b/i;

export const defaultAdapterInvocationAuthorizationBundle: AdapterInvocationAuthorizationBundleEvidence =
  {
    contract_id: adapterInvocationAuthorizationBundleContract.contract_id,
    bundle_version: adapterInvocationAuthorizationBundleContract.bundle_version,
    bundle_identity: {
      bundle_ref: "authorization_bundle:service-control-adapter-invocation",
      bundle_name: "Service control adapter invocation authorization bundle",
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
    rollback_refs: defaultAdapterInvocationResult.rollback_refs,
    policy_gate_refs: [
      {
        gate_ref: "substrate.adapter.invocation.authorization_bundle.review",
        decision_ref:
          "policy_decision:adapter-invocation-authorization-bundle-source-only",
        required: true,
      },
      ...defaultAdapterInvocationResult.policy_gate_refs,
    ],
    required_policy_gates: [
      "substrate.adapter.invocation.authorization_bundle.review",
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
      "ticket:BP-0126: source-only adapter invocation authorization bundle contract",
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
      ],
    },
    denied_live_behavior: [
      ...defaultAdapterInvocationResult.denied_live_behavior,
      "authorization bundle does not invoke adapter",
      "authorization bundle does not dispatch broker request",
      "authorization bundle does not execute runtime path",
    ],
    authorization_authority:
      adapterInvocationAuthorizationBundleContract.authorization_authority,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    side_effects: [],
  };

export function createAdapterInvocationAuthorizationBundle(
  input: unknown = {},
): AdapterInvocationAuthorizationBundleResult {
  const normalized = normalizeAdapterInvocationAuthorizationBundle(input);

  if (!normalized.ok) {
    return failAdapterInvocationAuthorizationBundle(normalized.errors);
  }

  return {
    ok: true,
    adapter_invocation_authorization_bundle: {
      contract_id: adapterInvocationAuthorizationBundleContract.contract_id,
      bundle_version: adapterInvocationAuthorizationBundleContract.bundle_version,
      ...normalized.bundle,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeAdapterInvocationAuthorizationBundle(
  input: unknown,
): NormalizedAdapterInvocationAuthorizationBundle {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        bundleError(
          "adapter_invocation_authorization_bundle.invalid_request",
          "",
          "Adapter invocation authorization bundle request must be an object.",
        ),
      ],
    };
  }

  const errors: AdapterInvocationAuthorizationBundleError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        bundleError(
          "adapter_invocation_authorization_bundle.unexpected_field",
          jsonPointer(key),
          "Unexpected adapter invocation authorization bundle field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "bundle_version") &&
    input.bundle_version !== adapterInvocationAuthorizationBundleContract.bundle_version
  ) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.invalid_version",
        "/bundle_version",
        "Adapter invocation authorization bundle version is unsupported.",
      ),
    );
  }

  const bundleIdentity = Object.hasOwn(input, "bundle_identity")
    ? normalizeBundleIdentity(input.bundle_identity, errors)
    : defaultAdapterInvocationAuthorizationBundle.bundle_identity;
  const requestedActor = Object.hasOwn(input, "requested_actor")
    ? normalizeActor(input.requested_actor, errors)
    : defaultAdapterInvocationAuthorizationBundle.requested_actor;
  const capability = Object.hasOwn(input, "capability")
    ? normalizeCapability(input.capability, errors)
    : defaultAdapterInvocationAuthorizationBundle.capability;
  const riskLevel = Object.hasOwn(input, "risk_level")
    ? normalizeRiskLevel(input.risk_level, errors)
    : defaultAdapterInvocationAuthorizationBundle.risk_level;
  const substrateKind = Object.hasOwn(input, "target_substrate_kind")
    ? normalizeSubstrateKind(input.target_substrate_kind, errors)
    : defaultAdapterInvocationAuthorizationBundle.target_substrate_kind;
  const controlMode = Object.hasOwn(input, "requested_control_mode")
    ? normalizeControlMode(input.requested_control_mode, errors)
    : defaultAdapterInvocationAuthorizationBundle.requested_control_mode;
  const substrateIntentRefs = Object.hasOwn(input, "substrate_control_intent_refs")
    ? normalizeSubstrateIntentRefs(input.substrate_control_intent_refs, errors)
    : [...defaultAdapterInvocationAuthorizationBundle.substrate_control_intent_refs];
  const brokerRequestRefs = Object.hasOwn(input, "capability_broker_request_refs")
    ? normalizeBrokerRequestRefs(input.capability_broker_request_refs, errors)
    : [...defaultAdapterInvocationAuthorizationBundle.capability_broker_request_refs];
  const manifestRefs = Object.hasOwn(input, "substrate_adapter_manifest_refs")
    ? normalizeManifestRefs(input.substrate_adapter_manifest_refs, errors)
    : [...defaultAdapterInvocationAuthorizationBundle.substrate_adapter_manifest_refs];
  const preflightRefs = Object.hasOwn(input, "adapter_invocation_preflight_refs")
    ? normalizePreflightRefs(input.adapter_invocation_preflight_refs, errors)
    : [
        ...defaultAdapterInvocationAuthorizationBundle.adapter_invocation_preflight_refs,
      ];
  const expectedResultRefs = Object.hasOwn(input, "expected_result_refs")
    ? normalizeExpectedResultRefs(input.expected_result_refs, errors)
    : [...defaultAdapterInvocationAuthorizationBundle.expected_result_refs];
  const rollbackRefs = Object.hasOwn(input, "rollback_refs")
    ? normalizeRollbackRefs(input.rollback_refs, errors)
    : [...defaultAdapterInvocationAuthorizationBundle.rollback_refs];
  const policyGateRefs = Object.hasOwn(input, "policy_gate_refs")
    ? normalizePolicyGateRefs(input.policy_gate_refs, errors)
    : [...defaultAdapterInvocationAuthorizationBundle.policy_gate_refs];
  const approvalRefs = Object.hasOwn(input, "approval_refs")
    ? normalizeApprovalRefs(input.approval_refs, errors)
    : [...defaultAdapterInvocationAuthorizationBundle.approval_refs];
  const auditEventRefs = Object.hasOwn(input, "audit_event_refs")
    ? normalizeAuditEventRefs(input.audit_event_refs, errors)
    : [...defaultAdapterInvocationAuthorizationBundle.audit_event_refs];
  const sourceRefs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, errors)
    : [...defaultAdapterInvocationAuthorizationBundle.source_refs];
  const consistency = Object.hasOwn(input, "cross_ref_consistency")
    ? normalizeConsistency(input.cross_ref_consistency, errors)
    : defaultAdapterInvocationAuthorizationBundle.cross_ref_consistency;
  const deniedLiveBehavior = Object.hasOwn(input, "denied_live_behavior")
    ? normalizeSafeStrings(
        input.denied_live_behavior,
        "/denied_live_behavior",
        "Adapter invocation authorization bundle requires denied live behavior.",
        "adapter_invocation_authorization_bundle.invalid_denied_live_behavior",
        errors,
      )
    : [...defaultAdapterInvocationAuthorizationBundle.denied_live_behavior];

  if (
    Object.hasOwn(input, "authorization_authority") &&
    input.authorization_authority !==
      adapterInvocationAuthorizationBundleContract.authorization_authority
  ) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.unsafe_authorization_authority",
        "/authorization_authority",
        "Adapter invocation authorization bundle cannot grant invocation authority.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_adapter_invocation_allowed") &&
    input.live_adapter_invocation_allowed !== false
  ) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.live_adapter_invocation_forbidden",
        "/live_adapter_invocation_allowed",
        "Adapter invocation authorization bundle cannot enable live adapter invocation.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_broker_dispatch_allowed") &&
    input.live_broker_dispatch_allowed !== false
  ) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.live_broker_dispatch_forbidden",
        "/live_broker_dispatch_allowed",
        "Adapter invocation authorization bundle cannot enable live broker dispatch.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_execution_allowed") &&
    input.live_execution_allowed !== false
  ) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.live_execution_forbidden",
        "/live_execution_allowed",
        "Adapter invocation authorization bundle cannot enable live execution.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.side_effects_forbidden",
        "/side_effects",
        "Adapter invocation authorization bundle must preserve side_effects: [].",
      ),
    );
  }

  if (substrateIntentRefs.length === 0) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.substrate_control_intent_ref_required",
        "/substrate_control_intent_refs",
        "Adapter invocation authorization bundle requires substrate control intent refs.",
      ),
    );
  }
  if (brokerRequestRefs.length === 0) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.broker_request_ref_required",
        "/capability_broker_request_refs",
        "Adapter invocation authorization bundle requires capability broker request refs.",
      ),
    );
  }
  if (manifestRefs.length === 0) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.adapter_manifest_ref_required",
        "/substrate_adapter_manifest_refs",
        "Adapter invocation authorization bundle requires substrate adapter manifest refs.",
      ),
    );
  }
  if (preflightRefs.length === 0) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.preflight_ref_required",
        "/adapter_invocation_preflight_refs",
        "Adapter invocation authorization bundle requires preflight refs.",
      ),
    );
  }
  if (expectedResultRefs.length === 0) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.expected_result_ref_required",
        "/expected_result_refs",
        "Adapter invocation authorization bundle requires expected result refs.",
      ),
    );
  }
  if (rollbackRefs.length === 0) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.rollback_ref_required",
        "/rollback_refs",
        "Adapter invocation authorization bundle requires rollback refs.",
      ),
    );
  }
  if (policyGateRefs.length === 0) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.policy_gate_required",
        "/policy_gate_refs",
        "Adapter invocation authorization bundle requires policy gate refs.",
      ),
    );
  }
  if (approvalRefs.length === 0) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.approval_required",
        "/approval_refs",
        "Adapter invocation authorization bundle requires approval refs.",
      ),
    );
  }
  if (auditEventRefs.length === 0) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.audit_ref_required",
        "/audit_event_refs",
        "Adapter invocation authorization bundle requires audit refs.",
      ),
    );
  }
  if (sourceRefs.length === 0) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.source_ref_required",
        "/source_refs",
        "Adapter invocation authorization bundle requires source refs.",
      ),
    );
  }
  if (consistency.evidence_refs.length === 0) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.cross_ref_consistency_required",
        "/cross_ref_consistency/evidence_refs",
        "Adapter invocation authorization bundle requires consistency evidence refs.",
      ),
    );
  }
  if (deniedLiveBehavior.length === 0) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.denied_live_behavior_required",
        "/denied_live_behavior",
        "Adapter invocation authorization bundle requires denied live behavior.",
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
      bundle_identity: bundleIdentity,
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
      rollback_refs: rollbackRefs,
      policy_gate_refs: policyGateRefs,
      required_policy_gates: uniqueStrings([
        "substrate.adapter.invocation.authorization_bundle.review",
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
        ...defaultAdapterInvocationAuthorizationBundle.consistency_requirements,
      ],
      cross_ref_consistency: consistency,
      denied_live_behavior: uniqueStrings(deniedLiveBehavior),
      authorization_authority:
        adapterInvocationAuthorizationBundleContract.authorization_authority,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
    },
  };
}

function normalizeBundleIdentity(
  value: unknown,
  errors: AdapterInvocationAuthorizationBundleError[],
): AdapterInvocationAuthorizationBundleIdentityInput {
  if (!isPlainObject(value)) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.invalid_bundle_identity",
        "/bundle_identity",
        "Adapter invocation authorization bundle requires bundle identity.",
      ),
    );
    return defaultAdapterInvocationAuthorizationBundle.bundle_identity;
  }
  for (const key of Object.keys(value)) {
    if (!identityKeys.has(key)) {
      errors.push(
        bundleError(
          "adapter_invocation_authorization_bundle.unexpected_field",
          `/bundle_identity/${escapeJsonPointerSegment(key)}`,
          "Unexpected bundle identity field.",
        ),
      );
    }
  }
  const bundleRef =
    typeof value.bundle_ref === "string" && safeRef(value.bundle_ref)
      ? value.bundle_ref
      : null;
  const bundleName =
    typeof value.bundle_name === "string" && safeString(value.bundle_name)
      ? value.bundle_name
      : null;
  const ownerRef =
    typeof value.owner_ref === "string" && safeRef(value.owner_ref)
      ? value.owner_ref
      : null;
  if (bundleRef === null || bundleName === null || ownerRef === null) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.invalid_bundle_identity",
        "/bundle_identity",
        "Bundle identity requires safe bundle_ref, bundle_name, and owner_ref.",
      ),
    );
  }
  return {
    bundle_ref:
      bundleRef ??
      defaultAdapterInvocationAuthorizationBundle.bundle_identity.bundle_ref,
    bundle_name:
      bundleName ??
      defaultAdapterInvocationAuthorizationBundle.bundle_identity.bundle_name,
    owner_ref:
      ownerRef ?? defaultAdapterInvocationAuthorizationBundle.bundle_identity.owner_ref,
  };
}

function normalizeActor(
  value: unknown,
  errors: AdapterInvocationAuthorizationBundleError[],
): SubstrateControlIntentActorInput {
  if (!isPlainObject(value)) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.invalid_actor",
        "/requested_actor",
        "Adapter invocation authorization bundle requires requested actor.",
      ),
    );
    return defaultAdapterInvocationAuthorizationBundle.requested_actor;
  }
  for (const key of Object.keys(value)) {
    if (!actorKeys.has(key)) {
      errors.push(
        bundleError(
          "adapter_invocation_authorization_bundle.unexpected_field",
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
        "adapter_invocation_authorization_bundle.invalid_actor",
        "/requested_actor",
        "Requested actor requires safe actor_ref, actor_type, and role_ref.",
      ),
    );
  }
  return {
    actor_ref:
      actorRef ?? defaultAdapterInvocationAuthorizationBundle.requested_actor.actor_ref,
    actor_type:
      actorType ??
      defaultAdapterInvocationAuthorizationBundle.requested_actor.actor_type,
    role_ref:
      roleRef ?? defaultAdapterInvocationAuthorizationBundle.requested_actor.role_ref,
  };
}

function normalizeCapability(
  value: unknown,
  errors: AdapterInvocationAuthorizationBundleError[],
): string {
  if (typeof value !== "string" || !safeCapability(value)) {
    errors.push(
      bundleError(
        unsafeAuthority(value)
          ? "adapter_invocation_authorization_bundle.unsafe_authorization_authority"
          : "adapter_invocation_authorization_bundle.invalid_capability",
        "/capability",
        unsafeAuthority(value)
          ? "Adapter invocation authorization bundle capability asks for unsafe authority."
          : "Adapter invocation authorization bundle capability must be safe dotted capability text.",
      ),
    );
    return defaultAdapterInvocationAuthorizationBundle.capability;
  }
  return value;
}

function normalizeRiskLevel(
  value: unknown,
  errors: AdapterInvocationAuthorizationBundleError[],
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 8) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.invalid_risk_level",
        "/risk_level",
        "Adapter invocation authorization bundle risk level must be an integer from 0 to 8.",
      ),
    );
    return defaultAdapterInvocationAuthorizationBundle.risk_level;
  }
  return value;
}

function normalizeSubstrateKind(
  value: unknown,
  errors: AdapterInvocationAuthorizationBundleError[],
): SubstrateKind {
  if (typeof value !== "string" || !substrateKinds.has(value as SubstrateKind)) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.invalid_substrate_kind",
        "/target_substrate_kind",
        "Adapter invocation authorization bundle target substrate kind is unsupported.",
      ),
    );
    return defaultAdapterInvocationAuthorizationBundle.target_substrate_kind;
  }
  return value as SubstrateKind;
}

function normalizeControlMode(
  value: unknown,
  errors: AdapterInvocationAuthorizationBundleError[],
): SubstrateControlMode {
  if (typeof value !== "string" || !controlModes.has(value as SubstrateControlMode)) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.invalid_control_mode",
        "/requested_control_mode",
        "Adapter invocation authorization bundle control mode is unsupported.",
      ),
    );
    return defaultAdapterInvocationAuthorizationBundle.requested_control_mode;
  }
  return value as SubstrateControlMode;
}

function normalizeSubstrateIntentRefs(
  value: unknown,
  errors: AdapterInvocationAuthorizationBundleError[],
): AdapterInvocationAuthorizationSubstrateIntentRefInput[] {
  return normalizeContractRefs(
    value,
    "/substrate_control_intent_refs",
    "intent_ref",
    intentRefKeys,
    substrateControlIntentContract.contract_id,
    "adapter_invocation_authorization_bundle.substrate_control_intent_ref_required",
    "adapter_invocation_authorization_bundle.invalid_substrate_control_intent_ref",
    "Adapter invocation authorization bundle requires substrate control intent refs.",
    "Substrate control intent ref requires safe refs, supported contract_id, and summary.",
    errors,
  ) as AdapterInvocationAuthorizationSubstrateIntentRefInput[];
}

function normalizeBrokerRequestRefs(
  value: unknown,
  errors: AdapterInvocationAuthorizationBundleError[],
): AdapterInvocationAuthorizationBrokerRequestRefInput[] {
  return normalizeContractRefs(
    value,
    "/capability_broker_request_refs",
    "request_ref",
    brokerRefKeys,
    capabilityBrokerRequestContract.contract_id,
    "adapter_invocation_authorization_bundle.broker_request_ref_required",
    "adapter_invocation_authorization_bundle.invalid_broker_request_ref",
    "Adapter invocation authorization bundle requires capability broker request refs.",
    "Capability broker request ref requires safe refs, supported contract_id, and summary.",
    errors,
  ) as AdapterInvocationAuthorizationBrokerRequestRefInput[];
}

function normalizeManifestRefs(
  value: unknown,
  errors: AdapterInvocationAuthorizationBundleError[],
): AdapterInvocationAuthorizationManifestRefInput[] {
  return normalizeContractRefs(
    value,
    "/substrate_adapter_manifest_refs",
    "manifest_ref",
    manifestRefKeys,
    substrateAdapterManifestContract.contract_id,
    "adapter_invocation_authorization_bundle.adapter_manifest_ref_required",
    "adapter_invocation_authorization_bundle.invalid_adapter_manifest_ref",
    "Adapter invocation authorization bundle requires substrate adapter manifest refs.",
    "Substrate adapter manifest ref requires safe refs, supported contract_id, and summary.",
    errors,
  ) as AdapterInvocationAuthorizationManifestRefInput[];
}

function normalizePreflightRefs(
  value: unknown,
  errors: AdapterInvocationAuthorizationBundleError[],
): AdapterInvocationAuthorizationPreflightRefInput[] {
  return normalizeContractRefs(
    value,
    "/adapter_invocation_preflight_refs",
    "preflight_ref",
    preflightRefKeys,
    adapterInvocationPreflightContract.contract_id,
    "adapter_invocation_authorization_bundle.preflight_ref_required",
    "adapter_invocation_authorization_bundle.invalid_preflight_ref",
    "Adapter invocation authorization bundle requires preflight refs.",
    "Adapter invocation preflight ref requires safe refs, supported contract_id, and summary.",
    errors,
  ) as AdapterInvocationAuthorizationPreflightRefInput[];
}

type ContractRefOutput =
  | AdapterInvocationAuthorizationSubstrateIntentRefInput
  | AdapterInvocationAuthorizationBrokerRequestRefInput
  | AdapterInvocationAuthorizationManifestRefInput
  | AdapterInvocationAuthorizationPreflightRefInput;

function normalizeContractRefs(
  value: unknown,
  basePath: string,
  primaryKey: "intent_ref" | "request_ref" | "manifest_ref" | "preflight_ref",
  allowedKeys: ReadonlySet<string>,
  contractId: string,
  requiredCode: AdapterInvocationAuthorizationBundleErrorCode,
  invalidCode: AdapterInvocationAuthorizationBundleErrorCode,
  requiredMessage: string,
  invalidMessage: string,
  errors: AdapterInvocationAuthorizationBundleError[],
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
            "adapter_invocation_authorization_bundle.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected authorization ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(
        bundleError(
          containsSecret(item)
            ? "adapter_invocation_authorization_bundle.secret_value_forbidden"
            : "adapter_invocation_authorization_bundle.unsafe_authorization_authority",
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
  errors: AdapterInvocationAuthorizationBundleError[],
): AdapterInvocationResultExpectedResultRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.expected_result_ref_required",
        "/expected_result_refs",
        "Adapter invocation authorization bundle requires expected result refs.",
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
          "adapter_invocation_authorization_bundle.invalid_expected_result_ref",
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
            "adapter_invocation_authorization_bundle.unexpected_field",
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
            ? "adapter_invocation_authorization_bundle.secret_value_forbidden"
            : "adapter_invocation_authorization_bundle.unsafe_authorization_authority",
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
          "adapter_invocation_authorization_bundle.invalid_expected_result_ref",
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
  errors: AdapterInvocationAuthorizationBundleError[],
): SubstrateControlIntentRollbackExpectationInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.rollback_ref_required",
        "/rollback_refs",
        "Adapter invocation authorization bundle requires rollback refs.",
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
          "adapter_invocation_authorization_bundle.invalid_rollback_ref",
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
            "adapter_invocation_authorization_bundle.unexpected_field",
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
            ? "adapter_invocation_authorization_bundle.secret_value_forbidden"
            : "adapter_invocation_authorization_bundle.unsafe_authorization_authority",
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
          "adapter_invocation_authorization_bundle.invalid_rollback_ref",
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
  errors: AdapterInvocationAuthorizationBundleError[],
): SubstrateControlIntentPolicyGateInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.policy_gate_required",
        "/policy_gate_refs",
        "Adapter invocation authorization bundle requires policy gate refs.",
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
          "adapter_invocation_authorization_bundle.invalid_policy_gate",
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
            "adapter_invocation_authorization_bundle.unexpected_field",
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
          "adapter_invocation_authorization_bundle.invalid_policy_gate",
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
  errors: AdapterInvocationAuthorizationBundleError[],
): SubstrateControlIntentApprovalRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.approval_required",
        "/approval_refs",
        "Adapter invocation authorization bundle requires approval refs.",
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
          "adapter_invocation_authorization_bundle.invalid_approval_ref",
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
            "adapter_invocation_authorization_bundle.unexpected_field",
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
          "adapter_invocation_authorization_bundle.invalid_approval_ref",
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
  errors: AdapterInvocationAuthorizationBundleError[],
): AdapterInvocationResultAuditRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.audit_ref_required",
        "/audit_event_refs",
        "Adapter invocation authorization bundle requires audit refs.",
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
          "adapter_invocation_authorization_bundle.invalid_audit_ref",
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
            "adapter_invocation_authorization_bundle.unexpected_field",
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
            ? "adapter_invocation_authorization_bundle.secret_value_forbidden"
            : "adapter_invocation_authorization_bundle.unsafe_authorization_authority",
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
          "adapter_invocation_authorization_bundle.invalid_audit_ref",
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
  errors: AdapterInvocationAuthorizationBundleError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.source_ref_required",
        "/source_refs",
        "Adapter invocation authorization bundle requires source refs.",
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
          "adapter_invocation_authorization_bundle.invalid_source_ref",
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
            "adapter_invocation_authorization_bundle.unexpected_field",
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
            ? "adapter_invocation_authorization_bundle.secret_value_forbidden"
            : "adapter_invocation_authorization_bundle.unsafe_authorization_authority",
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
          "adapter_invocation_authorization_bundle.invalid_source_ref",
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
  errors: AdapterInvocationAuthorizationBundleError[],
): AdapterInvocationAuthorizationCrossRefConsistencyInput {
  if (!isPlainObject(value)) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.cross_ref_consistency_required",
        "/cross_ref_consistency",
        "Adapter invocation authorization bundle requires cross-ref consistency evidence.",
      ),
    );
    return defaultAdapterInvocationAuthorizationBundle.cross_ref_consistency;
  }
  for (const key of Object.keys(value)) {
    if (!consistencyKeys.has(key)) {
      errors.push(
        bundleError(
          "adapter_invocation_authorization_bundle.unexpected_field",
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
          ? "adapter_invocation_authorization_bundle.secret_value_forbidden"
          : "adapter_invocation_authorization_bundle.unsafe_authorization_authority",
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
      : defaultAdapterInvocationAuthorizationBundle.cross_ref_consistency.actor_ref;
  const capability =
    typeof value.capability === "string" && safeCapability(value.capability)
      ? value.capability
      : defaultAdapterInvocationAuthorizationBundle.cross_ref_consistency.capability;
  const riskLevel =
    typeof value.risk_level === "number" &&
    Number.isInteger(value.risk_level) &&
    value.risk_level >= 0 &&
    value.risk_level <= 8
      ? value.risk_level
      : defaultAdapterInvocationAuthorizationBundle.cross_ref_consistency.risk_level;
  const substrateKind =
    typeof value.target_substrate_kind === "string" &&
    substrateKinds.has(value.target_substrate_kind as SubstrateKind)
      ? (value.target_substrate_kind as SubstrateKind)
      : defaultAdapterInvocationAuthorizationBundle.cross_ref_consistency
          .target_substrate_kind;
  const controlMode =
    typeof value.requested_control_mode === "string" &&
    controlModes.has(value.requested_control_mode as SubstrateControlMode)
      ? (value.requested_control_mode as SubstrateControlMode)
      : defaultAdapterInvocationAuthorizationBundle.cross_ref_consistency
          .requested_control_mode;
  const evidenceRefs = normalizeStringRefs(value.evidence_refs);
  if (evidenceRefs.length === 0) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.invalid_cross_ref_consistency",
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
  errors: AdapterInvocationAuthorizationBundleError[],
): void {
  if (consistency.actor_ref !== requestedActor.actor_ref) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.mismatched_actor",
        "/cross_ref_consistency/actor_ref",
        "Authorization bundle actor must match cross-ref evidence.",
      ),
    );
  }
  if (consistency.capability !== capability) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.mismatched_capability",
        "/cross_ref_consistency/capability",
        "Authorization bundle capability must match cross-ref evidence.",
      ),
    );
  }
  if (consistency.risk_level !== riskLevel) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.mismatched_risk_level",
        "/cross_ref_consistency/risk_level",
        "Authorization bundle risk level must match cross-ref evidence.",
      ),
    );
  }
  if (consistency.target_substrate_kind !== substrateKind) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.mismatched_substrate_kind",
        "/cross_ref_consistency/target_substrate_kind",
        "Authorization bundle substrate kind must match cross-ref evidence.",
      ),
    );
  }
  if (consistency.requested_control_mode !== controlMode) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.mismatched_control_mode",
        "/cross_ref_consistency/requested_control_mode",
        "Authorization bundle control mode must match cross-ref evidence.",
      ),
    );
  }
}

function normalizeSafeStrings(
  value: unknown,
  path: string,
  requiredMessage: string,
  invalidCode: AdapterInvocationAuthorizationBundleErrorCode,
  errors: AdapterInvocationAuthorizationBundleError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      bundleError(
        "adapter_invocation_authorization_bundle.denied_live_behavior_required",
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
            ? "adapter_invocation_authorization_bundle.secret_value_forbidden"
            : unsafeAuthority(item)
              ? "adapter_invocation_authorization_bundle.unsafe_authorization_authority"
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
  errors: AdapterInvocationAuthorizationBundleError[],
): AdapterInvocationAuthorizationBundleError[] {
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

function failAdapterInvocationAuthorizationBundle(
  errors: AdapterInvocationAuthorizationBundleError[],
): AdapterInvocationAuthorizationBundleResult {
  return {
    ok: false,
    adapter_invocation_authorization_bundle: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function bundleError(
  code: AdapterInvocationAuthorizationBundleErrorCode,
  path: string,
  message: string,
): AdapterInvocationAuthorizationBundleError {
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
