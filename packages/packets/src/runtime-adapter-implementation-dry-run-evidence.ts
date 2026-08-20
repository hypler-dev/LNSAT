import type { AdapterInvocationResultAuditRefInput } from "./adapter-invocation-result.js";
import {
  defaultRuntimeAdapterImplementationApprovalGate,
  runtimeAdapterImplementationApprovalGateContract,
} from "./runtime-adapter-implementation-approval-gate.js";
import type {
  RuntimeAdapterImplementationApprovalGateChainReviewRefInput,
  RuntimeAdapterImplementationAuthorizationRequestRefInput,
} from "./runtime-adapter-implementation-approval-gate.js";
import type {
  RuntimeAdapterImplementationAuthorizationPlanRefInput,
  RuntimeAdapterImplementationFuturePacketRefInput,
} from "./runtime-adapter-implementation-authorization-request.js";
import { runtimeAdapterImplementationAuthorizationRequestContract } from "./runtime-adapter-implementation-authorization-request.js";
import type {
  RuntimeAdapterImplementationPlanScopeRefInput,
  RuntimeAdapterImplementationValidationCommandInput,
} from "./runtime-adapter-implementation-plan.js";
import { runtimeAdapterImplementationPlanContract } from "./runtime-adapter-implementation-plan.js";
import type { RuntimeAdapterImplementationScopeReadinessRefInput } from "./runtime-adapter-implementation-scope.js";
import { runtimeAdapterImplementationScopeContract } from "./runtime-adapter-implementation-scope.js";
import { runtimeAdapterReadinessGateContract } from "./runtime-adapter-readiness-gate.js";
import type {
  SubstrateControlIntentApprovalRefInput,
  SubstrateControlIntentPolicyGateInput,
  SubstrateControlIntentRollbackExpectationInput,
} from "./substrate-control-intent.js";

export const RUNTIME_ADAPTER_IMPLEMENTATION_DRY_RUN_EVIDENCE_STATUS = "source_only";

export const runtimeAdapterImplementationDryRunEvidenceContract = {
  contract_id: "lnsat.platform.runtime_adapter_implementation_dry_run_evidence.v0_1",
  authority: [
    "@lnsat/packets",
    "source-backed-runtime-adapter-implementation-dry-run-evidence",
  ],
  dry_run_evidence_version: "0.1",
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
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  implementation_dry_run_evidence_authority:
    "implementation_dry_run_evidence_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type RuntimeAdapterImplementationPacketSelectionRefInput = {
  packet_selection_ref: string;
  packet_ref: string;
  evidence_ref: string;
  summary: string;
};

export type RuntimeAdapterImplementationApprovalGateRefInput = {
  approval_gate_ref: string;
  evidence_ref: string;
  contract_id: typeof runtimeAdapterImplementationApprovalGateContract.contract_id;
  summary: string;
};

export type RuntimeAdapterImplementationDryRunArtifactRefInput = {
  artifact_ref: string;
  evidence_ref: string;
  summary: string;
};

export type RuntimeAdapterImplementationDryRunSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type RuntimeAdapterImplementationDryRunEvidenceRequest = {
  dry_run_evidence_version?: typeof runtimeAdapterImplementationDryRunEvidenceContract.dry_run_evidence_version;
  packet_selection_refs?: RuntimeAdapterImplementationPacketSelectionRefInput[];
  approval_gate_chain_review_refs?: RuntimeAdapterImplementationApprovalGateChainReviewRefInput[];
  approval_gate_refs?: RuntimeAdapterImplementationApprovalGateRefInput[];
  authorization_request_refs?: RuntimeAdapterImplementationAuthorizationRequestRefInput[];
  implementation_plan_refs?: RuntimeAdapterImplementationAuthorizationPlanRefInput[];
  runtime_adapter_implementation_scope_refs?: RuntimeAdapterImplementationPlanScopeRefInput[];
  runtime_adapter_readiness_gate_refs?: RuntimeAdapterImplementationScopeReadinessRefInput[];
  validation_command_refs?: RuntimeAdapterImplementationValidationCommandInput[];
  dry_run_artifact_refs?: RuntimeAdapterImplementationDryRunArtifactRefInput[];
  rollback_refs?: SubstrateControlIntentRollbackExpectationInput[];
  policy_gate_refs?: SubstrateControlIntentPolicyGateInput[];
  human_approval_refs?: SubstrateControlIntentApprovalRefInput[];
  audit_event_refs?: AdapterInvocationResultAuditRefInput[];
  source_refs?: RuntimeAdapterImplementationDryRunSourceRefInput[];
  future_implementation_packet_refs?: RuntimeAdapterImplementationFuturePacketRefInput[];
  implementation_dry_run_evidence_authority?: typeof runtimeAdapterImplementationDryRunEvidenceContract.implementation_dry_run_evidence_authority;
  runtime_adapter_implementation_allowed?: false;
  runtime_adapter_dispatch_allowed?: false;
  live_adapter_invocation_allowed?: false;
  live_broker_dispatch_allowed?: false;
  live_execution_allowed?: false;
  side_effects?: [];
};

