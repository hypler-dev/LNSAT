import {
  codingAgentContextSynthesisContract,
  synthesizeCodingAgentContext,
  type CodingAgentContextSynthesisError,
  type CodingAgentContextSynthesisEvidence,
} from "@lnsat/packets";

export const CODING_AGENT_CONTEXT_SYNTHESIS_GATEWAY_STATUS = "contract_only";

export const codingAgentContextSynthesisGatewayContract = {
  contract_id: "lnsat.gateway.coding_agent_context_synthesis.v0_1",
  method: "POST",
  path: "/v1/context/coding-agent/synthesize",
  authority: ["@lnsat/packets", "source-backed-context-refs", "LNSAT Gateway"],
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/CONTEXT_SYNTHESIS.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/architecture/MCP_ADAPTER_DESIGN.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/packets/src/coding-agent-context-synthesis.ts",
    "apps/api/src/coding-agent-context-synthesis.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type CodingAgentContextSynthesisGatewayRequest = {
  request_id?: string;
  context_request: unknown;
};

export type CodingAgentContextSynthesisGatewayErrorCode =
  | "coding_agent_context_synthesis_gateway.invalid_request"
  | "coding_agent_context_synthesis_gateway.unexpected_field"
  | "coding_agent_context_synthesis_gateway.invalid_request_id"
  | "coding_agent_context_synthesis_gateway.missing_context_request";

export type CodingAgentContextSynthesisGatewayError = {
  code: CodingAgentContextSynthesisGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type CodingAgentContextSynthesisGatewayResponse =
  | {
      ok: true;
      contract_id: typeof codingAgentContextSynthesisGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      synthesis: CodingAgentContextSynthesisEvidence;
      required_source_kinds: CodingAgentContextSynthesisEvidence["required_source_kinds"];
      source_counts: CodingAgentContextSynthesisEvidence["source_counts"];
      source_refs: string[];
      coding_agent_brief: string[];
      constraints: string[];
      open_questions: string[];
      live_collection_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof codingAgentContextSynthesisGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: CodingAgentContextSynthesisGatewayError[];
      synthesis_errors: CodingAgentContextSynthesisError[];
      synthesis: null;
      required_source_kinds: typeof codingAgentContextSynthesisContract.required_source_kinds;
      source_counts: null;
      source_refs: [];
      coding_agent_brief: [];
      constraints: [];
      open_questions: [];
      live_collection_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedCodingAgentContextSynthesisGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      context_request: unknown;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: CodingAgentContextSynthesisGatewayError[];
    };

const requestKeys = new Set(["request_id", "context_request"]);
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;

export async function inspectCodingAgentContextSynthesisGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<CodingAgentContextSynthesisGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeCodingAgentContextSynthesisGatewayRequest(input);

  if (!normalized.ok) {
    return codingAgentContextSynthesisGatewayFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const synthesisResult = synthesizeCodingAgentContext(normalized.context_request, {
    now: new Date(inspectedAt),
  });

  if (!synthesisResult.ok) {
    return codingAgentContextSynthesisGatewayFailure(
      normalized.request_id,
      inspectedAt,
      [],
      synthesisResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: codingAgentContextSynthesisGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: codingAgentContextSynthesisGatewaySourceDocs(),
    synthesis: synthesisResult.synthesis,
    required_source_kinds: synthesisResult.synthesis.required_source_kinds,
    source_counts: synthesisResult.synthesis.source_counts,
    source_refs: synthesisResult.synthesis.source_refs,
    coding_agent_brief:
      synthesisResult.synthesis.synthesized_context.coding_agent_brief,
    constraints: synthesisResult.synthesis.synthesized_context.constraints,
    open_questions: synthesisResult.synthesis.synthesized_context.open_questions,
    live_collection_allowed: synthesisResult.synthesis.live_collection_allowed,
    side_effects: synthesisResult.side_effects,
  };
}

function normalizeCodingAgentContextSynthesisGatewayRequest(
  input: unknown,
): NormalizedCodingAgentContextSynthesisGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "coding_agent_context_synthesis_gateway.invalid_request",
          "",
          "Coding agent context synthesis Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors: CodingAgentContextSynthesisGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gatewayError(
          "coding_agent_context_synthesis_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected coding agent context synthesis Gateway request field.",
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
        "coding_agent_context_synthesis_gateway.invalid_request_id",
        "/request_id",
        "Coding agent context synthesis Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!Object.hasOwn(input, "context_request")) {
    errors.push(
      gatewayError(
        "coding_agent_context_synthesis_gateway.missing_context_request",
        "/context_request",
        "Coding agent context synthesis Gateway request must include context_request.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, request_id: requestId, errors };
  }

  return {
    ok: true,
    request_id: requestId,
    context_request: input.context_request,
  };
}

function codingAgentContextSynthesisGatewayFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: CodingAgentContextSynthesisGatewayError[],
  synthesisErrors: CodingAgentContextSynthesisError[] = [],
): CodingAgentContextSynthesisGatewayResponse {
  return {
    ok: false,
    contract_id: codingAgentContextSynthesisGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: codingAgentContextSynthesisGatewaySourceDocs(),
    request_errors: requestErrors,
    synthesis_errors: synthesisErrors,
    synthesis: null,
    required_source_kinds: codingAgentContextSynthesisContract.required_source_kinds,
    source_counts: null,
    source_refs: [],
    coding_agent_brief: [],
    constraints: [],
    open_questions: [],
    live_collection_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function codingAgentContextSynthesisGatewaySourceDocs(): string[] {
  return [...codingAgentContextSynthesisGatewayContract.source_docs];
}

function gatewayError(
  code: CodingAgentContextSynthesisGatewayErrorCode,
  path: string,
  message: string,
): CodingAgentContextSynthesisGatewayError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function jsonPointer(key: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(key)) {
    return "/unsafe_field";
  }

  return `/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}
