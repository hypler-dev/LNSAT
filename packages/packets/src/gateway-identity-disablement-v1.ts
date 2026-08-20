import {
  createContractErrorV1,
  type ContractErrorV1,
} from "./contract-error-envelope-v1.js";

export const GATEWAY_IDENTITY_DISABLEMENT_V1_STATUS = "contract_only";
export const GATEWAY_IDENTITY_DISABLEMENT_CONTRACT_V1 =
  "lnsat.gateway.identity_disablement.v1_0";
export const GATEWAY_IDENTITY_DISABLEMENT_ERROR_CODE_V1 =
  "gateway.identity_disablement.denied";
export const GATEWAY_IDENTITY_DISABLEMENT_ACTIVITY_SIDE_EFFECT_V1 =
  "session_activity_evidence_may_append";
export const GATEWAY_IDENTITY_DISABLEMENT_IDENTITY_STATUS_SIDE_EFFECT_V1 =
  "identity_status_evidence_appended";
export const GATEWAY_IDENTITY_DISABLEMENT_IDENTITY_EVENT_SIDE_EFFECT_V1 =
  "identity_security_event_appended";
export const GATEWAY_IDENTITY_DISABLEMENT_TARGET_SESSION_REVOCATION_SIDE_EFFECT_V1 =
  "target_session_revocations_may_append";
export const GATEWAY_IDENTITY_DISABLEMENT_TARGET_SESSION_EVENT_SIDE_EFFECT_V1 =
  "target_session_security_events_may_append";

export const gatewayIdentityDisablementV1Contract = {
  contract_id: GATEWAY_IDENTITY_DISABLEMENT_CONTRACT_V1,
  contract_version: "lnsat.contracts.v1_0",
  path: "/v1/identities/{identity_ref}",
  method: "DELETE",
  authentication: "active owner session plus double-submit CSRF",
  scope: "active_non_owner_identity",
  actor_roles: ["owner"],
  target_roles: ["operator", "auditor"],
  target_source: "validated_route_identity_ref",
  request_body: "exact_empty_json_framing",
  csrf: "required_double_submit",
  caller_idempotency_key: "forbidden",
  replay_semantics: "one_time_active_target_identity",
  failure_oracle: "one generic denial",
  failure_code: GATEWAY_IDENTITY_DISABLEMENT_ERROR_CODE_V1,
  success_side_effects: [
    GATEWAY_IDENTITY_DISABLEMENT_ACTIVITY_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_DISABLEMENT_IDENTITY_STATUS_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_DISABLEMENT_IDENTITY_EVENT_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_DISABLEMENT_TARGET_SESSION_REVOCATION_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_DISABLEMENT_TARGET_SESSION_EVENT_SIDE_EFFECT_V1,
  ],
  failure_side_effects: [],
  execution_authority: false,
  mutation_authority: false,
} as const;

export type GatewayIdentityDisablementSuccessV1 = {
  contract: typeof GATEWAY_IDENTITY_DISABLEMENT_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: true;
  status: "disabled";
  scope: "non_owner_identity";
  identity_ref: string;
  disabled_at: string;
  revoked_session_count: number;
  authorization: {
    source: "local_session";
    actor_role: "owner";
    permission: "manage_identities";
    actor_session_bound: true;
    csrf_verified: true;
  };
  replay_semantics: "one_time_active_target_identity";
  side_effects: [
    typeof GATEWAY_IDENTITY_DISABLEMENT_ACTIVITY_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_DISABLEMENT_IDENTITY_STATUS_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_DISABLEMENT_IDENTITY_EVENT_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_DISABLEMENT_TARGET_SESSION_REVOCATION_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_DISABLEMENT_TARGET_SESSION_EVENT_SIDE_EFFECT_V1,
  ];
  permanent: true;
  target_session_family_closed: true;
  reenable_authority: false;
  identity_state_changed: true;
  session_authority_state_changed: true;
  execution_authority: false;
  mutation_authority: false;
};

export type GatewayIdentityDisablementErrorV1 = ContractErrorV1<
  typeof GATEWAY_IDENTITY_DISABLEMENT_ERROR_CODE_V1,
  "/identities/{identity_ref}"
>;

export type GatewayIdentityDisablementFailureV1 = {
  contract: typeof GATEWAY_IDENTITY_DISABLEMENT_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: false;
  identity_ref: null;
  disabled_at: null;
  revoked_session_count: null;
  errors: [GatewayIdentityDisablementErrorV1];
  side_effects: [];
  identity_state_changed: false;
  session_authority_state_changed: false;
  execution_authority: false;
  mutation_authority: false;
};

export function createGatewayIdentityDisablementFailureV1(): GatewayIdentityDisablementFailureV1 {
  return {
    contract: GATEWAY_IDENTITY_DISABLEMENT_CONTRACT_V1,
    contract_version: "lnsat.contracts.v1_0",
    ok: false,
    identity_ref: null,
    disabled_at: null,
    revoked_session_count: null,
    errors: [
      createContractErrorV1(
        GATEWAY_IDENTITY_DISABLEMENT_ERROR_CODE_V1,
        "/identities/{identity_ref}",
        "Identity disablement denied.",
      ),
    ],
    side_effects: [],
    identity_state_changed: false,
    session_authority_state_changed: false,
    execution_authority: false,
    mutation_authority: false,
  };
}
