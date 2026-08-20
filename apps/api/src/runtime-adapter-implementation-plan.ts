import {
  createRuntimeAdapterImplementationPlan,
  runtimeAdapterImplementationPlanContract,
  type RuntimeAdapterImplementationPlanError,
  type RuntimeAdapterImplementationPlanEvidence,
} from "@lnsat/packets";

export const RUNTIME_ADAPTER_IMPLEMENTATION_PLAN_GATEWAY_STATUS = "contract_only";

export const runtimeAdapterImplementationPlanGatewayContract = {
  contract_id: "lnsat.gateway.runtime_adapter_implementation_plan.v0_1",
  method: "POST",
  path: "/v1/platform/runtime-adapter-implementation-plan/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-runtime-adapter-implementation-plan",
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
    "packages/packets/src/runtime-adapter-implementation-plan.ts",
    "apps/api/src/runtime-adapter-implementation-plan.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type RuntimeAdapterImplementationPlanGatewayRequest = {
  request_id?: string;
  implementation_plan_request: unknown;
};

export type RuntimeAdapterImplementationPlanGatewayErrorCode =
  | "runtime_adapter_implementation_plan_gateway.invalid_request"
  | "runtime_adapter_implementation_plan_gateway.unexpected_field"
  | "runtime_adapter_implementation_plan_gateway.invalid_request_id"
  | "runtime_adapter_implementation_plan_gateway.missing_implementation_plan_request";

