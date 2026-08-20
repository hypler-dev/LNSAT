import {
  capabilityBrokerRequestContract,
  createCapabilityBrokerRequest,
  type CapabilityBrokerRequestError,
  type CapabilityBrokerRequestEvidence,
} from "@lnsat/packets";

export const CAPABILITY_BROKER_REQUEST_GATEWAY_STATUS = "contract_only";

export const capabilityBrokerRequestGatewayContract = {
  contract_id: "lnsat.gateway.capability_broker_request.v0_1",
  method: "POST",
  path: "/v1/platform/capability-broker-request/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-capability-broker-request",
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
    "packages/packets/src/capability-broker-request.ts",
    "apps/api/src/capability-broker-request.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type CapabilityBrokerRequestGatewayRequest = {
  request_id?: string;
  broker_request: unknown;
};

export type CapabilityBrokerRequestGatewayErrorCode =
  | "capability_broker_request_gateway.invalid_request"
  | "capability_broker_request_gateway.unexpected_field"
  | "capability_broker_request_gateway.invalid_request_id"
  | "capability_broker_request_gateway.missing_broker_request";

export type CapabilityBrokerRequestGatewayError = {
  code: CapabilityBrokerRequestGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type CapabilityBrokerRequestGatewayResponse =
  | {
      ok: true;
      contract_id: typeof capabilityBrokerRequestGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      capability_broker_request: CapabilityBrokerRequestEvidence;
      request_version: CapabilityBrokerRequestEvidence["request_version"];
      requested_actor: CapabilityBrokerRequestEvidence["requested_actor"];
      capability: string;
      risk_level: number;
      target_substrate_kind: CapabilityBrokerRequestEvidence["target_substrate_kind"];
      requested_control_mode: CapabilityBrokerRequestEvidence["requested_control_mode"];
      broker_decision_posture: CapabilityBrokerRequestEvidence["broker_decision_posture"];
      substrate_control_intent_refs: CapabilityBrokerRequestEvidence["substrate_control_intent_refs"];
      required_policy_gates: string[];
      policy_gate_refs: CapabilityBrokerRequestEvidence["policy_gate_refs"];
      required_approvals: string[];
      approval_refs: CapabilityBrokerRequestEvidence["approval_refs"];
      audit_event_plan: CapabilityBrokerRequestEvidence["audit_event_plan"];
      required_audit_events: string[];
      result_expectations: CapabilityBrokerRequestEvidence["result_expectations"];
      rollback_expectations: CapabilityBrokerRequestEvidence["rollback_expectations"];
      proposed_adapter_class: CapabilityBrokerRequestEvidence["proposed_adapter_class"];
      proposed_adapter_authority: "proposal_only_no_dispatch";
      blocked_broker_dispatch_actions: string[];
      denied_broker_dispatch_behavior: string[];
      denied_live_behavior: string[];
      source_refs: string[];
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof capabilityBrokerRequestGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: CapabilityBrokerRequestGatewayError[];
      broker_errors: CapabilityBrokerRequestError[];
      capability_broker_request: null;
      request_version: typeof capabilityBrokerRequestContract.request_version;
      requested_actor: null;
      capability: null;
      risk_level: null;
      target_substrate_kind: null;
      requested_control_mode: null;
      broker_decision_posture: typeof capabilityBrokerRequestContract.broker_decision_posture;
      substrate_control_intent_refs: [];
      required_policy_gates: [];
      policy_gate_refs: [];
      required_approvals: [];
      approval_refs: [];
      audit_event_plan: [];
      required_audit_events: [];
      result_expectations: null;
      rollback_expectations: [];
      proposed_adapter_class: null;
      proposed_adapter_authority: "proposal_only_no_dispatch";
      blocked_broker_dispatch_actions: [];
      denied_broker_dispatch_behavior: [];
      denied_live_behavior: [];
      source_refs: [];
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedCapabilityBrokerRequestGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      broker_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: CapabilityBrokerRequestGatewayError[];
    };

const requestKeys = new Set(["request_id", "broker_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectCapabilityBrokerRequestGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<CapabilityBrokerRequestGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeCapabilityBrokerRequestGatewayRequest(input);

  if (!normalized.ok) {
    return capabilityBrokerRequestGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const brokerResult = createCapabilityBrokerRequest(normalized.broker_request);

  if (!brokerResult.ok) {
    return capabilityBrokerRequestGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      brokerResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: capabilityBrokerRequestGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: capabilityBrokerRequestGatewaySourceDocs(),
    capability_broker_request: brokerResult.capability_broker_request,
    request_version: brokerResult.capability_broker_request.request_version,
    requested_actor: brokerResult.capability_broker_request.requested_actor,
    capability: brokerResult.capability_broker_request.capability,
    risk_level: brokerResult.capability_broker_request.risk_level,
    target_substrate_kind: brokerResult.capability_broker_request.target_substrate_kind,
    requested_control_mode:
      brokerResult.capability_broker_request.requested_control_mode,
    broker_decision_posture:
      brokerResult.capability_broker_request.broker_decision_posture,
    substrate_control_intent_refs:
      brokerResult.capability_broker_request.substrate_control_intent_refs,
    required_policy_gates: brokerResult.capability_broker_request.required_policy_gates,
    policy_gate_refs: brokerResult.capability_broker_request.policy_gate_refs,
    required_approvals: brokerResult.capability_broker_request.required_approvals,
    approval_refs: brokerResult.capability_broker_request.approval_refs,
    audit_event_plan: brokerResult.capability_broker_request.audit_event_plan,
    required_audit_events: brokerResult.capability_broker_request.required_audit_events,
    result_expectations: brokerResult.capability_broker_request.result_expectations,
    rollback_expectations: brokerResult.capability_broker_request.rollback_expectations,
    proposed_adapter_class:
      brokerResult.capability_broker_request.proposed_adapter_class,
    proposed_adapter_authority:
      brokerResult.capability_broker_request.proposed_adapter_authority,
    blocked_broker_dispatch_actions:
      brokerResult.capability_broker_request.blocked_broker_dispatch_actions,
    denied_broker_dispatch_behavior:
      brokerResult.capability_broker_request.denied_broker_dispatch_behavior,
    denied_live_behavior: brokerResult.capability_broker_request.denied_live_behavior,
    source_refs: brokerResult.capability_broker_request.source_refs,
    live_broker_dispatch_allowed:
      brokerResult.capability_broker_request.live_broker_dispatch_allowed,
    live_execution_allowed:
      brokerResult.capability_broker_request.live_execution_allowed,
    side_effects: brokerResult.side_effects,
  };
}

function normalizeCapabilityBrokerRequestGatewayRequest(
  input: unknown,
): NormalizedCapabilityBrokerRequestGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "capability_broker_request_gateway.invalid_request",
          "",
          "Capability broker request Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: CapabilityBrokerRequestGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "capability_broker_request_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected capability broker request Gateway request field.",
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
        "capability_broker_request_gateway.invalid_request_id",
        "/request_id",
        "Capability broker request Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "broker_request")) {
    errors.push(
      gatewayError(
        "capability_broker_request_gateway.missing_broker_request",
        "/broker_request",
        "Capability broker request Gateway request must include broker_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    broker_request: input.broker_request,
  };
}

function capabilityBrokerRequestGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: CapabilityBrokerRequestGatewayError[],
  brokerErrors: CapabilityBrokerRequestError[] = [],
): CapabilityBrokerRequestGatewayResponse {
  return {
    ok: false,
    contract_id: capabilityBrokerRequestGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: capabilityBrokerRequestGatewaySourceDocs(),
    request_errors: requestErrors,
    broker_errors: brokerErrors,
    capability_broker_request: null,
    request_version: capabilityBrokerRequestContract.request_version,
    requested_actor: null,
    capability: null,
    risk_level: null,
    target_substrate_kind: null,
    requested_control_mode: null,
    broker_decision_posture: capabilityBrokerRequestContract.broker_decision_posture,
    substrate_control_intent_refs: [],
    required_policy_gates: [],
    policy_gate_refs: [],
    required_approvals: [],
    approval_refs: [],
    audit_event_plan: [],
    required_audit_events: [],
    result_expectations: null,
    rollback_expectations: [],
    proposed_adapter_class: null,
    proposed_adapter_authority: "proposal_only_no_dispatch",
    blocked_broker_dispatch_actions: [],
    denied_broker_dispatch_behavior: [],
    denied_live_behavior: [],
    source_refs: [],
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function capabilityBrokerRequestGatewaySourceDocs(): string[] {
  return [...capabilityBrokerRequestGatewayContract.source_docs];
}

function gatewayError(
  code: CapabilityBrokerRequestGatewayErrorCode,
  path: string,
  message: string,
): CapabilityBrokerRequestGatewayError {
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
