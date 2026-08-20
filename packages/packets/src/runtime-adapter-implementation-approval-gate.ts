import type { AdapterInvocationResultAuditRefInput } from "./adapter-invocation-result.js";
import {
  defaultRuntimeAdapterImplementationAuthorizationRequest,
  runtimeAdapterImplementationAuthorizationRequestContract,
} from "./runtime-adapter-implementation-authorization-request.js";
import type {
  RuntimeAdapterImplementationAuthorizationPlanRefInput,
  RuntimeAdapterImplementationFuturePacketRefInput,
} from "./runtime-adapter-implementation-authorization-request.js";
import { runtimeAdapterImplementationPlanContract } from "./runtime-adapter-implementation-plan.js";
import type { RuntimeAdapterImplementationPlanScopeRefInput } from "./runtime-adapter-implementation-plan.js";
import { runtimeAdapterImplementationScopeContract } from "./runtime-adapter-implementation-scope.js";
import type { RuntimeAdapterImplementationScopeReadinessRefInput } from "./runtime-adapter-implementation-scope.js";
import { runtimeAdapterReadinessGateContract } from "./runtime-adapter-readiness-gate.js";
import type {
  SubstrateControlIntentApprovalRefInput,
  SubstrateControlIntentPolicyGateInput,
  SubstrateControlIntentRollbackExpectationInput,
} from "./substrate-control-intent.js";

export const RUNTIME_ADAPTER_IMPLEMENTATION_APPROVAL_GATE_STATUS = "source_only";

export const runtimeAdapterImplementationApprovalGateContract = {
  contract_id: "lnsat.platform.runtime_adapter_implementation_approval_gate.v0_1",
  authority: [
    "@lnsat/packets",
    "source-backed-runtime-adapter-implementation-approval-gate",
  ],
  approval_gate_version: "0.1",
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
  implementation_approval_gate_authority:
    "implementation_approval_gate_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type RuntimeAdapterImplementationApprovalGateChainReviewRefInput = {
  chain_review_ref: string;
  packet_ref: string;
  evidence_ref: string;
  summary: string;
};

export type RuntimeAdapterImplementationAuthorizationRequestRefInput = {
  authorization_request_ref: string;
  evidence_ref: string;
  contract_id: typeof runtimeAdapterImplementationAuthorizationRequestContract.contract_id;
  summary: string;
};

export type RuntimeAdapterImplementationApprovalGateRequest = {
  approval_gate_version?: typeof runtimeAdapterImplementationApprovalGateContract.approval_gate_version;
  chain_review_refs?: RuntimeAdapterImplementationApprovalGateChainReviewRefInput[];
  authorization_request_refs?: RuntimeAdapterImplementationAuthorizationRequestRefInput[];
  implementation_plan_refs?: RuntimeAdapterImplementationAuthorizationPlanRefInput[];
  runtime_adapter_implementation_scope_refs?: RuntimeAdapterImplementationPlanScopeRefInput[];
  runtime_adapter_readiness_gate_refs?: RuntimeAdapterImplementationScopeReadinessRefInput[];
  policy_gate_refs?: SubstrateControlIntentPolicyGateInput[];
  human_approval_refs?: SubstrateControlIntentApprovalRefInput[];
  audit_event_refs?: AdapterInvocationResultAuditRefInput[];
  rollback_refs?: SubstrateControlIntentRollbackExpectationInput[];
  source_refs?: RuntimeAdapterImplementationApprovalGateSourceRefInput[];
  future_implementation_packet_ref?: RuntimeAdapterImplementationFuturePacketRefInput;
  implementation_approval_gate_authority?: typeof runtimeAdapterImplementationApprovalGateContract.implementation_approval_gate_authority;
  runtime_adapter_implementation_allowed?: false;
  runtime_adapter_dispatch_allowed?: false;
  live_adapter_invocation_allowed?: false;
  live_broker_dispatch_allowed?: false;
  live_execution_allowed?: false;
  side_effects?: [];
};

