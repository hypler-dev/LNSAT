import {
  createContractErrorV1,
  type ContractErrorV1,
} from "./contract-error-envelope-v1.js";

export const GATEWAY_APPROVAL_DECISION_V1_STATUS = "contract_only";
export const GATEWAY_APPROVAL_DECISION_CONTRACT_V1 =
  "lnsat.gateway.approval_decision.v1_0";
export const GATEWAY_APPROVAL_DECISION_ERROR_CODE_V1 =
  "gateway.approval_decision.denied";
export const GATEWAY_APPROVAL_DECISION_LIMITER_SIDE_EFFECT_V1 =
  "authentication_limiter_advanced";
export const GATEWAY_APPROVAL_DECISION_ACTIVITY_SIDE_EFFECT_V1 =
  "session_activity_evidence_may_append";
export const GATEWAY_APPROVAL_DECISION_EVIDENCE_SIDE_EFFECT_V1 =
  "approval_decision_evidence_appended";
export const GATEWAY_APPROVAL_DECISION_FAILURE_SIDE_EFFECT_V1 =
  "authentication_limiter_may_advance";

export const gatewayApprovalDecisionV1Contract = {
  contract_id: GATEWAY_APPROVAL_DECISION_CONTRACT_V1,
  contract_version: "lnsat.contracts.v1_0",
  path: "/v1/approval-requests/{approval_request_id}/decision",
  method: "POST",
  authentication: "active owner or operator session plus double-submit CSRF",
  actor_roles: ["owner", "operator"],
  permission: "decide_approval",
  request_fields: ["project_ref", "decision", "reason"],
  route_id_source: "validated path only",
  caller_derived_fields: "forbidden",
  caller_idempotency_key: "forbidden",
  approval_binding:
    "exact persisted request, policy, packet, project, approver, and local session",
  distinct_human: "approver must differ from requester",
  server_owned_time_field: "decided_at",
  terminal_semantics: "one immutable terminal decision per approval request",
  replay_semantics: {
    identical_derived_identity_at_identical_server_time: "exact_replay",
    different_time_outcome_reason_approver_or_session_after_terminal: "generic_denial",
  },
  failure_oracle: "one generic denial",
  failure_code: GATEWAY_APPROVAL_DECISION_ERROR_CODE_V1,
  recorded_side_effects: [
    GATEWAY_APPROVAL_DECISION_LIMITER_SIDE_EFFECT_V1,
    GATEWAY_APPROVAL_DECISION_ACTIVITY_SIDE_EFFECT_V1,
    GATEWAY_APPROVAL_DECISION_EVIDENCE_SIDE_EFFECT_V1,
  ],
  replayed_side_effects: [
    GATEWAY_APPROVAL_DECISION_LIMITER_SIDE_EFFECT_V1,
    GATEWAY_APPROVAL_DECISION_ACTIVITY_SIDE_EFFECT_V1,
  ],
  failure_side_effects: [GATEWAY_APPROVAL_DECISION_FAILURE_SIDE_EFFECT_V1],
  nested_domain_side_effects: [],
  approval_recorded: true,
  server_signed: false,
  approval_consumed: false,
  execution_authorized: false,
  packet_or_action_created: false,
  adapter_dispatched: false,
  mutation_authority: false,
} as const;

export type GatewayApprovalDecisionKindV1 = "approved" | "denied";

export type GatewayApprovalDecisionReasonV1 =
  | "approval.operator_approved"
  | "approval.operator_denied"
  | "approval.scope_rejected"
  | "approval.evidence_insufficient"
  | "approval.request_superseded";

export type GatewayApprovalDecisionRequestV1 = {
  project_ref: string;
  decision: GatewayApprovalDecisionKindV1;
  reason: GatewayApprovalDecisionReasonV1;
};

