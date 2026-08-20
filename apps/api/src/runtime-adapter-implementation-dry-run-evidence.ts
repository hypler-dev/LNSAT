import {
  createRuntimeAdapterImplementationDryRunEvidence,
  runtimeAdapterImplementationDryRunEvidenceContract,
  type RuntimeAdapterImplementationDryRunEvidence,
  type RuntimeAdapterImplementationDryRunEvidenceError,
} from "@lnsat/packets";

export const RUNTIME_ADAPTER_IMPLEMENTATION_DRY_RUN_EVIDENCE_GATEWAY_STATUS =
  "contract_only";

export const runtimeAdapterImplementationDryRunEvidenceGatewayContract = {
  contract_id: "lnsat.gateway.runtime_adapter_implementation_dry_run_evidence.v0_1",
  method: "POST",
  path: "/v1/platform/runtime-adapter-implementation-dry-run-evidence/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-runtime-adapter-implementation-dry-run-evidence",
    "LNSAT Gateway",
  ],
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/architecture/MCP_ADAPTER_DESIGN.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/packets/src/runtime-adapter-implementation-dry-run-evidence.ts",
    "apps/api/src/runtime-adapter-implementation-dry-run-evidence.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type RuntimeAdapterImplementationDryRunEvidenceGatewayRequest = {
  request_id?: string;
  dry_run_evidence_request: unknown;
};

export type RuntimeAdapterImplementationDryRunEvidenceGatewayErrorCode =
  | "runtime_adapter_implementation_dry_run_evidence_gateway.invalid_request"
  | "runtime_adapter_implementation_dry_run_evidence_gateway.unexpected_field"
  | "runtime_adapter_implementation_dry_run_evidence_gateway.invalid_request_id"
  | "runtime_adapter_implementation_dry_run_evidence_gateway.missing_dry_run_evidence_request";

