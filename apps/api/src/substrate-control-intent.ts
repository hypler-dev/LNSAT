import {
  createSubstrateControlIntent,
  substrateControlIntentContract,
  type SubstrateControlIntentError,
  type SubstrateControlIntentEvidence,
} from "@lnsat/packets";

export const SUBSTRATE_CONTROL_INTENT_GATEWAY_STATUS = "contract_only";

export const substrateControlIntentGatewayContract = {
  contract_id: "lnsat.gateway.substrate_control_intent.v0_1",
  method: "POST",
  path: "/v1/platform/substrate-control-intent/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-substrate-control-intent",
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
    "packages/packets/src/substrate-control-intent.ts",
    "apps/api/src/substrate-control-intent.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type SubstrateControlIntentGatewayRequest = {
  request_id?: string;
  intent_request: unknown;
};

export type SubstrateControlIntentGatewayErrorCode =
  | "substrate_control_intent_gateway.invalid_request"
  | "substrate_control_intent_gateway.unexpected_field"
  | "substrate_control_intent_gateway.invalid_request_id"
  | "substrate_control_intent_gateway.missing_intent_request";

export type SubstrateControlIntentGatewayError = {
  code: SubstrateControlIntentGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type SubstrateControlIntentGatewayResponse =
  | {
      ok: true;
      contract_id: typeof substrateControlIntentGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      substrate_control_intent: SubstrateControlIntentEvidence;
      intent_version: SubstrateControlIntentEvidence["intent_version"];
      requested_actor: SubstrateControlIntentEvidence["requested_actor"];
      capability: string;
      risk_level: number;
      target_substrate_kind: SubstrateControlIntentEvidence["target_substrate_kind"];
      requested_control_mode: SubstrateControlIntentEvidence["requested_control_mode"];
      required_packet_family_refs: SubstrateControlIntentEvidence["required_packet_family_refs"];
      lifecycle_refs: SubstrateControlIntentEvidence["lifecycle_refs"];
      required_policy_gates: string[];
      policy_gate_refs: SubstrateControlIntentEvidence["policy_gate_refs"];
      required_approvals: string[];
      approval_refs: SubstrateControlIntentEvidence["approval_refs"];
      audit_event_plan: SubstrateControlIntentEvidence["audit_event_plan"];
      required_audit_events: string[];
      result_expectations: SubstrateControlIntentEvidence["result_expectations"];
      rollback_expectations: SubstrateControlIntentEvidence["rollback_expectations"];
      blocked_live_actions: string[];
      denied_live_behavior: string[];
      secret_posture: "references_only_no_values";
      source_refs: string[];
      live_substrate_mutation_allowed: false;
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof substrateControlIntentGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: SubstrateControlIntentGatewayError[];
      intent_errors: SubstrateControlIntentError[];
      substrate_control_intent: null;
      intent_version: typeof substrateControlIntentContract.intent_version;
      requested_actor: null;
      capability: null;
      risk_level: null;
      target_substrate_kind: null;
      requested_control_mode: null;
      required_packet_family_refs: typeof substrateControlIntentContract.required_packet_families;
      lifecycle_refs: [];
      required_policy_gates: [];
      policy_gate_refs: [];
      required_approvals: [];
      approval_refs: [];
      audit_event_plan: [];
      required_audit_events: [];
      result_expectations: null;
      rollback_expectations: [];
      blocked_live_actions: [];
      denied_live_behavior: [];
      secret_posture: "references_only_no_values";
      source_refs: [];
      live_substrate_mutation_allowed: false;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedSubstrateControlIntentGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      intent_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: SubstrateControlIntentGatewayError[];
    };

const requestKeys = new Set(["request_id", "intent_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectSubstrateControlIntentGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<SubstrateControlIntentGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeSubstrateControlIntentGatewayRequest(input);

  if (!normalized.ok) {
    return substrateControlIntentGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const intentResult = createSubstrateControlIntent(normalized.intent_request);

  if (!intentResult.ok) {
    return substrateControlIntentGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      intentResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: substrateControlIntentGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: substrateControlIntentGatewaySourceDocs(),
    substrate_control_intent: intentResult.substrate_control_intent,
    intent_version: intentResult.substrate_control_intent.intent_version,
    requested_actor: intentResult.substrate_control_intent.requested_actor,
    capability: intentResult.substrate_control_intent.capability,
    risk_level: intentResult.substrate_control_intent.risk_level,
    target_substrate_kind: intentResult.substrate_control_intent.target_substrate_kind,
    requested_control_mode:
      intentResult.substrate_control_intent.requested_control_mode,
    required_packet_family_refs:
      intentResult.substrate_control_intent.required_packet_family_refs,
    lifecycle_refs: intentResult.substrate_control_intent.lifecycle_refs,
    required_policy_gates: intentResult.substrate_control_intent.required_policy_gates,
    policy_gate_refs: intentResult.substrate_control_intent.policy_gate_refs,
    required_approvals: intentResult.substrate_control_intent.required_approvals,
    approval_refs: intentResult.substrate_control_intent.approval_refs,
    audit_event_plan: intentResult.substrate_control_intent.audit_event_plan,
    required_audit_events: intentResult.substrate_control_intent.required_audit_events,
    result_expectations: intentResult.substrate_control_intent.result_expectations,
    rollback_expectations: intentResult.substrate_control_intent.rollback_expectations,
    blocked_live_actions: intentResult.substrate_control_intent.blocked_live_actions,
    denied_live_behavior: intentResult.substrate_control_intent.denied_live_behavior,
    secret_posture: intentResult.substrate_control_intent.secret_posture,
    source_refs: intentResult.substrate_control_intent.source_refs,
    live_substrate_mutation_allowed:
      intentResult.substrate_control_intent.live_substrate_mutation_allowed,
    live_execution_allowed:
      intentResult.substrate_control_intent.live_execution_allowed,
    side_effects: intentResult.side_effects,
  };
}

function normalizeSubstrateControlIntentGatewayRequest(
  input: unknown,
): NormalizedSubstrateControlIntentGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "substrate_control_intent_gateway.invalid_request",
          "",
          "Substrate control intent Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: SubstrateControlIntentGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "substrate_control_intent_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected substrate control intent Gateway request field.",
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
        "substrate_control_intent_gateway.invalid_request_id",
        "/request_id",
        "Substrate control intent Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "intent_request")) {
    errors.push(
      gatewayError(
        "substrate_control_intent_gateway.missing_intent_request",
        "/intent_request",
        "Substrate control intent Gateway request must include intent_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    intent_request: input.intent_request,
  };
}

function substrateControlIntentGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: SubstrateControlIntentGatewayError[],
  intentErrors: SubstrateControlIntentError[] = [],
): SubstrateControlIntentGatewayResponse {
  return {
    ok: false,
    contract_id: substrateControlIntentGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: substrateControlIntentGatewaySourceDocs(),
    request_errors: requestErrors,
    intent_errors: intentErrors,
    substrate_control_intent: null,
    intent_version: substrateControlIntentContract.intent_version,
    requested_actor: null,
    capability: null,
    risk_level: null,
    target_substrate_kind: null,
    requested_control_mode: null,
    required_packet_family_refs:
      substrateControlIntentContract.required_packet_families,
    lifecycle_refs: [],
    required_policy_gates: [],
    policy_gate_refs: [],
    required_approvals: [],
    approval_refs: [],
    audit_event_plan: [],
    required_audit_events: [],
    result_expectations: null,
    rollback_expectations: [],
    blocked_live_actions: [],
    denied_live_behavior: [],
    secret_posture: "references_only_no_values",
    source_refs: [],
    live_substrate_mutation_allowed: false,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function substrateControlIntentGatewaySourceDocs(): string[] {
  return [...substrateControlIntentGatewayContract.source_docs];
}

function gatewayError(
  code: SubstrateControlIntentGatewayErrorCode,
  path: string,
  message: string,
): SubstrateControlIntentGatewayError {
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
