import {
  createContractErrorV1,
  type ContractErrorV1,
} from "./contract-error-envelope-v1.js";

export const GATEWAY_IDENTITY_EVENT_READ_V1_STATUS = "contract_only";
export const GATEWAY_IDENTITY_EVENT_READ_CONTRACT_V1 =
  "lnsat.gateway.identity_event_read.v1_0";
export const GATEWAY_IDENTITY_EVENT_READ_ERROR_CODE_V1 =
  "gateway.identity_event_read.denied";
export const GATEWAY_IDENTITY_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1 =
  "session_activity_evidence_may_append";

export const gatewayIdentityEventReadV1Contract = {
  contract_id: GATEWAY_IDENTITY_EVENT_READ_CONTRACT_V1,
  contract_version: "lnsat.contracts.v1_0",
  path: "/v1/identities/{identity_ref}/events",
  methods: ["GET", "HEAD"],
  authentication: "active local browser session",
  authorization_permission: "read_evidence",
  scope: "validated_target_identity",
  roles: ["owner", "operator", "auditor"],
  target_source: "validated_route_identity_ref",
  request_body: "forbidden",
  query_string: "forbidden",
  caller_idempotency_key: "forbidden",
  event_order: "event_sequence_ascending",
  recovery_actor_semantics:
    "nullable_only_for_owner_bootstrap_and_offline_owner_recovery",
  failure_oracle: "one generic denial",
  failure_code: GATEWAY_IDENTITY_EVENT_READ_ERROR_CODE_V1,
  raw_secret_reflection: "forbidden",
  success_side_effects: [GATEWAY_IDENTITY_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1],
  failure_side_effects: [GATEWAY_IDENTITY_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1],
  identity_state_changed: false,
  session_authority_state_changed: false,
  execution_authority: false,
  mutation_authority: false,
} as const;

export type GatewayIdentityEventReadRoleV1 =
  (typeof gatewayIdentityEventReadV1Contract.roles)[number];

export type GatewayIdentityEventKindV1 =
  | "owner_bootstrapped"
  | "identity_created"
  | "password_rotated"
  | "identity_disabled"
  | "owner_recovered";

export type GatewayIdentityEventV1 = {
  event_id: string;
  identity_ref: string;
  event_sequence: number;
  event_kind: GatewayIdentityEventKindV1;
  actor_session_id: string | null;
  credential_version: number | null;
  source_evidence_digest: string;
  occurred_at: string;
  event_evidence_digest: string;
};

export type GatewayIdentityEventReadSuccessV1 = {
  contract: typeof GATEWAY_IDENTITY_EVENT_READ_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: true;
  status: "evidence_read";
  scope: "target_identity";
  identity_ref: string;
  events: GatewayIdentityEventV1[];
  event_order: "event_sequence_ascending";
  side_effects: [typeof GATEWAY_IDENTITY_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1];
  identity_state_changed: false;
  session_authority_state_changed: false;
  execution_authority: false;
  mutation_authority: false;
};

export type GatewayIdentityEventReadErrorV1 = ContractErrorV1<
  typeof GATEWAY_IDENTITY_EVENT_READ_ERROR_CODE_V1,
  "/identities/{identity_ref}/events"
>;

export type GatewayIdentityEventReadFailureV1 = {
  contract: typeof GATEWAY_IDENTITY_EVENT_READ_CONTRACT_V1;
  contract_version: "lnsat.contracts.v1_0";
  ok: false;
  identity_ref: null;
  events: null;
  errors: [GatewayIdentityEventReadErrorV1];
  side_effects: [typeof GATEWAY_IDENTITY_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1];
  identity_state_changed: false;
  session_authority_state_changed: false;
  execution_authority: false;
  mutation_authority: false;
};

export function createGatewayIdentityEventReadFailureV1(): GatewayIdentityEventReadFailureV1 {
  return {
    contract: GATEWAY_IDENTITY_EVENT_READ_CONTRACT_V1,
    contract_version: "lnsat.contracts.v1_0",
    ok: false,
    identity_ref: null,
    events: null,
    errors: [
      createContractErrorV1(
        GATEWAY_IDENTITY_EVENT_READ_ERROR_CODE_V1,
        "/identities/{identity_ref}/events",
        "Identity event read denied.",
      ),
    ],
    side_effects: [GATEWAY_IDENTITY_EVENT_READ_ACTIVITY_SIDE_EFFECT_V1],
    identity_state_changed: false,
    session_authority_state_changed: false,
    execution_authority: false,
    mutation_authority: false,
  };
}