export type RuntimeAdapterImplementationDryRunEvidenceErrorCode =
  | "runtime_adapter_implementation_dry_run_evidence.invalid_request"
  | "runtime_adapter_implementation_dry_run_evidence.unexpected_field"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_version"
  | "runtime_adapter_implementation_dry_run_evidence.packet_selection_ref_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_packet_selection_ref"
  | "runtime_adapter_implementation_dry_run_evidence.chain_review_ref_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_chain_review_ref"
  | "runtime_adapter_implementation_dry_run_evidence.approval_gate_ref_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_approval_gate_ref"
  | "runtime_adapter_implementation_dry_run_evidence.authorization_request_ref_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_authorization_request_ref"
  | "runtime_adapter_implementation_dry_run_evidence.plan_ref_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_plan_ref"
  | "runtime_adapter_implementation_dry_run_evidence.scope_ref_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_scope_ref"
  | "runtime_adapter_implementation_dry_run_evidence.readiness_ref_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_readiness_ref"
  | "runtime_adapter_implementation_dry_run_evidence.validation_command_ref_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_validation_command_ref"
  | "runtime_adapter_implementation_dry_run_evidence.dry_run_artifact_ref_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_dry_run_artifact_ref"
  | "runtime_adapter_implementation_dry_run_evidence.rollback_ref_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_rollback_ref"
  | "runtime_adapter_implementation_dry_run_evidence.policy_gate_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_policy_gate"
  | "runtime_adapter_implementation_dry_run_evidence.human_approval_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_human_approval_ref"
  | "runtime_adapter_implementation_dry_run_evidence.audit_ref_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_audit_ref"
  | "runtime_adapter_implementation_dry_run_evidence.source_ref_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_source_ref"
  | "runtime_adapter_implementation_dry_run_evidence.future_packet_ref_required"
  | "runtime_adapter_implementation_dry_run_evidence.invalid_future_packet_ref"
  | "runtime_adapter_implementation_dry_run_evidence.unsafe_dry_run_authority"
  | "runtime_adapter_implementation_dry_run_evidence.secret_value_forbidden"
  | "runtime_adapter_implementation_dry_run_evidence.runtime_adapter_implementation_forbidden"
  | "runtime_adapter_implementation_dry_run_evidence.runtime_adapter_dispatch_forbidden"
  | "runtime_adapter_implementation_dry_run_evidence.live_adapter_invocation_forbidden"
  | "runtime_adapter_implementation_dry_run_evidence.live_broker_dispatch_forbidden"
  | "runtime_adapter_implementation_dry_run_evidence.live_execution_forbidden"
  | "runtime_adapter_implementation_dry_run_evidence.side_effects_forbidden";

