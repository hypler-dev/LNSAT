import {
  createContractErrorV1,
  type ContractErrorV1,
} from "./contract-error-envelope-v1.js";
import type { GatewaySessionReadRoleV1 } from "./gateway-session-read-v1.js";

export const GATEWAY_IDENTITY_PASSWORD_ROTATION_V1_STATUS = "contract_only";
export const GATEWAY_IDENTITY_PASSWORD_ROTATION_CONTRACT_V1 =
  "lnsat.gateway.identity_password_rotation.v1_0";
export const GATEWAY_IDENTITY_PASSWORD_ROTATION_ERROR_CODE_V1 =
  "gateway.identity_password_rotation.denied";
export const GATEWAY_IDENTITY_PASSWORD_ROTATION_LIMITER_SIDE_EFFECT_V1 =
  "authentication_limiter_advanced";
export const GATEWAY_IDENTITY_PASSWORD_ROTATION_ACTIVITY_SIDE_EFFECT_V1 =
  "session_activity_evidence_may_append";
export const GATEWAY_IDENTITY_PASSWORD_ROTATION_CREDENTIAL_SIDE_EFFECT_V1 =
  "password_credential_evidence_appended";
export const GATEWAY_IDENTITY_PASSWORD_ROTATION_IDENTITY_EVENT_SIDE_EFFECT_V1 =
  "identity_security_event_appended";
export const GATEWAY_IDENTITY_PASSWORD_ROTATION_REVOCATION_SIDE_EFFECT_V1 =
  "session_family_revocations_appended";
export const GATEWAY_IDENTITY_PASSWORD_ROTATION_SESSION_EVENT_SIDE_EFFECT_V1 =
  "session_security_events_appended";
export const GATEWAY_IDENTITY_PASSWORD_ROTATION_COOKIE_SIDE_EFFECT_V1 =
  "session_cookies_cleared";
export const GATEWAY_IDENTITY_PASSWORD_ROTATION_FAILURE_SIDE_EFFECT_V1 =
  "authentication_limiter_may_advance";

export const gatewayIdentityPasswordRotationV1Contract = {
  contract_id: GATEWAY_IDENTITY_PASSWORD_ROTATION_CONTRACT_V1,
  contract_version: "lnsat.contracts.v1_0",
  path: "/v1/identity/password",
  method: "PATCH",
  authentication:
    "active local browser session plus double-submit CSRF and latest password",
  scope: "authenticated_identity",
  roles: ["owner", "operator", "auditor"] satisfies GatewaySessionReadRoleV1[],
  request_fields: ["current_password", "new_password"],
  secret_fields: ["current_password", "new_password"],
  secret_persistence: "forbidden",
  password_profile: "lnsat.argon2id.v1",
  new_password_rule: "must differ from current password and match profile",
  caller_idempotency_key: "forbidden",
  replay_semantics: "one_time_active_session_family",
  failure_oracle: "one generic denial",
  failure_code: GATEWAY_IDENTITY_PASSWORD_ROTATION_ERROR_CODE_V1,
  success_side_effects: [
    GATEWAY_IDENTITY_PASSWORD_ROTATION_LIMITER_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_PASSWORD_ROTATION_ACTIVITY_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_PASSWORD_ROTATION_CREDENTIAL_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_PASSWORD_ROTATION_IDENTITY_EVENT_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_PASSWORD_ROTATION_REVOCATION_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_PASSWORD_ROTATION_SESSION_EVENT_SIDE_EFFECT_V1,
    GATEWAY_IDENTITY_PASSWORD_ROTATION_COOKIE_SIDE_EFFECT_V1,
  ],
  failure_side_effects: [GATEWAY_IDENTITY_PASSWORD_ROTATION_FAILURE_SIDE_EFFECT_V1],
  execution_authority: false,
  mutation_authority: false,
} as const;

export type GatewayIdentityPasswordRotationRequestV1 = {
  current_password: string;
  new_password: string;
};

export type GatewayIdentityPasswordRotationSuccessV1 = {
  contract: typeof GATEWAY_IDENTITY_PASSWORD_ROTATION_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: true;
  status: "password_rotated";
  scope: "authenticated_identity";
  identity_ref: string;
  credential_version: number;
  rotated_at: string;
  revoked_session_count: number;
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
    typeof GATEWAY_IDENTITY_PASSWORD_ROTATION_LIMITER_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_PASSWORD_ROTATION_ACTIVITY_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_PASSWORD_ROTATION_CREDENTIAL_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_PASSWORD_ROTATION_IDENTITY_EVENT_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_PASSWORD_ROTATION_REVOCATION_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_PASSWORD_ROTATION_SESSION_EVENT_SIDE_EFFECT_V1,
    typeof GATEWAY_IDENTITY_PASSWORD_ROTATION_COOKIE_SIDE_EFFECT_V1,
  ];
  credential_state_changed: true;
  session_state_changed: true;
  reauthentication_required: true;
  execution_authority: false;
  mutation_authority: false;
};

export type GatewayIdentityPasswordRotationErrorV1 = ContractErrorV1<
  typeof GATEWAY_IDENTITY_PASSWORD_ROTATION_ERROR_CODE_V1,
  "/identity/password"
>;

export type GatewayIdentityPasswordRotationFailureV1 = {
  contract: typeof GATEWAY_IDENTITY_PASSWORD_ROTATION_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: false;
  identity_ref: null;
  credential_version: null;
  rotated_at: null;
  revoked_session_count: null;
  errors: [GatewayIdentityPasswordRotationErrorV1];
  side_effects: [typeof GATEWAY_IDENTITY_PASSWORD_ROTATION_FAILURE_SIDE_EFFECT_V1];
  credential_state_changed: false;
  session_state_changed: false;
  execution_authority: false;
  mutation_authority: false;
};

export function createGatewayIdentityPasswordRotationFailureV1(): GatewayIdentityPasswordRotationFailureV1 {
  return {
    contract: GATEWAY_IDENTITY_PASSWORD_ROTATION_CONTRACT_V1,
    contract_version: "lnsat.contracts.v1_0",
    ok: false,
    identity_ref: null,
    credential_version: null,
    rotated_at: null,
    revoked_session_count: null,
    errors: [
      createContractErrorV1(
        GATEWAY_IDENTITY_PASSWORD_ROTATION_ERROR_CODE_V1,
        "/identity/password",
        "Password rotation denied.",
      ),
    ],
    side_effects: [GATEWAY_IDENTITY_PASSWORD_ROTATION_FAILURE_SIDE_EFFECT_V1],
    credential_state_changed: false,
    session_state_changed: false,
    execution_authority: false,
    mutation_authority: false,
  };
}
