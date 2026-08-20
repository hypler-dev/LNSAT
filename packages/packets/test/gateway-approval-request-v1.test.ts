import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createGatewayApprovalRequestFailureV1,
  gatewayApprovalRequestV1Contract,
  type GatewayApprovalRequestCreatedSuccessV1,
  type GatewayApprovalRequestReplayedSuccessV1,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const approvalRequest = {
  contract_version: "lnsat.contracts.v1_0",
  schema_id: "lnsat.approval_request.schema.v1_0",
  approval_request_id: `apr_${"1".repeat(64)}`,
  status: "requested",
  policy_decision_ref: {
    schema_id: "lnsat.policy_decision.schema.v1_0",
    decision_id: `pol_${"2".repeat(64)}`,
    packet_hash: `sha256:${"3".repeat(64)}`,
  },
  requester_ref: "identity:human:operator",
  session_ref: "session:local:operator-session",
  project_ref: "project:lnsat",
  resource_refs: ["repo:lnsat"],
  requested_capabilities: ["deploy.request"],
  policy_reason_codes: ["policy.capability_requires_approval"],
  requested_at: "2026-07-26T09:30:00Z",
  expires_at: "2026-07-26T09:40:00Z",
  side_effects: [],
} as const;

const authorization = {
  source: "local_session",
  permission: "request_action",
  csrf_verified: true,
  requester_bound: true,
  actor_session_bound: true,
} as const;

describe("@lnsat/packets Gateway approval-request v1 contract", () => {
  it("freezes authentication, policy binding, replay, and exact outer effects", () => {
    expect(gatewayApprovalRequestV1Contract).toEqual({
      contract_id: "lnsat.gateway.approval_request.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      path: "/v1/approval-requests",
      method: "POST",
      authentication: "active owner or operator session plus double-submit CSRF",
      actor_roles: ["owner", "operator"],
      permission: "request_action",
      request_fields: ["project_ref", "policy_decision_id"],
      caller_derived_fields: "forbidden",
      caller_idempotency_key: "forbidden",
      policy_binding:
        "exact persisted approval-required policy actor and local session",
      server_owned_time_field: "requested_at",
      replay_semantics: {
        identical_derived_identity_at_identical_server_time: "exact_replay",
        different_server_time: "distinct_content_bound_request",
        conflicting_durable_identity: "generic_denial",
      },
      failure_oracle: "one generic denial",
      failure_code: "gateway.approval_request.denied",
      created_side_effects: [
        "authentication_limiter_advanced",
        "session_activity_evidence_may_append",
        "approval_request_evidence_appended",
      ],
      replayed_side_effects: [
        "authentication_limiter_advanced",
        "session_activity_evidence_may_append",
      ],
      failure_side_effects: ["authentication_limiter_may_advance"],
      nested_domain_side_effects: [],
      approval_recorded: false,
      server_signed: false,
      execution_authorized: false,
      mutation_authority: false,
    });
  });

  it("distinguishes created and exact replay without changing authority", () => {
    const created: GatewayApprovalRequestCreatedSuccessV1 = {
      contract: "lnsat.gateway.approval_request.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      ok: true,
      status: "created",
      scope: "pending_approval_request",
      approval_request: {
        ...approvalRequest,
        resource_refs: [...approvalRequest.resource_refs],
        requested_capabilities: [...approvalRequest.requested_capabilities],
        policy_reason_codes: [...approvalRequest.policy_reason_codes],
        side_effects: [],
      },
      authorization,
      replay_semantics: "content_bound_server_owned_time",
      side_effects: [
        "authentication_limiter_advanced",
        "session_activity_evidence_may_append",
        "approval_request_evidence_appended",
      ],
      approval_request_state_changed: true,
      approval_recorded: false,
      server_signed: false,
      session_authority_state_changed: false,
      execution_authorized: false,
      mutation_authority: false,
    };
    const replayed: GatewayApprovalRequestReplayedSuccessV1 = {
      ...created,
      status: "replayed",
      side_effects: [
        "authentication_limiter_advanced",
        "session_activity_evidence_may_append",
      ],
      approval_request_state_changed: false,
    };

    expect(created.approval_request.side_effects).toEqual([]);
    expect(created.side_effects).toContain("approval_request_evidence_appended");
    expect(replayed.side_effects).not.toContain("approval_request_evidence_appended");
    expect(replayed.approval_request).toEqual(created.approval_request);
    expect(replayed.execution_authorized).toBe(false);
    expect(replayed.mutation_authority).toBe(false);
  });

  it("creates one closed denial exposing only possible limiter advancement", () => {
    expect(createGatewayApprovalRequestFailureV1()).toEqual({
      contract: "lnsat.gateway.approval_request.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      ok: false,
      approval_request: null,
      errors: [
        {
          code: "gateway.approval_request.denied",
          path: "/approval-requests",
          message: "Approval request denied.",
          severity: "error",
        },
      ],
      side_effects: ["authentication_limiter_may_advance"],
      approval_request_state_changed: false,
      approval_recorded: false,
      server_signed: false,
      session_authority_state_changed: false,
      execution_authorized: false,
      mutation_authority: false,
    });
  });

  it("publishes separate closed request and conditional response schemas", async () => {
    const requestSchema = JSON.parse(
      await readFile(
        join(packageRoot, "schemas", "gateway-approval-request-request-v1.schema.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const responseSchema = JSON.parse(
      await readFile(
        join(
          packageRoot,
          "schemas",
          "gateway-approval-request-response-v1.schema.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(requestSchema).toMatchObject({
      additionalProperties: false,
      required: ["project_ref", "policy_decision_id"],
    });
    expect(requestSchema).toHaveProperty(
      "properties.project_ref.pattern",
      "^project:[^\\s\\u0000-\\u001F\\u007F]{1,240}$",
    );
    expect(requestSchema).toHaveProperty(
      "properties.policy_decision_id.pattern",
      "^pol_[0-9a-f]{64}$",
    );
    expect(responseSchema.oneOf).toHaveLength(2);
    expect(responseSchema).toHaveProperty("$defs.success.additionalProperties", false);
    expect(responseSchema).toHaveProperty("$defs.failure.additionalProperties", false);
    expect(responseSchema).toHaveProperty(
      "$defs.approval_request.additionalProperties",
      false,
    );
    expect(responseSchema).toHaveProperty(
      "$defs.approval_request.properties.side_effects.maxItems",
      0,
    );
    expect(responseSchema).toHaveProperty(
      "$defs.success.allOf.0.then.properties.side_effects.prefixItems.2.const",
      "approval_request_evidence_appended",
    );
    expect(responseSchema).toHaveProperty(
      "$defs.success.allOf.1.then.properties.side_effects.maxItems",
      2,
    );
    expect(responseSchema).toHaveProperty(
      "$defs.failure.properties.side_effects.prefixItems.0.const",
      "authentication_limiter_may_advance",
    );
  });
});