export type RuntimeAdapterImplementationApprovalGateSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type RuntimeAdapterImplementationApprovalGateErrorCode =
  | "runtime_adapter_implementation_approval_gate.invalid_request"
  | "runtime_adapter_implementation_approval_gate.unexpected_field"
  | "runtime_adapter_implementation_approval_gate.invalid_version"
  | "runtime_adapter_implementation_approval_gate.chain_review_ref_required"
  | "runtime_adapter_implementation_approval_gate.invalid_chain_review_ref"
  | "runtime_adapter_implementation_approval_gate.authorization_request_ref_required"
  | "runtime_adapter_implementation_approval_gate.invalid_authorization_request_ref"
  | "runtime_adapter_implementation_approval_gate.plan_ref_required"
  | "runtime_adapter_implementation_approval_gate.invalid_plan_ref"
  | "runtime_adapter_implementation_approval_gate.scope_ref_required"
  | "runtime_adapter_implementation_approval_gate.invalid_scope_ref"
  | "runtime_adapter_implementation_approval_gate.readiness_ref_required"
  | "runtime_adapter_implementation_approval_gate.invalid_readiness_ref"
  | "runtime_adapter_implementation_approval_gate.policy_gate_required"
  | "runtime_adapter_implementation_approval_gate.invalid_policy_gate"
  | "runtime_adapter_implementation_approval_gate.human_approval_required"
  | "runtime_adapter_implementation_approval_gate.invalid_human_approval_ref"
  | "runtime_adapter_implementation_approval_gate.audit_ref_required"
  | "runtime_adapter_implementation_approval_gate.invalid_audit_ref"
  | "runtime_adapter_implementation_approval_gate.rollback_ref_required"
  | "runtime_adapter_implementation_approval_gate.invalid_rollback_ref"
  | "runtime_adapter_implementation_approval_gate.source_ref_required"
  | "runtime_adapter_implementation_approval_gate.invalid_source_ref"
  | "runtime_adapter_implementation_approval_gate.future_packet_ref_required"
  | "runtime_adapter_implementation_approval_gate.invalid_future_packet_ref"
  | "runtime_adapter_implementation_approval_gate.unsafe_approval_authority"
  | "runtime_adapter_implementation_approval_gate.secret_value_forbidden"
  | "runtime_adapter_implementation_approval_gate.runtime_adapter_implementation_forbidden"
  | "runtime_adapter_implementation_approval_gate.runtime_adapter_dispatch_forbidden"
  | "runtime_adapter_implementation_approval_gate.live_adapter_invocation_forbidden"
  | "runtime_adapter_implementation_approval_gate.live_broker_dispatch_forbidden"
  | "runtime_adapter_implementation_approval_gate.live_execution_forbidden"
  | "runtime_adapter_implementation_approval_gate.side_effects_forbidden";