export type GatewayApprovalDecisionEvidenceV1 = {
  contract_version: "lnsat.contracts.v1_0";
  schema_id: "lnsat.approval_decision.schema.v1_0";
  approval_decision_id: string;
  approval_request_ref: {
    schema_id: "lnsat.approval_request.schema.v1_0";
    approval_request_id: string;
    policy_decision_id: string;
  };
  approver_ref: string;
  approver_session_ref: string;
  decision: GatewayApprovalDecisionKindV1;
  reason_code: GatewayApprovalDecisionReasonV1;
  decided_at: string;
  expires_at: string;
  approval_gate_satisfied: boolean;
  execution_authorized: false;
  side_effects: [];
};

export type GatewayApprovalDecisionAuthorizationV1 = {
  source: "local_session";
  permission: "decide_approval";
  csrf_verified: true;
  approver_bound: true;
  actor_session_bound: true;
  request_bound: true;
  distinct_human: true;
};

type GatewayApprovalDecisionSuccessBaseV1 = {
  contract: typeof GATEWAY_APPROVAL_DECISION_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: true;
  scope: "terminal_approval_decision";
  decision: GatewayApprovalDecisionEvidenceV1;
  authorization: GatewayApprovalDecisionAuthorizationV1;
  replay_semantics: "immutable_terminal_content_bound_server_owned_time";
  approval_recorded: true;
  server_signed: false;
  session_authority_state_changed: false;
  execution_authorized: false;
  mutation_authority: false;
};

export type GatewayApprovalDecisionRecordedSuccessV1 =
  GatewayApprovalDecisionSuccessBaseV1 & {
    status: "recorded";
    side_effects: [
      typeof GATEWAY_APPROVAL_DECISION_LIMITER_SIDE_EFFECT_V1,
      typeof GATEWAY_APPROVAL_DECISION_ACTIVITY_SIDE_EFFECT_V1,
      typeof GATEWAY_APPROVAL_DECISION_EVIDENCE_SIDE_EFFECT_V1,
    ];
    approval_decision_state_changed: true;
  };

export type GatewayApprovalDecisionReplayedSuccessV1 =
  GatewayApprovalDecisionSuccessBaseV1 & {
    status: "replayed";
    side_effects: [
      typeof GATEWAY_APPROVAL_DECISION_LIMITER_SIDE_EFFECT_V1,
      typeof GATEWAY_APPROVAL_DECISION_ACTIVITY_SIDE_EFFECT_V1,
    ];
    approval_decision_state_changed: false;
  };

export type GatewayApprovalDecisionSuccessV1 =
  GatewayApprovalDecisionRecordedSuccessV1 | GatewayApprovalDecisionReplayedSuccessV1;

export type GatewayApprovalDecisionErrorV1 = ContractErrorV1<
  typeof GATEWAY_APPROVAL_DECISION_ERROR_CODE_V1,
  "/approval-decisions"
>;

export type GatewayApprovalDecisionFailureV1 = {
  contract: typeof GATEWAY_APPROVAL_DECISION_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: false;
  decision: null;
  errors: [GatewayApprovalDecisionErrorV1];
  side_effects: [typeof GATEWAY_APPROVAL_DECISION_FAILURE_SIDE_EFFECT_V1];
  approval_decision_state_changed: false;
  approval_recorded: false;
  server_signed: false;
  session_authority_state_changed: false;
  execution_authorized: false;
  mutation_authority: false;
};

export function createGatewayApprovalDecisionFailureV1(): GatewayApprovalDecisionFailureV1 {
  return {
    contract: GATEWAY_APPROVAL_DECISION_CONTRACT_V1,
    contract_version: "lnsat.contracts.v1_0",
    ok: false,
    decision: null,
    errors: [
      createContractErrorV1(
        GATEWAY_APPROVAL_DECISION_ERROR_CODE_V1,
        "/approval-decisions",
        "Approval decision denied.",
      ),
    ],
    side_effects: [GATEWAY_APPROVAL_DECISION_FAILURE_SIDE_EFFECT_V1],
    approval_decision_state_changed: false,
    approval_recorded: false,
    server_signed: false,
    session_authority_state_changed: false,
    execution_authorized: false,
    mutation_authority: false,
  };
}
