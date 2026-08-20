import {
  createRuntimeAdapterReadinessGate,
  runtimeAdapterReadinessGateContract,
  type RuntimeAdapterReadinessGateError,
  type RuntimeAdapterReadinessGateEvidence,
} from "@lnsat/packets";

export const RUNTIME_ADAPTER_READINESS_GATE_GATEWAY_STATUS = "contract_only";

export const runtimeAdapterReadinessGateGatewayContract = {
  contract_id: "lnsat.gateway.runtime_adapter_readiness_gate.v0_1",
  method: "POST",
  path: "/v1/platform/runtime-adapter-readiness-gate/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-runtime-adapter-readiness-gate",
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
    "packages/packets/src/runtime-adapter-readiness-gate.ts",
    "apps/api/src/runtime-adapter-readiness-gate.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type RuntimeAdapterReadinessGateGatewayRequest = {
  request_id?: string;
  readiness_request: unknown;
};

export type RuntimeAdapterReadinessGateGatewayErrorCode =
  | "runtime_adapter_readiness_gate_gateway.invalid_request"
  | "runtime_adapter_readiness_gate_gateway.unexpected_field"
  | "runtime_adapter_readiness_gate_gateway.invalid_request_id"
  | "runtime_adapter_readiness_gate_gateway.missing_readiness_request";