export type RuntimeAdapterImplementationDryRunEvidenceGatewayError = {
  code: RuntimeAdapterImplementationDryRunEvidenceGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type RuntimeAdapterImplementationDryRunEvidenceGatewayResponse =
  | {
      ok: true;
      contract_id: typeof runtimeAdapterImplementationDryRunEvidenceGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      runtime_adapter_implementation_dry_run_evidence: RuntimeAdapterImplementationDryRunEvidence;
      dry_run_evidence_version: RuntimeAdapterImplementationDryRunEvidence["dry_run_evidence_version"];
      packet_selection_refs: RuntimeAdapterImplementationDryRunEvidence["packet_selection_refs"];
      approval_gate_chain_review_refs: RuntimeAdapterImplementationDryRunEvidence["approval_gate_chain_review_refs"];
      approval_gate_refs: RuntimeAdapterImplementationDryRunEvidence["approval_gate_refs"];
      authorization_request_refs: RuntimeAdapterImplementationDryRunEvidence["authorization_request_refs"];
      implementation_plan_refs: RuntimeAdapterImplementationDryRunEvidence["implementation_plan_refs"];
      runtime_adapter_implementation_scope_refs: RuntimeAdapterImplementationDryRunEvidence["runtime_adapter_implementation_scope_refs"];
      runtime_adapter_readiness_gate_refs: RuntimeAdapterImplementationDryRunEvidence["runtime_adapter_readiness_gate_refs"];
      validation_command_refs: RuntimeAdapterImplementationDryRunEvidence["validation_command_refs"];
      dry_run_artifact_refs: RuntimeAdapterImplementationDryRunEvidence["dry_run_artifact_refs"];
      rollback_refs: RuntimeAdapterImplementationDryRunEvidence["rollback_refs"];
      policy_gate_refs: RuntimeAdapterImplementationDryRunEvidence["policy_gate_refs"];
      required_policy_gates: string[];
      human_approval_refs: RuntimeAdapterImplementationDryRunEvidence["human_approval_refs"];
      required_human_approvals: string[];
      audit_event_refs: RuntimeAdapterImplementationDryRunEvidence["audit_event_refs"];
      required_audit_events: string[];
      source_refs: string[];
      future_implementation_packet_refs: RuntimeAdapterImplementationDryRunEvidence["future_implementation_packet_refs"];
      packet_selection_snapshot: RuntimeAdapterImplementationDryRunEvidence["packet_selection_snapshot"];
      approval_gate_chain_review_snapshot: RuntimeAdapterImplementationDryRunEvidence["approval_gate_chain_review_snapshot"];
      approval_gate_evidence_snapshot: RuntimeAdapterImplementationDryRunEvidence["approval_gate_evidence_snapshot"];
      denied_runtime_behavior: string[];
      implementation_dry_run_evidence_authority: "implementation_dry_run_evidence_only_no_runtime_adapter";
      runtime_adapter_implementation_allowed: false;
      runtime_adapter_dispatch_allowed: false;
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof runtimeAdapterImplementationDryRunEvidenceGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: RuntimeAdapterImplementationDryRunEvidenceGatewayError[];
      dry_run_evidence_errors: RuntimeAdapterImplementationDryRunEvidenceError[];
      runtime_adapter_implementation_dry_run_evidence: null;
      dry_run_evidence_version: typeof runtimeAdapterImplementationDryRunEvidenceContract.dry_run_evidence_version;
      packet_selection_refs: [];
      approval_gate_chain_review_refs: [];
      approval_gate_refs: [];
      authorization_request_refs: [];
      implementation_plan_refs: [];
      runtime_adapter_implementation_scope_refs: [];
      runtime_adapter_readiness_gate_refs: [];
      validation_command_refs: [];
      dry_run_artifact_refs: [];
      rollback_refs: [];
      policy_gate_refs: [];
      required_policy_gates: [];
      human_approval_refs: [];
      required_human_approvals: [];
      audit_event_refs: [];
      required_audit_events: [];
      source_refs: [];
      future_implementation_packet_refs: [];
      packet_selection_snapshot: null;
      approval_gate_chain_review_snapshot: null;
      approval_gate_evidence_snapshot: null;
      denied_runtime_behavior: [];
      implementation_dry_run_evidence_authority: "implementation_dry_run_evidence_only_no_runtime_adapter";
      runtime_adapter_implementation_allowed: false;
      runtime_adapter_dispatch_allowed: false;
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedRuntimeAdapterImplementationDryRunEvidenceGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      dry_run_evidence_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: RuntimeAdapterImplementationDryRunEvidenceGatewayError[];
    };

const requestKeys = new Set(["request_id", "dry_run_evidence_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectRuntimeAdapterImplementationDryRunEvidenceGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<RuntimeAdapterImplementationDryRunEvidenceGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized =
    normalizeRuntimeAdapterImplementationDryRunEvidenceGatewayRequest(input);

  if (!normalized.ok) {
    return runtimeAdapterImplementationDryRunEvidenceGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const dryRunEvidenceResult = createRuntimeAdapterImplementationDryRunEvidence(
    normalized.dry_run_evidence_request,
  );

  if (!dryRunEvidenceResult.ok) {
    return runtimeAdapterImplementationDryRunEvidenceGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      dryRunEvidenceResult.errors,
    );
  }

  const dryRunEvidence =
    dryRunEvidenceResult.runtime_adapter_implementation_dry_run_evidence;

  return {
    ok: true,
    contract_id: runtimeAdapterImplementationDryRunEvidenceGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: runtimeAdapterImplementationDryRunEvidenceGatewaySourceDocs(),
    runtime_adapter_implementation_dry_run_evidence: dryRunEvidence,
    dry_run_evidence_version: dryRunEvidence.dry_run_evidence_version,
    packet_selection_refs: dryRunEvidence.packet_selection_refs,
    approval_gate_chain_review_refs: dryRunEvidence.approval_gate_chain_review_refs,
    approval_gate_refs: dryRunEvidence.approval_gate_refs,
    authorization_request_refs: dryRunEvidence.authorization_request_refs,
    implementation_plan_refs: dryRunEvidence.implementation_plan_refs,
    runtime_adapter_implementation_scope_refs:
      dryRunEvidence.runtime_adapter_implementation_scope_refs,
    runtime_adapter_readiness_gate_refs:
      dryRunEvidence.runtime_adapter_readiness_gate_refs,
    validation_command_refs: dryRunEvidence.validation_command_refs,
    dry_run_artifact_refs: dryRunEvidence.dry_run_artifact_refs,
    rollback_refs: dryRunEvidence.rollback_refs,
    policy_gate_refs: dryRunEvidence.policy_gate_refs,
    required_policy_gates: dryRunEvidence.required_policy_gates,
    human_approval_refs: dryRunEvidence.human_approval_refs,
    required_human_approvals: dryRunEvidence.required_human_approvals,
    audit_event_refs: dryRunEvidence.audit_event_refs,
    required_audit_events: dryRunEvidence.required_audit_events,
    source_refs: dryRunEvidence.source_refs,
    future_implementation_packet_refs: dryRunEvidence.future_implementation_packet_refs,
    packet_selection_snapshot: dryRunEvidence.packet_selection_snapshot,
    approval_gate_chain_review_snapshot:
      dryRunEvidence.approval_gate_chain_review_snapshot,
    approval_gate_evidence_snapshot: dryRunEvidence.approval_gate_evidence_snapshot,
    denied_runtime_behavior: dryRunEvidence.denied_runtime_behavior,
    implementation_dry_run_evidence_authority:
      dryRunEvidence.implementation_dry_run_evidence_authority,
    runtime_adapter_implementation_allowed:
      dryRunEvidence.runtime_adapter_implementation_allowed,
    runtime_adapter_dispatch_allowed: dryRunEvidence.runtime_adapter_dispatch_allowed,
    live_adapter_invocation_allowed: dryRunEvidence.live_adapter_invocation_allowed,
    live_broker_dispatch_allowed: dryRunEvidence.live_broker_dispatch_allowed,
    live_execution_allowed: dryRunEvidence.live_execution_allowed,
    side_effects: dryRunEvidenceResult.side_effects,
  };
}

function normalizeRuntimeAdapterImplementationDryRunEvidenceGatewayRequest(
  input: unknown,
): NormalizedRuntimeAdapterImplementationDryRunEvidenceGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "runtime_adapter_implementation_dry_run_evidence_gateway.invalid_request",
          "",
          "Runtime adapter implementation dry-run evidence Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: RuntimeAdapterImplementationDryRunEvidenceGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "runtime_adapter_implementation_dry_run_evidence_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected runtime adapter implementation dry-run evidence Gateway request field.",
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
        "runtime_adapter_implementation_dry_run_evidence_gateway.invalid_request_id",
        "/request_id",
        "Runtime adapter implementation dry-run evidence Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "dry_run_evidence_request")) {
    errors.push(
      gatewayError(
        "runtime_adapter_implementation_dry_run_evidence_gateway.missing_dry_run_evidence_request",
        "/dry_run_evidence_request",
        "Runtime adapter implementation dry-run evidence Gateway request must include dry_run_evidence_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    dry_run_evidence_request: input.dry_run_evidence_request,
  };
}

function runtimeAdapterImplementationDryRunEvidenceGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: RuntimeAdapterImplementationDryRunEvidenceGatewayError[],
  dryRunEvidenceErrors: RuntimeAdapterImplementationDryRunEvidenceError[] = [],
): RuntimeAdapterImplementationDryRunEvidenceGatewayResponse {
  return {
    ok: false,
    contract_id: runtimeAdapterImplementationDryRunEvidenceGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: runtimeAdapterImplementationDryRunEvidenceGatewaySourceDocs(),
    request_errors: requestErrors,
    dry_run_evidence_errors: dryRunEvidenceErrors,
    runtime_adapter_implementation_dry_run_evidence: null,
    dry_run_evidence_version:
      runtimeAdapterImplementationDryRunEvidenceContract.dry_run_evidence_version,
    packet_selection_refs: [],
    approval_gate_chain_review_refs: [],
    approval_gate_refs: [],
    authorization_request_refs: [],
    implementation_plan_refs: [],
    runtime_adapter_implementation_scope_refs: [],
    runtime_adapter_readiness_gate_refs: [],
    validation_command_refs: [],
    dry_run_artifact_refs: [],
    rollback_refs: [],
    policy_gate_refs: [],
    required_policy_gates: [],
    human_approval_refs: [],
    required_human_approvals: [],
    audit_event_refs: [],
    required_audit_events: [],
    source_refs: [],
    future_implementation_packet_refs: [],
    packet_selection_snapshot: null,
    approval_gate_chain_review_snapshot: null,
    approval_gate_evidence_snapshot: null,
    denied_runtime_behavior: [],
    implementation_dry_run_evidence_authority:
      runtimeAdapterImplementationDryRunEvidenceContract.implementation_dry_run_evidence_authority,
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function runtimeAdapterImplementationDryRunEvidenceGatewaySourceDocs(): string[] {
  return [...runtimeAdapterImplementationDryRunEvidenceGatewayContract.source_docs];
}

function gatewayError(
  code: RuntimeAdapterImplementationDryRunEvidenceGatewayErrorCode,
  path: string,
  message: string,
): RuntimeAdapterImplementationDryRunEvidenceGatewayError {
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
