import {
  createContractErrorV1,
  type ContractErrorV1,
} from "./contract-error-envelope-v1.js";
import type {
  GatewaySessionReadRoleV1,
  GatewaySessionReadSessionV1,
} from "./gateway-session-read-v1.js";

export const GATEWAY_SESSION_ISSUE_V1_STATUS = "contract_only";
export const GATEWAY_SESSION_ISSUE_CONTRACT_V1 = "lnsat.gateway.session_issue.v1_0";
export const GATEWAY_SESSION_ISSUE_ERROR_CODE_V1 = "gateway.session_issue.denied";
export const GATEWAY_SESSION_ISSUE_LIMITER_SIDE_EFFECT_V1 =
  "authentication_limiter_advanced";
export const GATEWAY_SESSION_ISSUE_EVIDENCE_SIDE_EFFECT_V1 =
  "session_evidence_appended";
export const GATEWAY_SESSION_ISSUE_EVENT_SIDE_EFFECT_V1 =
  "session_security_event_appended";
export const GATEWAY_SESSION_ISSUE_COOKIE_SIDE_EFFECT_V1 = "session_cookies_set";
export const GATEWAY_SESSION_ISSUE_FAILURE_SIDE_EFFECT_V1 =
  "authentication_limiter_may_advance";

export const gatewaySessionIssueV1Contract = {
  contract_id: GATEWAY_SESSION_ISSUE_CONTRACT_V1,
  contract_version: "lnsat.contracts.v1_0",
  path: "/v1/session",
  method: "POST",
  authentication: "local password credential",
  identity_scope: "requested_local_human_identity",
  identity_ref_semantics:
    "stable reference grammar, identity:human: prefix, 240-character remainder, 256 UTF-16 code units",
  intent_header: "X-LNSAT-Session-Intent: lnsat.session.issue.v1",
  csrf: "not_applicable_before_session",
  request_fields: ["identity_ref", "password", "lifetime_seconds"],
  secret_fields: ["password"],
  secret_persistence: "forbidden",
  roles: ["owner", "operator", "auditor"] satisfies GatewaySessionReadRoleV1[],
  lifetime_seconds: { minimum: 60, maximum: 3_600 },
  replay_semantics: "fresh_session_per_success",
  caller_idempotency_key: "forbidden",
  failure_oracle: "one generic denial",
  failure_code: GATEWAY_SESSION_ISSUE_ERROR_CODE_V1,
  success_side_effects: [
    GATEWAY_SESSION_ISSUE_LIMITER_SIDE_EFFECT_V1,
    GATEWAY_SESSION_ISSUE_EVIDENCE_SIDE_EFFECT_V1,
    GATEWAY_SESSION_ISSUE_EVENT_SIDE_EFFECT_V1,
    GATEWAY_SESSION_ISSUE_COOKIE_SIDE_EFFECT_V1,
  ],
  failure_side_effects: [GATEWAY_SESSION_ISSUE_FAILURE_SIDE_EFFECT_V1],
  execution_authority: false,
  mutation_authority: false,
} as const;

export type GatewaySessionIssueRequestV1 = {
  identity_ref: string;
  password: string;
  lifetime_seconds: number;
};

export type GatewaySessionIssueSuccessV1 = {
  contract: typeof GATEWAY_SESSION_ISSUE_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: true;
  status: "authenticated";
  session: GatewaySessionReadSessionV1;
  transport: {
    bind_scope: "loopback";
    same_origin_required: true;
    cors_enabled: false;
    session_cookie: "host_only_http_only_samesite_strict";
    csrf_cookie: "host_only_samesite_strict";
  };
  replay_semantics: "fresh_session_per_success";
  side_effects: [
    typeof GATEWAY_SESSION_ISSUE_LIMITER_SIDE_EFFECT_V1,
    typeof GATEWAY_SESSION_ISSUE_EVIDENCE_SIDE_EFFECT_V1,
    typeof GATEWAY_SESSION_ISSUE_EVENT_SIDE_EFFECT_V1,
    typeof GATEWAY_SESSION_ISSUE_COOKIE_SIDE_EFFECT_V1,
  ];
  session_state_changed: true;
  execution_authority: false;
  mutation_authority: false;
};

export type GatewaySessionIssueErrorV1 = ContractErrorV1<
  typeof GATEWAY_SESSION_ISSUE_ERROR_CODE_V1,
  "/session"
>;

export type GatewaySessionIssueFailureV1 = {
  contract: typeof GATEWAY_SESSION_ISSUE_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: false;
  session: null;
  errors: [GatewaySessionIssueErrorV1];
  side_effects: [typeof GATEWAY_SESSION_ISSUE_FAILURE_SIDE_EFFECT_V1];
  session_state_changed: false;
  execution_authority: false;
  mutation_authority: false;
};

export function createGatewaySessionIssueFailureV1(): GatewaySessionIssueFailureV1 {
  return {
    contract: GATEWAY_SESSION_ISSUE_CONTRACT_V1,
    contract_version: "lnsat.contracts.v1_0",
    ok: false,
    session: null,
    errors: [
      createContractErrorV1(
        GATEWAY_SESSION_ISSUE_ERROR_CODE_V1,
        "/session",
        "Session issue denied.",
      ),
    ],
    side_effects: [GATEWAY_SESSION_ISSUE_FAILURE_SIDE_EFFECT_V1],
    session_state_changed: false,
    execution_authority: false,
    mutation_authority: false,
  };
}
