import {
  createRuntimeAdapterImplementationAuthorizationRequest,
  runtimeAdapterImplementationAuthorizationRequestContract,
  type RuntimeAdapterImplementationAuthorizationRequestError,
  type RuntimeAdapterImplementationAuthorizationRequestEvidence,
} from "@lnsat/packets";

export const RUNTIME_ADAPTER_IMPLEMENTATION_AUTHORIZATION_REQUEST_GATEWAY_STATUS =
  "contract_only";

export const runtimeAdapterImplementationAuthorizationRequestGatewayContract = {
  contract_id:
    "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
  method: "POST",
  path: "/v1/platform/runtime-adapter-implementation-authorization-request/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-runtime-adapter-implementation-authorization-request",
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
    "packages/packets/src/runtime-adapter-implementation-authorization-request.ts",
    "apps/api/src/runtime-adapter-implementation-authorization-request.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type RuntimeAdapterImplementationAuthorizationRequestGatewayRequest = {
  request_id?: string;
  authorization_request: unknown;
};

export type RuntimeAdapterImplementationAuthorizationRequestGatewayErrorCode =
  | "runtime_adapter_implementation_authorization_request_gateway.invalid_request"
  | "runtime_adapter_implementation_authorization_request_gateway.unexpected_field"
  | "runtime_adapter_implementation_authorization_request_gateway.invalid_request_id"
  | "runtime_adapter_implementation_authorization_request_gateway.missing_authorization_request";

