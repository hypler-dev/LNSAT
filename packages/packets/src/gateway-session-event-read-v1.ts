import {
  createContractErrorV1,
  type ContractErrorV1,
} from "./contract-error-envelope-v1.js";

export const GATEWAY_SESSION_EVENT_READ_V1_STATUS = "contract_only";
export const GATEWAY_SESSION_EVENT_READ_CONTRACT_V1 =
  "lnsat.gateway.session_event_read.v1_0";
export const GATEWAY_SESSION_EVENT_READ_ERROR_CODE_V1 =
  "gateway.session_event_read.denied";
export const GATEWAY_SESSION_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1 =
  "session_activity_evidence_may_append";

export const gatewaySessionEventReadV1Contract = {
  contract_id: GATEWAY_SESSION_EVENT_READ_CONTRACT_V1,
  contract_version: "lnsat.contracts.v1_0",
  path: "/v1/sessions/{session_id}/events",
  methods: ["GET", "HEAD"],
  authentication: "active local browser session",
  authorization_permission: "read_evidence",
  scope: "validated_target_session",
  roles: ["owner", "operator", "auditor"],
  target_source: "validated_route_session_id",
  session_id_grammar: "ses_ plus 32 lowercase hexadecimal characters",
  request_body: "forbidden",
  query_string: "forbidden",
  caller_idempotency_key: "forbidden",
  event_order: "event_sequence_ascending",
  actor_session_semantics: "nullable_for_issue_and_offline_owner_recovery",
  related_session_semantics: "present_only_for_rotation",
  revocation_reason_semantics: "present_only_for_revocation",
  failure_oracle: "one generic denial",
  failure_code: GATEWAY_SESSION_EVENT_READ_ERROR_CODE_V1,
  raw_secret_reflection: "forbidden",
  success_side_effects: [GATEWAY_SESSION_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1],
  failure_side_effects: [GATEWAY_SESSION_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1],
  identity_state_changed: false,
  session_authority_state_changed: false,
  packet_state_changed: false,
  action_state_changed: false,
  signing_authority: false,
  nonce_authority: false,
  consumption_authority: false,
  execution_authority: false,
  mutation_authority: false,
} as const;

export type GatewaySessionEventReadRoleV1 =
  (typeof gatewaySessionEventReadV1Contract.roles)[number];

export type GatewaySessionEventKindV1 = "issued" | "revoked" | "rotated";

export type GatewaySessionEventV1 = {
  event_id: string;
  session_id: string;
  event_sequence: number;
  event_kind: GatewaySessionEventKindV1;
  actor_session_id: string | null;
  related_session_id: string | null;
  revocation_reason:
    "sign_out" | "owner_revoke" | "credential_revoke" | "recovery" | "rotation" | null;
  source_evidence_digest: string;
  occurred_at: string;
  event_evidence_digest: string;
};

type GatewaySessionEventAuthorityClosureV1 = {
  identity_state_changed: false;
  session_authority_state_changed: false;
  packet_state_changed: false;
  action_state_changed: false;
  signing_authority: false;
  nonce_authority: false;
  consumption_authority: false;
  execution_authority: false;
  mutation_authority: false;
};

export type GatewaySessionEventReadSuccessV1 = GatewaySessionEventAuthorityClosureV1 & {
  contract: typeof GATEWAY_SESSION_EVENT_READ_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: true;
  status: "evidence_read";
  scope: "target_session";
  session_id: string;
  events: GatewaySessionEventV1[];
  event_order: "event_sequence_ascending";
  side_effects: [typeof GATEWAY_SESSION_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1];
};

export type GatewaySessionEventReadErrorV1 = ContractErrorV1<
  typeof GATEWAY_SESSION_EVENT_READ_ERROR_CODE_V1,
  "/sessions/{session_id}/events"
>;

export type GatewaySessionEventReadFailureV1 = GatewaySessionEventAuthorityClosureV1 & {
  contract: typeof GATEWAY_SESSION_EVENT_READ_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: false;
  session_id: null;
  events: null;
  errors: [GatewaySessionEventReadErrorV1];
  side_effects: [typeof GATEWAY_SESSION_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1];
};

export function createGatewaySessionEventReadFailureV1(): GatewaySessionEventReadFailureV1 {
  return {
    contract: GATEWAY_SESSION_EVENT_READ_CONTRACT_V1,
    contract_version: "lnsat.contracts.v1_0",
    ok: false,
    session_id: null,
    events: null,
    errors: [
      createContractErrorV1(
        GATEWAY_SESSION_EVENT_READ_ERROR_CODE_V1,
        "/sessions/{session_id}/events",
        "Session event read denied.",
      ),
    ],
    side_effects: [GATEWAY_SESSION_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1],
    identity_state_changed: false,
    session_authority_state_changed: false,
    packet_state_changed: false,
    action_state_changed: false,
    signing_authority: false,
    nonce_authority: false,
    consumption_authority: false,
    execution_authority: false,
    mutation_authority: false,
  };
}
