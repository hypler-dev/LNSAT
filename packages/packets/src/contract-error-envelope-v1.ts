export const CONTRACT_ERROR_ENVELOPE_V1_STATUS = "contract_only";

export const contractErrorEnvelopeV1Contract = {
  contract_id: "lnsat.error_envelope.v1_0",
  contract_version: "lnsat.contracts.v1_0",
  schema_id: "lnsat.error_envelope.schema.v1_0",
  required_fields: ["ok", "errors", "side_effects"],
  family_result_fields: [
    "version",
    "packet",
    "policy_decision",
    "approval_request",
    "approval_decision",
    "audit_event",
  ],
  family_result_behavior: "exactly one documented family result field is null",
  error_item_fields: ["code", "path", "message", "severity"],
  code_identity: "stable namespaced identifier",
  path_identity: "RFC 6901 JSON Pointer rooted at /",
  message_stability: "public-safe human summary; not compatibility identity",
  raw_input_reflection: "forbidden",
  severity: "error",
  minimum_errors: 1,
  side_effects: [],
} as const;

export type ContractErrorV1<
  Code extends string = string,
  Path extends string = string,
> = {
  code: Code;
  path: Path;
  message: string;
  severity: "error";
};

export type ContractErrorEnvelopeV1<Code extends string = string> = {
  ok: false;
  errors: ContractErrorV1<Code>[];
  side_effects: [];
};

export function createContractErrorV1<Code extends string, Path extends string>(
  code: Code,
  path: Path,
  message: string,
): ContractErrorV1<Code, Path> {
  return { code, path, message, severity: "error" };
}
