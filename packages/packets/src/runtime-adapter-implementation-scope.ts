import type { CapabilityBrokerAdapterClass } from "./capability-broker-request.js";
import type { AdapterInvocationResultAuditRefInput } from "./adapter-invocation-result.js";
import {
  defaultRuntimeAdapterReadinessGate,
  runtimeAdapterReadinessGateContract,
} from "./runtime-adapter-readiness-gate.js";
import type {
  RuntimeAdapterReadinessGateIdentityInput,
  RuntimeAdapterReadinessGateEvidence,
} from "./runtime-adapter-readiness-gate.js";
import type {
  SubstrateControlIntentActorInput,
  SubstrateControlIntentApprovalRefInput,
  SubstrateControlIntentPolicyGateInput,
  SubstrateControlIntentRollbackExpectationInput,
} from "./substrate-control-intent.js";
import type { SubstrateControlMode, SubstrateKind } from "./substrate-taxonomy.js";

export const RUNTIME_ADAPTER_IMPLEMENTATION_SCOPE_STATUS = "source_only";

export const runtimeAdapterImplementationScopeContract = {
  contract_id: "lnsat.platform.runtime_adapter_implementation_scope.v0_1",
  authority: ["@lnsat/packets", "source-backed-runtime-adapter-implementation-scope"],
  implementation_scope_version: "0.1",
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
  implementation_authority: "implementation_scope_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type RuntimeAdapterImplementationScopeIdentityInput = {
  scope_ref: string;
  scope_name: string;
  owner_ref: string;
  future_packet_ref: string;
};

export type RuntimeAdapterImplementationScopeReadinessRefInput = {
  readiness_ref: string;
  evidence_ref: string;
  contract_id: typeof runtimeAdapterReadinessGateContract.contract_id;
  summary: string;
};

export type RuntimeAdapterImplementationScopeAdapterIdentityInput = {
  adapter_ref: string;
  adapter_name: string;
  owner_ref: string;
};

export type RuntimeAdapterImplementationBoundaryInput = {
  boundary_ref: string;
  rule: string;
  evidence_ref: string;
};

export type RuntimeAdapterAllowedSourceZoneInput = {
  zone_ref: string;
  path_ref: string;
  summary: string;
};

export type RuntimeAdapterRequiredTestInput = {
  test_ref: string;
  evidence_ref: string;
  summary: string;
};

export type RuntimeAdapterDryRunExpectationInput = {
  dry_run_ref: string;
  expected_artifact_ref: string;
  summary: string;
};

export type RuntimeAdapterImplementationScopeSourceInput = {
  source_ref: string;
  summary: string;
};

export type RuntimeAdapterImplementationScopeRequest = {
  implementation_scope_version?: typeof runtimeAdapterImplementationScopeContract.implementation_scope_version;
  scope_identity?: RuntimeAdapterImplementationScopeIdentityInput;
  runtime_adapter_readiness_gate_refs?: RuntimeAdapterImplementationScopeReadinessRefInput[];
  requested_actor?: SubstrateControlIntentActorInput;
  capability?: string;
  risk_level?: number;
  target_substrate_kind?: SubstrateKind;
  requested_control_mode?: SubstrateControlMode;
  adapter_identity?: RuntimeAdapterImplementationScopeAdapterIdentityInput;
  adapter_class?: CapabilityBrokerAdapterClass;
  implementation_boundaries?: RuntimeAdapterImplementationBoundaryInput[];
  allowed_source_zones?: RuntimeAdapterAllowedSourceZoneInput[];
  required_tests?: RuntimeAdapterRequiredTestInput[];
  dry_run_expectations?: RuntimeAdapterDryRunExpectationInput[];
  rollback_refs?: SubstrateControlIntentRollbackExpectationInput[];
  policy_gate_refs?: SubstrateControlIntentPolicyGateInput[];
  approval_refs?: SubstrateControlIntentApprovalRefInput[];
  audit_event_refs?: AdapterInvocationResultAuditRefInput[];
  source_refs?: RuntimeAdapterImplementationScopeSourceInput[];
  implementation_authority?: typeof runtimeAdapterImplementationScopeContract.implementation_authority;
  runtime_adapter_implementation_allowed?: false;
  runtime_adapter_dispatch_allowed?: false;
  live_adapter_invocation_allowed?: false;
  live_broker_dispatch_allowed?: false;
  live_execution_allowed?: false;
  side_effects?: [];
};

export type RuntimeAdapterImplementationScopeErrorCode =
  | "runtime_adapter_implementation_scope.invalid_request"
  | "runtime_adapter_implementation_scope.unexpected_field"
  | "runtime_adapter_implementation_scope.invalid_version"
  | "runtime_adapter_implementation_scope.invalid_scope_identity"
  | "runtime_adapter_implementation_scope.readiness_ref_required"
  | "runtime_adapter_implementation_scope.invalid_readiness_ref"
  | "runtime_adapter_implementation_scope.invalid_actor"
  | "runtime_adapter_implementation_scope.invalid_capability"
  | "runtime_adapter_implementation_scope.invalid_risk_level"
  | "runtime_adapter_implementation_scope.invalid_substrate_kind"
  | "runtime_adapter_implementation_scope.invalid_control_mode"
  | "runtime_adapter_implementation_scope.invalid_adapter_identity"
  | "runtime_adapter_implementation_scope.invalid_adapter_class"
  | "runtime_adapter_implementation_scope.implementation_boundary_required"
  | "runtime_adapter_implementation_scope.invalid_implementation_boundary"
  | "runtime_adapter_implementation_scope.allowed_source_zone_required"
  | "runtime_adapter_implementation_scope.invalid_allowed_source_zone"
  | "runtime_adapter_implementation_scope.required_test_required"
  | "runtime_adapter_implementation_scope.invalid_required_test"
  | "runtime_adapter_implementation_scope.dry_run_expectation_required"
  | "runtime_adapter_implementation_scope.invalid_dry_run_expectation"
  | "runtime_adapter_implementation_scope.rollback_ref_required"
  | "runtime_adapter_implementation_scope.invalid_rollback_ref"
  | "runtime_adapter_implementation_scope.policy_gate_required"
  | "runtime_adapter_implementation_scope.invalid_policy_gate"
  | "runtime_adapter_implementation_scope.approval_required"
  | "runtime_adapter_implementation_scope.invalid_approval_ref"
  | "runtime_adapter_implementation_scope.audit_ref_required"
  | "runtime_adapter_implementation_scope.invalid_audit_ref"
  | "runtime_adapter_implementation_scope.source_ref_required"
  | "runtime_adapter_implementation_scope.invalid_source_ref"
  | "runtime_adapter_implementation_scope.unsafe_implementation_authority"
  | "runtime_adapter_implementation_scope.secret_value_forbidden"
  | "runtime_adapter_implementation_scope.runtime_adapter_implementation_forbidden"
  | "runtime_adapter_implementation_scope.runtime_adapter_dispatch_forbidden"
  | "runtime_adapter_implementation_scope.live_adapter_invocation_forbidden"
  | "runtime_adapter_implementation_scope.live_broker_dispatch_forbidden"
  | "runtime_adapter_implementation_scope.live_execution_forbidden"
  | "runtime_adapter_implementation_scope.side_effects_forbidden";

