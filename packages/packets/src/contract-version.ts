import {
  createContractErrorV1,
  type ContractErrorEnvelopeV1,
  type ContractErrorV1,
} from "./contract-error-envelope-v1.js";

export const CONTRACT_VERSION_STATUS = "contract_only";
export const GATEWAY_V1_ROOT_PATH = "/v1";
export const GATEWAY_CONTRACT_VERSION_HEADER_NAME = "LNSAT-Contract-Version";

export const contractVersionPolicy = {
  contract_id: "lnsat.contract_version_policy.v1_0",
  current_version: "lnsat.contracts.v1_0",
  supported_versions: [
    {
      version: "lnsat.contracts.v1_0",
      stability: "stable",
    },
    {
      version: "lnsat.contracts.v0_1",
      stability: "deprecated",
      removal: "not before 2.0.0 after one supported-release deprecation window",
    },
  ],
  negotiation: "exact_match",
  implicit_downgrade_allowed: false,
  version_ranges_allowed: false,
  side_effects: [],
} as const;

export const gatewayV1NegotiationPolicy = {
  contract_id: "lnsat.gateway.negotiation.v1_0",
  path: GATEWAY_V1_ROOT_PATH,
  methods: ["GET", "HEAD"],
  request_header: GATEWAY_CONTRACT_VERSION_HEADER_NAME,
  response_header: GATEWAY_CONTRACT_VERSION_HEADER_NAME,
  required_version: contractVersionPolicy.current_version,
  deprecated_versions_allowed: false,
  authentication_required: false,
  stored_state_disclosed: false,
  side_effects: [],
  mutation_authority: false,
} as const;

export const gatewayV1VersionGatePolicy = {
  contract_id: "lnsat.gateway.version_gate.v1_0",
  path_prefix: "/v1/",
  request_header: GATEWAY_CONTRACT_VERSION_HEADER_NAME,
  response_header: GATEWAY_CONTRACT_VERSION_HEADER_NAME,
  required_version: contractVersionPolicy.current_version,
  deprecated_versions_allowed: false,
  accepted_version_repeated_on_routed_response: true,
  validation_order: [
    "loopback_peer",
    "http_framing_and_size",
    "numeric_bound_host",
    "contract_version",
    "route",
    "authentication",
    "policy",
    "mutation",
  ],
  side_effects: [],
  mutation_authority: false,
} as const;

export type ContractVersion =
  (typeof contractVersionPolicy.supported_versions)[number]["version"];

export type ContractVersionStability =
  (typeof contractVersionPolicy.supported_versions)[number]["stability"];

export type ContractVersionErrorCode =
  | "contract.version.invalid_type"
  | "contract.version.required"
  | "contract.version.malformed"
  | "contract.version.unsupported";

export type ContractVersionError = ContractErrorV1<
  ContractVersionErrorCode,
  "/version"
>;

export type ContractVersionValidationResult =
  | {
      ok: true;
      version: ContractVersion;
      stability: ContractVersionStability;
      side_effects: [];
    }
  | (ContractErrorEnvelopeV1<ContractVersionErrorCode> & {
      version: null;
      errors: ContractVersionError[];
    });

const canonicalContractVersionPattern =
  /^lnsat\.contracts\.v(?:0|[1-9][0-9]*)_(?:0|[1-9][0-9]*)$/u;

export function validateContractVersion(
  input: unknown,
): ContractVersionValidationResult {
  if (typeof input !== "string") {
    return failure(
      "contract.version.invalid_type",
      "Contract version must be a string.",
    );
  }

  if (input.length === 0) {
    return failure("contract.version.required", "Contract version is required.");
  }

  if (input.length > 128 || !canonicalContractVersionPattern.test(input)) {
    return failure(
      "contract.version.malformed",
      "Contract version must use canonical lnsat.contracts.v<major>_<minor> syntax.",
    );
  }

  const supportedVersion = contractVersionPolicy.supported_versions.find(
    (candidate) => candidate.version === input,
  );
  if (supportedVersion === undefined) {
    return failure(
      "contract.version.unsupported",
      "Contract version is well formed but unsupported.",
    );
  }

  return {
    ok: true,
    version: supportedVersion.version,
    stability: supportedVersion.stability,
    side_effects: [],
  };
}

export function validateGatewayV1ContractVersion(
  input: unknown,
): ContractVersionValidationResult {
  const result = validateContractVersion(input);
  if (!result.ok || result.version === contractVersionPolicy.current_version) {
    return result;
  }
  return failure(
    "contract.version.unsupported",
    "Contract version is well formed but unsupported.",
  );
}

function failure(
  code: ContractVersionErrorCode,
  message: string,
): ContractVersionValidationResult {
  return {
    ok: false,
    version: null,
    errors: [
      {
        ...createContractErrorV1(code, "/version", message),
      },
    ],
    side_effects: [],
  };
}