export type RuntimeAdapterImplementationPlanGatewayError = {
  code: RuntimeAdapterImplementationPlanGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type RuntimeAdapterImplementationPlanGatewayResponse =
  | {
      ok: true;
      contract_id: typeof runtimeAdapterImplementationPlanGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      runtime_adapter_implementation_plan: RuntimeAdapterImplementationPlanEvidence;
      implementation_plan_version: RuntimeAdapterImplementationPlanEvidence["implementation_plan_version"];
      plan_identity: RuntimeAdapterImplementationPlanEvidence["plan_identity"];
      runtime_adapter_implementation_scope_refs: RuntimeAdapterImplementationPlanEvidence["runtime_adapter_implementation_scope_refs"];
      runtime_adapter_readiness_gate_refs: RuntimeAdapterImplementationPlanEvidence["runtime_adapter_readiness_gate_refs"];
      requested_actor: RuntimeAdapterImplementationPlanEvidence["requested_actor"];
      capability: string;
      risk_level: number;
      target_substrate_kind: RuntimeAdapterImplementationPlanEvidence["target_substrate_kind"];
      requested_control_mode: RuntimeAdapterImplementationPlanEvidence["requested_control_mode"];
      adapter_identity: RuntimeAdapterImplementationPlanEvidence["adapter_identity"];
      adapter_class: RuntimeAdapterImplementationPlanEvidence["adapter_class"];
      planned_files_modules: RuntimeAdapterImplementationPlanEvidence["planned_files_modules"];
      implementation_steps: RuntimeAdapterImplementationPlanEvidence["implementation_steps"];
      validation_commands: RuntimeAdapterImplementationPlanEvidence["validation_commands"];
      dry_run_plan: RuntimeAdapterImplementationPlanEvidence["dry_run_plan"];
      rollback_refs: RuntimeAdapterImplementationPlanEvidence["rollback_refs"];
      policy_gate_refs: RuntimeAdapterImplementationPlanEvidence["policy_gate_refs"];
      required_policy_gates: string[];
      approval_refs: RuntimeAdapterImplementationPlanEvidence["approval_refs"];
      required_approvals: string[];
      audit_event_refs: RuntimeAdapterImplementationPlanEvidence["audit_event_refs"];
      required_audit_events: string[];
      source_refs: string[];
      scope_evidence_snapshot: RuntimeAdapterImplementationPlanEvidence["scope_evidence_snapshot"];
      readiness_evidence_snapshot: RuntimeAdapterImplementationPlanEvidence["readiness_evidence_snapshot"];
      denied_runtime_behavior: string[];
      implementation_plan_authority: "implementation_plan_only_no_runtime_adapter";
      runtime_adapter_implementation_allowed: false;
      runtime_adapter_dispatch_allowed: false;
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof runtimeAdapterImplementationPlanGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: RuntimeAdapterImplementationPlanGatewayError[];
      implementation_plan_errors: RuntimeAdapterImplementationPlanError[];
      runtime_adapter_implementation_plan: null;
      implementation_plan_version: typeof runtimeAdapterImplementationPlanContract.implementation_plan_version;
      plan_identity: null;
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
      scope_evidence_snapshot: null;
      readiness_evidence_snapshot: null;
      denied_runtime_behavior: [];
      implementation_plan_authority: "implementation_plan_only_no_runtime_adapter";
      runtime_adapter_implementation_allowed: false;
      runtime_adapter_dispatch_allowed: false;
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedRuntimeAdapterImplementationPlanGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      implementation_plan_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: RuntimeAdapterImplementationPlanGatewayError[];
    };

const requestKeys = new Set(["request_id", "implementation_plan_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectRuntimeAdapterImplementationPlanGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<RuntimeAdapterImplementationPlanGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeRuntimeAdapterImplementationPlanGatewayRequest(input);

  if (!normalized.ok) {
    return runtimeAdapterImplementationPlanGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const implementationPlanResult = createRuntimeAdapterImplementationPlan(
    normalized.implementation_plan_request,
  );

  if (!implementationPlanResult.ok) {
    return runtimeAdapterImplementationPlanGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      implementationPlanResult.errors,
    );
  }

  const plan = implementationPlanResult.runtime_adapter_implementation_plan;

  return {
    ok: true,
    contract_id: runtimeAdapterImplementationPlanGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: runtimeAdapterImplementationPlanGatewaySourceDocs(),
    runtime_adapter_implementation_plan: plan,
    implementation_plan_version: plan.implementation_plan_version,
    plan_identity: plan.plan_identity,
    runtime_adapter_implementation_scope_refs:
      plan.runtime_adapter_implementation_scope_refs,
    runtime_adapter_readiness_gate_refs: plan.runtime_adapter_readiness_gate_refs,
    requested_actor: plan.requested_actor,
    capability: plan.capability,
    risk_level: plan.risk_level,
    target_substrate_kind: plan.target_substrate_kind,
    requested_control_mode: plan.requested_control_mode,
    adapter_identity: plan.adapter_identity,
    adapter_class: plan.adapter_class,
    planned_files_modules: plan.planned_files_modules,
    implementation_steps: plan.implementation_steps,
    validation_commands: plan.validation_commands,
    dry_run_plan: plan.dry_run_plan,
    rollback_refs: plan.rollback_refs,
    policy_gate_refs: plan.policy_gate_refs,
    required_policy_gates: plan.required_policy_gates,
    approval_refs: plan.approval_refs,
    required_approvals: plan.required_approvals,
    audit_event_refs: plan.audit_event_refs,
    required_audit_events: plan.required_audit_events,
    source_refs: plan.source_refs,
    scope_evidence_snapshot: plan.scope_evidence_snapshot,
    readiness_evidence_snapshot: plan.readiness_evidence_snapshot,
    denied_runtime_behavior: plan.denied_runtime_behavior,
    implementation_plan_authority: plan.implementation_plan_authority,
    runtime_adapter_implementation_allowed: plan.runtime_adapter_implementation_allowed,
    runtime_adapter_dispatch_allowed: plan.runtime_adapter_dispatch_allowed,
    live_adapter_invocation_allowed: plan.live_adapter_invocation_allowed,
    live_broker_dispatch_allowed: plan.live_broker_dispatch_allowed,
    live_execution_allowed: plan.live_execution_allowed,
    side_effects: implementationPlanResult.side_effects,
  };
}

function normalizeRuntimeAdapterImplementationPlanGatewayRequest(
  input: unknown,
): NormalizedRuntimeAdapterImplementationPlanGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "runtime_adapter_implementation_plan_gateway.invalid_request",
          "",
          "Runtime adapter implementation plan Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: RuntimeAdapterImplementationPlanGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "runtime_adapter_implementation_plan_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected runtime adapter implementation plan Gateway request field.",
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
        "runtime_adapter_implementation_plan_gateway.invalid_request_id",
        "/request_id",
        "Runtime adapter implementation plan Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "implementation_plan_request")) {
    errors.push(
      gatewayError(
        "runtime_adapter_implementation_plan_gateway.missing_implementation_plan_request",
        "/implementation_plan_request",
        "Runtime adapter implementation plan Gateway request must include implementation_plan_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    implementation_plan_request: input.implementation_plan_request,
  };
}

function runtimeAdapterImplementationPlanGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: RuntimeAdapterImplementationPlanGatewayError[],
  implementationPlanErrors: RuntimeAdapterImplementationPlanError[] = [],
): RuntimeAdapterImplementationPlanGatewayResponse {
  return {
    ok: false,
    contract_id: runtimeAdapterImplementationPlanGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: runtimeAdapterImplementationPlanGatewaySourceDocs(),
    request_errors: requestErrors,
    implementation_plan_errors: implementationPlanErrors,
    runtime_adapter_implementation_plan: null,
    implementation_plan_version:
      runtimeAdapterImplementationPlanContract.implementation_plan_version,
    plan_identity: null,
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
    scope_evidence_snapshot: null,
    readiness_evidence_snapshot: null,
    denied_runtime_behavior: [],
    implementation_plan_authority:
      runtimeAdapterImplementationPlanContract.implementation_plan_authority,
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function runtimeAdapterImplementationPlanGatewaySourceDocs(): string[] {
  return [...runtimeAdapterImplementationPlanGatewayContract.source_docs];
}

function gatewayError(
  code: RuntimeAdapterImplementationPlanGatewayErrorCode,
  path: string,
  message: string,
): RuntimeAdapterImplementationPlanGatewayError {
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
