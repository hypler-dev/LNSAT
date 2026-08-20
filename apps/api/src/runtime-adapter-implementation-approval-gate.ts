import {
  createRuntimeAdapterImplementationApprovalGate,
  runtimeAdapterImplementationApprovalGateContract,
  type RuntimeAdapterImplementationApprovalGateError,
  type RuntimeAdapterImplementationApprovalGateEvidence,
} from "@lnsat/packets";

export const RUNTIME_ADAPTER_IMPLEMENTATION_APPROVAL_GATE_GATEWAY_STATUS =
  "contract_only";

export const runtimeAdapterImplementationApprovalGateGatewayContract = {
  contract_id: "lnsat.gateway.runtime_adapter_implementation_approval_gate.v0_1",
  method: "POST",
  path: "/v1/platform/runtime-adapter-implementation-approval-gate/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-runtime-adapter-implementation-approval-gate",
    "LNSAT Gateway",
  ],
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
    "packages/packets/src/runtime-adapter-implementation-approval-gate.ts",
    "apps/api/src/runtime-adapter-implementation-approval-gate.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type RuntimeAdapterImplementationApprovalGateGatewayRequest = {
  request_id?: string;
  approval_gate_request: unknown;
};

export type RuntimeAdapterImplementationApprovalGateGatewayErrorCode =
  | "runtime_adapter_implementation_approval_gate_gateway.invalid_request"
  | "runtime_adapter_implementation_approval_gate_gateway.unexpected_field"
  | "runtime_adapter_implementation_approval_gate_gateway.invalid_request_id"
  | "runtime_adapter_implementation_approval_gate_gateway.missing_approval_gate_request";

