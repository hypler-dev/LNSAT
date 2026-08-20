import {
  adapterInvocationResultContract,
  createAdapterInvocationResult,
  type AdapterInvocationResultError,
  type AdapterInvocationResultEvidence,
} from "@lnsat/packets";

export const ADAPTER_INVOCATION_RESULT_GATEWAY_STATUS = "contract_only";

export const adapterInvocationResultGatewayContract = {
  contract_id: "lnsat.gateway.adapter_invocation_result.v0_1",
  method: "POST",
  path: "/v1/platform/adapter-invocation-result/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-adapter-invocation-result",
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
    "packages/packets/src/adapter-invocation-result.ts",
    "apps/api/src/adapter-invocation-result.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type AdapterInvocationResultGatewayRequest = {
  request_id?: string;
  result_request: unknown;
};

export type AdapterInvocationResultGatewayErrorCode =
  | "adapter_invocation_result_gateway.invalid_request"
  | "adapter_invocation_result_gateway.unexpected_field"
  | "adapter_invocation_result_gateway.invalid_request_id"
  | "adapter_invocation_result_gateway.missing_result_request";

export type AdapterInvocationResultGatewayError = {
  code: AdapterInvocationResultGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AdapterInvocationResultGatewayResponse =
  | {
      ok: true;
      contract_id: typeof adapterInvocationResultGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      adapter_invocation_result: AdapterInvocationResultEvidence;
      result_version: AdapterInvocationResultEvidence["result_version"];
      result_identity: AdapterInvocationResultEvidence["result_identity"];
      adapter_invocation_preflight_refs: AdapterInvocationResultEvidence["adapter_invocation_preflight_refs"];
      adapter_identity: AdapterInvocationResultEvidence["adapter_identity"];
      adapter_class: AdapterInvocationResultEvidence["adapter_class"];
      requested_actor: AdapterInvocationResultEvidence["requested_actor"];
      capability: string;
      risk_level: number;
      target_substrate_kind: AdapterInvocationResultEvidence["target_substrate_kind"];
      requested_control_mode: AdapterInvocationResultEvidence["requested_control_mode"];
      expected_result_refs: AdapterInvocationResultEvidence["expected_result_refs"];
      rollback_refs: AdapterInvocationResultEvidence["rollback_refs"];
      audit_event_refs: AdapterInvocationResultEvidence["audit_event_refs"];
      required_audit_events: string[];
      policy_gate_refs: AdapterInvocationResultEvidence["policy_gate_refs"];
      required_policy_gates: string[];
      approval_refs: AdapterInvocationResultEvidence["approval_refs"];
      required_approvals: string[];
      observed_status: AdapterInvocationResultEvidence["observed_status"];
      output_evidence_refs: AdapterInvocationResultEvidence["output_evidence_refs"];
      error_evidence_refs: AdapterInvocationResultEvidence["error_evidence_refs"];
      denied_live_behavior: string[];
      source_refs: string[];
      result_authority: "result_evidence_only_no_execution";
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof adapterInvocationResultGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: AdapterInvocationResultGatewayError[];
      result_errors: AdapterInvocationResultError[];
      adapter_invocation_result: null;
      result_version: typeof adapterInvocationResultContract.result_version;
      result_identity: null;
      adapter_invocation_preflight_refs: [];
      adapter_identity: null;
      adapter_class: null;
      requested_actor: null;
      capability: null;
      risk_level: null;
      target_substrate_kind: null;
      requested_control_mode: null;
      expected_result_refs: [];
      rollback_refs: [];
      audit_event_refs: [];
      required_audit_events: [];
      policy_gate_refs: [];
      required_policy_gates: [];
      approval_refs: [];
      required_approvals: [];
      observed_status: null;
      output_evidence_refs: [];
      error_evidence_refs: [];
      denied_live_behavior: [];
      source_refs: [];
      result_authority: "result_evidence_only_no_execution";
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedAdapterInvocationResultGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      result_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: AdapterInvocationResultGatewayError[];
    };

const requestKeys = new Set(["request_id", "result_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectAdapterInvocationResultGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<AdapterInvocationResultGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeAdapterInvocationResultGatewayRequest(input);

  if (!normalized.ok) {
    return adapterInvocationResultGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const result = createAdapterInvocationResult(normalized.result_request);

  if (!result.ok) {
    return adapterInvocationResultGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      result.errors,
    );
  }

  return {
    ok: true,
    contract_id: adapterInvocationResultGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: adapterInvocationResultGatewaySourceDocs(),
    adapter_invocation_result: result.adapter_invocation_result,
    result_version: result.adapter_invocation_result.result_version,
    result_identity: result.adapter_invocation_result.result_identity,
    adapter_invocation_preflight_refs:
      result.adapter_invocation_result.adapter_invocation_preflight_refs,
    adapter_identity: result.adapter_invocation_result.adapter_identity,
    adapter_class: result.adapter_invocation_result.adapter_class,
    requested_actor: result.adapter_invocation_result.requested_actor,
    capability: result.adapter_invocation_result.capability,
    risk_level: result.adapter_invocation_result.risk_level,
    target_substrate_kind: result.adapter_invocation_result.target_substrate_kind,
    requested_control_mode: result.adapter_invocation_result.requested_control_mode,
    expected_result_refs: result.adapter_invocation_result.expected_result_refs,
    rollback_refs: result.adapter_invocation_result.rollback_refs,
    audit_event_refs: result.adapter_invocation_result.audit_event_refs,
    required_audit_events: result.adapter_invocation_result.required_audit_events,
    policy_gate_refs: result.adapter_invocation_result.policy_gate_refs,
    required_policy_gates: result.adapter_invocation_result.required_policy_gates,
    approval_refs: result.adapter_invocation_result.approval_refs,
    required_approvals: result.adapter_invocation_result.required_approvals,
    observed_status: result.adapter_invocation_result.observed_status,
    output_evidence_refs: result.adapter_invocation_result.output_evidence_refs,
    error_evidence_refs: result.adapter_invocation_result.error_evidence_refs,
    denied_live_behavior: result.adapter_invocation_result.denied_live_behavior,
    source_refs: result.adapter_invocation_result.source_refs,
    result_authority: result.adapter_invocation_result.result_authority,
    live_adapter_invocation_allowed:
      result.adapter_invocation_result.live_adapter_invocation_allowed,
    live_broker_dispatch_allowed:
      result.adapter_invocation_result.live_broker_dispatch_allowed,
    live_execution_allowed: result.adapter_invocation_result.live_execution_allowed,
    side_effects: result.side_effects,
  };
}

function normalizeAdapterInvocationResultGatewayRequest(
  input: unknown,
): NormalizedAdapterInvocationResultGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "adapter_invocation_result_gateway.invalid_request",
          "",
          "Adapter invocation result Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: AdapterInvocationResultGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "adapter_invocation_result_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected adapter invocation result Gateway request field.",
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
        "adapter_invocation_result_gateway.invalid_request_id",
        "/request_id",
        "Adapter invocation result Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "result_request")) {
    errors.push(
      gatewayError(
        "adapter_invocation_result_gateway.missing_result_request",
        "/result_request",
        "Adapter invocation result Gateway request must include result_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    result_request: input.result_request,
  };
}

function adapterInvocationResultGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: AdapterInvocationResultGatewayError[],
  resultErrors: AdapterInvocationResultError[] = [],
): AdapterInvocationResultGatewayResponse {
  return {
    ok: false,
    contract_id: adapterInvocationResultGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: adapterInvocationResultGatewaySourceDocs(),
    request_errors: requestErrors,
    result_errors: resultErrors,
    adapter_invocation_result: null,
    result_version: adapterInvocationResultContract.result_version,
    result_identity: null,
    adapter_invocation_preflight_refs: [],
    adapter_identity: null,
    adapter_class: null,
    requested_actor: null,
    capability: null,
    risk_level: null,
    target_substrate_kind: null,
    requested_control_mode: null,
    expected_result_refs: [],
    rollback_refs: [],
    audit_event_refs: [],
    required_audit_events: [],
    policy_gate_refs: [],
    required_policy_gates: [],
    approval_refs: [],
    required_approvals: [],
    observed_status: null,
    output_evidence_refs: [],
    error_evidence_refs: [],
    denied_live_behavior: [],
    source_refs: [],
    result_authority: adapterInvocationResultContract.result_authority,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function adapterInvocationResultGatewaySourceDocs(): string[] {
  return [...adapterInvocationResultGatewayContract.source_docs];
}

function gatewayError(
  code: AdapterInvocationResultGatewayErrorCode,
  path: string,
  message: string,
): AdapterInvocationResultGatewayError {
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