export type RuntimeAdapterImplementationAuthorizationRequestGatewayError = {
  code: RuntimeAdapterImplementationAuthorizationRequestGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type RuntimeAdapterImplementationAuthorizationRequestGatewayResponse =
  | {
      ok: true;
      contract_id: typeof runtimeAdapterImplementationAuthorizationRequestGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      runtime_adapter_implementation_authorization_request: RuntimeAdapterImplementationAuthorizationRequestEvidence;
      authorization_request_version: RuntimeAdapterImplementationAuthorizationRequestEvidence["authorization_request_version"];
      chain_review_refs: RuntimeAdapterImplementationAuthorizationRequestEvidence["chain_review_refs"];
      implementation_plan_refs: RuntimeAdapterImplementationAuthorizationRequestEvidence["implementation_plan_refs"];
      runtime_adapter_implementation_scope_refs: RuntimeAdapterImplementationAuthorizationRequestEvidence["runtime_adapter_implementation_scope_refs"];
      runtime_adapter_readiness_gate_refs: RuntimeAdapterImplementationAuthorizationRequestEvidence["runtime_adapter_readiness_gate_refs"];
      requested_actor: RuntimeAdapterImplementationAuthorizationRequestEvidence["requested_actor"];
      capability: string;
      risk_level: number;
      target_substrate_kind: RuntimeAdapterImplementationAuthorizationRequestEvidence["target_substrate_kind"];
      requested_control_mode: RuntimeAdapterImplementationAuthorizationRequestEvidence["requested_control_mode"];
      adapter_identity: RuntimeAdapterImplementationAuthorizationRequestEvidence["adapter_identity"];
      adapter_class: RuntimeAdapterImplementationAuthorizationRequestEvidence["adapter_class"];
      planned_files_modules: RuntimeAdapterImplementationAuthorizationRequestEvidence["planned_files_modules"];
      implementation_steps: RuntimeAdapterImplementationAuthorizationRequestEvidence["implementation_steps"];
      validation_commands: RuntimeAdapterImplementationAuthorizationRequestEvidence["validation_commands"];
      dry_run_plan: RuntimeAdapterImplementationAuthorizationRequestEvidence["dry_run_plan"];
      rollback_refs: RuntimeAdapterImplementationAuthorizationRequestEvidence["rollback_refs"];
      policy_gate_refs: RuntimeAdapterImplementationAuthorizationRequestEvidence["policy_gate_refs"];
      required_policy_gates: string[];
      approval_refs: RuntimeAdapterImplementationAuthorizationRequestEvidence["approval_refs"];
      required_approvals: string[];
      audit_event_refs: RuntimeAdapterImplementationAuthorizationRequestEvidence["audit_event_refs"];
      required_audit_events: string[];
      source_refs: string[];
      future_implementation_packet_ref: RuntimeAdapterImplementationAuthorizationRequestEvidence["future_implementation_packet_ref"];
      chain_review_snapshot: RuntimeAdapterImplementationAuthorizationRequestEvidence["chain_review_snapshot"];
      implementation_plan_evidence_snapshot: RuntimeAdapterImplementationAuthorizationRequestEvidence["implementation_plan_evidence_snapshot"];
      denied_runtime_behavior: string[];
      implementation_authorization_request_authority: "implementation_authorization_request_only_no_runtime_adapter";
      runtime_adapter_implementation_allowed: false;
      runtime_adapter_dispatch_allowed: false;
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof runtimeAdapterImplementationAuthorizationRequestGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: RuntimeAdapterImplementationAuthorizationRequestGatewayError[];
      authorization_request_errors: RuntimeAdapterImplementationAuthorizationRequestError[];
      runtime_adapter_implementation_authorization_request: null;
      authorization_request_version: typeof runtimeAdapterImplementationAuthorizationRequestContract.authorization_request_version;
      chain_review_refs: [];
      implementation_plan_refs: [];
      runtime_adapter_implementation_scope_refs: [];
      runtime_adapter_readiness_gate_refs: [];
      requested_actor: null;
      capability: null;
      risk_level: null;
      target_substrate_kind: null;
      requested_control_mode: null;
      adapter_identity: null;
      adapter_class: null;
      planned_files_modules: [];
      implementation_steps: [];
      validation_commands: [];
      dry_run_plan: [];
      rollback_refs: [];
      policy_gate_refs: [];
      required_policy_gates: [];
      approval_refs: [];
      required_approvals: [];
      audit_event_refs: [];
      required_audit_events: [];
      source_refs: [];
      future_implementation_packet_ref: null;
      chain_review_snapshot: null;
      implementation_plan_evidence_snapshot: null;
      denied_runtime_behavior: [];
      implementation_authorization_request_authority: "implementation_authorization_request_only_no_runtime_adapter";
      runtime_adapter_implementation_allowed: false;
      runtime_adapter_dispatch_allowed: false;
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedRuntimeAdapterImplementationAuthorizationRequestGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      authorization_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: RuntimeAdapterImplementationAuthorizationRequestGatewayError[];
    };

const requestKeys = new Set(["request_id", "authorization_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectRuntimeAdapterImplementationAuthorizationRequestGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<RuntimeAdapterImplementationAuthorizationRequestGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized =
    normalizeRuntimeAdapterImplementationAuthorizationRequestGatewayRequest(input);

  if (!normalized.ok) {
    return runtimeAdapterImplementationAuthorizationRequestGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const authorizationRequestResult =
    createRuntimeAdapterImplementationAuthorizationRequest(
      normalized.authorization_request,
    );

  if (!authorizationRequestResult.ok) {
    return runtimeAdapterImplementationAuthorizationRequestGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      authorizationRequestResult.errors,
    );
  }

  const authorizationRequest =
    authorizationRequestResult.runtime_adapter_implementation_authorization_request;

  return {
    ok: true,
    contract_id:
      runtimeAdapterImplementationAuthorizationRequestGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: runtimeAdapterImplementationAuthorizationRequestGatewaySourceDocs(),
    runtime_adapter_implementation_authorization_request: authorizationRequest,
    authorization_request_version: authorizationRequest.authorization_request_version,
    chain_review_refs: authorizationRequest.chain_review_refs,
    implementation_plan_refs: authorizationRequest.implementation_plan_refs,
    runtime_adapter_implementation_scope_refs:
      authorizationRequest.runtime_adapter_implementation_scope_refs,
    runtime_adapter_readiness_gate_refs:
      authorizationRequest.runtime_adapter_readiness_gate_refs,
    requested_actor: authorizationRequest.requested_actor,
    capability: authorizationRequest.capability,
    risk_level: authorizationRequest.risk_level,
    target_substrate_kind: authorizationRequest.target_substrate_kind,
    requested_control_mode: authorizationRequest.requested_control_mode,
    adapter_identity: authorizationRequest.adapter_identity,
    adapter_class: authorizationRequest.adapter_class,
    planned_files_modules: authorizationRequest.planned_files_modules,
    implementation_steps: authorizationRequest.implementation_steps,
    validation_commands: authorizationRequest.validation_commands,
    dry_run_plan: authorizationRequest.dry_run_plan,
    rollback_refs: authorizationRequest.rollback_refs,
    policy_gate_refs: authorizationRequest.policy_gate_refs,
    required_policy_gates: authorizationRequest.required_policy_gates,
    approval_refs: authorizationRequest.approval_refs,
    required_approvals: authorizationRequest.required_approvals,
    audit_event_refs: authorizationRequest.audit_event_refs,
    required_audit_events: authorizationRequest.required_audit_events,
    source_refs: authorizationRequest.source_refs,
    future_implementation_packet_ref:
      authorizationRequest.future_implementation_packet_ref,
    chain_review_snapshot: authorizationRequest.chain_review_snapshot,
    implementation_plan_evidence_snapshot:
      authorizationRequest.implementation_plan_evidence_snapshot,
    denied_runtime_behavior: authorizationRequest.denied_runtime_behavior,
    implementation_authorization_request_authority:
      authorizationRequest.implementation_authorization_request_authority,
    runtime_adapter_implementation_allowed:
      authorizationRequest.runtime_adapter_implementation_allowed,
    runtime_adapter_dispatch_allowed:
      authorizationRequest.runtime_adapter_dispatch_allowed,
    live_adapter_invocation_allowed:
      authorizationRequest.live_adapter_invocation_allowed,
    live_broker_dispatch_allowed: authorizationRequest.live_broker_dispatch_allowed,
    live_execution_allowed: authorizationRequest.live_execution_allowed,
    side_effects: authorizationRequestResult.side_effects,
  };
}

function normalizeRuntimeAdapterImplementationAuthorizationRequestGatewayRequest(
  input: unknown,
): NormalizedRuntimeAdapterImplementationAuthorizationRequestGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "runtime_adapter_implementation_authorization_request_gateway.invalid_request",
          "",
          "Runtime adapter implementation authorization request Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: RuntimeAdapterImplementationAuthorizationRequestGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "runtime_adapter_implementation_authorization_request_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected runtime adapter implementation authorization request Gateway request field.",
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
        "runtime_adapter_implementation_authorization_request_gateway.invalid_request_id",
        "/request_id",
        "Runtime adapter implementation authorization request Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "authorization_request")) {
    errors.push(
      gatewayError(
        "runtime_adapter_implementation_authorization_request_gateway.missing_authorization_request",
        "/authorization_request",
        "Runtime adapter implementation authorization request Gateway request must include authorization_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    authorization_request: input.authorization_request,
  };
}

function runtimeAdapterImplementationAuthorizationRequestGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: RuntimeAdapterImplementationAuthorizationRequestGatewayError[],
  authorizationRequestErrors: RuntimeAdapterImplementationAuthorizationRequestError[] = [],
): RuntimeAdapterImplementationAuthorizationRequestGatewayResponse {
  return {
    ok: false,
    contract_id:
      runtimeAdapterImplementationAuthorizationRequestGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: runtimeAdapterImplementationAuthorizationRequestGatewaySourceDocs(),
    request_errors: requestErrors,
    authorization_request_errors: authorizationRequestErrors,
    runtime_adapter_implementation_authorization_request: null,
    authorization_request_version:
      runtimeAdapterImplementationAuthorizationRequestContract.authorization_request_version,
    chain_review_refs: [],
    implementation_plan_refs: [],
    runtime_adapter_implementation_scope_refs: [],
    runtime_adapter_readiness_gate_refs: [],
    requested_actor: null,
    capability: null,
    risk_level: null,
    target_substrate_kind: null,
    requested_control_mode: null,
    adapter_identity: null,
    adapter_class: null,
    planned_files_modules: [],
    implementation_steps: [],
    validation_commands: [],
    dry_run_plan: [],
    rollback_refs: [],
    policy_gate_refs: [],
    required_policy_gates: [],
    approval_refs: [],
    required_approvals: [],
    audit_event_refs: [],
    required_audit_events: [],
    source_refs: [],
    future_implementation_packet_ref: null,
    chain_review_snapshot: null,
    implementation_plan_evidence_snapshot: null,
    denied_runtime_behavior: [],
    implementation_authorization_request_authority:
      runtimeAdapterImplementationAuthorizationRequestContract.implementation_authorization_request_authority,
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function runtimeAdapterImplementationAuthorizationRequestGatewaySourceDocs(): string[] {
  return [
    ...runtimeAdapterImplementationAuthorizationRequestGatewayContract.source_docs,
  ];
}

function gatewayError(
  code: RuntimeAdapterImplementationAuthorizationRequestGatewayErrorCode,
  path: string,
  message: string,
): RuntimeAdapterImplementationAuthorizationRequestGatewayError {
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
