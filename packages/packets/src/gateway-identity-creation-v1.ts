import {
  createContractErrorV1,
  type ContractErrorV1,
} from "./contract-error-envelope-v1.js";

export const GATEWAY_IDENTITY_CREATION_V1_STATUS = "contract_only";
export const GATEWAY_IDENTITY_CREATION_CONTRACT_V1 =
  "lnsat.gateway.identity_creation.v1_0";
export const GATEWAY_IDENTITY_CREATION_ERROR_CODE_V1 =
  "gateway.identity_creation.denied";
export const GATEWAY_IDENTITY_CREATION_LIMITER_SIDE_EFFECT_V1 =
  "authentication_limiter_advanced";
export const GATEWAY_IDENTITY_CREATION_ACTIVITY_SIDE_EFFECT_V1 =
  "session_activity_evidence_may_append";
export const GATEWAY_IDENTITY_CREATION_IDENTITY_SIDE_EFFECT_V1 =
  "identity_evidence_appended";
export const GATEWAY_IDENTITY_CREATION_CREDENTIAL_SIDE_EFFECT_V1 =
  "password_credential_evidence_appended";
export const GATEWAY_IDENTITY_CREATION_EVENT_SIDE_EFFECT_V1 =
  "identity_security_event_appended";
export const GATEWAY_IDENTITY_CREATION_FAILURE_SIDE_EFFECT_V1 =
  "authentication_limiter_may_advance";

export const gatewayIdentityCreationV1Contract = {
  contract_id: GATEWAY_IDENTITY_CREATION_CONTRACT_V1,
  contract_version: "lnsat.contracts.v1_0",
  path: "/v1/identities",
  method: "POST",
  authentication: "active owner session plus double-submit CSRF",
  scope: "new_non_owner_identity",
  actor_roles: ["owner"],
  created_roles: ["operator", "auditor"],
  request_fields: ["identity_ref", "display_name", "role", "password"],
  secret_fields: ["password"],
  secret_persistence: "forbidden",
  password_profile: "lnsat.argon2id.v1",
  caller_idempotency_key: "forbidden",
  replay_semantics: "create_once_identity_ref",
  duplicate_semantics: "generic_denial",
  failure_oracle: "one generic denial",
  failure_code: GATEWAY_IDENTITY_CREATION_ERROR_CODE_V1,
  success_side_effects: [
    GATEWAY_IDENTITY_CREATION_LIMITER_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_CREATION_ACTIVITY_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_CREATION_IDENTITY_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_CREATION_CREDENTIAL_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_CREATION_EVENT_SIDE_EFFECT_V1,
  ],
  failure_side_effects: [GATEWAY_IDENTITY_CREATION_FAILURE_SIDE_EFFECT_V1],
  execution_authority: false,
  mutation_authority: false,
} as const;

export type GatewayIdentityCreationRoleV1 = "operator" | "auditor";

export type GatewayIdentityCreationRequestV1 = {
  identity_ref: string;
  display_name: string;
  role: GatewayIdentityCreationRoleV1;
  password: string;
};

export type GatewayIdentityCreationSuccessV1 = {
  contract: typeof GATEWAY_IDENTITY_CREATION_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: true;
  status: "created";
  scope: "new_non_owner_identity";
  identity: {
    identity_ref: string;
    display_name: string;
    role: GatewayIdentityCreationRoleV1;
    lifecycle_status: "active";
    created_at: string;
  };
  credential: {
    profile: "lnsat.argon2id.v1";
    version: 1;
    created_at: string;
    secret_exposed: false;
  };
  authorization: {
    source: "local_session";
    actor_role: "owner";
    permission: "manage_identities";
    actor_session_bound: true;
    csrf_verified: true;
  };
  replay_semantics: "create_once_identity_ref";
  side_effects: [
    typeof GATEWAY_IDENTITY_CREATION_LIMITER_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_CREATION_ACTIVITY_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_CREATION_IDENTITY_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_CREATION_CREDENTIAL_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_CREATION_EVENT_SIDE_EFFECT_V1,
  ];
  identity_state_changed: true;
  credential_state_changed: true;
  session_authority_state_changed: false;
  execution_authority: false;
  mutation_authority: false;
};

export type GatewayIdentityCreationErrorV1 = ContractErrorV1<
  typeof GATEWAY_IDENTITY_CREATION_ERROR_CODE_V1,
  "/identities"
>;

export type GatewayIdentityCreationFailureV1 = {
  contract: typeof GATEWAY_IDENTITY_CREATION_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: false;
  identity: null;
  credential: null;
  errors: [GatewayIdentityCreationErrorV1];
  side_effects: [typeof GATEWAY_IDENTITY_CREATION_FAILURE_SIDE_EFFECT_V1];
  identity_state_changed: false;
  credential_state_changed: false;
  session_authority_state_changed: false;
  execution_authority: false;
  mutation_authority: false;
};

export function createGatewayIdentityCreationFailureV1(): GatewayIdentityCreationFailureV1 {
  return {
    contract: GATEWAY_IDENTITY_CREATION_CONTRACT_V1,
    contract_version: "lnsat.contracts.v1_0",
    ok: false,
    identity: null,
    credential: null,
    errors: [
      createContractErrorV1(
        GATEWAY_IDENTITY_CREATION_ERROR_CODE_V1,
        "/identities",
        "Identity creation denied.",
      ),
    ],
    side_effects: [GATEWAY_IDENTITY_CREATION_FAILURE_SIDE_EFFECT_V1],
    identity_state_changed: false,
    credential_state_changed: false,
    session_authority_state_changed: false,
    execution_authority: false,
    mutation_authority: false,
  };
}
