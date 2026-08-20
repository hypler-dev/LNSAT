import {
  adapterInvocationPreflightContract,
  createAdapterInvocationPreflight,
  type AdapterInvocationPreflightError,
  type AdapterInvocationPreflightEvidence,
} from "@lnsat/packets";

export const ADAPTER_INVOCATION_PREFLIGHT_GATEWAY_STATUS = "contract_only";

export const adapterInvocationPreflightGatewayContract = {
  contract_id: "lnsat.gateway.adapter_invocation_preflight.v0_1",
  method: "POST",
  path: "/v1/platform/adapter-invocation-preflight/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-adapter-invocation-preflight",
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
    "packages/packets/src/adapter-invocation-preflight.ts",
    "apps/api/src/adapter-invocation-preflight.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type AdapterInvocationPreflightGatewayRequest = {
  request_id?: string;
  preflight_request: unknown;
};

export type AdapterInvocationPreflightGatewayErrorCode =
  | "adapter_invocation_preflight_gateway.invalid_request"
  | "adapter_invocation_preflight_gateway.unexpected_field"
  | "adapter_invocation_preflight_gateway.invalid_request_id"
  | "adapter_invocation_preflight_gateway.missing_preflight_request";

export type AdapterInvocationPreflightGatewayError = {
  code: AdapterInvocationPreflightGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AdapterInvocationPreflightGatewayResponse =
  | {
      ok: true;
      contract_id: typeof adapterInvocationPreflightGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      adapter_invocation_preflight: AdapterInvocationPreflightEvidence;
      preflight_version: AdapterInvocationPreflightEvidence["preflight_version"];
      preflight_identity: AdapterInvocationPreflightEvidence["preflight_identity"];
      requested_actor: AdapterInvocationPreflightEvidence["requested_actor"];
      capability: string;
      risk_level: number;
      target_substrate_kind: AdapterInvocationPreflightEvidence["target_substrate_kind"];
      requested_control_mode: AdapterInvocationPreflightEvidence["requested_control_mode"];
      substrate_control_intent_refs: AdapterInvocationPreflightEvidence["substrate_control_intent_refs"];
      capability_broker_request_refs: AdapterInvocationPreflightEvidence["capability_broker_request_refs"];
      substrate_adapter_manifest_refs: AdapterInvocationPreflightEvidence["substrate_adapter_manifest_refs"];
      adapter_identity: AdapterInvocationPreflightEvidence["adapter_identity"];
      adapter_class: AdapterInvocationPreflightEvidence["adapter_class"];
      required_input_evidence_refs: AdapterInvocationPreflightEvidence["required_input_evidence_refs"];
      required_policy_gates: string[];
      policy_gate_refs: AdapterInvocationPreflightEvidence["policy_gate_refs"];
      required_approvals: string[];
      approval_refs: AdapterInvocationPreflightEvidence["approval_refs"];
      audit_event_plan: AdapterInvocationPreflightEvidence["audit_event_plan"];
      required_audit_events: string[];
      result_expectations: AdapterInvocationPreflightEvidence["result_expectations"];
      rollback_expectations: AdapterInvocationPreflightEvidence["rollback_expectations"];
      denied_adapter_behavior: string[];
      denied_live_behavior: string[];
      source_refs: string[];
      adapter_authority: "preflight_only_no_invocation";
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof adapterInvocationPreflightGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: AdapterInvocationPreflightGatewayError[];
      preflight_errors: AdapterInvocationPreflightError[];
      adapter_invocation_preflight: null;
      preflight_version: typeof adapterInvocationPreflightContract.preflight_version;
      preflight_identity: null;
      requested_actor: null;
      capability: null;
      risk_level: null;
      target_substrate_kind: null;
      requested_control_mode: null;
      substrate_control_intent_refs: [];
      capability_broker_request_refs: [];
      substrate_adapter_manifest_refs: [];
      adapter_identity: null;
      adapter_class: null;
      required_input_evidence_refs: [];
      required_policy_gates: [];
      policy_gate_refs: [];
      required_approvals: [];
      approval_refs: [];
      audit_event_plan: [];
      required_audit_events: [];
      result_expectations: null;
      rollback_expectations: [];
      denied_adapter_behavior: [];
      denied_live_behavior: [];
      source_refs: [];
      adapter_authority: "preflight_only_no_invocation";
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedAdapterInvocationPreflightGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      preflight_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: AdapterInvocationPreflightGatewayError[];
    };

const requestKeys = new Set(["request_id", "preflight_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectAdapterInvocationPreflightGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<AdapterInvocationPreflightGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeAdapterInvocationPreflightGatewayRequest(input);

  if (!normalized.ok) {
    return adapterInvocationPreflightGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const preflightResult = createAdapterInvocationPreflight(
    normalized.preflight_request,
  );

  if (!preflightResult.ok) {
    return adapterInvocationPreflightGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      preflightResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: adapterInvocationPreflightGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: adapterInvocationPreflightGatewaySourceDocs(),
    adapter_invocation_preflight: preflightResult.adapter_invocation_preflight,
    preflight_version: preflightResult.adapter_invocation_preflight.preflight_version,
    preflight_identity: preflightResult.adapter_invocation_preflight.preflight_identity,
    requested_actor: preflightResult.adapter_invocation_preflight.requested_actor,
    capability: preflightResult.adapter_invocation_preflight.capability,
    risk_level: preflightResult.adapter_invocation_preflight.risk_level,
    target_substrate_kind:
      preflightResult.adapter_invocation_preflight.target_substrate_kind,
    requested_control_mode:
      preflightResult.adapter_invocation_preflight.requested_control_mode,
    substrate_control_intent_refs:
      preflightResult.adapter_invocation_preflight.substrate_control_intent_refs,
    capability_broker_request_refs:
      preflightResult.adapter_invocation_preflight.capability_broker_request_refs,
    substrate_adapter_manifest_refs:
      preflightResult.adapter_invocation_preflight.substrate_adapter_manifest_refs,
    adapter_identity: preflightResult.adapter_invocation_preflight.adapter_identity,
    adapter_class: preflightResult.adapter_invocation_preflight.adapter_class,
    required_input_evidence_refs:
      preflightResult.adapter_invocation_preflight.required_input_evidence_refs,
    required_policy_gates:
      preflightResult.adapter_invocation_preflight.required_policy_gates,
    policy_gate_refs: preflightResult.adapter_invocation_preflight.policy_gate_refs,
    required_approvals: preflightResult.adapter_invocation_preflight.required_approvals,
    approval_refs: preflightResult.adapter_invocation_preflight.approval_refs,
    audit_event_plan: preflightResult.adapter_invocation_preflight.audit_event_plan,
    required_audit_events:
      preflightResult.adapter_invocation_preflight.required_audit_events,
    result_expectations:
      preflightResult.adapter_invocation_preflight.result_expectations,
    rollback_expectations:
      preflightResult.adapter_invocation_preflight.rollback_expectations,
    denied_adapter_behavior:
      preflightResult.adapter_invocation_preflight.denied_adapter_behavior,
    denied_live_behavior:
      preflightResult.adapter_invocation_preflight.denied_live_behavior,
    source_refs: preflightResult.adapter_invocation_preflight.source_refs,
    adapter_authority: preflightResult.adapter_invocation_preflight.adapter_authority,
    live_adapter_invocation_allowed:
      preflightResult.adapter_invocation_preflight.live_adapter_invocation_allowed,
    live_broker_dispatch_allowed:
      preflightResult.adapter_invocation_preflight.live_broker_dispatch_allowed,
    live_execution_allowed:
      preflightResult.adapter_invocation_preflight.live_execution_allowed,
    side_effects: preflightResult.side_effects,
  };
}

function normalizeAdapterInvocationPreflightGatewayRequest(
  input: unknown,
): NormalizedAdapterInvocationPreflightGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "adapter_invocation_preflight_gateway.invalid_request",
          "",
          "Adapter invocation preflight Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: AdapterInvocationPreflightGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "adapter_invocation_preflight_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected adapter invocation preflight Gateway request field.",
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
        "adapter_invocation_preflight_gateway.invalid_request_id",
        "/request_id",
        "Adapter invocation preflight Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "preflight_request")) {
    errors.push(
      gatewayError(
        "adapter_invocation_preflight_gateway.missing_preflight_request",
        "/preflight_request",
        "Adapter invocation preflight Gateway request must include preflight_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    preflight_request: input.preflight_request,
  };
}

function adapterInvocationPreflightGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: AdapterInvocationPreflightGatewayError[],
  preflightErrors: AdapterInvocationPreflightError[] = [],
): AdapterInvocationPreflightGatewayResponse {
  return {
    ok: false,
    contract_id: adapterInvocationPreflightGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: adapterInvocationPreflightGatewaySourceDocs(),
    request_errors: requestErrors,
    preflight_errors: preflightErrors,
    adapter_invocation_preflight: null,
    preflight_version: adapterInvocationPreflightContract.preflight_version,
    preflight_identity: null,
    requested_actor: null,
    capability: null,
    risk_level: null,
    target_substrate_kind: null,
    requested_control_mode: null,
    substrate_control_intent_refs: [],
    capability_broker_request_refs: [],
    substrate_adapter_manifest_refs: [],
    adapter_identity: null,
    adapter_class: null,
    required_input_evidence_refs: [],
    required_policy_gates: [],
    policy_gate_refs: [],
    required_approvals: [],
    approval_refs: [],
    audit_event_plan: [],
    required_audit_events: [],
    result_expectations: null,
    rollback_expectations: [],
    denied_adapter_behavior: [],
    denied_live_behavior: [],
    source_refs: [],
    adapter_authority: adapterInvocationPreflightContract.adapter_authority,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function adapterInvocationPreflightGatewaySourceDocs(): string[] {
  return [...adapterInvocationPreflightGatewayContract.source_docs];
}

function gatewayError(
  code: AdapterInvocationPreflightGatewayErrorCode,
  path: string,
  message: string,
): AdapterInvocationPreflightGatewayError {
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