export type RuntimeAdapterImplementationScopeError = {
  code: RuntimeAdapterImplementationScopeErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type RuntimeAdapterImplementationScopeEvidence = {
  contract_id: typeof runtimeAdapterImplementationScopeContract.contract_id;
  implementation_scope_version: typeof runtimeAdapterImplementationScopeContract.implementation_scope_version;
  scope_identity: RuntimeAdapterImplementationScopeIdentityInput;
  runtime_adapter_readiness_gate_refs: RuntimeAdapterImplementationScopeReadinessRefInput[];
  requested_actor: SubstrateControlIntentActorInput;
  capability: string;
  risk_level: number;
  target_substrate_kind: SubstrateKind;
  requested_control_mode: SubstrateControlMode;
  adapter_identity: RuntimeAdapterImplementationScopeAdapterIdentityInput;
  adapter_class: CapabilityBrokerAdapterClass;
  implementation_boundaries: RuntimeAdapterImplementationBoundaryInput[];
  allowed_source_zones: RuntimeAdapterAllowedSourceZoneInput[];
  required_tests: RuntimeAdapterRequiredTestInput[];
  dry_run_expectations: RuntimeAdapterDryRunExpectationInput[];
  rollback_refs: SubstrateControlIntentRollbackExpectationInput[];
  policy_gate_refs: SubstrateControlIntentPolicyGateInput[];
  required_policy_gates: string[];
  approval_refs: SubstrateControlIntentApprovalRefInput[];
  required_approvals: string[];
  audit_event_refs: AdapterInvocationResultAuditRefInput[];
  required_audit_events: string[];
  source_refs: string[];
  readiness_evidence_snapshot: Pick<
    RuntimeAdapterReadinessGateEvidence,
    | "contract_id"
    | "readiness_identity"
    | "readiness_authority"
    | "runtime_adapter_dispatch_allowed"
    | "live_adapter_invocation_allowed"
    | "live_broker_dispatch_allowed"
    | "live_execution_allowed"
    | "side_effects"
  >;
  denied_runtime_behavior: string[];
  implementation_authority: typeof runtimeAdapterImplementationScopeContract.implementation_authority;
  runtime_adapter_implementation_allowed: false;
  runtime_adapter_dispatch_allowed: false;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type RuntimeAdapterImplementationScopeResult =
  | {
      ok: true;
      runtime_adapter_implementation_scope: RuntimeAdapterImplementationScopeEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      runtime_adapter_implementation_scope: null;
      errors: RuntimeAdapterImplementationScopeError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedRuntimeAdapterImplementationScope =
  | {
      ok: true;
      scope: Omit<
        RuntimeAdapterImplementationScopeEvidence,
        "contract_id" | "implementation_scope_version" | "side_effects"
      >;
    }
  | {
      ok: false;
      errors: RuntimeAdapterImplementationScopeError[];
    };

const requestKeys = new Set([
  "implementation_scope_version",
  "scope_identity",
  "runtime_adapter_readiness_gate_refs",
  "requested_actor",
  "capability",
  "risk_level",
  "target_substrate_kind",
  "requested_control_mode",
  "adapter_identity",
  "adapter_class",
  "implementation_boundaries",
  "allowed_source_zones",
  "required_tests",
  "dry_run_expectations",
  "rollback_refs",
  "policy_gate_refs",
  "approval_refs",
  "audit_event_refs",
  "source_refs",
  "implementation_authority",
  "runtime_adapter_implementation_allowed",
  "runtime_adapter_dispatch_allowed",
  "live_adapter_invocation_allowed",
  "live_broker_dispatch_allowed",
  "live_execution_allowed",
  "side_effects",
]);
const scopeIdentityKeys = new Set([
  "scope_ref",
  "scope_name",
  "owner_ref",
  "future_packet_ref",
]);
const readinessRefKeys = new Set([
  "readiness_ref",
  "evidence_ref",
  "contract_id",
  "summary",
]);
const actorKeys = new Set(["actor_ref", "actor_type", "role_ref"]);
const adapterIdentityKeys = new Set(["adapter_ref", "adapter_name", "owner_ref"]);
const boundaryKeys = new Set(["boundary_ref", "rule", "evidence_ref"]);
const sourceZoneKeys = new Set(["zone_ref", "path_ref", "summary"]);
const testKeys = new Set(["test_ref", "evidence_ref", "summary"]);
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
const unsafeAuthorityPattern =
  /\b(root|sudo|shell|ssh\.raw|secret\.read|credential\.read|write\.execute|delete\.execute|drop|destroy\.execute|restart\.execute|deploy\.execute|dns\.write|cloudflare\.write|database\.write|db\.write|queue\.purge|docker\.socket|docker_socket|privileged|unrestricted|node_agent\.exec|rm -rf|raw command|live_dispatch|dispatch\.execute|adapter\.invoke|adapter_invocation|broker\.dispatch|invoke\.execute|runtime\.execution|runtime_adapter_dispatch|runtime_adapter\.dispatch|runtime_adapter_implementation|adapter_implementation|implementation\.execute)\b/i;

export const defaultRuntimeAdapterImplementationScope: RuntimeAdapterImplementationScopeEvidence =
  {
    contract_id: runtimeAdapterImplementationScopeContract.contract_id,
    implementation_scope_version:
      runtimeAdapterImplementationScopeContract.implementation_scope_version,
    scope_identity: {
      scope_ref: "implementation_scope:service-control-adapter-runtime",
      scope_name: "Service control runtime adapter implementation scope",
      owner_ref: "owner:lnsat-platform",
      future_packet_ref: "packet:BP-0139-runtime-adapter-implementation",
    },
    runtime_adapter_readiness_gate_refs: [
      {
        readiness_ref:
          defaultRuntimeAdapterReadinessGate.readiness_identity.readiness_ref,
        evidence_ref: "evidence:bp0132-runtime-adapter-readiness-gate",
        contract_id: runtimeAdapterReadinessGateContract.contract_id,
        summary: "BP-0132 source-only runtime adapter readiness gate evidence",
      },
    ],
    requested_actor: defaultRuntimeAdapterReadinessGate.requested_actor,
    capability: defaultRuntimeAdapterReadinessGate.capability,
    risk_level: defaultRuntimeAdapterReadinessGate.risk_level,
    target_substrate_kind: defaultRuntimeAdapterReadinessGate.target_substrate_kind,
    requested_control_mode: defaultRuntimeAdapterReadinessGate.requested_control_mode,
    adapter_identity: {
      adapter_ref: "adapter:service-control-runtime-adapter",
      adapter_name: "Service control runtime adapter scope",
      owner_ref: "owner:lnsat-platform",
    },
    adapter_class: "service_control_adapter",
    implementation_boundaries: [
      {
        boundary_ref: "boundary:source-only-adapter-scope",
        rule: "Scope contract may describe future adapter implementation zones only",
        evidence_ref: "evidence:bp0138-no-runtime-adapter-implementation",
      },
      {
        boundary_ref: "boundary:no-live-dispatch-or-invocation",
        rule: "Scope contract must not dispatch broker requests or invoke adapters",
        evidence_ref: "evidence:bp0132-readiness-denied-live-behavior",
      },
    ],
    allowed_source_zones: [
      {
        zone_ref: "zone:packages-runtime-adapters-future",
        path_ref: "src:packages/runtime-adapters",
        summary: "Future source zone only after a later approved packet",
      },
      {
        zone_ref: "zone:packages-packets-contracts",
        path_ref: "src:packages/packets",
        summary: "Packet contract evidence zone for BP-0138 only",
      },
    ],
    required_tests: [
      {
        test_ref: "test:runtime-adapter-implementation-scope-contract",
        evidence_ref: "evidence:bp0138-packets-tests",
        summary: "Contract validates source-only scope and fail-closed probes",
      },
    ],
    dry_run_expectations: [
      {
        dry_run_ref: "dry_run:future-runtime-adapter-noop",
        expected_artifact_ref: "artifact:future-adapter-dry-run-plan",
        summary: "Future packet must prove dry-run plan before adapter implementation",
      },
    ],
    rollback_refs: defaultRuntimeAdapterReadinessGate.rollback_refs,
    policy_gate_refs: [
      {
        gate_ref: "substrate.adapter.implementation_scope.review",
        decision_ref:
          "policy_decision:runtime-adapter-implementation-scope-source-only",
        required: true,
      },
      ...defaultRuntimeAdapterReadinessGate.policy_gate_refs,
    ],
    required_policy_gates: [
      "substrate.adapter.implementation_scope.review",
      ...defaultRuntimeAdapterReadinessGate.required_policy_gates,
    ].sort(),
    approval_refs: defaultRuntimeAdapterReadinessGate.approval_refs,
    required_approvals: defaultRuntimeAdapterReadinessGate.required_approvals,
    audit_event_refs: defaultRuntimeAdapterReadinessGate.audit_event_refs,
    required_audit_events: defaultRuntimeAdapterReadinessGate.required_audit_events,
    source_refs: [
      "doc:docs/architecture/PACKET_MODEL.md",
      "doc:docs/architecture/POLICY_AND_AUDIT.md",
      "doc:docs/architecture/SYSTEM_ARCHITECTURE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "ticket:BP-0138: source-only runtime adapter implementation scope contract",
    ],
    readiness_evidence_snapshot: {
      contract_id: defaultRuntimeAdapterReadinessGate.contract_id,
      readiness_identity: defaultRuntimeAdapterReadinessGate.readiness_identity,
      readiness_authority: defaultRuntimeAdapterReadinessGate.readiness_authority,
      runtime_adapter_dispatch_allowed:
        defaultRuntimeAdapterReadinessGate.runtime_adapter_dispatch_allowed,
      live_adapter_invocation_allowed:
        defaultRuntimeAdapterReadinessGate.live_adapter_invocation_allowed,
      live_broker_dispatch_allowed:
        defaultRuntimeAdapterReadinessGate.live_broker_dispatch_allowed,
      live_execution_allowed: defaultRuntimeAdapterReadinessGate.live_execution_allowed,
      side_effects: [],
    },
    denied_runtime_behavior: [
      "implementation scope does not create runtime adapter implementation",
      "implementation scope does not register dispatcher",
      "implementation scope does not dispatch broker request",
      "implementation scope does not invoke adapter",
      "implementation scope does not execute live runtime path",
    ],
    implementation_authority:
      runtimeAdapterImplementationScopeContract.implementation_authority,
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    side_effects: [],
  };

export function createRuntimeAdapterImplementationScope(
  input: unknown = {},
): RuntimeAdapterImplementationScopeResult {
  const normalized = normalizeRuntimeAdapterImplementationScope(input);

  if (!normalized.ok) {
    return failRuntimeAdapterImplementationScope(normalized.errors);
  }

  return {
    ok: true,
    runtime_adapter_implementation_scope: {
      contract_id: runtimeAdapterImplementationScopeContract.contract_id,
      implementation_scope_version:
        runtimeAdapterImplementationScopeContract.implementation_scope_version,
      ...normalized.scope,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeRuntimeAdapterImplementationScope(
  input: unknown,
): NormalizedRuntimeAdapterImplementationScope {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        scopeError(
          "runtime_adapter_implementation_scope.invalid_request",
          "",
          "Runtime adapter implementation scope request must be an object.",
        ),
      ],
    };
  }

  const errors: RuntimeAdapterImplementationScopeError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        scopeError(
          "runtime_adapter_implementation_scope.unexpected_field",
          jsonPointer(key),
          "Unexpected runtime adapter implementation scope field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "implementation_scope_version") &&
    input.implementation_scope_version !==
      runtimeAdapterImplementationScopeContract.implementation_scope_version
  ) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.invalid_version",
        "/implementation_scope_version",
        "Runtime adapter implementation scope version is unsupported.",
      ),
    );
  }

  const scopeIdentity = Object.hasOwn(input, "scope_identity")
    ? normalizeScopeIdentity(input.scope_identity, errors)
    : defaultRuntimeAdapterImplementationScope.scope_identity;
  const readinessRefs = Object.hasOwn(input, "runtime_adapter_readiness_gate_refs")
    ? normalizeReadinessRefs(input.runtime_adapter_readiness_gate_refs, errors)
    : [...defaultRuntimeAdapterImplementationScope.runtime_adapter_readiness_gate_refs];
  const requestedActor = Object.hasOwn(input, "requested_actor")
    ? normalizeActor(input.requested_actor, errors)
    : defaultRuntimeAdapterImplementationScope.requested_actor;
  const capability = Object.hasOwn(input, "capability")
    ? normalizeCapability(input.capability, errors)
    : defaultRuntimeAdapterImplementationScope.capability;
  const riskLevel = Object.hasOwn(input, "risk_level")
    ? normalizeRiskLevel(input.risk_level, errors)
    : defaultRuntimeAdapterImplementationScope.risk_level;
  const substrateKind = Object.hasOwn(input, "target_substrate_kind")
    ? normalizeSubstrateKind(input.target_substrate_kind, errors)
    : defaultRuntimeAdapterImplementationScope.target_substrate_kind;
  const controlMode = Object.hasOwn(input, "requested_control_mode")
    ? normalizeControlMode(input.requested_control_mode, errors)
    : defaultRuntimeAdapterImplementationScope.requested_control_mode;
  const adapterIdentity = Object.hasOwn(input, "adapter_identity")
    ? normalizeAdapterIdentity(input.adapter_identity, errors)
    : defaultRuntimeAdapterImplementationScope.adapter_identity;
  const adapterClass = Object.hasOwn(input, "adapter_class")
    ? normalizeAdapterClass(input.adapter_class, errors)
    : defaultRuntimeAdapterImplementationScope.adapter_class;
  const implementationBoundaries = Object.hasOwn(input, "implementation_boundaries")
    ? normalizeBoundaries(input.implementation_boundaries, errors)
    : [...defaultRuntimeAdapterImplementationScope.implementation_boundaries];
  const allowedSourceZones = Object.hasOwn(input, "allowed_source_zones")
    ? normalizeSourceZones(input.allowed_source_zones, errors)
    : [...defaultRuntimeAdapterImplementationScope.allowed_source_zones];
  const requiredTests = Object.hasOwn(input, "required_tests")
    ? normalizeTests(input.required_tests, errors)
    : [...defaultRuntimeAdapterImplementationScope.required_tests];
  const dryRunExpectations = Object.hasOwn(input, "dry_run_expectations")
    ? normalizeDryRuns(input.dry_run_expectations, errors)
    : [...defaultRuntimeAdapterImplementationScope.dry_run_expectations];
  const rollbackRefs = Object.hasOwn(input, "rollback_refs")
    ? normalizeRollbackRefs(input.rollback_refs, errors)
    : [...defaultRuntimeAdapterImplementationScope.rollback_refs];
  const policyGateRefs = Object.hasOwn(input, "policy_gate_refs")
    ? normalizePolicyGateRefs(input.policy_gate_refs, errors)
    : [...defaultRuntimeAdapterImplementationScope.policy_gate_refs];
  const approvalRefs = Object.hasOwn(input, "approval_refs")
    ? normalizeApprovalRefs(input.approval_refs, errors)
    : [...defaultRuntimeAdapterImplementationScope.approval_refs];
  const auditEventRefs = Object.hasOwn(input, "audit_event_refs")
    ? normalizeAuditEventRefs(input.audit_event_refs, errors)
    : [...defaultRuntimeAdapterImplementationScope.audit_event_refs];
  const sourceRefs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, errors)
    : [...defaultRuntimeAdapterImplementationScope.source_refs];

  if (
    Object.hasOwn(input, "implementation_authority") &&
    input.implementation_authority !==
      runtimeAdapterImplementationScopeContract.implementation_authority
  ) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.unsafe_implementation_authority",
        "/implementation_authority",
        "Runtime adapter implementation scope cannot grant runtime adapter authority.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "runtime_adapter_implementation_allowed") &&
    input.runtime_adapter_implementation_allowed !== false
  ) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.runtime_adapter_implementation_forbidden",
        "/runtime_adapter_implementation_allowed",
        "Runtime adapter implementation scope cannot enable runtime adapter implementation.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "runtime_adapter_dispatch_allowed") &&
    input.runtime_adapter_dispatch_allowed !== false
  ) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.runtime_adapter_dispatch_forbidden",
        "/runtime_adapter_dispatch_allowed",
        "Runtime adapter implementation scope cannot enable runtime adapter dispatch.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_adapter_invocation_allowed") &&
    input.live_adapter_invocation_allowed !== false
  ) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.live_adapter_invocation_forbidden",
        "/live_adapter_invocation_allowed",
        "Runtime adapter implementation scope cannot enable live adapter invocation.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_broker_dispatch_allowed") &&
    input.live_broker_dispatch_allowed !== false
  ) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.live_broker_dispatch_forbidden",
        "/live_broker_dispatch_allowed",
        "Runtime adapter implementation scope cannot enable live broker dispatch.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "live_execution_allowed") &&
    input.live_execution_allowed !== false
  ) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.live_execution_forbidden",
        "/live_execution_allowed",
        "Runtime adapter implementation scope cannot enable live execution.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.side_effects_forbidden",
        "/side_effects",
        "Runtime adapter implementation scope must preserve side_effects: [].",
      ),
    );
  }

  if (readinessRefs.length === 0) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.readiness_ref_required",
        "/runtime_adapter_readiness_gate_refs",
        "Runtime adapter implementation scope requires readiness gate refs.",
      ),
    );
  }
  if (implementationBoundaries.length === 0) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.implementation_boundary_required",
        "/implementation_boundaries",
        "Runtime adapter implementation scope requires implementation boundaries.",
      ),
    );
  }
  if (allowedSourceZones.length === 0) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.allowed_source_zone_required",
        "/allowed_source_zones",
        "Runtime adapter implementation scope requires allowed source zones.",
      ),
    );
  }
  if (requiredTests.length === 0) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.required_test_required",
        "/required_tests",
        "Runtime adapter implementation scope requires test refs.",
      ),
    );
  }
  if (dryRunExpectations.length === 0) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.dry_run_expectation_required",
        "/dry_run_expectations",
        "Runtime adapter implementation scope requires dry-run expectations.",
      ),
    );
  }
  if (rollbackRefs.length === 0) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.rollback_ref_required",
        "/rollback_refs",
        "Runtime adapter implementation scope requires rollback refs.",
      ),
    );
  }
  if (policyGateRefs.length === 0) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.policy_gate_required",
        "/policy_gate_refs",
        "Runtime adapter implementation scope requires policy gate refs.",
      ),
    );
  }
  if (approvalRefs.length === 0) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.approval_required",
        "/approval_refs",
        "Runtime adapter implementation scope requires approval refs.",
      ),
    );
  }
  if (auditEventRefs.length === 0) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.audit_ref_required",
        "/audit_event_refs",
        "Runtime adapter implementation scope requires audit refs.",
      ),
    );
  }
  if (sourceRefs.length === 0) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.source_ref_required",
        "/source_refs",
        "Runtime adapter implementation scope requires source refs.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    scope: {
      scope_identity: scopeIdentity,
      runtime_adapter_readiness_gate_refs: readinessRefs,
      requested_actor: requestedActor,
      capability,
      risk_level: riskLevel,
      target_substrate_kind: substrateKind,
      requested_control_mode: controlMode,
      adapter_identity: adapterIdentity,
      adapter_class: adapterClass,
      implementation_boundaries: implementationBoundaries,
      allowed_source_zones: allowedSourceZones,
      required_tests: requiredTests,
      dry_run_expectations: dryRunExpectations,
      rollback_refs: rollbackRefs,
      policy_gate_refs: policyGateRefs,
      required_policy_gates: uniqueStrings([
        "substrate.adapter.implementation_scope.review",
        ...policyGateRefs.map((gate) => gate.gate_ref),
      ]),
      approval_refs: approvalRefs,
      required_approvals: uniqueStrings(approvalRefs.map((ref) => ref.approval_ref)),
      audit_event_refs: auditEventRefs,
      required_audit_events: uniqueStrings(
        auditEventRefs.map((event) => event.event_type),
      ),
      source_refs: sourceRefs,
      readiness_evidence_snapshot:
        defaultRuntimeAdapterImplementationScope.readiness_evidence_snapshot,
      denied_runtime_behavior: [
        ...defaultRuntimeAdapterImplementationScope.denied_runtime_behavior,
      ],
      implementation_authority:
        runtimeAdapterImplementationScopeContract.implementation_authority,
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
    },
  };
}

