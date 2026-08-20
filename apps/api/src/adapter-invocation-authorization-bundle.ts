import {
  adapterInvocationAuthorizationBundleContract,
  createAdapterInvocationAuthorizationBundle,
  type AdapterInvocationAuthorizationBundleError,
  type AdapterInvocationAuthorizationBundleEvidence,
} from "@lnsat/packets";

export const ADAPTER_INVOCATION_AUTHORIZATION_BUNDLE_GATEWAY_STATUS = "contract_only";

export const adapterInvocationAuthorizationBundleGatewayContract = {
  contract_id: "lnsat.gateway.adapter_invocation_authorization_bundle.v0_1",
  method: "POST",
  path: "/v1/platform/adapter-invocation-authorization-bundle/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-adapter-invocation-authorization-bundle",
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
    "packages/packets/src/adapter-invocation-authorization-bundle.ts",
    "apps/api/src/adapter-invocation-authorization-bundle.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type AdapterInvocationAuthorizationBundleGatewayRequest = {
  request_id?: string;
  bundle_request: unknown;
};

export type AdapterInvocationAuthorizationBundleGatewayErrorCode =
  | "adapter_invocation_authorization_bundle_gateway.invalid_request"
  | "adapter_invocation_authorization_bundle_gateway.unexpected_field"
  | "adapter_invocation_authorization_bundle_gateway.invalid_request_id"
  | "adapter_invocation_authorization_bundle_gateway.missing_bundle_request";

