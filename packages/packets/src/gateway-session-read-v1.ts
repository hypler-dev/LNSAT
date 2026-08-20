import {
  createContractErrorV1,
  type ContractErrorV1,
} from "./contract-error-envelope-v1.js";

export const GATEWAY_SESSION_READ_V1_STATUS = "contract_only";
export const GATEWAY_SESSION_READ_CONTRACT_V1 = "lnsat.gateway.session_read.v1_0";
export const GATEWAY_SESSION_READ_ERROR_CODE_V1 = "gateway.session_read.denied";
export const GATEWAY_SESSION_ACTIVITY_SIDE_EFFECT_V1 =
  "session_activity_evidence_may_append";

export const gatewaySessionReadV1Contract = {
  contract_id: GATEWAY_SESSION_READ_CONTRACT_V1,
  contract_version: "lnsat.contracts.v1_0",
  path: "/v1/session",
  methods: ["GET", "HEAD"],
  authentication: "active local browser session",
  scope: "current_session_only",
  roles: ["owner", "operator", "auditor"],
  failure_oracle: "one generic denial",
  failure_code: GATEWAY_SESSION_READ_ERROR_CODE_V1,
  raw_secret_reflection: "forbidden",
  success_side_effects: [GATEWAY_SESSION_ACTIVITY_SIDE_EFFECT_V1],
  failure_side_effects: [],
  execution_authority: false,
  mutation_authority: false,
} as const;

export type GatewaySessionReadRoleV1 =
  (typeof gatewaySessionReadV1Contract.roles)[number];

export type GatewaySessionReadSessionV1 = {
  session_id: string;
  identity_ref: string;
  role: GatewaySessionReadRoleV1;
  issued_at: string;
  expires_at: string;
};

export type GatewaySessionReadSuccessV1 = {
  contract: typeof GATEWAY_SESSION_READ_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: true;
  status: "authenticated";
  session: GatewaySessionReadSessionV1;
  transport: {
    bind_scope: "loopback";
    same_origin_required: true;
    cors_enabled: false;
  };
  side_effects: [typeof GATEWAY_SESSION_ACTIVITY_SIDE_EFFECT_V1];
  mutation_authority: false;
};

export type GatewaySessionReadErrorV1 = ContractErrorV1<
  typeof GATEWAY_SESSION_READ_ERROR_CODE_V1,
  "/session"
>;

export type GatewaySessionReadFailureV1 = {
  contract: typeof GATEWAY_SESSION_READ_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: false;
  session: null;
  errors: [GatewaySessionReadErrorV1];
  side_effects: [];
  mutation_authority: false;
};

export function createGatewaySessionReadFailureV1(): GatewaySessionReadFailureV1 {
  return {
    contract: GATEWAY_SESSION_READ_CONTRACT_V1,
    contract_version: "lnsat.contracts.v1_0",
    ok: false,
    session: null,
    errors: [
      createContractErrorV1(
        GATEWAY_SESSION_READ_ERROR_CODE_V1,
        "/session",
        "Session read denied.",
      ),
    ],
    side_effects: [],
    mutation_authority: false,
  };
}