export type RuntimeAdapterImplementationDryRunEvidenceError = {
  code: RuntimeAdapterImplementationDryRunEvidenceErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type RuntimeAdapterImplementationDryRunEvidence = {
  contract_id: typeof runtimeAdapterImplementationDryRunEvidenceContract.contract_id;
  dry_run_evidence_version: typeof runtimeAdapterImplementationDryRunEvidenceContract.dry_run_evidence_version;
  packet_selection_refs: RuntimeAdapterImplementationPacketSelectionRefInput[];
  approval_gate_chain_review_refs: RuntimeAdapterImplementationApprovalGateChainReviewRefInput[];
  approval_gate_refs: RuntimeAdapterImplementationApprovalGateRefInput[];
  authorization_request_refs: RuntimeAdapterImplementationAuthorizationRequestRefInput[];
  implementation_plan_refs: RuntimeAdapterImplementationAuthorizationPlanRefInput[];
  runtime_adapter_implementation_scope_refs: RuntimeAdapterImplementationPlanScopeRefInput[];
  runtime_adapter_readiness_gate_refs: RuntimeAdapterImplementationScopeReadinessRefInput[];
  validation_command_refs: RuntimeAdapterImplementationValidationCommandInput[];
  dry_run_artifact_refs: RuntimeAdapterImplementationDryRunArtifactRefInput[];
  rollback_refs: SubstrateControlIntentRollbackExpectationInput[];
  policy_gate_refs: SubstrateControlIntentPolicyGateInput[];
  required_policy_gates: string[];
  human_approval_refs: SubstrateControlIntentApprovalRefInput[];
  required_human_approvals: string[];
  audit_event_refs: AdapterInvocationResultAuditRefInput[];
  required_audit_events: string[];
  source_refs: string[];
  future_implementation_packet_refs: RuntimeAdapterImplementationFuturePacketRefInput[];
  packet_selection_snapshot: {
    packet_ref: "packet:BP-0162";
    selected_next_packet_ref: "packet:BP-0163";
    selected_contract_id: typeof runtimeAdapterImplementationDryRunEvidenceContract.contract_id;
    side_effects: [];
  };
  approval_gate_chain_review_snapshot: {
    packet_ref: "packet:BP-0161";
    reviewed_source_contract_id: typeof runtimeAdapterImplementationApprovalGateContract.contract_id;
    reviewed_mcp_tool: "lnsat.platform.runtime_adapter_implementation_approval_gate.inspect";
    registered_read_only_tool_count: 22;
    side_effects: [];
  };
  approval_gate_evidence_snapshot: Pick<
    typeof defaultRuntimeAdapterImplementationApprovalGate,
    | "contract_id"
    | "implementation_approval_gate_authority"
    | "runtime_adapter_implementation_allowed"
    | "runtime_adapter_dispatch_allowed"
    | "live_adapter_invocation_allowed"
    | "live_broker_dispatch_allowed"
    | "live_execution_allowed"
    | "side_effects"
  >;
  denied_runtime_behavior: string[];
  implementation_dry_run_evidence_authority: typeof runtimeAdapterImplementationDryRunEvidenceContract.implementation_dry_run_evidence_authority;
  runtime_adapter_implementation_allowed: false;
  runtime_adapter_dispatch_allowed: false;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type RuntimeAdapterImplementationDryRunEvidenceResult =
  | {
      ok: true;
      runtime_adapter_implementation_dry_run_evidence: RuntimeAdapterImplementationDryRunEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      runtime_adapter_implementation_dry_run_evidence: null;
      errors: RuntimeAdapterImplementationDryRunEvidenceError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedDryRunEvidence =
  | {
      ok: true;
      request: Omit<
        RuntimeAdapterImplementationDryRunEvidence,
        "contract_id" | "dry_run_evidence_version" | "side_effects"
      >;
    }
  | { ok: false; errors: RuntimeAdapterImplementationDryRunEvidenceError[] };

const requestKeys = new Set([
  "dry_run_evidence_version",
  "packet_selection_refs",
  "approval_gate_chain_review_refs",
  "approval_gate_refs",
  "authorization_request_refs",
  "implementation_plan_refs",
  "runtime_adapter_implementation_scope_refs",
  "runtime_adapter_readiness_gate_refs",
  "validation_command_refs",
  "dry_run_artifact_refs",
  "rollback_refs",
  "policy_gate_refs",
  "human_approval_refs",
  "audit_event_refs",
  "source_refs",
  "future_implementation_packet_refs",
  "implementation_dry_run_evidence_authority",
  "runtime_adapter_implementation_allowed",
  "runtime_adapter_dispatch_allowed",
  "live_adapter_invocation_allowed",
  "live_broker_dispatch_allowed",
  "live_execution_allowed",
  "side_effects",
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
const policyGatePattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,7}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|API_KEY|SECRET=|TOKEN=|PASSWORD|PRIVATE KEY|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]|AKIA[A-Z0-9]|secret:)/i;
const rawCommandPattern =
  /\b(npm|pnpm|yarn|node|tsx|ts-node|bash|sh|zsh|git|docker|ssh|curl|wrangler|psql|mysql|redis-cli|kubectl|rm|mv|cp|chmod|chown|sudo)\s+/i;
const unsafeAuthorityPattern =
  /\b(root|sudo|shell|ssh\.raw|secret\.read|credential\.read|write\.execute|delete\.execute|drop|destroy\.execute|restart\.execute|deploy\.execute|dns\.write|cloudflare\.write|database\.write|db\.write|queue\.purge|docker\.socket|docker_socket|privileged|unrestricted|node_agent\.exec|rm -rf|raw command|live_dispatch|dispatch\.execute|adapter\.invoke|adapter_invocation|broker\.dispatch|invoke\.execute|runtime\.execution|runtime_adapter_dispatch|runtime_adapter\.dispatch|runtime_adapter_implementation|adapter_implementation|implementation\.execute)\b/i;

export const defaultRuntimeAdapterImplementationDryRunEvidence: RuntimeAdapterImplementationDryRunEvidence =
  {
    contract_id: runtimeAdapterImplementationDryRunEvidenceContract.contract_id,
    dry_run_evidence_version:
      runtimeAdapterImplementationDryRunEvidenceContract.dry_run_evidence_version,
    packet_selection_refs: [
      {
        packet_selection_ref:
          "packet_selection:bp0162-runtime-adapter-implementation-packet-selection",
        packet_ref: "packet:BP-0162",
        evidence_ref: "evidence:bp0162-runtime-adapter-implementation-packet-selection",
        summary: "BP-0162 selected BP-0163 dry-run evidence before implementation",
      },
    ],
    approval_gate_chain_review_refs: [
      {
        chain_review_ref:
          "chain_review:bp0161-runtime-adapter-approval-gate-chain-review",
        packet_ref: "packet:BP-0161",
        evidence_ref: "evidence:bp0161-runtime-adapter-approval-gate-chain-review",
        summary: "BP-0161 reviewed BP-0156 through BP-0160 approval gate chain",
      },
    ],
    approval_gate_refs: [
      {
        approval_gate_ref:
          "approval_gate:bp0156-runtime-adapter-implementation-approval-gate",
        evidence_ref: "evidence:bp0156-runtime-adapter-implementation-approval-gate",
        contract_id: runtimeAdapterImplementationApprovalGateContract.contract_id,
        summary: "BP-0156 source-only approval gate evidence",
      },
    ],
    authorization_request_refs:
      defaultRuntimeAdapterImplementationApprovalGate.authorization_request_refs,
    implementation_plan_refs:
      defaultRuntimeAdapterImplementationApprovalGate.implementation_plan_refs,
    runtime_adapter_implementation_scope_refs:
      defaultRuntimeAdapterImplementationApprovalGate.runtime_adapter_implementation_scope_refs,
    runtime_adapter_readiness_gate_refs:
      defaultRuntimeAdapterImplementationApprovalGate.runtime_adapter_readiness_gate_refs,
    validation_command_refs: [
      {
        validation_ref:
          "validation:packets-runtime-adapter-implementation-dry-run-evidence",
        command_ref:
          "script:npm-workspace-packets-test-runtime-adapter-implementation-dry-run-evidence",
        expected_artifact_ref: "artifact:bp0163-packets-test-output",
        summary: "Run BP-0163 packet workspace test through named package script",
      },
      {
        validation_ref: "validation:packets-typecheck",
        command_ref: "script:npm-workspace-packets-typecheck",
        expected_artifact_ref: "artifact:bp0163-packets-typecheck-output",
        summary: "Run packet workspace typecheck through named package script",
      },
    ],
    dry_run_artifact_refs: [
      {
        artifact_ref: "artifact:bp0163-dry-run-evidence-contract-output",
        evidence_ref: "evidence:bp0163-runtime-adapter-implementation-dry-run-evidence",
        summary:
          "Source-only dry-run evidence artifact exists before adapter implementation opens",
      },
    ],
    rollback_refs: defaultRuntimeAdapterImplementationApprovalGate.rollback_refs,
    policy_gate_refs: [
      {
        gate_ref: "substrate.adapter.implementation_dry_run_evidence.review",
        decision_ref:
          "policy_decision:runtime-adapter-implementation-dry-run-evidence-source-only",
        required: true,
      },
      ...defaultRuntimeAdapterImplementationApprovalGate.policy_gate_refs,
    ],
    required_policy_gates: uniqueStrings([
      "substrate.adapter.implementation_dry_run_evidence.review",
      ...defaultRuntimeAdapterImplementationApprovalGate.required_policy_gates,
    ]),
    human_approval_refs:
      defaultRuntimeAdapterImplementationApprovalGate.human_approval_refs,
    required_human_approvals:
      defaultRuntimeAdapterImplementationApprovalGate.required_human_approvals,
    audit_event_refs: [
      {
        audit_ref: "audit:bp0163-implementation-dry-run-evidence-recorded",
        event_type: "decision_recorded",
        evidence_ref: "evidence:bp0163-runtime-adapter-implementation-dry-run-evidence",
        summary: "Dry-run evidence contract recorded before implementation scope opens",
      },
      ...defaultRuntimeAdapterImplementationApprovalGate.audit_event_refs,
    ],
    required_audit_events: uniqueStrings([
      "decision_recorded",
      ...defaultRuntimeAdapterImplementationApprovalGate.required_audit_events,
    ]),
    source_refs: [
      "doc:docs/architecture/PACKET_MODEL.md",
      "doc:docs/architecture/POLICY_AND_AUDIT.md",
      "doc:docs/architecture/SYSTEM_ARCHITECTURE.md",
      "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
      "doc:docs/architecture/DATA_MODEL.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "ticket:BP-0163",
    ],
    future_implementation_packet_refs: [
      defaultRuntimeAdapterImplementationApprovalGate.future_implementation_packet_ref,
    ],
    packet_selection_snapshot: {
      packet_ref: "packet:BP-0162",
      selected_next_packet_ref: "packet:BP-0163",
      selected_contract_id:
        runtimeAdapterImplementationDryRunEvidenceContract.contract_id,
      side_effects: [],
    },
    approval_gate_chain_review_snapshot: {
      packet_ref: "packet:BP-0161",
      reviewed_source_contract_id:
        runtimeAdapterImplementationApprovalGateContract.contract_id,
      reviewed_mcp_tool:
        "lnsat.platform.runtime_adapter_implementation_approval_gate.inspect",
      registered_read_only_tool_count: 22,
      side_effects: [],
    },
    approval_gate_evidence_snapshot: {
      contract_id: defaultRuntimeAdapterImplementationApprovalGate.contract_id,
      implementation_approval_gate_authority:
        defaultRuntimeAdapterImplementationApprovalGate.implementation_approval_gate_authority,
      runtime_adapter_implementation_allowed:
        defaultRuntimeAdapterImplementationApprovalGate.runtime_adapter_implementation_allowed,
      runtime_adapter_dispatch_allowed:
        defaultRuntimeAdapterImplementationApprovalGate.runtime_adapter_dispatch_allowed,
      live_adapter_invocation_allowed:
        defaultRuntimeAdapterImplementationApprovalGate.live_adapter_invocation_allowed,
      live_broker_dispatch_allowed:
        defaultRuntimeAdapterImplementationApprovalGate.live_broker_dispatch_allowed,
      live_execution_allowed:
        defaultRuntimeAdapterImplementationApprovalGate.live_execution_allowed,
      side_effects: [],
    },
    denied_runtime_behavior: [
      "dry-run evidence does not create runtime adapter implementation",
      "dry-run evidence does not register dispatcher",
      "dry-run evidence does not dispatch broker request",
      "dry-run evidence does not invoke adapter",
      "dry-run evidence does not execute live runtime path",
    ],
    implementation_dry_run_evidence_authority:
      runtimeAdapterImplementationDryRunEvidenceContract.implementation_dry_run_evidence_authority,
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    side_effects: [],
  };

export function createRuntimeAdapterImplementationDryRunEvidence(
  input: unknown = {},
): RuntimeAdapterImplementationDryRunEvidenceResult {
  const normalized = normalizeDryRunEvidence(input);
  if (!normalized.ok) {
    return failDryRunEvidence(normalized.errors);
  }

  return {
    ok: true,
    runtime_adapter_implementation_dry_run_evidence: {
      contract_id: runtimeAdapterImplementationDryRunEvidenceContract.contract_id,
      dry_run_evidence_version:
        runtimeAdapterImplementationDryRunEvidenceContract.dry_run_evidence_version,
      ...normalized.request,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeDryRunEvidence(input: unknown): NormalizedDryRunEvidence {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        dryRunError(
          "runtime_adapter_implementation_dry_run_evidence.invalid_request",
          "",
          "Runtime adapter implementation dry-run evidence must be an object.",
        ),
      ],
    };
  }

  const errors: RuntimeAdapterImplementationDryRunEvidenceError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        dryRunError(
          "runtime_adapter_implementation_dry_run_evidence.unexpected_field",
          jsonPointer(key),
          "Unexpected runtime adapter implementation dry-run evidence field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "dry_run_evidence_version") &&
    input.dry_run_evidence_version !==
      runtimeAdapterImplementationDryRunEvidenceContract.dry_run_evidence_version
  ) {
    errors.push(
      dryRunError(
        "runtime_adapter_implementation_dry_run_evidence.invalid_version",
        "/dry_run_evidence_version",
        "Runtime adapter implementation dry-run evidence version is unsupported.",
      ),
    );
  }

  const packetSelectionRefs = Object.hasOwn(input, "packet_selection_refs")
    ? normalizePacketSelectionRefs(input.packet_selection_refs, errors)
    : [...defaultRuntimeAdapterImplementationDryRunEvidence.packet_selection_refs];
  const chainReviewRefs = Object.hasOwn(input, "approval_gate_chain_review_refs")
    ? normalizeChainReviewRefs(input.approval_gate_chain_review_refs, errors)
    : [
        ...defaultRuntimeAdapterImplementationDryRunEvidence.approval_gate_chain_review_refs,
      ];
  const approvalGateRefs = Object.hasOwn(input, "approval_gate_refs")
    ? normalizeApprovalGateRefs(input.approval_gate_refs, errors)
    : [...defaultRuntimeAdapterImplementationDryRunEvidence.approval_gate_refs];
  const authorizationRequestRefs = Object.hasOwn(input, "authorization_request_refs")
    ? normalizeAuthorizationRequestRefs(input.authorization_request_refs, errors)
    : [...defaultRuntimeAdapterImplementationDryRunEvidence.authorization_request_refs];
  const planRefs = Object.hasOwn(input, "implementation_plan_refs")
    ? normalizePlanRefs(input.implementation_plan_refs, errors)
    : [...defaultRuntimeAdapterImplementationDryRunEvidence.implementation_plan_refs];
  const scopeRefs = Object.hasOwn(input, "runtime_adapter_implementation_scope_refs")
    ? normalizeScopeRefs(input.runtime_adapter_implementation_scope_refs, errors)
    : [
        ...defaultRuntimeAdapterImplementationDryRunEvidence.runtime_adapter_implementation_scope_refs,
      ];
  const readinessRefs = Object.hasOwn(input, "runtime_adapter_readiness_gate_refs")
    ? normalizeReadinessRefs(input.runtime_adapter_readiness_gate_refs, errors)
    : [
        ...defaultRuntimeAdapterImplementationDryRunEvidence.runtime_adapter_readiness_gate_refs,
      ];
  const validationCommandRefs = Object.hasOwn(input, "validation_command_refs")
    ? normalizeValidationCommandRefs(input.validation_command_refs, errors)
    : [...defaultRuntimeAdapterImplementationDryRunEvidence.validation_command_refs];
  const dryRunArtifactRefs = Object.hasOwn(input, "dry_run_artifact_refs")
    ? normalizeDryRunArtifactRefs(input.dry_run_artifact_refs, errors)
    : [...defaultRuntimeAdapterImplementationDryRunEvidence.dry_run_artifact_refs];
  const rollbackRefs = Object.hasOwn(input, "rollback_refs")
    ? normalizeRollbackRefs(input.rollback_refs, errors)
    : [...defaultRuntimeAdapterImplementationDryRunEvidence.rollback_refs];
  const policyGateRefs = Object.hasOwn(input, "policy_gate_refs")
    ? normalizePolicyGateRefs(input.policy_gate_refs, errors)
    : [...defaultRuntimeAdapterImplementationDryRunEvidence.policy_gate_refs];
  const humanApprovalRefs = Object.hasOwn(input, "human_approval_refs")
    ? normalizeHumanApprovalRefs(input.human_approval_refs, errors)
    : [...defaultRuntimeAdapterImplementationDryRunEvidence.human_approval_refs];
  const auditEventRefs = Object.hasOwn(input, "audit_event_refs")
    ? normalizeAuditEventRefs(input.audit_event_refs, errors)
    : [...defaultRuntimeAdapterImplementationDryRunEvidence.audit_event_refs];
  const sourceRefs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, errors)
    : [...defaultRuntimeAdapterImplementationDryRunEvidence.source_refs];
  const futurePacketRefs = Object.hasOwn(input, "future_implementation_packet_refs")
    ? normalizeFuturePacketRefs(input.future_implementation_packet_refs, errors)
    : [
        ...defaultRuntimeAdapterImplementationDryRunEvidence.future_implementation_packet_refs,
      ];

  addAuthorityErrors(input, errors);
  addRequiredArrayErrors(
    {
      packetSelectionRefs,
      chainReviewRefs,
      approvalGateRefs,
      authorizationRequestRefs,
      planRefs,
      scopeRefs,
      readinessRefs,
      validationCommandRefs,
      dryRunArtifactRefs,
      rollbackRefs,
      policyGateRefs,
      humanApprovalRefs,
      auditEventRefs,
      sourceRefs,
      futurePacketRefs,
    },
    errors,
  );

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    request: {
      packet_selection_refs: packetSelectionRefs,
      approval_gate_chain_review_refs: chainReviewRefs,
      approval_gate_refs: approvalGateRefs,
      authorization_request_refs: authorizationRequestRefs,
      implementation_plan_refs: planRefs,
      runtime_adapter_implementation_scope_refs: scopeRefs,
      runtime_adapter_readiness_gate_refs: readinessRefs,
      validation_command_refs: validationCommandRefs,
      dry_run_artifact_refs: dryRunArtifactRefs,
      rollback_refs: rollbackRefs,
      policy_gate_refs: policyGateRefs,
      required_policy_gates: uniqueStrings(policyGateRefs.map((gate) => gate.gate_ref)),
      human_approval_refs: humanApprovalRefs,
      required_human_approvals: uniqueStrings(
        humanApprovalRefs.map((approval) => approval.approval_ref),
      ),
      audit_event_refs: auditEventRefs,
      required_audit_events: uniqueStrings(
        auditEventRefs.map((event) => event.event_type),
      ),
      source_refs: sourceRefs,
      future_implementation_packet_refs: futurePacketRefs,
      packet_selection_snapshot:
        defaultRuntimeAdapterImplementationDryRunEvidence.packet_selection_snapshot,
      approval_gate_chain_review_snapshot:
        defaultRuntimeAdapterImplementationDryRunEvidence.approval_gate_chain_review_snapshot,
      approval_gate_evidence_snapshot:
        defaultRuntimeAdapterImplementationDryRunEvidence.approval_gate_evidence_snapshot,
      denied_runtime_behavior: [
        ...defaultRuntimeAdapterImplementationDryRunEvidence.denied_runtime_behavior,
      ],
      implementation_dry_run_evidence_authority:
        runtimeAdapterImplementationDryRunEvidenceContract.implementation_dry_run_evidence_authority,
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
    },
  };
}

function normalizePacketSelectionRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): RuntimeAdapterImplementationPacketSelectionRefInput[] {
  return normalizeRefObjects(
    value,
    "/packet_selection_refs",
    "runtime_adapter_implementation_dry_run_evidence.packet_selection_ref_required",
    "Runtime adapter implementation dry-run evidence requires BP-0162 packet selection refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_packet_selection_ref",
    "Packet selection ref",
    (item) => {
      const packetSelectionRef = safeRefValue(item.packet_selection_ref);
      const packetRef = safeRefValue(item.packet_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (
        packetSelectionRef === null ||
        packetRef !== "packet:BP-0162" ||
        evidenceRef === null ||
        summary === null
      ) {
        return null;
      }
      return {
        packet_selection_ref: packetSelectionRef,
        packet_ref: packetRef,
        evidence_ref: evidenceRef,
        summary,
      };
    },
    errors,
  );
}

function normalizeChainReviewRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): RuntimeAdapterImplementationApprovalGateChainReviewRefInput[] {
  return normalizeRefObjects(
    value,
    "/approval_gate_chain_review_refs",
    "runtime_adapter_implementation_dry_run_evidence.chain_review_ref_required",
    "Runtime adapter implementation dry-run evidence requires BP-0161 chain review refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_chain_review_ref",
    "Chain review ref",
    (item) => {
      const chainReviewRef = safeRefValue(item.chain_review_ref);
      const packetRef = safeRefValue(item.packet_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (
        chainReviewRef === null ||
        packetRef !== "packet:BP-0161" ||
        evidenceRef === null ||
        summary === null
      ) {
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

function normalizeApprovalGateRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): RuntimeAdapterImplementationApprovalGateRefInput[] {
  return normalizeRefObjects(
    value,
    "/approval_gate_refs",
    "runtime_adapter_implementation_dry_run_evidence.approval_gate_ref_required",
    "Runtime adapter implementation dry-run evidence requires BP-0156 approval gate refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_approval_gate_ref",
    "Approval gate ref",
    (item) => {
      const approvalGateRef = safeRefValue(item.approval_gate_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (
        approvalGateRef === null ||
        evidenceRef === null ||
        item.contract_id !==
          runtimeAdapterImplementationApprovalGateContract.contract_id ||
        summary === null
      ) {
        return null;
      }
      return {
        approval_gate_ref: approvalGateRef,
        evidence_ref: evidenceRef,
        contract_id: runtimeAdapterImplementationApprovalGateContract.contract_id,
        summary,
      };
    },
    errors,
  );
}

function normalizeAuthorizationRequestRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): RuntimeAdapterImplementationAuthorizationRequestRefInput[] {
  return normalizeRefObjects(
    value,
    "/authorization_request_refs",
    "runtime_adapter_implementation_dry_run_evidence.authorization_request_ref_required",
    "Runtime adapter implementation dry-run evidence requires BP-0150 authorization request refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_authorization_request_ref",
    "Authorization request ref",
    (item) => {
      const authorizationRequestRef = safeRefValue(item.authorization_request_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (
        authorizationRequestRef === null ||
        evidenceRef === null ||
        item.contract_id !==
          runtimeAdapterImplementationAuthorizationRequestContract.contract_id ||
        summary === null
      ) {
        return null;
      }
      return {
        authorization_request_ref: authorizationRequestRef,
        evidence_ref: evidenceRef,
        contract_id:
          runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
        summary,
      };
    },
    errors,
  );
}

function normalizePlanRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): RuntimeAdapterImplementationAuthorizationPlanRefInput[] {
  return normalizeRefObjects(
    value,
    "/implementation_plan_refs",
    "runtime_adapter_implementation_dry_run_evidence.plan_ref_required",
    "Runtime adapter implementation dry-run evidence requires implementation plan refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_plan_ref",
    "Implementation plan ref",
    (item) => {
      const planRef = safeRefValue(item.plan_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (
        planRef === null ||
        evidenceRef === null ||
        item.contract_id !== runtimeAdapterImplementationPlanContract.contract_id ||
        summary === null
      ) {
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
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): RuntimeAdapterImplementationPlanScopeRefInput[] {
  return normalizeRefObjects(
    value,
    "/runtime_adapter_implementation_scope_refs",
    "runtime_adapter_implementation_dry_run_evidence.scope_ref_required",
    "Runtime adapter implementation dry-run evidence requires implementation scope refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_scope_ref",
    "Implementation scope ref",
    (item) => {
      const scopeRef = safeRefValue(item.scope_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (
        scopeRef === null ||
        evidenceRef === null ||
        item.contract_id !== runtimeAdapterImplementationScopeContract.contract_id ||
        summary === null
      ) {
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
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): RuntimeAdapterImplementationScopeReadinessRefInput[] {
  return normalizeRefObjects(
    value,
    "/runtime_adapter_readiness_gate_refs",
    "runtime_adapter_implementation_dry_run_evidence.readiness_ref_required",
    "Runtime adapter implementation dry-run evidence requires readiness gate refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_readiness_ref",
    "Readiness ref",
    (item) => {
      const readinessRef = safeRefValue(item.readiness_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (
        readinessRef === null ||
        evidenceRef === null ||
        item.contract_id !== runtimeAdapterReadinessGateContract.contract_id ||
        summary === null
      ) {
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

function normalizeValidationCommandRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): RuntimeAdapterImplementationValidationCommandInput[] {
  return normalizeRefObjects(
    value,
    "/validation_command_refs",
    "runtime_adapter_implementation_dry_run_evidence.validation_command_ref_required",
    "Runtime adapter implementation dry-run evidence requires validation command refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_validation_command_ref",
    "Validation command ref",
    (item) => {
      if (rawCommand(item)) {
        errors.push(
          dryRunError(
            "runtime_adapter_implementation_dry_run_evidence.unsafe_dry_run_authority",
            "/validation_command_refs",
            "Validation command refs cannot echo raw commands.",
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

function normalizeDryRunArtifactRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): RuntimeAdapterImplementationDryRunArtifactRefInput[] {
  return normalizeRefObjects(
    value,
    "/dry_run_artifact_refs",
    "runtime_adapter_implementation_dry_run_evidence.dry_run_artifact_ref_required",
    "Runtime adapter implementation dry-run evidence requires dry-run artifact refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_dry_run_artifact_ref",
    "Dry-run artifact ref",
    (item) => {
      const artifactRef = safeRefValue(item.artifact_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (artifactRef === null || evidenceRef === null || summary === null) {
        return null;
      }
      return { artifact_ref: artifactRef, evidence_ref: evidenceRef, summary };
    },
    errors,
  );
}

function normalizeRollbackRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): SubstrateControlIntentRollbackExpectationInput[] {
  return normalizeRefObjects(
    value,
    "/rollback_refs",
    "runtime_adapter_implementation_dry_run_evidence.rollback_ref_required",
    "Runtime adapter implementation dry-run evidence requires rollback refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_rollback_ref",
    "Rollback ref",
    (item) => {
      const rollbackRef = safeRefValue(item.rollback_ref);
      const ownerRef = safeRefValue(item.owner_ref);
      const evidenceRefs = Array.isArray(item.evidence_refs)
        ? item.evidence_refs.map(safeRefValue).filter(isString)
        : [];
      if (
        rollbackRef === null ||
        ownerRef === null ||
        typeof item.required_for_risk_level_at_or_above !== "number" ||
        evidenceRefs.length === 0
      ) {
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
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): SubstrateControlIntentPolicyGateInput[] {
  return normalizeRefObjects(
    value,
    "/policy_gate_refs",
    "runtime_adapter_implementation_dry_run_evidence.policy_gate_required",
    "Runtime adapter implementation dry-run evidence requires policy gate refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_policy_gate",
    "Policy gate ref",
    (item) => {
      if (unsafeAuthority(item)) {
        errors.push(
          dryRunError(
            "runtime_adapter_implementation_dry_run_evidence.unsafe_dry_run_authority",
            "/policy_gate_refs",
            "Policy gate refs cannot grant runtime authority.",
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
        return null;
      }
      return { gate_ref: gateRef, decision_ref: decisionRef, required: true };
    },
    errors,
  );
}

function normalizeHumanApprovalRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): SubstrateControlIntentApprovalRefInput[] {
  return normalizeRefObjects(
    value,
    "/human_approval_refs",
    "runtime_adapter_implementation_dry_run_evidence.human_approval_required",
    "Runtime adapter implementation dry-run evidence requires human approval refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_human_approval_ref",
    "Human approval ref",
    (item) => {
      if (unsafeAuthority(item)) {
        errors.push(
          dryRunError(
            "runtime_adapter_implementation_dry_run_evidence.unsafe_dry_run_authority",
            "/human_approval_refs",
            "Human approval refs cannot grant runtime authority.",
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
      if (approvalRef === null || approvalType !== "human" || item.required !== true) {
        return null;
      }
      return { approval_ref: approvalRef, approval_type: "human", required: true };
    },
    errors,
  );
}

function normalizeAuditEventRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): AdapterInvocationResultAuditRefInput[] {
  return normalizeRefObjects(
    value,
    "/audit_event_refs",
    "runtime_adapter_implementation_dry_run_evidence.audit_ref_required",
    "Runtime adapter implementation dry-run evidence requires audit refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_audit_ref",
    "Audit ref",
    (item) => {
      if (rawCommand(item)) {
        errors.push(
          dryRunError(
            "runtime_adapter_implementation_dry_run_evidence.unsafe_dry_run_authority",
            "/audit_event_refs",
            "Audit refs cannot contain raw command authority.",
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
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): string[] {
  const refs = normalizeRefObjects(
    value,
    "/source_refs",
    "runtime_adapter_implementation_dry_run_evidence.source_ref_required",
    "Runtime adapter implementation dry-run evidence requires source refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_source_ref",
    "Source ref",
    (item) => {
      const sourceRef = safeRefValue(item.source_ref);
      const summary = safeStringValue(item.summary);
      if (sourceRef === null || summary === null || rawCommand(item)) {
        return null;
      }
      return sourceRef;
    },
    errors,
  );
  return uniqueStrings(refs);
}

function normalizeFuturePacketRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): RuntimeAdapterImplementationFuturePacketRefInput[] {
  return normalizeRefObjects(
    value,
    "/future_implementation_packet_refs",
    "runtime_adapter_implementation_dry_run_evidence.future_packet_ref_required",
    "Runtime adapter implementation dry-run evidence requires future implementation packet refs.",
    "runtime_adapter_implementation_dry_run_evidence.invalid_future_packet_ref",
    "Future implementation packet ref",
    (item) => {
      if (unsafeAuthority(item) || rawCommand(item)) {
        errors.push(
          dryRunError(
            "runtime_adapter_implementation_dry_run_evidence.unsafe_dry_run_authority",
            "/future_implementation_packet_refs",
            "Future implementation packet refs cannot grant runtime authority.",
          ),
        );
        return null;
      }
      const packetRef = safeRefValue(item.packet_ref);
      const packetName = safeStringValue(item.packet_name);
      const ownerRef = safeRefValue(item.owner_ref);
      const summary = safeStringValue(item.summary);
      if (
        packetRef === null ||
        packetName === null ||
        ownerRef === null ||
        summary === null
      ) {
        return null;
      }
      return {
        packet_ref: packetRef,
        packet_name: packetName,
        owner_ref: ownerRef,
        summary,
      };
    },
    errors,
  );
}

function normalizeRefObjects<T>(
  value: unknown,
  path: string,
  requiredCode: RuntimeAdapterImplementationDryRunEvidenceErrorCode,
  requiredMessage: string,
  invalidCode: RuntimeAdapterImplementationDryRunEvidenceErrorCode,
  label: string,
  mapper: (item: Record<string, unknown>, path: string) => T | null,
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): T[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(dryRunError(requiredCode, path, requiredMessage));
    return [];
  }

  const output: T[] = [];
  value.forEach((item, index) => {
    const itemPath = `${path}/${index}`;
    if (!isPlainObject(item)) {
      errors.push(dryRunError(invalidCode, itemPath, `${label} must be an object.`));
      return;
    }
    if (containsSecret(item)) {
      errors.push(secretError(itemPath, `${label}s`));
      return;
    }
    const mapped = mapper(item, itemPath);
    if (mapped === null) {
      errors.push(dryRunError(invalidCode, itemPath, `${label} is invalid.`));
      return;
    }
    output.push(mapped);
  });
  return output;
}

function addRequiredArrayErrors(
  values: {
    packetSelectionRefs: unknown[];
    chainReviewRefs: unknown[];
    approvalGateRefs: unknown[];
    authorizationRequestRefs: unknown[];
    planRefs: unknown[];
    scopeRefs: unknown[];
    readinessRefs: unknown[];
    validationCommandRefs: unknown[];
    dryRunArtifactRefs: unknown[];
    rollbackRefs: unknown[];
    policyGateRefs: unknown[];
    humanApprovalRefs: unknown[];
    auditEventRefs: unknown[];
    sourceRefs: unknown[];
    futurePacketRefs: unknown[];
  },
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): void {
  const required: Array<
    [unknown[], RuntimeAdapterImplementationDryRunEvidenceErrorCode, string, string]
  > = [
    [
      values.packetSelectionRefs,
      "runtime_adapter_implementation_dry_run_evidence.packet_selection_ref_required",
      "/packet_selection_refs",
      "Runtime adapter implementation dry-run evidence requires BP-0162 packet selection refs.",
    ],
    [
      values.chainReviewRefs,
      "runtime_adapter_implementation_dry_run_evidence.chain_review_ref_required",
      "/approval_gate_chain_review_refs",
      "Runtime adapter implementation dry-run evidence requires BP-0161 chain review refs.",
    ],
    [
      values.approvalGateRefs,
      "runtime_adapter_implementation_dry_run_evidence.approval_gate_ref_required",
      "/approval_gate_refs",
      "Runtime adapter implementation dry-run evidence requires BP-0156 approval gate refs.",
    ],
    [
      values.authorizationRequestRefs,
      "runtime_adapter_implementation_dry_run_evidence.authorization_request_ref_required",
      "/authorization_request_refs",
      "Runtime adapter implementation dry-run evidence requires BP-0150 authorization request refs.",
    ],
    [
      values.planRefs,
      "runtime_adapter_implementation_dry_run_evidence.plan_ref_required",
      "/implementation_plan_refs",
      "Runtime adapter implementation dry-run evidence requires implementation plan refs.",
    ],
    [
      values.scopeRefs,
      "runtime_adapter_implementation_dry_run_evidence.scope_ref_required",
      "/runtime_adapter_implementation_scope_refs",
      "Runtime adapter implementation dry-run evidence requires implementation scope refs.",
    ],
    [
      values.readinessRefs,
      "runtime_adapter_implementation_dry_run_evidence.readiness_ref_required",
      "/runtime_adapter_readiness_gate_refs",
      "Runtime adapter implementation dry-run evidence requires readiness gate refs.",
    ],
    [
      values.validationCommandRefs,
      "runtime_adapter_implementation_dry_run_evidence.validation_command_ref_required",
      "/validation_command_refs",
      "Runtime adapter implementation dry-run evidence requires validation command refs.",
    ],
    [
      values.dryRunArtifactRefs,
      "runtime_adapter_implementation_dry_run_evidence.dry_run_artifact_ref_required",
      "/dry_run_artifact_refs",
      "Runtime adapter implementation dry-run evidence requires dry-run artifact refs.",
    ],
    [
      values.rollbackRefs,
      "runtime_adapter_implementation_dry_run_evidence.rollback_ref_required",
      "/rollback_refs",
      "Runtime adapter implementation dry-run evidence requires rollback refs.",
    ],
    [
      values.policyGateRefs,
      "runtime_adapter_implementation_dry_run_evidence.policy_gate_required",
      "/policy_gate_refs",
      "Runtime adapter implementation dry-run evidence requires policy gate refs.",
    ],
    [
      values.humanApprovalRefs,
      "runtime_adapter_implementation_dry_run_evidence.human_approval_required",
      "/human_approval_refs",
      "Runtime adapter implementation dry-run evidence requires human approval refs.",
    ],
    [
      values.auditEventRefs,
      "runtime_adapter_implementation_dry_run_evidence.audit_ref_required",
      "/audit_event_refs",
      "Runtime adapter implementation dry-run evidence requires audit refs.",
    ],
    [
      values.sourceRefs,
      "runtime_adapter_implementation_dry_run_evidence.source_ref_required",
      "/source_refs",
      "Runtime adapter implementation dry-run evidence requires source refs.",
    ],
    [
      values.futurePacketRefs,
      "runtime_adapter_implementation_dry_run_evidence.future_packet_ref_required",
      "/future_implementation_packet_refs",
      "Runtime adapter implementation dry-run evidence requires future implementation packet refs.",
    ],
  ];

  for (const [array, code, path, message] of required) {
    if (array.length === 0) {
      errors.push(dryRunError(code, path, message));
    }
  }
}

function addAuthorityErrors(
  input: Record<string, unknown>,
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): void {
  if (
    Object.hasOwn(input, "implementation_dry_run_evidence_authority") &&
    input.implementation_dry_run_evidence_authority !==
      runtimeAdapterImplementationDryRunEvidenceContract.implementation_dry_run_evidence_authority
  ) {
    errors.push(
      dryRunError(
        "runtime_adapter_implementation_dry_run_evidence.unsafe_dry_run_authority",
        "/implementation_dry_run_evidence_authority",
        "Runtime adapter implementation dry-run evidence cannot grant runtime adapter authority.",
      ),
    );
  }
  if (input.runtime_adapter_implementation_allowed !== undefined) {
    errors.push(
      dryRunError(
        "runtime_adapter_implementation_dry_run_evidence.runtime_adapter_implementation_forbidden",
        "/runtime_adapter_implementation_allowed",
        "Runtime adapter implementation dry-run evidence cannot enable runtime adapter implementation.",
      ),
    );
  }
  if (input.runtime_adapter_dispatch_allowed !== undefined) {
    errors.push(
      dryRunError(
        "runtime_adapter_implementation_dry_run_evidence.runtime_adapter_dispatch_forbidden",
        "/runtime_adapter_dispatch_allowed",
        "Runtime adapter implementation dry-run evidence cannot enable runtime adapter dispatch.",
      ),
    );
  }
  if (input.live_adapter_invocation_allowed !== undefined) {
    errors.push(
      dryRunError(
        "runtime_adapter_implementation_dry_run_evidence.live_adapter_invocation_forbidden",
        "/live_adapter_invocation_allowed",
        "Runtime adapter implementation dry-run evidence cannot enable live adapter invocation.",
      ),
    );
  }
  if (input.live_broker_dispatch_allowed !== undefined) {
    errors.push(
      dryRunError(
        "runtime_adapter_implementation_dry_run_evidence.live_broker_dispatch_forbidden",
        "/live_broker_dispatch_allowed",
        "Runtime adapter implementation dry-run evidence cannot enable live broker dispatch.",
      ),
    );
  }
  if (input.live_execution_allowed !== undefined) {
    errors.push(
      dryRunError(
        "runtime_adapter_implementation_dry_run_evidence.live_execution_forbidden",
        "/live_execution_allowed",
        "Runtime adapter implementation dry-run evidence cannot enable live execution.",
      ),
    );
  }
  if (Object.hasOwn(input, "side_effects")) {
    errors.push(
      dryRunError(
        "runtime_adapter_implementation_dry_run_evidence.side_effects_forbidden",
        "/side_effects",
        "Runtime adapter implementation dry-run evidence must preserve side_effects: [].",
      ),
    );
  }
}

function failDryRunEvidence(
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): RuntimeAdapterImplementationDryRunEvidenceResult {
  return {
    ok: false,
    runtime_adapter_implementation_dry_run_evidence: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function dryRunError(
  code: RuntimeAdapterImplementationDryRunEvidenceErrorCode,
  path: string,
  message: string,
): RuntimeAdapterImplementationDryRunEvidenceError {
  return { code, path, message, severity: "error" };
}

function secretError(
  path: string,
  label: string,
): RuntimeAdapterImplementationDryRunEvidenceError {
  return dryRunError(
    "runtime_adapter_implementation_dry_run_evidence.secret_value_forbidden",
    path,
    `${label} cannot contain secret-like values.`,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeRefValue(value: unknown): string | null {
  return typeof value === "string" && refPattern.test(value) ? value : null;
}

function safeStringValue(value: unknown): string | null {
  return typeof value === "string" &&
    safeStringPattern.test(value) &&
    !containsSecret(value) &&
    !rawCommand(value)
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

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function jsonPointer(key: string): string {
  return `/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
}

function dedupeErrors(
  errors: RuntimeAdapterImplementationDryRunEvidenceError[],
): RuntimeAdapterImplementationDryRunEvidenceError[] {
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
