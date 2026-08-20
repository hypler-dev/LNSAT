import {
  createContractErrorV1,
  type ContractErrorV1,
} from "./contract-error-envelope-v1.js";

export const GATEWAY_APPROVAL_REQUEST_V1_STATUS = "contract_only";
export const GATEWAY_APPROVAL_REQUEST_CONTRACT_V1 =
  "lnsat.gateway.approval_request.v1_0";
export const GATEWAY_APPROVAL_REQUEST_ERROR_CODE_V1 = "gateway.approval_request.denied";
export const GATEWAY_APPROVAL_REQUEST_LIMITER_SIDE_EFFECT_V1 =
  "authentication_limiter_advanced";
export const GATEWAY_APPROVAL_REQUEST_ACTIVITY_SIDE_EFFECT_V1 =
  "session_activity_evidence_may_append";
export const GATEWAY_APPROVAL_REQUEST_EVIDENCE_SIDE_EFFECT_V1 =
  "approval_request_evidence_appended";
export const GATEWAY_APPROVAL_REQUEST_FAILURE_SIDE_EFFECT_V1 =
  "authentication_limiter_may_advance";

export const gatewayApprovalRequestV1Contract = {
  contract_id: GATEWAY_APPROVAL_REQUEST_CONTRACT_V1,
  contract_version: "lnsat.contracts.v1_0",
  path: "/v1/approval-requests",
  method: "POST",
  authentication: "active owner or operator session plus double-submit CSRF",
  actor_roles: ["owner", "operator"],
  permission: "request_action",
  request_fields: ["project_ref", "policy_decision_id"],
  caller_derived_fields: "forbidden",
  caller_idempotency_key: "forbidden",
  policy_binding: "exact persisted approval-required policy actor and local session",
  server_owned_time_field: "requested_at",
  replay_semantics: {
    identical_derived_identity_at_identical_server_time: "exact_replay",
    different_server_time: "distinct_content_bound_request",
    conflicting_durable_identity: "generic_denial",
  },
  failure_oracle: "one generic denial",
  failure_code: GATEWAY_APPROVAL_REQUEST_ERROR_CODE_V1,
  created_side_effects: [
    GATEWAY_APPROVAL_REQUEST_LIMITER_SIDE_EFFECT_V1,
    GATEWAY_APPROVAL_REQUEST_ACTIVITY_SIDE_EFFECT_V1,
    GATEWAY_APPROVAL_REQUEST_EVIDENCE_SIDE_EFFECT_V1,
  ],
  replayed_side_effects: [
    GATEWAY_APPROVAL_REQUEST_LIMITER_SIDE_EFFECT_V1,
    GATEWAY_APPROVAL_REQUEST_ACTIVITY_SIDE_EFFECT_V1,
  ],
  failure_side_effects: [GATEWAY_APPROVAL_REQUEST_FAILURE_SIDE_EFFECT_V1],
  nested_domain_side_effects: [],
  approval_recorded: false,
  server_signed: false,
  execution_authorized: false,
  mutation_authority: false,
} as const;

export type GatewayApprovalRequestV1 = {
  project_ref: string;
  policy_decision_id: string;
};

export type GatewayApprovalRequestPolicyReasonCodeV1 =
  | "policy.packet_requires_approval"
  | "policy.risk_requires_approval"
  | "policy.capability_requires_approval";

export type GatewayApprovalRequestEvidenceV1 = {
  contract_version: "lnsat.contracts.v1_0";
  schema_id: "lnsat.approval_request.schema.v1_0";
  approval_request_id: string;
  status: "requested";
  policy_decision_ref: {
    schema_id: "lnsat.policy_decision.schema.v1_0";
    decision_id: string;
    packet_hash: string;
  };
  requester_ref: string;
  session_ref: string;
  project_ref: string;
  resource_refs: string[];
  requested_capabilities: string[];
  policy_reason_codes: GatewayApprovalRequestPolicyReasonCodeV1[];
  requested_at: string;
  expires_at: string;
  side_effects: [];
};

export type GatewayApprovalRequestAuthorizationV1 = {
  source: "local_session";
  permission: "request_action";
  csrf_verified: true;
  requester_bound: true;
  actor_session_bound: true;
};

type GatewayApprovalRequestSuccessBaseV1 = {
  contract: typeof GATEWAY_APPROVAL_REQUEST_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: true;
  scope: "pending_approval_request";
  approval_request: GatewayApprovalRequestEvidenceV1;
  authorization: GatewayApprovalRequestAuthorizationV1;
  replay_semantics: "content_bound_server_owned_time";
  approval_recorded: false;
  server_signed: false;
  session_authority_state_changed: false;
  execution_authorized: false;
  mutation_authority: false;
};

export type GatewayApprovalRequestCreatedSuccessV1 =
  GatewayApprovalRequestSuccessBaseV1 & {
    status: "created";
    side_effects: [
      typeof GATEWAY_APPROVAL_REQUEST_LIMITER_SIDE_EFFECT_V1,
      typeof GATEWAY_APPROVAL_REQUEST_ACTIVITY_SIDE_EFFECT_V1,
      typeof GATEWAY_APPROVAL_REQUEST_EVIDENCE_SIDE_EFFECT_V1,
    ];
    approval_request_state_changed: true;
  };

export type GatewayApprovalRequestReplayedSuccessV1 =
  GatewayApprovalRequestSuccessBaseV1 & {
    status: "replayed";
    side_effects: [
      typeof GATEWAY_APPROVAL_REQUEST_LIMITER_SIDE_EFFECT_V1,
      typeof GATEWAY_APPROVAL_REQUEST_ACTIVITY_SIDE_EFFECT_V1,
    ];
    approval_request_state_changed: false;
  };

export type GatewayApprovalRequestSuccessV1 =
  GatewayApprovalRequestCreatedSuccessV1 | GatewayApprovalRequestReplayedSuccessV1;

export type GatewayApprovalRequestErrorV1 = ContractErrorV1<
  typeof GATEWAY_APPROVAL_REQUEST_ERROR_CODE_V1,
  "/approval-requests"
>;

export type GatewayApprovalRequestFailureV1 = {
  contract: typeof GATEWAY_APPROVAL_REQUEST_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: false;
  approval_request: null;
  errors: [GatewayApprovalRequestErrorV1];
  side_effects: [typeof GATEWAY_APPROVAL_REQUEST_FAILURE_SIDE_EFFECT_V1];
  approval_request_state_changed: false;
  approval_recorded: false;
  server_signed: false;
  session_authority_state_changed: false;
  execution_authorized: false;
  mutation_authority: false;
};

export function createGatewayApprovalRequestFailureV1(): GatewayApprovalRequestFailureV1 {
  return {
    contract: GATEWAY_APPROVAL_REQUEST_CONTRACT_V1,
    contract_version: "lnsat.contracts.v1_0",
    ok: false,
    approval_request: null,
    errors: [
      createContractErrorV1(
        GATEWAY_APPROVAL_REQUEST_ERROR_CODE_V1,
        "/approval-requests",
        "Approval request denied.",
      ),
    ],
    side_effects: [GATEWAY_APPROVAL_REQUEST_FAILURE_SIDE_EFFECT_V1],
    approval_request_state_changed: false,
    approval_recorded: false,
    server_signed: false,
    session_authority_state_changed: false,
    execution_authorized: false,
    mutation_authority: false,
  };
}
