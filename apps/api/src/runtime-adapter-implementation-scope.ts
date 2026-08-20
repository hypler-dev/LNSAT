import {
  createRuntimeAdapterImplementationScope,
  runtimeAdapterImplementationScopeContract,
  type RuntimeAdapterImplementationScopeError,
  type RuntimeAdapterImplementationScopeEvidence,
} from "@lnsat/packets";

export const RUNTIME_ADAPTER_IMPLEMENTATION_SCOPE_GATEWAY_STATUS = "contract_only";

export const runtimeAdapterImplementationScopeGatewayContract = {
  contract_id: "lnsat.gateway.runtime_adapter_implementation_scope.v0_1",
  method: "POST",
  path: "/v1/platform/runtime-adapter-implementation-scope/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-runtime-adapter-implementation-scope",
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
    "packages/packets/src/runtime-adapter-implementation-scope.ts",
    "apps/api/src/runtime-adapter-implementation-scope.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type RuntimeAdapterImplementationScopeGatewayRequest = {
  request_id?: string;
  implementation_scope_request: unknown;
};

export type RuntimeAdapterImplementationScopeGatewayErrorCode =
  | "runtime_adapter_implementation_scope_gateway.invalid_request"
  | "runtime_adapter_implementation_scope_gateway.unexpected_field"
  | "runtime_adapter_implementation_scope_gateway.invalid_request_id"
  | "runtime_adapter_implementation_scope_gateway.missing_implementation_scope_request";