export type AdapterInvocationAuthorizationBundleGatewayError = {
  code: AdapterInvocationAuthorizationBundleGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AdapterInvocationAuthorizationBundleGatewayResponse =
  | {
      ok: true;
      contract_id: typeof adapterInvocationAuthorizationBundleGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      adapter_invocation_authorization_bundle: AdapterInvocationAuthorizationBundleEvidence;
      bundle_version: AdapterInvocationAuthorizationBundleEvidence["bundle_version"];
      bundle_identity: AdapterInvocationAuthorizationBundleEvidence["bundle_identity"];
      requested_actor: AdapterInvocationAuthorizationBundleEvidence["requested_actor"];
      capability: string;
      risk_level: number;
      target_substrate_kind: AdapterInvocationAuthorizationBundleEvidence["target_substrate_kind"];
      requested_control_mode: AdapterInvocationAuthorizationBundleEvidence["requested_control_mode"];
      substrate_control_intent_refs: AdapterInvocationAuthorizationBundleEvidence["substrate_control_intent_refs"];
      capability_broker_request_refs: AdapterInvocationAuthorizationBundleEvidence["capability_broker_request_refs"];
      substrate_adapter_manifest_refs: AdapterInvocationAuthorizationBundleEvidence["substrate_adapter_manifest_refs"];
      adapter_invocation_preflight_refs: AdapterInvocationAuthorizationBundleEvidence["adapter_invocation_preflight_refs"];
      expected_result_refs: AdapterInvocationAuthorizationBundleEvidence["expected_result_refs"];
      rollback_refs: AdapterInvocationAuthorizationBundleEvidence["rollback_refs"];
      policy_gate_refs: AdapterInvocationAuthorizationBundleEvidence["policy_gate_refs"];
      required_policy_gates: string[];
      approval_refs: AdapterInvocationAuthorizationBundleEvidence["approval_refs"];
      required_approvals: string[];
      audit_event_refs: AdapterInvocationAuthorizationBundleEvidence["audit_event_refs"];
      required_audit_events: string[];
      source_refs: string[];
      consistency_requirements: string[];
      cross_ref_consistency: AdapterInvocationAuthorizationBundleEvidence["cross_ref_consistency"];
      denied_live_behavior: string[];
      authorization_authority: "authorization_bundle_only_no_invocation";
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof adapterInvocationAuthorizationBundleGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: AdapterInvocationAuthorizationBundleGatewayError[];
      bundle_errors: AdapterInvocationAuthorizationBundleError[];
      adapter_invocation_authorization_bundle: null;
      bundle_version: typeof adapterInvocationAuthorizationBundleContract.bundle_version;
      bundle_identity: null;
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
      authorization_authority: "authorization_bundle_only_no_invocation";
      live_adapter_invocation_allowed: false;
      live_broker_dispatch_allowed: false;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedAdapterInvocationAuthorizationBundleGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      bundle_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: AdapterInvocationAuthorizationBundleGatewayError[];
    };

const requestKeys = new Set(["request_id", "bundle_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectAdapterInvocationAuthorizationBundleGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<AdapterInvocationAuthorizationBundleGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeAdapterInvocationAuthorizationBundleGatewayRequest(input);

  if (!normalized.ok) {
    return adapterInvocationAuthorizationBundleGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const bundleResult = createAdapterInvocationAuthorizationBundle(
    normalized.bundle_request,
  );

  if (!bundleResult.ok) {
    return adapterInvocationAuthorizationBundleGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      bundleResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: adapterInvocationAuthorizationBundleGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: adapterInvocationAuthorizationBundleGatewaySourceDocs(),
    adapter_invocation_authorization_bundle:
      bundleResult.adapter_invocation_authorization_bundle,
    bundle_version: bundleResult.adapter_invocation_authorization_bundle.bundle_version,
    bundle_identity:
      bundleResult.adapter_invocation_authorization_bundle.bundle_identity,
    requested_actor:
      bundleResult.adapter_invocation_authorization_bundle.requested_actor,
    capability: bundleResult.adapter_invocation_authorization_bundle.capability,
    risk_level: bundleResult.adapter_invocation_authorization_bundle.risk_level,
    target_substrate_kind:
      bundleResult.adapter_invocation_authorization_bundle.target_substrate_kind,
    requested_control_mode:
      bundleResult.adapter_invocation_authorization_bundle.requested_control_mode,
    substrate_control_intent_refs:
      bundleResult.adapter_invocation_authorization_bundle
        .substrate_control_intent_refs,
    capability_broker_request_refs:
      bundleResult.adapter_invocation_authorization_bundle
        .capability_broker_request_refs,
    substrate_adapter_manifest_refs:
      bundleResult.adapter_invocation_authorization_bundle
        .substrate_adapter_manifest_refs,
    adapter_invocation_preflight_refs:
      bundleResult.adapter_invocation_authorization_bundle
        .adapter_invocation_preflight_refs,
    expected_result_refs:
      bundleResult.adapter_invocation_authorization_bundle.expected_result_refs,
    rollback_refs: bundleResult.adapter_invocation_authorization_bundle.rollback_refs,
    policy_gate_refs:
      bundleResult.adapter_invocation_authorization_bundle.policy_gate_refs,
    required_policy_gates:
      bundleResult.adapter_invocation_authorization_bundle.required_policy_gates,
    approval_refs: bundleResult.adapter_invocation_authorization_bundle.approval_refs,
    required_approvals:
      bundleResult.adapter_invocation_authorization_bundle.required_approvals,
    audit_event_refs:
      bundleResult.adapter_invocation_authorization_bundle.audit_event_refs,
    required_audit_events:
      bundleResult.adapter_invocation_authorization_bundle.required_audit_events,
    source_refs: bundleResult.adapter_invocation_authorization_bundle.source_refs,
    consistency_requirements:
      bundleResult.adapter_invocation_authorization_bundle.consistency_requirements,
    cross_ref_consistency:
      bundleResult.adapter_invocation_authorization_bundle.cross_ref_consistency,
    denied_live_behavior:
      bundleResult.adapter_invocation_authorization_bundle.denied_live_behavior,
    authorization_authority:
      bundleResult.adapter_invocation_authorization_bundle.authorization_authority,
    live_adapter_invocation_allowed:
      bundleResult.adapter_invocation_authorization_bundle
        .live_adapter_invocation_allowed,
    live_broker_dispatch_allowed:
      bundleResult.adapter_invocation_authorization_bundle.live_broker_dispatch_allowed,
    live_execution_allowed:
      bundleResult.adapter_invocation_authorization_bundle.live_execution_allowed,
    side_effects: bundleResult.side_effects,
  };
}

function normalizeAdapterInvocationAuthorizationBundleGatewayRequest(
  input: unknown,
): NormalizedAdapterInvocationAuthorizationBundleGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "adapter_invocation_authorization_bundle_gateway.invalid_request",
          "",
          "Adapter invocation authorization bundle Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: AdapterInvocationAuthorizationBundleGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "adapter_invocation_authorization_bundle_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected adapter invocation authorization bundle Gateway request field.",
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
        "adapter_invocation_authorization_bundle_gateway.invalid_request_id",
        "/request_id",
        "Adapter invocation authorization bundle Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "bundle_request")) {
    errors.push(
      gatewayError(
        "adapter_invocation_authorization_bundle_gateway.missing_bundle_request",
        "/bundle_request",
        "Adapter invocation authorization bundle Gateway request must include bundle_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    bundle_request: input.bundle_request,
  };
}

function adapterInvocationAuthorizationBundleGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: AdapterInvocationAuthorizationBundleGatewayError[],
  bundleErrors: AdapterInvocationAuthorizationBundleError[] = [],
): AdapterInvocationAuthorizationBundleGatewayResponse {
  return {
    ok: false,
    contract_id: adapterInvocationAuthorizationBundleGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: adapterInvocationAuthorizationBundleGatewaySourceDocs(),
    request_errors: requestErrors,
    bundle_errors: bundleErrors,
    adapter_invocation_authorization_bundle: null,
    bundle_version: adapterInvocationAuthorizationBundleContract.bundle_version,
    bundle_identity: null,
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
    authorization_authority:
      adapterInvocationAuthorizationBundleContract.authorization_authority,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function adapterInvocationAuthorizationBundleGatewaySourceDocs(): string[] {
  return [...adapterInvocationAuthorizationBundleGatewayContract.source_docs];
}

function gatewayError(
  code: AdapterInvocationAuthorizationBundleGatewayErrorCode,
  path: string,
  message: string,
): AdapterInvocationAuthorizationBundleGatewayError {
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
