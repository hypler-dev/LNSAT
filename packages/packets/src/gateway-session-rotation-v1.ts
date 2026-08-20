import {
  createContractErrorV1,
  type ContractErrorV1,
} from "./contract-error-envelope-v1.js";
import type { GatewaySessionReadSessionV1 } from "./gateway-session-read-v1.js";

export const GATEWAY_SESSION_ROTATION_V1_STATUS = "contract_only";
export const GATEWAY_SESSION_ROTATION_CONTRACT_V1 =
  "lnsat.gateway.session_rotation.v1_0";
export const GATEWAY_SESSION_ROTATION_ERROR_CODE_V1 = "gateway.session_rotation.denied";
export const GATEWAY_SESSION_ROTATION_ACTIVITY_SIDE_EFFECT_V1 =
  "session_activity_evidence_may_append";
export const GATEWAY_SESSION_ROTATION_REVOCATION_SIDE_EFFECT_V1 =
  "prior_session_revocation_appended";
export const GATEWAY_SESSION_ROTATION_REPLACEMENT_SIDE_EFFECT_V1 =
  "replacement_session_evidence_appended";
export const GATEWAY_SESSION_ROTATION_EVIDENCE_SIDE_EFFECT_V1 =
  "session_rotation_evidence_appended";
export const GATEWAY_SESSION_ROTATION_EVENT_SIDE_EFFECT_V1 =
  "session_security_events_appended";
export const GATEWAY_SESSION_ROTATION_COOKIE_SIDE_EFFECT_V1 = "session_cookies_set";

export const gatewaySessionRotationV1Contract = {
  contract_id: GATEWAY_SESSION_ROTATION_CONTRACT_V1,
  contract_version: "lnsat.contracts.v1_0",
  path: "/v1/session",
  method: "PATCH",
  authentication: "active local browser session plus double-submit CSRF",
  scope: "current_session_only",
  roles: ["owner", "operator", "auditor"],
  request_body: "exact_empty_json_framing",
  csrf: "required_double_submit",
  absolute_expiry: "preserve_original",
  replay_semantics: "one_time_current_session",
  failure_oracle: "one generic denial",
  failure_code: GATEWAY_SESSION_ROTATION_ERROR_CODE_V1,
  success_side_effects: [
    GATEWAY_SESSION_ROTATION_ACTIVITY_SIDE_EFFECT_V1,
    GATEWAY_SESSION_ROTATION_REVOCATION_SIDE_EFFECT_V1,
    GATEWAY_SESSION_ROTATION_REPLACEMENT_SIDE_EFFECT_V1,
    GATEWAY_SESSION_ROTATION_EVIDENCE_SIDE_EFFECT_V1,
    GATEWAY_SESSION_ROTATION_EVENT_SIDE_EFFECT_V1,
    GATEWAY_SESSION_ROTATION_COOKIE_SIDE_EFFECT_V1,
  ],
  failure_side_effects: [],
  execution_authority: false,
  mutation_authority: false,
} as const;

export type GatewaySessionRotationSuccessV1 = {
  contract: typeof GATEWAY_SESSION_ROTATION_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: true;
  status: "rotated";
  scope: "current_session_only";
  prior_session_id: string;
  session: GatewaySessionReadSessionV1;
  transport: {
    bind_scope: "loopback";
    same_origin_required: true;
    csrf_verified: true;
    cors_enabled: false;
    session_cookie: "host_only_http_only_samesite_strict";
    csrf_cookie: "host_only_samesite_strict";
  };
  replay_semantics: "one_time_current_session";
  absolute_expiry_preserved: true;
  side_effects: [
    typeof GATEWAY_SESSION_ROTATION_ACTIVITY_SIDE_EFFECT_V1,
    typeof GATEWAY_SESSION_ROTATION_REVOCATION_SIDE_EFFECT_V1,
    typeof GATEWAY_SESSION_ROTATION_REPLACEMENT_SIDE_EFFECT_V1,
    typeof GATEWAY_SESSION_ROTATION_EVIDENCE_SIDE_EFFECT_V1,
    typeof GATEWAY_SESSION_ROTATION_EVENT_SIDE_EFFECT_V1,
    typeof GATEWAY_SESSION_ROTATION_COOKIE_SIDE_EFFECT_V1,
  ];
  session_state_changed: true;
  execution_authority: false;
  mutation_authority: false;
};

export type GatewaySessionRotationErrorV1 = ContractErrorV1<
  typeof GATEWAY_SESSION_ROTATION_ERROR_CODE_V1,
  "/session"
>;

export type GatewaySessionRotationFailureV1 = {
  contract: typeof GATEWAY_SESSION_ROTATION_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: false;
  prior_session_id: null;
  session: null;
  errors: [GatewaySessionRotationErrorV1];
  side_effects: [];
  session_state_changed: false;
  execution_authority: false;
  mutation_authority: false;
};

export function createGatewaySessionRotationFailureV1(): GatewaySessionRotationFailureV1 {
  return {
    contract: GATEWAY_SESSION_ROTATION_CONTRACT_V1,
    contract_version: "lnsat.contracts.v1_0",
    ok: false,
    prior_session_id: null,
    session: null,
    errors: [
      createContractErrorV1(
        GATEWAY_SESSION_ROTATION_ERROR_CODE_V1,
        "/session",
        "Session rotation denied.",
      ),
    ],
    side_effects: [],
    session_state_changed: false,
    execution_authority: false,
    mutation_authority: false,
  };
}