export type RuntimeAdapterReadinessGateGatewayError = {
  code: RuntimeAdapterReadinessGateGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type RuntimeAdapterReadinessGateGatewayResponse =
  | {
      ok: true;
      contract_id: typeof runtimeAdapterReadinessGateGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      runtime_adapter_readiness_gate: RuntimeAdapterReadinessGateEvidence;
      readiness_version: RuntimeAdapterReadinessGateEvidence["readiness_version"];
      readiness_identity: RuntimeAdapterReadinessGateEvidence["readiness_identity"];
      requested_actor: RuntimeAdapterReadinessGateEvidence["requested_actor"];
      capability: string;
      risk_level: number;
      target_substrate_kind: RuntimeAdapterReadinessGateEvidence["target_substrate_kind"];
      requested_control_mode: RuntimeAdapterReadinessGateEvidence["requested_control_mode"];
      substrate_control_intent_refs: RuntimeAdapterReadinessGateEvidence["substrate_control_intent_refs"];
      capability_broker_request_refs: RuntimeAdapterReadinessGateEvidence["capability_broker_request_refs"];
      substrate_adapter_manifest_refs: RuntimeAdapterReadinessGateEvidence["substrate_adapter_manifest_refs"];
      adapter_invocation_preflight_refs: RuntimeAdapterReadinessGateEvidence["adapter_invocation_preflight_refs"];
      expected_result_refs: RuntimeAdapterReadinessGateEvidence["expected_result_refs"];
      adapter_invocation_authorization_bundle_refs: RuntimeAdapterReadinessGateEvidence["adapter_invocation_authorization_bundle_refs"];
      rollback_refs: RuntimeAdapterReadinessGateEvidence["rollback_refs"];
      policy_gate_refs: RuntimeAdapterReadinessGateEvidence["policy_gate_refs"];
      required_policy_gates: string[];
      approval_refs: RuntimeAdapterReadinessGateEvidence["approval_refs"];
      required_approvals: string[];
      audit_event_refs: RuntimeAdapterReadinessGateEvidence["audit_event_refs"];
      required_audit_events: string[];
      source_refs: string[];
      consistency_requirements: string[];
      cross_ref_consistency: RuntimeAdapterReadinessGateEvidence["cross_ref_consistency"];
      denied_live_behavior: string[];
      readiness_authority: "readiness_gate_only_no_runtime_invocation";
      runtime_adapter_dispatch_allowed: false;
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof runtimeAdapterReadinessGateGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: RuntimeAdapterReadinessGateGatewayError[];
      readiness_errors: RuntimeAdapterReadinessGateError[];
      runtime_adapter_readiness_gate: null;
      readiness_version: typeof runtimeAdapterReadinessGateContract.readiness_version;
      readiness_identity: null;
      requested_actor: null;
      capability: null;
      risk_level: null;
      target_substrate_kind: null;
      requested_control_mode: null;
      substrate_control_intent_refs: [];
      capability_broker_request_refs: [];
      substrate_adapter_manifest_refs: [];
      adapter_invocation_preflight_refs: [];
      expected_result_refs: [];
      adapter_invocation_authorization_bundle_refs: [];
      rollback_refs: [];
      policy_gate_refs: [];
      required_policy_gates: [];
      approval_refs: [];
      required_approvals: [];
      audit_event_refs: [];
      required_audit_events: [];
      source_refs: [];
      consistency_requirements: [];
      cross_ref_consistency: null;
      denied_live_behavior: [];
      readiness_authority: "readiness_gate_only_no_runtime_invocation";
      runtime_adapter_dispatch_allowed: false;
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedRuntimeAdapterReadinessGateGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      readiness_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: RuntimeAdapterReadinessGateGatewayError[];
    };

const requestKeys = new Set(["request_id", "readiness_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectRuntimeAdapterReadinessGateGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<RuntimeAdapterReadinessGateGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeRuntimeAdapterReadinessGateGatewayRequest(input);

  if (!normalized.ok) {
    return runtimeAdapterReadinessGateGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const readinessResult = createRuntimeAdapterReadinessGate(
    normalized.readiness_request,
  );

  if (!readinessResult.ok) {
    return runtimeAdapterReadinessGateGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      readinessResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: runtimeAdapterReadinessGateGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: runtimeAdapterReadinessGateGatewaySourceDocs(),
    runtime_adapter_readiness_gate: readinessResult.runtime_adapter_readiness_gate,
    readiness_version: readinessResult.runtime_adapter_readiness_gate.readiness_version,
    readiness_identity:
      readinessResult.runtime_adapter_readiness_gate.readiness_identity,
    requested_actor: readinessResult.runtime_adapter_readiness_gate.requested_actor,
    capability: readinessResult.runtime_adapter_readiness_gate.capability,
    risk_level: readinessResult.runtime_adapter_readiness_gate.risk_level,
    target_substrate_kind:
      readinessResult.runtime_adapter_readiness_gate.target_substrate_kind,
    requested_control_mode:
      readinessResult.runtime_adapter_readiness_gate.requested_control_mode,
    substrate_control_intent_refs:
      readinessResult.runtime_adapter_readiness_gate.substrate_control_intent_refs,
    capability_broker_request_refs:
      readinessResult.runtime_adapter_readiness_gate.capability_broker_request_refs,
    substrate_adapter_manifest_refs:
      readinessResult.runtime_adapter_readiness_gate.substrate_adapter_manifest_refs,
    adapter_invocation_preflight_refs:
      readinessResult.runtime_adapter_readiness_gate.adapter_invocation_preflight_refs,
    expected_result_refs:
      readinessResult.runtime_adapter_readiness_gate.expected_result_refs,
    adapter_invocation_authorization_bundle_refs:
      readinessResult.runtime_adapter_readiness_gate
        .adapter_invocation_authorization_bundle_refs,
    rollback_refs: readinessResult.runtime_adapter_readiness_gate.rollback_refs,
    policy_gate_refs: readinessResult.runtime_adapter_readiness_gate.policy_gate_refs,
    required_policy_gates:
      readinessResult.runtime_adapter_readiness_gate.required_policy_gates,
    approval_refs: readinessResult.runtime_adapter_readiness_gate.approval_refs,
    required_approvals:
      readinessResult.runtime_adapter_readiness_gate.required_approvals,
    audit_event_refs: readinessResult.runtime_adapter_readiness_gate.audit_event_refs,
    required_audit_events:
      readinessResult.runtime_adapter_readiness_gate.required_audit_events,
    source_refs: readinessResult.runtime_adapter_readiness_gate.source_refs,
    consistency_requirements:
      readinessResult.runtime_adapter_readiness_gate.consistency_requirements,
    cross_ref_consistency:
      readinessResult.runtime_adapter_readiness_gate.cross_ref_consistency,
    denied_live_behavior:
      readinessResult.runtime_adapter_readiness_gate.denied_live_behavior,
    readiness_authority:
      readinessResult.runtime_adapter_readiness_gate.readiness_authority,
    runtime_adapter_dispatch_allowed:
      readinessResult.runtime_adapter_readiness_gate.runtime_adapter_dispatch_allowed,
    live_adapter_invocation_allowed:
      readinessResult.runtime_adapter_readiness_gate.live_adapter_invocation_allowed,
    live_broker_dispatch_allowed:
      readinessResult.runtime_adapter_readiness_gate.live_broker_dispatch_allowed,
    live_execution_allowed:
      readinessResult.runtime_adapter_readiness_gate.live_execution_allowed,
    side_effects: readinessResult.side_effects,
  };
}

function normalizeRuntimeAdapterReadinessGateGatewayRequest(
  input: unknown,
): NormalizedRuntimeAdapterReadinessGateGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "runtime_adapter_readiness_gate_gateway.invalid_request",
          "",
          "Runtime adapter readiness gate Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: RuntimeAdapterReadinessGateGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "runtime_adapter_readiness_gate_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected runtime adapter readiness gate Gateway request field.",
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
        "runtime_adapter_readiness_gate_gateway.invalid_request_id",
        "/request_id",
        "Runtime adapter readiness gate Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "readiness_request")) {
    errors.push(
      gatewayError(
        "runtime_adapter_readiness_gate_gateway.missing_readiness_request",
        "/readiness_request",
        "Runtime adapter readiness gate Gateway request must include readiness_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    readiness_request: input.readiness_request,
  };
}

function runtimeAdapterReadinessGateGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: RuntimeAdapterReadinessGateGatewayError[],
  readinessErrors: RuntimeAdapterReadinessGateError[] = [],
): RuntimeAdapterReadinessGateGatewayResponse {
  return {
    ok: false,
    contract_id: runtimeAdapterReadinessGateGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: runtimeAdapterReadinessGateGatewaySourceDocs(),
    request_errors: requestErrors,
    readiness_errors: readinessErrors,
    runtime_adapter_readiness_gate: null,
    readiness_version: runtimeAdapterReadinessGateContract.readiness_version,
    readiness_identity: null,
    requested_actor: null,
    capability: null,
    risk_level: null,
    target_substrate_kind: null,
    requested_control_mode: null,
    substrate_control_intent_refs: [],
    capability_broker_request_refs: [],
    substrate_adapter_manifest_refs: [],
    adapter_invocation_preflight_refs: [],
    expected_result_refs: [],
    adapter_invocation_authorization_bundle_refs: [],
    rollback_refs: [],
    policy_gate_refs: [],
    required_policy_gates: [],
    approval_refs: [],
    required_approvals: [],
    audit_event_refs: [],
    required_audit_events: [],
    source_refs: [],
    consistency_requirements: [],
    cross_ref_consistency: null,
    denied_live_behavior: [],
    readiness_authority: runtimeAdapterReadinessGateContract.readiness_authority,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function runtimeAdapterReadinessGateGatewaySourceDocs(): string[] {
  return [...runtimeAdapterReadinessGateGatewayContract.source_docs];
}

function gatewayError(
  code: RuntimeAdapterReadinessGateGatewayErrorCode,
  path: string,
  message: string,
): RuntimeAdapterReadinessGateGatewayError {
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