export type RuntimeAdapterImplementationApprovalGateGatewayError = {
  code: RuntimeAdapterImplementationApprovalGateGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type RuntimeAdapterImplementationApprovalGateGatewayResponse =
  | {
      ok: true;
      contract_id: typeof runtimeAdapterImplementationApprovalGateGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      runtime_adapter_implementation_approval_gate: RuntimeAdapterImplementationApprovalGateEvidence;
      approval_gate_version: RuntimeAdapterImplementationApprovalGateEvidence["approval_gate_version"];
      chain_review_refs: RuntimeAdapterImplementationApprovalGateEvidence["chain_review_refs"];
      authorization_request_refs: RuntimeAdapterImplementationApprovalGateEvidence["authorization_request_refs"];
      implementation_plan_refs: RuntimeAdapterImplementationApprovalGateEvidence["implementation_plan_refs"];
      runtime_adapter_implementation_scope_refs: RuntimeAdapterImplementationApprovalGateEvidence["runtime_adapter_implementation_scope_refs"];
      runtime_adapter_readiness_gate_refs: RuntimeAdapterImplementationApprovalGateEvidence["runtime_adapter_readiness_gate_refs"];
      policy_gate_refs: RuntimeAdapterImplementationApprovalGateEvidence["policy_gate_refs"];
      required_policy_gates: string[];
      human_approval_refs: RuntimeAdapterImplementationApprovalGateEvidence["human_approval_refs"];
      required_human_approvals: string[];
      audit_event_refs: RuntimeAdapterImplementationApprovalGateEvidence["audit_event_refs"];
      required_audit_events: string[];
      rollback_refs: RuntimeAdapterImplementationApprovalGateEvidence["rollback_refs"];
      source_refs: string[];
      future_implementation_packet_ref: RuntimeAdapterImplementationApprovalGateEvidence["future_implementation_packet_ref"];
      authorization_request_chain_review_snapshot: RuntimeAdapterImplementationApprovalGateEvidence["authorization_request_chain_review_snapshot"];
      authorization_request_evidence_snapshot: RuntimeAdapterImplementationApprovalGateEvidence["authorization_request_evidence_snapshot"];
      denied_runtime_behavior: string[];
      implementation_approval_gate_authority: "implementation_approval_gate_only_no_runtime_adapter";
      runtime_adapter_implementation_allowed: false;
      runtime_adapter_dispatch_allowed: false;
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof runtimeAdapterImplementationApprovalGateGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: RuntimeAdapterImplementationApprovalGateGatewayError[];
      approval_gate_errors: RuntimeAdapterImplementationApprovalGateError[];
      runtime_adapter_implementation_approval_gate: null;
      approval_gate_version: typeof runtimeAdapterImplementationApprovalGateContract.approval_gate_version;
      chain_review_refs: [];
      authorization_request_refs: [];
      implementation_plan_refs: [];
      runtime_adapter_implementation_scope_refs: [];
      runtime_adapter_readiness_gate_refs: [];
      policy_gate_refs: [];
      required_policy_gates: [];
      human_approval_refs: [];
      required_human_approvals: [];
      audit_event_refs: [];
      required_audit_events: [];
      rollback_refs: [];
      source_refs: [];
      future_implementation_packet_ref: null;
      authorization_request_chain_review_snapshot: null;
      authorization_request_evidence_snapshot: null;
      denied_runtime_behavior: [];
      implementation_approval_gate_authority: "implementation_approval_gate_only_no_runtime_adapter";
      runtime_adapter_implementation_allowed: false;
      runtime_adapter_dispatch_allowed: false;
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedRuntimeAdapterImplementationApprovalGateGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      approval_gate_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: RuntimeAdapterImplementationApprovalGateGatewayError[];
    };

const requestKeys = new Set(["request_id", "approval_gate_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectRuntimeAdapterImplementationApprovalGateGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<RuntimeAdapterImplementationApprovalGateGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized =
    normalizeRuntimeAdapterImplementationApprovalGateGatewayRequest(input);

  if (!normalized.ok) {
    return runtimeAdapterImplementationApprovalGateGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const approvalGateResult = createRuntimeAdapterImplementationApprovalGate(
    normalized.approval_gate_request,
  );

  if (!approvalGateResult.ok) {
    return runtimeAdapterImplementationApprovalGateGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      approvalGateResult.errors,
    );
  }

  const approvalGate = approvalGateResult.runtime_adapter_implementation_approval_gate;

  return {
    ok: true,
    contract_id: runtimeAdapterImplementationApprovalGateGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: runtimeAdapterImplementationApprovalGateGatewaySourceDocs(),
    runtime_adapter_implementation_approval_gate: approvalGate,
    approval_gate_version: approvalGate.approval_gate_version,
    chain_review_refs: approvalGate.chain_review_refs,
    authorization_request_refs: approvalGate.authorization_request_refs,
    implementation_plan_refs: approvalGate.implementation_plan_refs,
    runtime_adapter_implementation_scope_refs:
      approvalGate.runtime_adapter_implementation_scope_refs,
    runtime_adapter_readiness_gate_refs:
      approvalGate.runtime_adapter_readiness_gate_refs,
    policy_gate_refs: approvalGate.policy_gate_refs,
    required_policy_gates: approvalGate.required_policy_gates,
    human_approval_refs: approvalGate.human_approval_refs,
    required_human_approvals: approvalGate.required_human_approvals,
    audit_event_refs: approvalGate.audit_event_refs,
    required_audit_events: approvalGate.required_audit_events,
    rollback_refs: approvalGate.rollback_refs,
    source_refs: approvalGate.source_refs,
    future_implementation_packet_ref: approvalGate.future_implementation_packet_ref,
    authorization_request_chain_review_snapshot:
      approvalGate.authorization_request_chain_review_snapshot,
    authorization_request_evidence_snapshot:
      approvalGate.authorization_request_evidence_snapshot,
    denied_runtime_behavior: approvalGate.denied_runtime_behavior,
    implementation_approval_gate_authority:
      approvalGate.implementation_approval_gate_authority,
    runtime_adapter_implementation_allowed:
      approvalGate.runtime_adapter_implementation_allowed,
    runtime_adapter_dispatch_allowed: approvalGate.runtime_adapter_dispatch_allowed,
    live_adapter_invocation_allowed: approvalGate.live_adapter_invocation_allowed,
    live_broker_dispatch_allowed: approvalGate.live_broker_dispatch_allowed,
    live_execution_allowed: approvalGate.live_execution_allowed,
    side_effects: approvalGateResult.side_effects,
  };
}

function normalizeRuntimeAdapterImplementationApprovalGateGatewayRequest(
  input: unknown,
): NormalizedRuntimeAdapterImplementationApprovalGateGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "runtime_adapter_implementation_approval_gate_gateway.invalid_request",
          "",
          "Runtime adapter implementation approval gate Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: RuntimeAdapterImplementationApprovalGateGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "runtime_adapter_implementation_approval_gate_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected runtime adapter implementation approval gate Gateway request field.",
        ),
      );
    }
  }

  const requestId =
    typeof input.request_id === "string" && safeRequestIdPattern.test(input.request_id)
      ? input.request_id
      : null;
  if (
    Object.hasOwn(input, "request_id") &&
    (typeof input.request_id !== "string" ||
      !safeRequestIdPattern.test(input.request_id))
  ) {
    errors.push(
      gatewayError(
        "runtime_adapter_implementation_approval_gate_gateway.invalid_request_id",
        "/request_id",
        "Runtime adapter implementation approval gate Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "approval_gate_request")) {
    errors.push(
      gatewayError(
        "runtime_adapter_implementation_approval_gate_gateway.missing_approval_gate_request",
        "/approval_gate_request",
        "Runtime adapter implementation approval gate Gateway request must include approval_gate_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    approval_gate_request: input.approval_gate_request,
  };
}

function runtimeAdapterImplementationApprovalGateGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: RuntimeAdapterImplementationApprovalGateGatewayError[],
  approvalGateErrors: RuntimeAdapterImplementationApprovalGateError[] = [],
): RuntimeAdapterImplementationApprovalGateGatewayResponse {
  return {
    ok: false,
    contract_id: runtimeAdapterImplementationApprovalGateGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: runtimeAdapterImplementationApprovalGateGatewaySourceDocs(),
    request_errors: requestErrors,
    approval_gate_errors: approvalGateErrors,
    runtime_adapter_implementation_approval_gate: null,
    approval_gate_version:
      runtimeAdapterImplementationApprovalGateContract.approval_gate_version,
    chain_review_refs: [],
    authorization_request_refs: [],
    implementation_plan_refs: [],
    runtime_adapter_implementation_scope_refs: [],
    runtime_adapter_readiness_gate_refs: [],
    policy_gate_refs: [],
    required_policy_gates: [],
    human_approval_refs: [],
    required_human_approvals: [],
    audit_event_refs: [],
    required_audit_events: [],
    rollback_refs: [],
    source_refs: [],
    future_implementation_packet_ref: null,
    authorization_request_chain_review_snapshot: null,
    authorization_request_evidence_snapshot: null,
    denied_runtime_behavior: [],
    implementation_approval_gate_authority:
      runtimeAdapterImplementationApprovalGateContract.implementation_approval_gate_authority,
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function runtimeAdapterImplementationApprovalGateGatewaySourceDocs(): string[] {
  return [...runtimeAdapterImplementationApprovalGateGatewayContract.source_docs];
}

function gatewayError(
  code: RuntimeAdapterImplementationApprovalGateGatewayErrorCode,
  path: string,
  message: string,
): RuntimeAdapterImplementationApprovalGateGatewayError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function jsonPointer(segment: string): string {
  return `/${segment.replace(/~/g, "~0").replace(/\//g, "~1")}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