export type RuntimeAdapterImplementationApprovalGateError = {
  code: RuntimeAdapterImplementationApprovalGateErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type RuntimeAdapterImplementationApprovalGateEvidence = {
  contract_id: typeof runtimeAdapterImplementationApprovalGateContract.contract_id;
  approval_gate_version: typeof runtimeAdapterImplementationApprovalGateContract.approval_gate_version;
  chain_review_refs: RuntimeAdapterImplementationApprovalGateChainReviewRefInput[];
  authorization_request_refs: RuntimeAdapterImplementationAuthorizationRequestRefInput[];
  implementation_plan_refs: RuntimeAdapterImplementationAuthorizationPlanRefInput[];
  runtime_adapter_implementation_scope_refs: RuntimeAdapterImplementationPlanScopeRefInput[];
  runtime_adapter_readiness_gate_refs: RuntimeAdapterImplementationScopeReadinessRefInput[];
  policy_gate_refs: SubstrateControlIntentPolicyGateInput[];
  required_policy_gates: string[];
  human_approval_refs: SubstrateControlIntentApprovalRefInput[];
  required_human_approvals: string[];
  audit_event_refs: AdapterInvocationResultAuditRefInput[];
  required_audit_events: string[];
  rollback_refs: SubstrateControlIntentRollbackExpectationInput[];
  source_refs: string[];
  future_implementation_packet_ref: RuntimeAdapterImplementationFuturePacketRefInput;
  authorization_request_chain_review_snapshot: {
    packet_ref: "packet:BP-0155";
    reviewed_source_contract_id: typeof runtimeAdapterImplementationAuthorizationRequestContract.contract_id;
    reviewed_gateway_contract_id: "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1";
    reviewed_route: "POST /v1/platform/runtime-adapter-implementation-authorization-request/inspect";
    reviewed_mcp_tool: "lnsat.platform.runtime_adapter_implementation_authorization_request.inspect";
    registered_read_only_tool_count: 21;
    side_effects: [];
  };
  authorization_request_evidence_snapshot: Pick<
    typeof defaultRuntimeAdapterImplementationAuthorizationRequest,
    | "contract_id"
    | "implementation_authorization_request_authority"
    | "runtime_adapter_implementation_allowed"
    | "runtime_adapter_dispatch_allowed"
    | "live_adapter_invocation_allowed"
    | "live_broker_dispatch_allowed"
    | "live_execution_allowed"
    | "side_effects"
  >;
  denied_runtime_behavior: string[];
  implementation_approval_gate_authority: typeof runtimeAdapterImplementationApprovalGateContract.implementation_approval_gate_authority;
  runtime_adapter_implementation_allowed: false;
  runtime_adapter_dispatch_allowed: false;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type RuntimeAdapterImplementationApprovalGateResult =
  | {
      ok: true;
      runtime_adapter_implementation_approval_gate: RuntimeAdapterImplementationApprovalGateEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      runtime_adapter_implementation_approval_gate: null;
      errors: RuntimeAdapterImplementationApprovalGateError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedApprovalGate =
  | {
      ok: true;
      request: Omit<
        RuntimeAdapterImplementationApprovalGateEvidence,
        "contract_id" | "approval_gate_version" | "side_effects"
      >;
    }
  | { ok: false; errors: RuntimeAdapterImplementationApprovalGateError[] };

const requestKeys = new Set([
  "approval_gate_version",
  "chain_review_refs",
  "authorization_request_refs",
  "implementation_plan_refs",
  "runtime_adapter_implementation_scope_refs",
  "runtime_adapter_readiness_gate_refs",
  "policy_gate_refs",
  "human_approval_refs",
  "audit_event_refs",
  "rollback_refs",
  "source_refs",
  "future_implementation_packet_ref",
  "implementation_approval_gate_authority",
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

export const defaultRuntimeAdapterImplementationApprovalGate: RuntimeAdapterImplementationApprovalGateEvidence =
  {
    contract_id: runtimeAdapterImplementationApprovalGateContract.contract_id,
    approval_gate_version:
      runtimeAdapterImplementationApprovalGateContract.approval_gate_version,
    chain_review_refs: [
      {
        chain_review_ref:
          "chain_review:bp0155-runtime-adapter-authorization-request-chain-review",
        packet_ref: "packet:BP-0155",
        evidence_ref:
          "evidence:bp0155-runtime-adapter-authorization-request-chain-review",
        summary: "BP-0155 reviewed BP-0150 through BP-0154 authorization request chain",
      },
    ],
    authorization_request_refs: [
      {
        authorization_request_ref:
          "authorization_request:bp0150-runtime-adapter-implementation-authorization-request",
        evidence_ref:
          "evidence:bp0150-runtime-adapter-implementation-authorization-request",
        contract_id:
          runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
        summary: "BP-0150 source-only runtime adapter implementation request",
      },
    ],
    implementation_plan_refs:
      defaultRuntimeAdapterImplementationAuthorizationRequest.implementation_plan_refs,
    runtime_adapter_implementation_scope_refs:
      defaultRuntimeAdapterImplementationAuthorizationRequest.runtime_adapter_implementation_scope_refs,
    runtime_adapter_readiness_gate_refs:
      defaultRuntimeAdapterImplementationAuthorizationRequest.runtime_adapter_readiness_gate_refs,
    policy_gate_refs: [
      {
        gate_ref: "substrate.adapter.implementation_approval_gate.review",
        decision_ref:
          "policy_decision:runtime-adapter-implementation-approval-gate-source-only",
        required: true,
      },
      ...defaultRuntimeAdapterImplementationAuthorizationRequest.policy_gate_refs,
    ],
    required_policy_gates: uniqueStrings([
      "substrate.adapter.implementation_approval_gate.review",
      ...defaultRuntimeAdapterImplementationAuthorizationRequest.required_policy_gates,
    ]),
    human_approval_refs: [
      {
        approval_ref: "approval:human-runtime-adapter-implementation-approval-gate",
        approval_type: "human",
        required: true,
      },
    ],
    required_human_approvals: [
      "approval:human-runtime-adapter-implementation-approval-gate",
    ],
    audit_event_refs: [
      {
        audit_ref: "audit:bp0156-implementation-approval-gate-recorded",
        event_type: "approval_requested",
        evidence_ref: "evidence:bp0156-implementation-approval-gate",
        summary: "Approval gate records required human approval before implementation",
      },
      ...defaultRuntimeAdapterImplementationAuthorizationRequest.audit_event_refs,
    ],
    required_audit_events: uniqueStrings([
      "approval_requested",
      ...defaultRuntimeAdapterImplementationAuthorizationRequest.required_audit_events,
    ]),
    rollback_refs:
      defaultRuntimeAdapterImplementationAuthorizationRequest.rollback_refs,
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
      "ticket:BP-0156",
    ],
    future_implementation_packet_ref: {
      packet_ref: "packet:future-runtime-adapter-implementation",
      packet_name: "Future Runtime Adapter Implementation Packet",
      owner_ref: "owner:lnsat-platform",
      summary:
        "Future packet must cite this approval gate before implementation begins",
    },
    authorization_request_chain_review_snapshot: {
      packet_ref: "packet:BP-0155",
      reviewed_source_contract_id:
        runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
      reviewed_gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
      reviewed_route:
        "POST /v1/platform/runtime-adapter-implementation-authorization-request/inspect",
      reviewed_mcp_tool:
        "lnsat.platform.runtime_adapter_implementation_authorization_request.inspect",
      registered_read_only_tool_count: 21,
      side_effects: [],
    },
    authorization_request_evidence_snapshot: {
      contract_id: defaultRuntimeAdapterImplementationAuthorizationRequest.contract_id,
      implementation_authorization_request_authority:
        defaultRuntimeAdapterImplementationAuthorizationRequest.implementation_authorization_request_authority,
      runtime_adapter_implementation_allowed:
        defaultRuntimeAdapterImplementationAuthorizationRequest.runtime_adapter_implementation_allowed,
      runtime_adapter_dispatch_allowed:
        defaultRuntimeAdapterImplementationAuthorizationRequest.runtime_adapter_dispatch_allowed,
      live_adapter_invocation_allowed:
        defaultRuntimeAdapterImplementationAuthorizationRequest.live_adapter_invocation_allowed,
      live_broker_dispatch_allowed:
        defaultRuntimeAdapterImplementationAuthorizationRequest.live_broker_dispatch_allowed,
      live_execution_allowed:
        defaultRuntimeAdapterImplementationAuthorizationRequest.live_execution_allowed,
      side_effects: [],
    },
    denied_runtime_behavior: [
      "approval gate does not create runtime adapter implementation",
      "approval gate does not register dispatcher",
      "approval gate does not dispatch broker request",
      "approval gate does not invoke adapter",
      "approval gate does not execute live runtime path",
    ],
    implementation_approval_gate_authority:
      runtimeAdapterImplementationApprovalGateContract.implementation_approval_gate_authority,
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    side_effects: [],
  };

export function createRuntimeAdapterImplementationApprovalGate(
  input: unknown = {},
): RuntimeAdapterImplementationApprovalGateResult {
  const normalized = normalizeApprovalGate(input);
  if (!normalized.ok) {
    return failApprovalGate(normalized.errors);
  }

  return {
    ok: true,
    runtime_adapter_implementation_approval_gate: {
      contract_id: runtimeAdapterImplementationApprovalGateContract.contract_id,
      approval_gate_version:
        runtimeAdapterImplementationApprovalGateContract.approval_gate_version,
      ...normalized.request,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeApprovalGate(input: unknown): NormalizedApprovalGate {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        gateError(
          "runtime_adapter_implementation_approval_gate.invalid_request",
          "",
          "Runtime adapter implementation approval gate must be an object.",
        ),
      ],
    };
  }

  const errors: RuntimeAdapterImplementationApprovalGateError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gateError(
          "runtime_adapter_implementation_approval_gate.unexpected_field",
          jsonPointer(key),
          "Unexpected runtime adapter implementation approval gate field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "approval_gate_version") &&
    input.approval_gate_version !==
      runtimeAdapterImplementationApprovalGateContract.approval_gate_version
  ) {
    errors.push(
      gateError(
        "runtime_adapter_implementation_approval_gate.invalid_version",
        "/approval_gate_version",
        "Runtime adapter implementation approval gate version is unsupported.",
      ),
    );
  }

  const chainReviewRefs = Object.hasOwn(input, "chain_review_refs")
    ? normalizeChainReviewRefs(input.chain_review_refs, errors)
    : [...defaultRuntimeAdapterImplementationApprovalGate.chain_review_refs];
  const authorizationRequestRefs = Object.hasOwn(input, "authorization_request_refs")
    ? normalizeAuthorizationRequestRefs(input.authorization_request_refs, errors)
    : [...defaultRuntimeAdapterImplementationApprovalGate.authorization_request_refs];
  const planRefs = Object.hasOwn(input, "implementation_plan_refs")
    ? normalizePlanRefs(input.implementation_plan_refs, errors)
    : [...defaultRuntimeAdapterImplementationApprovalGate.implementation_plan_refs];
  const scopeRefs = Object.hasOwn(input, "runtime_adapter_implementation_scope_refs")
    ? normalizeScopeRefs(input.runtime_adapter_implementation_scope_refs, errors)
    : [
        ...defaultRuntimeAdapterImplementationApprovalGate.runtime_adapter_implementation_scope_refs,
      ];
  const readinessRefs = Object.hasOwn(input, "runtime_adapter_readiness_gate_refs")
    ? normalizeReadinessRefs(input.runtime_adapter_readiness_gate_refs, errors)
    : [
        ...defaultRuntimeAdapterImplementationApprovalGate.runtime_adapter_readiness_gate_refs,
      ];
  const policyGateRefs = Object.hasOwn(input, "policy_gate_refs")
    ? normalizePolicyGateRefs(input.policy_gate_refs, errors)
    : [...defaultRuntimeAdapterImplementationApprovalGate.policy_gate_refs];
  const humanApprovalRefs = Object.hasOwn(input, "human_approval_refs")
    ? normalizeHumanApprovalRefs(input.human_approval_refs, errors)
    : [...defaultRuntimeAdapterImplementationApprovalGate.human_approval_refs];
  const auditEventRefs = Object.hasOwn(input, "audit_event_refs")
    ? normalizeAuditEventRefs(input.audit_event_refs, errors)
    : [...defaultRuntimeAdapterImplementationApprovalGate.audit_event_refs];
  const rollbackRefs = Object.hasOwn(input, "rollback_refs")
    ? normalizeRollbackRefs(input.rollback_refs, errors)
    : [...defaultRuntimeAdapterImplementationApprovalGate.rollback_refs];
  const sourceRefs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, errors)
    : [...defaultRuntimeAdapterImplementationApprovalGate.source_refs];
  const futurePacketRef = Object.hasOwn(input, "future_implementation_packet_ref")
    ? normalizeFuturePacketRef(input.future_implementation_packet_ref, errors)
    : defaultRuntimeAdapterImplementationApprovalGate.future_implementation_packet_ref;

  addAuthorityErrors(input, errors);
  addRequiredArrayErrors(
    {
      chainReviewRefs,
      authorizationRequestRefs,
      planRefs,
      scopeRefs,
      readinessRefs,
      policyGateRefs,
      humanApprovalRefs,
      auditEventRefs,
      rollbackRefs,
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
      authorization_request_refs: authorizationRequestRefs,
      implementation_plan_refs: planRefs,
      runtime_adapter_implementation_scope_refs: scopeRefs,
      runtime_adapter_readiness_gate_refs: readinessRefs,
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
      rollback_refs: rollbackRefs,
      source_refs: sourceRefs,
      future_implementation_packet_ref: futurePacketRef,
      authorization_request_chain_review_snapshot:
        defaultRuntimeAdapterImplementationApprovalGate.authorization_request_chain_review_snapshot,
      authorization_request_evidence_snapshot:
        defaultRuntimeAdapterImplementationApprovalGate.authorization_request_evidence_snapshot,
      denied_runtime_behavior: [
        ...defaultRuntimeAdapterImplementationApprovalGate.denied_runtime_behavior,
      ],
      implementation_approval_gate_authority:
        runtimeAdapterImplementationApprovalGateContract.implementation_approval_gate_authority,
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
  errors: RuntimeAdapterImplementationApprovalGateError[],
): RuntimeAdapterImplementationApprovalGateChainReviewRefInput[] {
  return normalizeArray(
    value,
    "/chain_review_refs",
    "runtime_adapter_implementation_approval_gate.chain_review_ref_required",
    "Runtime adapter implementation approval gate requires BP-0155 chain review refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Chain review refs")
            : gateError(
                "runtime_adapter_implementation_approval_gate.invalid_chain_review_ref",
                path,
                "Chain review ref must be an object.",
              ),
        );
        return null;
      }
      const chainReviewRef = safeRefValue(item.chain_review_ref);
      const packetRef = safeRefValue(item.packet_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (
        chainReviewRef === null ||
        packetRef !== "packet:BP-0155" ||
        evidenceRef === null ||
        summary === null
      ) {
        errors.push(
          gateError(
            "runtime_adapter_implementation_approval_gate.invalid_chain_review_ref",
            path,
            "Chain review ref requires safe refs, packet:BP-0155, and summary.",
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

function normalizeAuthorizationRequestRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationApprovalGateError[],
): RuntimeAdapterImplementationAuthorizationRequestRefInput[] {
  return normalizeArray(
    value,
    "/authorization_request_refs",
    "runtime_adapter_implementation_approval_gate.authorization_request_ref_required",
    "Runtime adapter implementation approval gate requires BP-0150 authorization request refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Authorization request refs")
            : gateError(
                "runtime_adapter_implementation_approval_gate.invalid_authorization_request_ref",
                path,
                "Authorization request ref must be an object.",
              ),
        );
        return null;
      }
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
        errors.push(
          gateError(
            "runtime_adapter_implementation_approval_gate.invalid_authorization_request_ref",
            path,
            "Authorization request ref requires safe refs, BP-0150 contract_id, and summary.",
          ),
        );
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
  errors: RuntimeAdapterImplementationApprovalGateError[],
): RuntimeAdapterImplementationAuthorizationPlanRefInput[] {
  return normalizeArray(
    value,
    "/implementation_plan_refs",
    "runtime_adapter_implementation_approval_gate.plan_ref_required",
    "Runtime adapter implementation approval gate requires implementation plan refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Implementation plan refs")
            : gateError(
                "runtime_adapter_implementation_approval_gate.invalid_plan_ref",
                path,
                "Implementation plan ref must be an object.",
              ),
        );
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
          gateError(
            "runtime_adapter_implementation_approval_gate.invalid_plan_ref",
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
  errors: RuntimeAdapterImplementationApprovalGateError[],
): RuntimeAdapterImplementationPlanScopeRefInput[] {
  return normalizeArray(
    value,
    "/runtime_adapter_implementation_scope_refs",
    "runtime_adapter_implementation_approval_gate.scope_ref_required",
    "Runtime adapter implementation approval gate requires implementation scope refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Implementation scope refs")
            : gateError(
                "runtime_adapter_implementation_approval_gate.invalid_scope_ref",
                path,
                "Implementation scope ref must be an object.",
              ),
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
          gateError(
            "runtime_adapter_implementation_approval_gate.invalid_scope_ref",
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
  errors: RuntimeAdapterImplementationApprovalGateError[],
): RuntimeAdapterImplementationScopeReadinessRefInput[] {
  return normalizeArray(
    value,
    "/runtime_adapter_readiness_gate_refs",
    "runtime_adapter_implementation_approval_gate.readiness_ref_required",
    "Runtime adapter implementation approval gate requires readiness gate refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Readiness refs")
            : gateError(
                "runtime_adapter_implementation_approval_gate.invalid_readiness_ref",
                path,
                "Readiness ref must be an object.",
              ),
        );
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
          gateError(
            "runtime_adapter_implementation_approval_gate.invalid_readiness_ref",
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

function normalizePolicyGateRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationApprovalGateError[],
): SubstrateControlIntentPolicyGateInput[] {
  return normalizeArray(
    value,
    "/policy_gate_refs",
    "runtime_adapter_implementation_approval_gate.policy_gate_required",
    "Runtime adapter implementation approval gate requires policy gate refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item) || unsafeAuthority(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Policy gate refs")
            : gateError(
                "runtime_adapter_implementation_approval_gate.unsafe_approval_authority",
                path,
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
        errors.push(
          gateError(
            "runtime_adapter_implementation_approval_gate.invalid_policy_gate",
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

function normalizeHumanApprovalRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationApprovalGateError[],
): SubstrateControlIntentApprovalRefInput[] {
  return normalizeArray(
    value,
    "/human_approval_refs",
    "runtime_adapter_implementation_approval_gate.human_approval_required",
    "Runtime adapter implementation approval gate requires human approval refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item) || unsafeAuthority(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Human approval refs")
            : gateError(
                "runtime_adapter_implementation_approval_gate.unsafe_approval_authority",
                path,
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
        errors.push(
          gateError(
            "runtime_adapter_implementation_approval_gate.invalid_human_approval_ref",
            path,
            "Human approval ref requires safe approval_ref, approval_type human, and required true.",
          ),
        );
        return null;
      }
      return { approval_ref: approvalRef, approval_type: "human", required: true };
    },
    errors,
  );
}

function normalizeAuditEventRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationApprovalGateError[],
): AdapterInvocationResultAuditRefInput[] {
  return normalizeArray(
    value,
    "/audit_event_refs",
    "runtime_adapter_implementation_approval_gate.audit_ref_required",
    "Runtime adapter implementation approval gate requires audit refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item) || rawCommand(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Audit refs")
            : gateError(
                "runtime_adapter_implementation_approval_gate.unsafe_approval_authority",
                path,
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
        errors.push(
          gateError(
            "runtime_adapter_implementation_approval_gate.invalid_audit_ref",
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

function normalizeRollbackRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationApprovalGateError[],
): SubstrateControlIntentRollbackExpectationInput[] {
  return normalizeArray(
    value,
    "/rollback_refs",
    "runtime_adapter_implementation_approval_gate.rollback_ref_required",
    "Runtime adapter implementation approval gate requires rollback refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Rollback refs")
            : gateError(
                "runtime_adapter_implementation_approval_gate.invalid_rollback_ref",
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
          gateError(
            "runtime_adapter_implementation_approval_gate.invalid_rollback_ref",
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

function normalizeSourceRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationApprovalGateError[],
): string[] {
  const sourceObjects = normalizeArray(
    value,
    "/source_refs",
    "runtime_adapter_implementation_approval_gate.source_ref_required",
    "Runtime adapter implementation approval gate requires source refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item) || rawCommand(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Source refs")
            : gateError(
                "runtime_adapter_implementation_approval_gate.unsafe_approval_authority",
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
          gateError(
            "runtime_adapter_implementation_approval_gate.invalid_source_ref",
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
  errors: RuntimeAdapterImplementationApprovalGateError[],
): RuntimeAdapterImplementationFuturePacketRefInput {
  if (!isPlainObject(value)) {
    errors.push(
      gateError(
        "runtime_adapter_implementation_approval_gate.future_packet_ref_required",
        "/future_implementation_packet_ref",
        "Runtime adapter implementation approval gate requires future implementation packet ref.",
      ),
    );
    return defaultRuntimeAdapterImplementationApprovalGate.future_implementation_packet_ref;
  }
  if (containsSecret(value) || unsafeAuthority(value)) {
    errors.push(
      containsSecret(value)
        ? secretError("/future_implementation_packet_ref", "Future packet ref")
        : gateError(
            "runtime_adapter_implementation_approval_gate.unsafe_approval_authority",
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
      gateError(
        "runtime_adapter_implementation_approval_gate.invalid_future_packet_ref",
        "/future_implementation_packet_ref",
        "Future packet ref requires safe packet_ref, packet_name, owner_ref, and summary.",
      ),
    );
  }
  return {
    packet_ref:
      packetRef ??
      defaultRuntimeAdapterImplementationApprovalGate.future_implementation_packet_ref
        .packet_ref,
    packet_name:
      packetName ??
      defaultRuntimeAdapterImplementationApprovalGate.future_implementation_packet_ref
        .packet_name,
    owner_ref:
      ownerRef ??
      defaultRuntimeAdapterImplementationApprovalGate.future_implementation_packet_ref
        .owner_ref,
    summary:
      summary ??
      defaultRuntimeAdapterImplementationApprovalGate.future_implementation_packet_ref
        .summary,
  };
}

function addAuthorityErrors(
  input: Record<string, unknown>,
  errors: RuntimeAdapterImplementationApprovalGateError[],
): void {
  const authority = input.implementation_approval_gate_authority;
  if (
    Object.hasOwn(input, "implementation_approval_gate_authority") &&
    authority !==
      runtimeAdapterImplementationApprovalGateContract.implementation_approval_gate_authority
  ) {
    errors.push(
      gateError(
        "runtime_adapter_implementation_approval_gate.unsafe_approval_authority",
        "/implementation_approval_gate_authority",
        "Runtime adapter implementation approval gate cannot grant runtime adapter authority.",
      ),
    );
  }
  if (input.runtime_adapter_implementation_allowed !== undefined) {
    errors.push(
      gateError(
        "runtime_adapter_implementation_approval_gate.runtime_adapter_implementation_forbidden",
        "/runtime_adapter_implementation_allowed",
        "Runtime adapter implementation approval gate cannot enable runtime adapter implementation.",
      ),
    );
  }
  if (input.runtime_adapter_dispatch_allowed !== undefined) {
    errors.push(
      gateError(
        "runtime_adapter_implementation_approval_gate.runtime_adapter_dispatch_forbidden",
        "/runtime_adapter_dispatch_allowed",
        "Runtime adapter implementation approval gate cannot enable runtime adapter dispatch.",
      ),
    );
  }
  if (input.live_adapter_invocation_allowed !== undefined) {
    errors.push(
      gateError(
        "runtime_adapter_implementation_approval_gate.live_adapter_invocation_forbidden",
        "/live_adapter_invocation_allowed",
        "Runtime adapter implementation approval gate cannot enable live adapter invocation.",
      ),
    );
  }
  if (input.live_broker_dispatch_allowed !== undefined) {
    errors.push(
      gateError(
        "runtime_adapter_implementation_approval_gate.live_broker_dispatch_forbidden",
        "/live_broker_dispatch_allowed",
        "Runtime adapter implementation approval gate cannot enable live broker dispatch.",
      ),
    );
  }
  if (input.live_execution_allowed !== undefined) {
    errors.push(
      gateError(
        "runtime_adapter_implementation_approval_gate.live_execution_forbidden",
        "/live_execution_allowed",
        "Runtime adapter implementation approval gate cannot enable live execution.",
      ),
    );
  }
  if (Object.hasOwn(input, "side_effects") && !isEmptyArray(input.side_effects)) {
    errors.push(
      gateError(
        "runtime_adapter_implementation_approval_gate.side_effects_forbidden",
        "/side_effects",
        "Runtime adapter implementation approval gate must preserve side_effects: [].",
      ),
    );
  }
}

function addRequiredArrayErrors(
  arrays: {
    chainReviewRefs: unknown[];
    authorizationRequestRefs: unknown[];
    planRefs: unknown[];
    scopeRefs: unknown[];
    readinessRefs: unknown[];
    policyGateRefs: unknown[];
    humanApprovalRefs: unknown[];
    auditEventRefs: unknown[];
    rollbackRefs: unknown[];
    sourceRefs: unknown[];
  },
  errors: RuntimeAdapterImplementationApprovalGateError[],
): void {
  const checks: Array<
    [unknown[], RuntimeAdapterImplementationApprovalGateErrorCode, string, string]
  > = [
    [
      arrays.chainReviewRefs,
      "runtime_adapter_implementation_approval_gate.chain_review_ref_required",
      "/chain_review_refs",
      "Runtime adapter implementation approval gate requires BP-0155 chain review refs.",
    ],
    [
      arrays.authorizationRequestRefs,
      "runtime_adapter_implementation_approval_gate.authorization_request_ref_required",
      "/authorization_request_refs",
      "Runtime adapter implementation approval gate requires BP-0150 authorization request refs.",
    ],
    [
      arrays.planRefs,
      "runtime_adapter_implementation_approval_gate.plan_ref_required",
      "/implementation_plan_refs",
      "Runtime adapter implementation approval gate requires implementation plan refs.",
    ],
    [
      arrays.scopeRefs,
      "runtime_adapter_implementation_approval_gate.scope_ref_required",
      "/runtime_adapter_implementation_scope_refs",
      "Runtime adapter implementation approval gate requires implementation scope refs.",
    ],
    [
      arrays.readinessRefs,
      "runtime_adapter_implementation_approval_gate.readiness_ref_required",
      "/runtime_adapter_readiness_gate_refs",
      "Runtime adapter implementation approval gate requires readiness gate refs.",
    ],
    [
      arrays.policyGateRefs,
      "runtime_adapter_implementation_approval_gate.policy_gate_required",
      "/policy_gate_refs",
      "Runtime adapter implementation approval gate requires policy gate refs.",
    ],
    [
      arrays.humanApprovalRefs,
      "runtime_adapter_implementation_approval_gate.human_approval_required",
      "/human_approval_refs",
      "Runtime adapter implementation approval gate requires human approval refs.",
    ],
    [
      arrays.auditEventRefs,
      "runtime_adapter_implementation_approval_gate.audit_ref_required",
      "/audit_event_refs",
      "Runtime adapter implementation approval gate requires audit refs.",
    ],
    [
      arrays.rollbackRefs,
      "runtime_adapter_implementation_approval_gate.rollback_ref_required",
      "/rollback_refs",
      "Runtime adapter implementation approval gate requires rollback refs.",
    ],
    [
      arrays.sourceRefs,
      "runtime_adapter_implementation_approval_gate.source_ref_required",
      "/source_refs",
      "Runtime adapter implementation approval gate requires source refs.",
    ],
  ];
  for (const [array, code, path, message] of checks) {
    if (array.length === 0) {
      errors.push(gateError(code, path, message));
    }
  }
}

function normalizeArray<T>(
  value: unknown,
  path: string,
  requiredCode: RuntimeAdapterImplementationApprovalGateErrorCode,
  requiredMessage: string,
  mapper: (item: unknown, path: string) => T | null,
  errors: RuntimeAdapterImplementationApprovalGateError[],
): T[] {
  if (!Array.isArray(value)) {
    errors.push(gateError(requiredCode, path, requiredMessage));
    return [];
  }
  return value
    .map((item, index) => mapper(item, `${path}/${index}`))
    .filter((item): item is T => item !== null);
}

function failApprovalGate(
  errors: RuntimeAdapterImplementationApprovalGateError[],
): RuntimeAdapterImplementationApprovalGateResult {
  return {
    ok: false,
    runtime_adapter_implementation_approval_gate: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function gateError(
  code: RuntimeAdapterImplementationApprovalGateErrorCode,
  path: string,
  message: string,
): RuntimeAdapterImplementationApprovalGateError {
  return { code, path, message, severity: "error" };
}

function secretError(
  path: string,
  subject: string,
): RuntimeAdapterImplementationApprovalGateError {
  return gateError(
    "runtime_adapter_implementation_approval_gate.secret_value_forbidden",
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
  errors: RuntimeAdapterImplementationApprovalGateError[],
): RuntimeAdapterImplementationApprovalGateError[] {
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