function normalizeScopeIdentity(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): RuntimeAdapterImplementationScopeIdentityInput {
  if (!isPlainObject(value)) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.invalid_scope_identity",
        "/scope_identity",
        "Runtime adapter implementation scope requires scope identity.",
      ),
    );
    return defaultRuntimeAdapterImplementationScope.scope_identity;
  }
  for (const key of Object.keys(value)) {
    if (!scopeIdentityKeys.has(key)) {
      errors.push(
        scopeError(
          "runtime_adapter_implementation_scope.unexpected_field",
          `/scope_identity/${escapeJsonPointerSegment(key)}`,
          "Unexpected scope identity field.",
        ),
      );
    }
  }
  const scopeRef =
    typeof value.scope_ref === "string" && safeRef(value.scope_ref)
      ? value.scope_ref
      : null;
  const scopeName =
    typeof value.scope_name === "string" && safeString(value.scope_name)
      ? value.scope_name
      : null;
  const ownerRef =
    typeof value.owner_ref === "string" && safeRef(value.owner_ref)
      ? value.owner_ref
      : null;
  const futurePacketRef =
    typeof value.future_packet_ref === "string" && safeRef(value.future_packet_ref)
      ? value.future_packet_ref
      : null;
  if (
    scopeRef === null ||
    scopeName === null ||
    ownerRef === null ||
    futurePacketRef === null
  ) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.invalid_scope_identity",
        "/scope_identity",
        "Scope identity requires safe scope_ref, scope_name, owner_ref, and future_packet_ref.",
      ),
    );
  }
  return {
    scope_ref:
      scopeRef ?? defaultRuntimeAdapterImplementationScope.scope_identity.scope_ref,
    scope_name:
      scopeName ?? defaultRuntimeAdapterImplementationScope.scope_identity.scope_name,
    owner_ref:
      ownerRef ?? defaultRuntimeAdapterImplementationScope.scope_identity.owner_ref,
    future_packet_ref:
      futurePacketRef ??
      defaultRuntimeAdapterImplementationScope.scope_identity.future_packet_ref,
  };
}

function normalizeReadinessRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): RuntimeAdapterImplementationScopeReadinessRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.readiness_ref_required",
        "/runtime_adapter_readiness_gate_refs",
        "Runtime adapter implementation scope requires readiness gate refs.",
      ),
    );
    return [];
  }
  const result: RuntimeAdapterImplementationScopeReadinessRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/runtime_adapter_readiness_gate_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        scopeError(
          "runtime_adapter_implementation_scope.invalid_readiness_ref",
          path,
          "Readiness ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!readinessRefKeys.has(key)) {
        errors.push(
          scopeError(
            "runtime_adapter_implementation_scope.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected readiness ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(secretOrUnsafeError(path, "Readiness refs", containsSecret(item)));
      return;
    }
    const readinessRef =
      typeof item.readiness_ref === "string" && safeRef(item.readiness_ref)
        ? item.readiness_ref
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
      readinessRef === null ||
      evidenceRef === null ||
      item.contract_id !== runtimeAdapterReadinessGateContract.contract_id ||
      summary === null
    ) {
      errors.push(
        scopeError(
          "runtime_adapter_implementation_scope.invalid_readiness_ref",
          path,
          "Readiness ref requires safe refs, BP-0132 contract_id, and summary.",
        ),
      );
      return;
    }
    result.push({
      readiness_ref: readinessRef,
      evidence_ref: evidenceRef,
      contract_id: runtimeAdapterReadinessGateContract.contract_id,
      summary,
    });
  });
  return result;
}