export type RuntimeAdapterImplementationScopeGatewayError = {
  code: RuntimeAdapterImplementationScopeGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type RuntimeAdapterImplementationScopeGatewayResponse =
  | {
      ok: true;
      contract_id: typeof runtimeAdapterImplementationScopeGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      runtime_adapter_implementation_scope: RuntimeAdapterImplementationScopeEvidence;
      implementation_scope_version: RuntimeAdapterImplementationScopeEvidence["implementation_scope_version"];
      scope_identity: RuntimeAdapterImplementationScopeEvidence["scope_identity"];
      runtime_adapter_readiness_gate_refs: RuntimeAdapterImplementationScopeEvidence["runtime_adapter_readiness_gate_refs"];
      requested_actor: RuntimeAdapterImplementationScopeEvidence["requested_actor"];
      capability: string;
      risk_level: number;
      target_substrate_kind: RuntimeAdapterImplementationScopeEvidence["target_substrate_kind"];
      requested_control_mode: RuntimeAdapterImplementationScopeEvidence["requested_control_mode"];
      adapter_identity: RuntimeAdapterImplementationScopeEvidence["adapter_identity"];
      adapter_class: RuntimeAdapterImplementationScopeEvidence["adapter_class"];
      implementation_boundaries: RuntimeAdapterImplementationScopeEvidence["implementation_boundaries"];
      allowed_source_zones: RuntimeAdapterImplementationScopeEvidence["allowed_source_zones"];
      required_tests: RuntimeAdapterImplementationScopeEvidence["required_tests"];
      dry_run_expectations: RuntimeAdapterImplementationScopeEvidence["dry_run_expectations"];
      rollback_refs: RuntimeAdapterImplementationScopeEvidence["rollback_refs"];
      policy_gate_refs: RuntimeAdapterImplementationScopeEvidence["policy_gate_refs"];
      required_policy_gates: string[];
      approval_refs: RuntimeAdapterImplementationScopeEvidence["approval_refs"];
      required_approvals: string[];
      audit_event_refs: RuntimeAdapterImplementationScopeEvidence["audit_event_refs"];
      required_audit_events: string[];
      source_refs: string[];
      readiness_evidence_snapshot: RuntimeAdapterImplementationScopeEvidence["readiness_evidence_snapshot"];
      denied_runtime_behavior: string[];
      implementation_authority: "implementation_scope_only_no_runtime_adapter";
      runtime_adapter_implementation_allowed: false;
      runtime_adapter_dispatch_allowed: false;
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof runtimeAdapterImplementationScopeGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: RuntimeAdapterImplementationScopeGatewayError[];
      implementation_scope_errors: RuntimeAdapterImplementationScopeError[];
      runtime_adapter_implementation_scope: null;
      implementation_scope_version: typeof runtimeAdapterImplementationScopeContract.implementation_scope_version;
      scope_identity: null;
      runtime_adapter_readiness_gate_refs: [];
      requested_actor: null;
      capability: null;
      risk_level: null;
      target_substrate_kind: null;
      requested_control_mode: null;
      adapter_identity: null;
      adapter_class: null;
      implementation_boundaries: [];
      allowed_source_zones: [];
      required_tests: [];
      dry_run_expectations: [];
      rollback_refs: [];
      policy_gate_refs: [];
      required_policy_gates: [];
      approval_refs: [];
      required_approvals: [];
      audit_event_refs: [];
      required_audit_events: [];
      source_refs: [];
      readiness_evidence_snapshot: null;
      denied_runtime_behavior: [];
      implementation_authority: "implementation_scope_only_no_runtime_adapter";
      runtime_adapter_implementation_allowed: false;
      runtime_adapter_dispatch_allowed: false;
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedRuntimeAdapterImplementationScopeGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      implementation_scope_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: RuntimeAdapterImplementationScopeGatewayError[];
    };

const requestKeys = new Set(["request_id", "implementation_scope_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectRuntimeAdapterImplementationScopeGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<RuntimeAdapterImplementationScopeGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeRuntimeAdapterImplementationScopeGatewayRequest(input);

  if (!normalized.ok) {
    return runtimeAdapterImplementationScopeGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const implementationScopeResult = createRuntimeAdapterImplementationScope(
    normalized.implementation_scope_request,
  );

  if (!implementationScopeResult.ok) {
    return runtimeAdapterImplementationScopeGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      implementationScopeResult.errors,
    );
  }

  const scope = implementationScopeResult.runtime_adapter_implementation_scope;

  return {
    ok: true,
    contract_id: runtimeAdapterImplementationScopeGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: runtimeAdapterImplementationScopeGatewaySourceDocs(),
    runtime_adapter_implementation_scope: scope,
    implementation_scope_version: scope.implementation_scope_version,
    scope_identity: scope.scope_identity,
    runtime_adapter_readiness_gate_refs: scope.runtime_adapter_readiness_gate_refs,
    requested_actor: scope.requested_actor,
    capability: scope.capability,
    risk_level: scope.risk_level,
    target_substrate_kind: scope.target_substrate_kind,
    requested_control_mode: scope.requested_control_mode,
    adapter_identity: scope.adapter_identity,
    adapter_class: scope.adapter_class,
    implementation_boundaries: scope.implementation_boundaries,
    allowed_source_zones: scope.allowed_source_zones,
    required_tests: scope.required_tests,
    dry_run_expectations: scope.dry_run_expectations,
    rollback_refs: scope.rollback_refs,
    policy_gate_refs: scope.policy_gate_refs,
    required_policy_gates: scope.required_policy_gates,
    approval_refs: scope.approval_refs,
    required_approvals: scope.required_approvals,
    audit_event_refs: scope.audit_event_refs,
    required_audit_events: scope.required_audit_events,
    source_refs: scope.source_refs,
    readiness_evidence_snapshot: scope.readiness_evidence_snapshot,
    denied_runtime_behavior: scope.denied_runtime_behavior,
    implementation_authority: scope.implementation_authority,
    runtime_adapter_implementation_allowed:
      scope.runtime_adapter_implementation_allowed,
    runtime_adapter_dispatch_allowed: scope.runtime_adapter_dispatch_allowed,
    live_adapter_invocation_allowed: scope.live_adapter_invocation_allowed,
    live_broker_dispatch_allowed: scope.live_broker_dispatch_allowed,
    live_execution_allowed: scope.live_execution_allowed,
    side_effects: implementationScopeResult.side_effects,
  };
}

function normalizeRuntimeAdapterImplementationScopeGatewayRequest(
  input: unknown,
): NormalizedRuntimeAdapterImplementationScopeGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "runtime_adapter_implementation_scope_gateway.invalid_request",
          "",
          "Runtime adapter implementation scope Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: RuntimeAdapterImplementationScopeGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "runtime_adapter_implementation_scope_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected runtime adapter implementation scope Gateway request field.",
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
        "runtime_adapter_implementation_scope_gateway.invalid_request_id",
        "/request_id",
        "Runtime adapter implementation scope Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "implementation_scope_request")) {
    errors.push(
      gatewayError(
        "runtime_adapter_implementation_scope_gateway.missing_implementation_scope_request",
        "/implementation_scope_request",
        "Runtime adapter implementation scope Gateway request must include implementation_scope_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    implementation_scope_request: input.implementation_scope_request,
  };
}

function runtimeAdapterImplementationScopeGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: RuntimeAdapterImplementationScopeGatewayError[],
  implementationScopeErrors: RuntimeAdapterImplementationScopeError[] = [],
): RuntimeAdapterImplementationScopeGatewayResponse {
  return {
    ok: false,
    contract_id: runtimeAdapterImplementationScopeGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: runtimeAdapterImplementationScopeGatewaySourceDocs(),
    request_errors: requestErrors,
    implementation_scope_errors: implementationScopeErrors,
    runtime_adapter_implementation_scope: null,
    implementation_scope_version:
      runtimeAdapterImplementationScopeContract.implementation_scope_version,
    scope_identity: null,
    runtime_adapter_readiness_gate_refs: [],
    requested_actor: null,
    capability: null,
    risk_level: null,
    target_substrate_kind: null,
    requested_control_mode: null,
    adapter_identity: null,
    adapter_class: null,
    implementation_boundaries: [],
    allowed_source_zones: [],
    required_tests: [],
    dry_run_expectations: [],
    rollback_refs: [],
    policy_gate_refs: [],
    required_policy_gates: [],
    approval_refs: [],
    required_approvals: [],
    audit_event_refs: [],
    required_audit_events: [],
    source_refs: [],
    readiness_evidence_snapshot: null,
    denied_runtime_behavior: [],
    implementation_authority:
      runtimeAdapterImplementationScopeContract.implementation_authority,
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function runtimeAdapterImplementationScopeGatewaySourceDocs(): string[] {
  return [...runtimeAdapterImplementationScopeGatewayContract.source_docs];
}

function gatewayError(
  code: RuntimeAdapterImplementationScopeGatewayErrorCode,
  path: string,
  message: string,
): RuntimeAdapterImplementationScopeGatewayError {
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
