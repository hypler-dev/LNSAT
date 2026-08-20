import {
  agentContextFirewallContract,
  createAgentContextFirewallBundle,
  type AgentContextFirewallBundleEvidence,
  type AgentContextFirewallError,
} from "@lnsat/packets";

export const AGENT_CONTEXT_FIREWALL_GATEWAY_STATUS = "read_only";

export const agentContextFirewallGatewayContract = {
  contract_id: "lnsat.gateway.agent_context_firewall.v0_1",
  method: "POST",
  path: "/v1/agents/context-firewall/inspect",
  authority: [
    "@lnsat/packets",
    "source-backed-agent-context-firewall",
    "LNSAT Gateway",
  ],
  source_docs: [
    "docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md",
    "docs/architecture/MCP_ADAPTER_DESIGN.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/packets/src/agent-context-firewall.ts",
    "apps/api/src/agent-context-firewall.ts",
  ],
  provider_dispatch_allowed: false,
  runtime_mutation_allowed: false,
  side_effects: [],
  status: "read_only_inspection",
} as const;

export type AgentContextFirewallGatewayRequest = {
  request_id?: string;
  firewall_bundle_request: unknown;
};

export type AgentContextFirewallGatewayErrorCode =
  | "agent_context_firewall_gateway.invalid_request"
  | "agent_context_firewall_gateway.unexpected_field"
  | "agent_context_firewall_gateway.invalid_request_id"
  | "agent_context_firewall_gateway.missing_firewall_bundle_request";

export type AgentContextFirewallGatewayError = {
  code: AgentContextFirewallGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AgentContextFirewallGatewayResponse =
  | {
      ok: true;
      contract_id: typeof agentContextFirewallGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      agent_context_firewall_bundle: AgentContextFirewallBundleEvidence;
      firewall_contract_id: typeof agentContextFirewallContract.contract_id;
      firewall_level: AgentContextFirewallBundleEvidence["firewall_level"];
      agent_profile_refs: string[];
      provider_profile_refs: string[];
      permission_profile_refs: string[];
      context_decisions: AgentContextFirewallBundleEvidence["context_decisions"];
      required_human_review_refs: string[];
      excluded_context_refs: string[];
      blocked_provider_refs: string[];
      audit_event_plan: string[];
      source_refs: string[];
      provider_dispatch_allowed: false;
      runtime_mutation_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof agentContextFirewallGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: AgentContextFirewallGatewayError[];
      firewall_errors: AgentContextFirewallError[];
      agent_context_firewall_bundle: null;
      firewall_contract_id: typeof agentContextFirewallContract.contract_id;
      firewall_level: null;
      agent_profile_refs: [];
      provider_profile_refs: [];
      permission_profile_refs: [];
      context_decisions: [];
      required_human_review_refs: [];
      excluded_context_refs: [];
      blocked_provider_refs: [];
      audit_event_plan: [];
      source_refs: [];
      provider_dispatch_allowed: false;
      runtime_mutation_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedAgentContextFirewallGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      firewall_bundle_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: AgentContextFirewallGatewayError[];
    };

const requestKeys = new Set(["request_id", "firewall_bundle_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectAgentContextFirewallGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<AgentContextFirewallGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeAgentContextFirewallGatewayRequest(input);

  if (!normalized.ok) {
    return agentContextFirewallGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const bundleResult = createAgentContextFirewallBundle(
    normalized.firewall_bundle_request,
    options,
  );

  if (!bundleResult.ok) {
    return agentContextFirewallGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      bundleResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: agentContextFirewallGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: agentContextFirewallGatewaySourceDocs(),
    agent_context_firewall_bundle: bundleResult.bundle,
    firewall_contract_id: bundleResult.bundle.contract_id,
    firewall_level: bundleResult.bundle.firewall_level,
    agent_profile_refs: bundleResult.bundle.agent_profile_refs,
    provider_profile_refs: bundleResult.bundle.provider_profile_refs,
    permission_profile_refs: bundleResult.bundle.permission_profile_refs,
    context_decisions: bundleResult.bundle.context_decisions,
    required_human_review_refs: bundleResult.bundle.required_human_review_refs,
    excluded_context_refs: bundleResult.bundle.excluded_context_refs,
    blocked_provider_refs: bundleResult.bundle.blocked_provider_refs,
    audit_event_plan: bundleResult.bundle.audit_event_plan,
    source_refs: bundleResult.bundle.source_refs,
    provider_dispatch_allowed: false,
    runtime_mutation_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function normalizeAgentContextFirewallGatewayRequest(
  input: unknown,
): NormalizedAgentContextFirewallGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "agent_context_firewall_gateway.invalid_request",
          "",
          "Agent context firewall Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: AgentContextFirewallGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "agent_context_firewall_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected agent context firewall Gateway request field.",
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
        "agent_context_firewall_gateway.invalid_request_id",
        "/request_id",
        "Agent context firewall Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "firewall_bundle_request")) {
    errors.push(
      gatewayError(
        "agent_context_firewall_gateway.missing_firewall_bundle_request",
        "/firewall_bundle_request",
        "Agent context firewall Gateway request must include firewall_bundle_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    firewall_bundle_request: input.firewall_bundle_request,
  };
}

function agentContextFirewallGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: AgentContextFirewallGatewayError[],
  firewallErrors: AgentContextFirewallError[] = [],
): AgentContextFirewallGatewayResponse {
  return {
    ok: false,
    contract_id: agentContextFirewallGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: agentContextFirewallGatewaySourceDocs(),
    request_errors: requestErrors,
    firewall_errors: firewallErrors,
    agent_context_firewall_bundle: null,
    firewall_contract_id: agentContextFirewallContract.contract_id,
    firewall_level: null,
    agent_profile_refs: [],
    provider_profile_refs: [],
    permission_profile_refs: [],
    context_decisions: [],
    required_human_review_refs: [],
    excluded_context_refs: [],
    blocked_provider_refs: [],
    audit_event_plan: [],
    source_refs: [],
    provider_dispatch_allowed: false,
    runtime_mutation_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function agentContextFirewallGatewaySourceDocs(): string[] {
  return [...agentContextFirewallGatewayContract.source_docs];
}

function gatewayError(
  code: AgentContextFirewallGatewayErrorCode,
  path: string,
  message: string,
): AgentContextFirewallGatewayError {
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
