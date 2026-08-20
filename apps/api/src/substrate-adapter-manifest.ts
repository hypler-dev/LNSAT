import {
  createSubstrateAdapterManifest,
  substrateAdapterManifestContract,
  type SubstrateAdapterManifestError,
  type SubstrateAdapterManifestEvidence,
} from "@lnsat/packets";

export const SUBSTRATE_ADAPTER_MANIFEST_GATEWAY_STATUS = "contract_only";

export const substrateAdapterManifestGatewayContract = {
  contract_id: "lnsat.gateway.substrate_adapter_manifest.v0_1",
  method: "POST",
  path: "/v1/platform/substrate-adapter-manifest/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-substrate-adapter-manifest",
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
    "packages/packets/src/substrate-adapter-manifest.ts",
    "apps/api/src/substrate-adapter-manifest.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type SubstrateAdapterManifestGatewayRequest = {
  request_id?: string;
  manifest_request: unknown;
};

export type SubstrateAdapterManifestGatewayErrorCode =
  | "substrate_adapter_manifest_gateway.invalid_request"
  | "substrate_adapter_manifest_gateway.unexpected_field"
  | "substrate_adapter_manifest_gateway.invalid_request_id"
  | "substrate_adapter_manifest_gateway.missing_manifest_request";

export type SubstrateAdapterManifestGatewayError = {
  code: SubstrateAdapterManifestGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type SubstrateAdapterManifestGatewayResponse =
  | {
      ok: true;
      contract_id: typeof substrateAdapterManifestGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      substrate_adapter_manifest: SubstrateAdapterManifestEvidence;
      manifest_version: SubstrateAdapterManifestEvidence["manifest_version"];
      adapter_identity: SubstrateAdapterManifestEvidence["adapter_identity"];
      adapter_class: SubstrateAdapterManifestEvidence["adapter_class"];
      supported_substrate_kinds: SubstrateAdapterManifestEvidence["supported_substrate_kinds"];
      supported_control_modes: SubstrateAdapterManifestEvidence["supported_control_modes"];
      accepted_capability_refs: SubstrateAdapterManifestEvidence["accepted_capability_refs"];
      required_input_evidence_refs: SubstrateAdapterManifestEvidence["required_input_evidence_refs"];
      required_policy_gates: string[];
      policy_gate_refs: SubstrateAdapterManifestEvidence["policy_gate_refs"];
      required_approvals: string[];
      approval_refs: SubstrateAdapterManifestEvidence["approval_refs"];
      audit_event_plan: SubstrateAdapterManifestEvidence["audit_event_plan"];
      required_audit_events: string[];
      result_expectations: SubstrateAdapterManifestEvidence["result_expectations"];
      rollback_expectations: SubstrateAdapterManifestEvidence["rollback_expectations"];
      denied_adapter_behavior: string[];
      denied_live_behavior: string[];
      source_refs: string[];
      adapter_authority: "manifest_only_no_invocation";
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof substrateAdapterManifestGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: SubstrateAdapterManifestGatewayError[];
      manifest_errors: SubstrateAdapterManifestError[];
      substrate_adapter_manifest: null;
      manifest_version: typeof substrateAdapterManifestContract.manifest_version;
      adapter_identity: null;
      adapter_class: null;
      supported_substrate_kinds: [];
      supported_control_modes: [];
      accepted_capability_refs: [];
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
      adapter_authority: "manifest_only_no_invocation";
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedSubstrateAdapterManifestGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      manifest_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: SubstrateAdapterManifestGatewayError[];
    };

const requestKeys = new Set(["request_id", "manifest_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectSubstrateAdapterManifestGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<SubstrateAdapterManifestGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeSubstrateAdapterManifestGatewayRequest(input);

  if (!normalized.ok) {
    return substrateAdapterManifestGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const manifestResult = createSubstrateAdapterManifest(normalized.manifest_request);

  if (!manifestResult.ok) {
    return substrateAdapterManifestGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      manifestResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: substrateAdapterManifestGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: substrateAdapterManifestGatewaySourceDocs(),
    substrate_adapter_manifest: manifestResult.substrate_adapter_manifest,
    manifest_version: manifestResult.substrate_adapter_manifest.manifest_version,
    adapter_identity: manifestResult.substrate_adapter_manifest.adapter_identity,
    adapter_class: manifestResult.substrate_adapter_manifest.adapter_class,
    supported_substrate_kinds:
      manifestResult.substrate_adapter_manifest.supported_substrate_kinds,
    supported_control_modes:
      manifestResult.substrate_adapter_manifest.supported_control_modes,
    accepted_capability_refs:
      manifestResult.substrate_adapter_manifest.accepted_capability_refs,
    required_input_evidence_refs:
      manifestResult.substrate_adapter_manifest.required_input_evidence_refs,
    required_policy_gates:
      manifestResult.substrate_adapter_manifest.required_policy_gates,
    policy_gate_refs: manifestResult.substrate_adapter_manifest.policy_gate_refs,
    required_approvals: manifestResult.substrate_adapter_manifest.required_approvals,
    approval_refs: manifestResult.substrate_adapter_manifest.approval_refs,
    audit_event_plan: manifestResult.substrate_adapter_manifest.audit_event_plan,
    required_audit_events:
      manifestResult.substrate_adapter_manifest.required_audit_events,
    result_expectations: manifestResult.substrate_adapter_manifest.result_expectations,
    rollback_expectations:
      manifestResult.substrate_adapter_manifest.rollback_expectations,
    denied_adapter_behavior:
      manifestResult.substrate_adapter_manifest.denied_adapter_behavior,
    denied_live_behavior:
      manifestResult.substrate_adapter_manifest.denied_live_behavior,
    source_refs: manifestResult.substrate_adapter_manifest.source_refs,
    adapter_authority: manifestResult.substrate_adapter_manifest.adapter_authority,
    live_adapter_invocation_allowed:
      manifestResult.substrate_adapter_manifest.live_adapter_invocation_allowed,
    live_broker_dispatch_allowed:
      manifestResult.substrate_adapter_manifest.live_broker_dispatch_allowed,
    live_execution_allowed:
      manifestResult.substrate_adapter_manifest.live_execution_allowed,
    side_effects: manifestResult.side_effects,
  };
}

function normalizeSubstrateAdapterManifestGatewayRequest(
  input: unknown,
): NormalizedSubstrateAdapterManifestGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "substrate_adapter_manifest_gateway.invalid_request",
          "",
          "Substrate adapter manifest Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: SubstrateAdapterManifestGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "substrate_adapter_manifest_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected substrate adapter manifest Gateway request field.",
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
        "substrate_adapter_manifest_gateway.invalid_request_id",
        "/request_id",
        "Substrate adapter manifest Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "manifest_request")) {
    errors.push(
      gatewayError(
        "substrate_adapter_manifest_gateway.missing_manifest_request",
        "/manifest_request",
        "Substrate adapter manifest Gateway request must include manifest_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    manifest_request: input.manifest_request,
  };
}

function substrateAdapterManifestGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: SubstrateAdapterManifestGatewayError[],
  manifestErrors: SubstrateAdapterManifestError[] = [],
): SubstrateAdapterManifestGatewayResponse {
  return {
    ok: false,
    contract_id: substrateAdapterManifestGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: substrateAdapterManifestGatewaySourceDocs(),
    request_errors: requestErrors,
    manifest_errors: manifestErrors,
    substrate_adapter_manifest: null,
    manifest_version: substrateAdapterManifestContract.manifest_version,
    adapter_identity: null,
    adapter_class: null,
    supported_substrate_kinds: [],
    supported_control_modes: [],
    accepted_capability_refs: [],
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
    adapter_authority: substrateAdapterManifestContract.adapter_authority,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function substrateAdapterManifestGatewaySourceDocs(): string[] {
  return [...substrateAdapterManifestGatewayContract.source_docs];
}

function gatewayError(
  code: SubstrateAdapterManifestGatewayErrorCode,
  path: string,
  message: string,
): SubstrateAdapterManifestGatewayError {
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