function normalizeActor(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): SubstrateControlIntentActorInput {
  if (!isPlainObject(value)) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.invalid_actor",
        "/requested_actor",
        "Runtime adapter implementation scope requires requested actor.",
      ),
    );
    return defaultRuntimeAdapterImplementationScope.requested_actor;
  }
  for (const key of Object.keys(value)) {
    if (!actorKeys.has(key)) {
      errors.push(
        scopeError(
          "runtime_adapter_implementation_scope.unexpected_field",
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
      scopeError(
        "runtime_adapter_implementation_scope.invalid_actor",
        "/requested_actor",
        "Requested actor requires safe actor_ref, actor_type, and role_ref.",
      ),
    );
  }
  return {
    actor_ref:
      actorRef ?? defaultRuntimeAdapterImplementationScope.requested_actor.actor_ref,
    actor_type:
      actorType ?? defaultRuntimeAdapterImplementationScope.requested_actor.actor_type,
    role_ref:
      roleRef ?? defaultRuntimeAdapterImplementationScope.requested_actor.role_ref,
  };
}

function normalizeCapability(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): string {
  if (typeof value !== "string" || !safeCapability(value)) {
    errors.push(
      scopeError(
        unsafeAuthority(value)
          ? "runtime_adapter_implementation_scope.unsafe_implementation_authority"
          : "runtime_adapter_implementation_scope.invalid_capability",
        "/capability",
        unsafeAuthority(value)
          ? "Runtime adapter implementation scope capability asks for unsafe authority."
          : "Runtime adapter implementation scope capability must be safe dotted capability text.",
      ),
    );
    return defaultRuntimeAdapterImplementationScope.capability;
  }
  return value;
}

function normalizeRiskLevel(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 8) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.invalid_risk_level",
        "/risk_level",
        "Runtime adapter implementation scope risk level must be an integer from 0 to 8.",
      ),
    );
    return defaultRuntimeAdapterImplementationScope.risk_level;
  }
  return value;
}

