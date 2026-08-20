import {
  createContractErrorV1,
  type ContractErrorV1,
} from "./contract-error-envelope-v1.js";

export const GATEWAY_SESSION_FAMILY_SIGN_OUT_V1_STATUS = "contract_only";
export const GATEWAY_SESSION_FAMILY_SIGN_OUT_CONTRACT_V1 =
  "lnsat.gateway.session_family_sign_out.v1_0";
export const GATEWAY_SESSION_FAMILY_SIGN_OUT_ERROR_CODE_V1 =
  "gateway.session_family_sign_out.denied";
export const GATEWAY_SESSION_FAMILY_SIGN_OUT_ACTIVITY_SIDE_EFFECT_V1 =
  "session_activity_evidence_may_append";
export const GATEWAY_SESSION_FAMILY_SIGN_OUT_REVOCATION_SIDE_EFFECT_V1 =
  "session_family_revocations_appended";
export const GATEWAY_SESSION_FAMILY_SIGN_OUT_EVENT_SIDE_EFFECT_V1 =
  "session_security_events_appended";
export const GATEWAY_SESSION_FAMILY_SIGN_OUT_COOKIE_SIDE_EFFECT_V1 =
  "session_cookies_cleared";

export const gatewaySessionFamilySignOutV1Contract = {
  contract_id: GATEWAY_SESSION_FAMILY_SIGN_OUT_CONTRACT_V1,
  contract_version: "lnsat.contracts.v1_0",
  path: "/v1/session",
  method: "DELETE",
  authentication: "active local browser session plus double-submit CSRF",
  scope: "authenticated_identity_session_family",
  roles: ["owner", "operator", "auditor"],
  request_body: "exact_empty_json_framing",
  csrf: "required_double_submit",
  replay_semantics: "one_time_active_session_family",
  failure_oracle: "one generic denial",
  failure_code: GATEWAY_SESSION_FAMILY_SIGN_OUT_ERROR_CODE_V1,
  success_side_effects: [
    GATEWAY_SESSION_FAMILY_SIGN_OUT_ACTIVITY_SIDE_EFFECT_V1,
    GATEWAY_SESSION_FAMILY_SIGN_OUT_REVOCATION_SIDE_EFFECT_V1,
    GATEWAY_SESSION_FAMILY_SIGN_OUT_EVENT_SIDE_EFFECT_V1,
    GATEWAY_SESSION_FAMILY_SIGN_OUT_COOKIE_SIDE_EFFECT_V1,
  ],
  failure_side_effects: [],
  execution_authority: false,
  mutation_authority: false,
} as const;

export type GatewaySessionFamilySignOutSuccessV1 = {
  contract: typeof GATEWAY_SESSION_FAMILY_SIGN_OUT_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: true;
  status: "signed_out";
  scope: "identity_session_family";
  identity_ref: string;
  family_session_count: number;
  newly_revoked_session_count: number;
  revoked_at: string;
  transport: {
    bind_scope: "loopback";
    same_origin_required: true;
    csrf_verified: true;
    cors_enabled: false;
    session_cookie: "cleared_host_only_http_only_samesite_strict";
    csrf_cookie: "cleared_host_only_samesite_strict";
  };
  replay_semantics: "one_time_active_session_family";
  side_effects: [
    typeof GATEWAY_SESSION_FAMILY_SIGN_OUT_ACTIVITY_SIDE_EFFECT_V1,
    typeof GATEWAY_SESSION_FAMILY_SIGN_OUT_REVOCATION_SIDE_EFFECT_V1,
    typeof GATEWAY_SESSION_FAMILY_SIGN_OUT_EVENT_SIDE_EFFECT_V1,
    typeof GATEWAY_SESSION_FAMILY_SIGN_OUT_COOKIE_SIDE_EFFECT_V1,
  ];
  session_state_changed: true;
  reauthentication_required: true;
  execution_authority: false;
  mutation_authority: false;
};

export type GatewaySessionFamilySignOutErrorV1 = ContractErrorV1<
  typeof GATEWAY_SESSION_FAMILY_SIGN_OUT_ERROR_CODE_V1,
  "/session"
>;

export type GatewaySessionFamilySignOutFailureV1 = {
  contract: typeof GATEWAY_SESSION_FAMILY_SIGN_OUT_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: false;
  identity_ref: null;
  family_session_count: null;
  newly_revoked_session_count: null;
  revoked_at: null;
  errors: [GatewaySessionFamilySignOutErrorV1];
  side_effects: [];
  session_state_changed: false;
  execution_authority: false;
  mutation_authority: false;
};

export function createGatewaySessionFamilySignOutFailureV1(): GatewaySessionFamilySignOutFailureV1 {
  return {
    contract: GATEWAY_SESSION_FAMILY_SIGN_OUT_CONTRACT_V1,
    contract_version: "lnsat.contracts.v1_0",
    ok: false,
    identity_ref: null,
    family_session_count: null,
    newly_revoked_session_count: null,
    revoked_at: null,
    errors: [
      createContractErrorV1(
        GATEWAY_SESSION_FAMILY_SIGN_OUT_ERROR_CODE_V1,
        "/session",
        "Session family sign-out denied.",
      ),
    ],
    side_effects: [],
    session_state_changed: false,
    execution_authority: false,
    mutation_authority: false,
  };
}
