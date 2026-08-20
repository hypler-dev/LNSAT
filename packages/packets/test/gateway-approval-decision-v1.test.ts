import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createGatewayApprovalDecisionFailureV1,
  gatewayApprovalDecisionV1Contract,
  type GatewayApprovalDecisionRecordedSuccessV1,
  type GatewayApprovalDecisionReplayedSuccessV1,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const approvalDecision = {
  contract_version: "lnsat.contracts.v1_0",
  schema_id: "lnsat.approval_decision.schema.v1_0",
  approval_decision_id: `apd_${"1".repeat(64)}`,
  approval_request_ref: {
    schema_id: "lnsat.approval_request.schema.v1_0",
    approval_request_id: `apr_${"2".repeat(64)}`,
    policy_decision_id: `pol_${"3".repeat(64)}`,
  },
  approver_ref: "identity:human:owner",
  approver_session_ref: "session:local:owner-session",
  decision: "approved",
  reason_code: "approval.operator_approved",
  decided_at: "2026-07-26T10:30:00Z",
  expires_at: "2026-07-26T10:40:00Z",
  approval_gate_satisfied: true,
  execution_authorized: false,
  side_effects: [],
} as const;

const authorization = {
  source: "local_session",
  permission: "decide_approval",
  csrf_verified: true,
  approver_bound: true,
  actor_session_bound: true,
  request_bound: true,
  distinct_human: true,
} as const;

describe("@lnsat/packets Gateway approval-decision v1 contract", () => {
  it("freezes terminal, distinct-human, replay, and authority closure", () => {
    expect(gatewayApprovalDecisionV1Contract).toEqual({
      contract_id: "lnsat.gateway.approval_decision.v1_0",
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
        different_time_outcome_reason_approver_or_session_after_terminal:
          "generic_denial",
      },
      failure_oracle: "one generic denial",
      failure_code: "gateway.approval_decision.denied",
      recorded_side_effects: [
        "authentication_limiter_advanced",
        "session_activity_evidence_may_append",
        "approval_decision_evidence_appended",
      ],
      replayed_side_effects: [
        "authentication_limiter_advanced",
        "session_activity_evidence_may_append",
      ],
      failure_side_effects: ["authentication_limiter_may_advance"],
      nested_domain_side_effects: [],
      approval_recorded: true,
      server_signed: false,
      approval_consumed: false,
      execution_authorized: false,
      packet_or_action_created: false,
      adapter_dispatched: false,
      mutation_authority: false,
    });
  });

  it("distinguishes recorded and exact replay without widening authority", () => {
    const recorded: GatewayApprovalDecisionRecordedSuccessV1 = {
      contract: "lnsat.gateway.approval_decision.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      ok: true,
      status: "recorded",
      scope: "terminal_approval_decision",
      decision: approvalDecision,
      authorization,
      replay_semantics: "immutable_terminal_content_bound_server_owned_time",
      side_effects: [
        "authentication_limiter_advanced",
        "session_activity_evidence_may_append",
        "approval_decision_evidence_appended",
      ],
      approval_decision_state_changed: true,
      approval_recorded: true,
      server_signed: false,
      session_authority_state_changed: false,
      execution_authorized: false,
      mutation_authority: false,
    };
    const replayed: GatewayApprovalDecisionReplayedSuccessV1 = {
      ...recorded,
      status: "replayed",
      side_effects: [
        "authentication_limiter_advanced",
        "session_activity_evidence_may_append",
      ],
      approval_decision_state_changed: false,
    };

    expect(recorded.decision.side_effects).toEqual([]);
    expect(recorded.side_effects).toContain("approval_decision_evidence_appended");
    expect(replayed.side_effects).not.toContain("approval_decision_evidence_appended");
    expect(replayed.decision).toEqual(recorded.decision);
    expect(replayed.approval_recorded).toBe(true);
    expect(replayed.execution_authorized).toBe(false);
    expect(replayed.mutation_authority).toBe(false);
  });

  it("creates one closed denial exposing only possible limiter advancement", () => {
    expect(createGatewayApprovalDecisionFailureV1()).toEqual({
      contract: "lnsat.gateway.approval_decision.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      ok: false,
      decision: null,
      errors: [
        {
          code: "gateway.approval_decision.denied",
          path: "/approval-decisions",
          message: "Approval decision denied.",
          severity: "error",
        },
      ],
      side_effects: ["authentication_limiter_may_advance"],
      approval_decision_state_changed: false,
      approval_recorded: false,
      server_signed: false,
      session_authority_state_changed: false,
      execution_authorized: false,
      mutation_authority: false,
    });
  });

  it("publishes closed outcome-aware request and conditional response schemas", async () => {
    const requestSchema = JSON.parse(
      await readFile(
        join(
          packageRoot,
          "schemas",
          "gateway-approval-decision-request-v1.schema.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const responseSchema = JSON.parse(
      await readFile(
        join(
          packageRoot,
          "schemas",
          "gateway-approval-decision-response-v1.schema.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(requestSchema).toMatchObject({
      additionalProperties: false,
      required: ["project_ref", "decision", "reason"],
    });
    expect(requestSchema).toHaveProperty(
      "allOf.0.then.properties.reason.const",
      "approval.operator_approved",
    );
    expect(requestSchema).toHaveProperty("allOf.0.else.properties.reason.enum", [
      "approval.operator_denied",
      "approval.scope_rejected",
      "approval.evidence_insufficient",
      "approval.request_superseded",
    ]);
    expect(responseSchema.oneOf).toHaveLength(2);
    expect(responseSchema).toHaveProperty("$defs.success.additionalProperties", false);
    expect(responseSchema).toHaveProperty("$defs.failure.additionalProperties", false);
    expect(responseSchema).toHaveProperty(
      "$defs.approval_decision.additionalProperties",
      false,
    );
    expect(responseSchema).toHaveProperty(
      "$defs.approval_decision.properties.side_effects.maxItems",
      0,
    );
    expect(responseSchema).toHaveProperty(
      "$defs.success.allOf.0.then.properties.side_effects.prefixItems.2.const",
      "approval_decision_evidence_appended",
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