function normalizeSubstrateKind(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): SubstrateKind {
  if (typeof value !== "string" || !substrateKinds.has(value as SubstrateKind)) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.invalid_substrate_kind",
        "/target_substrate_kind",
        "Runtime adapter implementation scope target substrate kind is unsupported.",
      ),
    );
    return defaultRuntimeAdapterImplementationScope.target_substrate_kind;
  }
  return value as SubstrateKind;
}

function normalizeControlMode(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): SubstrateControlMode {
  if (typeof value !== "string" || !controlModes.has(value as SubstrateControlMode)) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.invalid_control_mode",
        "/requested_control_mode",
        "Runtime adapter implementation scope control mode is unsupported.",
      ),
    );
    return defaultRuntimeAdapterImplementationScope.requested_control_mode;
  }
  return value as SubstrateControlMode;
}

function normalizeAdapterIdentity(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): RuntimeAdapterImplementationScopeAdapterIdentityInput {
  if (!isPlainObject(value)) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.invalid_adapter_identity",
        "/adapter_identity",
        "Runtime adapter implementation scope requires adapter identity.",
      ),
    );
    return defaultRuntimeAdapterImplementationScope.adapter_identity;
  }
  for (const key of Object.keys(value)) {
    if (!adapterIdentityKeys.has(key)) {
      errors.push(
        scopeError(
          "runtime_adapter_implementation_scope.unexpected_field",
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
      scopeError(
        "runtime_adapter_implementation_scope.invalid_adapter_identity",
        "/adapter_identity",
        "Adapter identity requires safe adapter_ref, adapter_name, and owner_ref.",
      ),
    );
  }
  return {
    adapter_ref:
      adapterRef ??
      defaultRuntimeAdapterImplementationScope.adapter_identity.adapter_ref,
    adapter_name:
      adapterName ??
      defaultRuntimeAdapterImplementationScope.adapter_identity.adapter_name,
    owner_ref:
      ownerRef ?? defaultRuntimeAdapterImplementationScope.adapter_identity.owner_ref,
  };
}

function normalizeAdapterClass(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): CapabilityBrokerAdapterClass {
  if (
    typeof value !== "string" ||
    !adapterClasses.has(value as CapabilityBrokerAdapterClass)
  ) {
    errors.push(
      scopeError(
        unsafeAuthority(value)
          ? "runtime_adapter_implementation_scope.unsafe_implementation_authority"
          : "runtime_adapter_implementation_scope.invalid_adapter_class",
        "/adapter_class",
        unsafeAuthority(value)
          ? "Runtime adapter implementation scope adapter class asks for unsafe authority."
          : "Runtime adapter implementation scope adapter class is unsupported.",
      ),
    );
    return defaultRuntimeAdapterImplementationScope.adapter_class;
  }
  return value as CapabilityBrokerAdapterClass;
}

function normalizeBoundaries(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): RuntimeAdapterImplementationBoundaryInput[] {
  return normalizeTripleRefs(
    value,
    "/implementation_boundaries",
    "boundary_ref",
    "rule",
    "evidence_ref",
    boundaryKeys,
    refPattern,
    safeString,
    refPattern,
    "runtime_adapter_implementation_scope.implementation_boundary_required",
    "runtime_adapter_implementation_scope.invalid_implementation_boundary",
    "Runtime adapter implementation scope requires implementation boundaries.",
    "Implementation boundary requires safe boundary_ref, rule, and evidence_ref.",
    "Implementation boundaries",
    errors,
  ) as RuntimeAdapterImplementationBoundaryInput[];
}

function normalizeSourceZones(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): RuntimeAdapterAllowedSourceZoneInput[] {
  return normalizeTripleRefs(
    value,
    "/allowed_source_zones",
    "zone_ref",
    "path_ref",
    "summary",
    sourceZoneKeys,
    refPattern,
    safePathRef,
    safeString,
    "runtime_adapter_implementation_scope.allowed_source_zone_required",
    "runtime_adapter_implementation_scope.invalid_allowed_source_zone",
    "Runtime adapter implementation scope requires allowed source zones.",
    "Allowed source zone requires safe zone_ref, path_ref, and summary.",
    "Allowed source zones",
    errors,
  ) as RuntimeAdapterAllowedSourceZoneInput[];
}

function normalizeTests(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): RuntimeAdapterRequiredTestInput[] {
  return normalizeTripleRefs(
    value,
    "/required_tests",
    "test_ref",
    "evidence_ref",
    "summary",
    testKeys,
    refPattern,
    refPattern,
    safeString,
    "runtime_adapter_implementation_scope.required_test_required",
    "runtime_adapter_implementation_scope.invalid_required_test",
    "Runtime adapter implementation scope requires test refs.",
    "Required test requires safe test_ref, evidence_ref, and summary.",
    "Required tests",
    errors,
  ) as RuntimeAdapterRequiredTestInput[];
}

function normalizeDryRuns(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): RuntimeAdapterDryRunExpectationInput[] {
  return normalizeTripleRefs(
    value,
    "/dry_run_expectations",
    "dry_run_ref",
    "expected_artifact_ref",
    "summary",
    dryRunKeys,
    refPattern,
    refPattern,
    safeString,
    "runtime_adapter_implementation_scope.dry_run_expectation_required",
    "runtime_adapter_implementation_scope.invalid_dry_run_expectation",
    "Runtime adapter implementation scope requires dry-run expectations.",
    "Dry-run expectation requires safe dry_run_ref, expected_artifact_ref, and summary.",
    "Dry-run expectations",
    errors,
  ) as RuntimeAdapterDryRunExpectationInput[];
}

type TripleRefOutput =
  | RuntimeAdapterImplementationBoundaryInput
  | RuntimeAdapterAllowedSourceZoneInput
  | RuntimeAdapterRequiredTestInput
  | RuntimeAdapterDryRunExpectationInput;

function normalizeTripleRefs(
  value: unknown,
  basePath: string,
  keyA: string,
  keyB: string,
  keyC: string,
  allowedKeys: ReadonlySet<string>,
  validateA: RegExp | ((value: string) => boolean),
  validateB: RegExp | ((value: string) => boolean),
  validateC: RegExp | ((value: string) => boolean),
  requiredCode: RuntimeAdapterImplementationScopeErrorCode,
  invalidCode: RuntimeAdapterImplementationScopeErrorCode,
  requiredMessage: string,
  invalidMessage: string,
  label: string,
  errors: RuntimeAdapterImplementationScopeError[],
): TripleRefOutput[] {
  if (!Array.isArray(value)) {
    errors.push(scopeError(requiredCode, basePath, requiredMessage));
    return [];
  }
  const result: TripleRefOutput[] = [];
  value.forEach((item, index) => {
    const path = `${basePath}/${index}`;
    if (!isPlainObject(item)) {
      errors.push(scopeError(invalidCode, path, `${label} item must be an object.`));
      return;
    }
    for (const key of Object.keys(item)) {
      if (!allowedKeys.has(key)) {
        errors.push(
          scopeError(
            "runtime_adapter_implementation_scope.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            `Unexpected ${label.toLowerCase()} field.`,
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(secretOrUnsafeError(path, label, containsSecret(item)));
      return;
    }
    const valueA = typeof item[keyA] === "string" ? item[keyA] : null;
    const valueB = typeof item[keyB] === "string" ? item[keyB] : null;
    const valueC = typeof item[keyC] === "string" ? item[keyC] : null;
    if (
      valueA === null ||
      valueB === null ||
      valueC === null ||
      !matchesValidator(valueA, validateA) ||
      !matchesValidator(valueB, validateB) ||
      !matchesValidator(valueC, validateC)
    ) {
      errors.push(scopeError(invalidCode, path, invalidMessage));
      return;
    }
    result.push({ [keyA]: valueA, [keyB]: valueB, [keyC]: valueC } as TripleRefOutput);
  });
  return result;
}

function normalizeRollbackRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationScopeError[],
): SubstrateControlIntentRollbackExpectationInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.rollback_ref_required",
        "/rollback_refs",
        "Runtime adapter implementation scope requires rollback refs.",
      ),
    );
    return [];
  }
  const result: SubstrateControlIntentRollbackExpectationInput[] = [];
  value.forEach((item, index) => {
    const path = `/rollback_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        scopeError(
          "runtime_adapter_implementation_scope.invalid_rollback_ref",
          path,
          "Rollback ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!rollbackRefKeys.has(key)) {
        errors.push(
          scopeError(
            "runtime_adapter_implementation_scope.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected rollback ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(secretOrUnsafeError(path, "Rollback refs", containsSecret(item)));
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
        scopeError(
          "runtime_adapter_implementation_scope.invalid_rollback_ref",
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
  errors: RuntimeAdapterImplementationScopeError[],
): SubstrateControlIntentPolicyGateInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.policy_gate_required",
        "/policy_gate_refs",
        "Runtime adapter implementation scope requires policy gate refs.",
      ),
    );
    return [];
  }
  const result: SubstrateControlIntentPolicyGateInput[] = [];
  value.forEach((item, index) => {
    const path = `/policy_gate_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        scopeError(
          "runtime_adapter_implementation_scope.invalid_policy_gate",
          path,
          "Policy gate ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!policyGateKeys.has(key)) {
        errors.push(
          scopeError(
            "runtime_adapter_implementation_scope.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected policy gate field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(secretOrUnsafeError(path, "Policy gate refs", containsSecret(item)));
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
        scopeError(
          "runtime_adapter_implementation_scope.invalid_policy_gate",
          path,
          "Policy gate requires safe gate_ref, decision_ref, and required: true.",
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
  errors: RuntimeAdapterImplementationScopeError[],
): SubstrateControlIntentApprovalRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.approval_required",
        "/approval_refs",
        "Runtime adapter implementation scope requires approval refs.",
      ),
    );
    return [];
  }
  const result: SubstrateControlIntentApprovalRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/approval_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        scopeError(
          "runtime_adapter_implementation_scope.invalid_approval_ref",
          path,
          "Approval ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!approvalRefKeys.has(key)) {
        errors.push(
          scopeError(
            "runtime_adapter_implementation_scope.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected approval ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(secretOrUnsafeError(path, "Approval refs", containsSecret(item)));
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
        scopeError(
          "runtime_adapter_implementation_scope.invalid_approval_ref",
          path,
          "Approval ref requires safe approval_ref, approval_type, and required: true.",
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
  errors: RuntimeAdapterImplementationScopeError[],
): AdapterInvocationResultAuditRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.audit_ref_required",
        "/audit_event_refs",
        "Runtime adapter implementation scope requires audit refs.",
      ),
    );
    return [];
  }
  const result: AdapterInvocationResultAuditRefInput[] = [];
  value.forEach((item, index) => {
    const path = `/audit_event_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        scopeError(
          "runtime_adapter_implementation_scope.invalid_audit_ref",
          path,
          "Audit ref must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!auditRefKeys.has(key)) {
        errors.push(
          scopeError(
            "runtime_adapter_implementation_scope.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected audit ref field.",
          ),
        );
      }
    }
    if (containsSecret(item) || unsafeAuthority(item)) {
      errors.push(secretOrUnsafeError(path, "Audit refs", containsSecret(item)));
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
        scopeError(
          "runtime_adapter_implementation_scope.invalid_audit_ref",
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
  errors: RuntimeAdapterImplementationScopeError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.source_ref_required",
        "/source_refs",
        "Runtime adapter implementation scope requires source refs.",
      ),
    );
    return [];
  }
  const result: string[] = [];
  value.forEach((item, index) => {
    const path = `/source_refs/${index}`;
    if (typeof item === "string" && safeRef(item)) {
      result.push(item);
      return;
    }
    if (isPlainObject(item)) {
      for (const key of Object.keys(item)) {
        if (!sourceKeys.has(key)) {
          errors.push(
            scopeError(
              "runtime_adapter_implementation_scope.unexpected_field",
              `${path}/${escapeJsonPointerSegment(key)}`,
              "Unexpected source ref field.",
            ),
          );
        }
      }
      if (containsSecret(item) || unsafeAuthority(item)) {
        errors.push(secretOrUnsafeError(path, "Source refs", containsSecret(item)));
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
      if (sourceRef !== null && summary !== null) {
        result.push(sourceRef);
        return;
      }
    }
    errors.push(
      scopeError(
        "runtime_adapter_implementation_scope.invalid_source_ref",
        path,
        "Source ref requires safe source_ref and summary.",
      ),
    );
  });
  return uniqueStrings(result);
}

function failRuntimeAdapterImplementationScope(
  errors: RuntimeAdapterImplementationScopeError[],
): RuntimeAdapterImplementationScopeResult {
  return {
    ok: false,
    runtime_adapter_implementation_scope: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function secretOrUnsafeError(
  path: string,
  label: string,
  isSecret: boolean,
): RuntimeAdapterImplementationScopeError {
  return scopeError(
    isSecret
      ? "runtime_adapter_implementation_scope.secret_value_forbidden"
      : "runtime_adapter_implementation_scope.unsafe_implementation_authority",
    path,
    isSecret
      ? `${label} cannot contain secret-like values.`
      : `${label} ask for unsafe implementation authority.`,
  );
}

function scopeError(
  code: RuntimeAdapterImplementationScopeErrorCode,
  path: string,
  message: string,
): RuntimeAdapterImplementationScopeError {
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
  return (
    safeStringPattern.test(value) && !containsSecret(value) && !unsafeAuthority(value)
  );
}

function safeRef(value: string): boolean {
  return refPattern.test(value) && !containsSecret(value) && !unsafeAuthority(value);
}

function safePathRef(value: string): boolean {
  return (
    pathRefPattern.test(value) && !containsSecret(value) && !unsafeAuthority(value)
  );
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

function matchesValidator(
  value: string,
  validator: RegExp | ((value: string) => boolean),
): boolean {
  return validator instanceof RegExp ? validator.test(value) : validator(value);
}

function containsSecret(value: unknown): boolean {
  return secretLikePattern.test(JSON.stringify(value));
}

function unsafeAuthority(value: unknown): boolean {
  return unsafeAuthorityPattern.test(JSON.stringify(value));
}

function normalizeStringRefs(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(
    value.filter((item): item is string => typeof item === "string" && safeRef(item)),
  );
}

function uniqueStrings<T extends string>(values: T[]): T[] {
  return [...new Set(values)].sort();
}

function jsonPointer(key: string): string {
  return `/${escapeJsonPointerSegment(key)}`;
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

function dedupeErrors(
  errors: RuntimeAdapterImplementationScopeError[],
): RuntimeAdapterImplementationScopeError[] {
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
