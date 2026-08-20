import { describe, expect, it } from "vitest";
import {
  auditLedgerWriterInterfaceGatewayContract,
  inspectAuditLedgerWriterInterfaceGatewayRequest,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

describe("@lnsat/api BP-0054 audit ledger writer interface gateway contract", () => {
  it("returns BP-0052 writer interface evidence through Gateway inspection", async () => {
    const response = await inspectAuditLedgerWriterInterfaceGatewayRequest(
      {
        request_id: "req_bp0054_gateway_append",
        actor_id: "agent.codex",
        session_id: "sess_bp0054_0001",
        approval_evidence: { mode: "valid" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: auditLedgerWriterInterfaceGatewayContract.contract_id,
      request_id: "req_bp0054_gateway_append",
      inspected_at: "2026-05-05T00:00:00.000Z",
      writer_interface: {
        contract_id: "lnsat.audit.audit_ledger_writer_interface.v0_1",
        operation: "ledger.record.append",
        policy_gate_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
          decision_id: "pol_req_bp0054_gateway_append",
          decision: "approval_required",
          requires_approval: true,
          reason_codes: ["policy.audit_ledger_state_change_requires_approval"],
        },
        approval_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
          approval_request_id: "apr_bp0054_gateway_append",
          approval_status: "requested",
          approval_kind: "ledger_state_change",
          policy_gate_decision_id: "pol_req_bp0054_gateway_append",
        },
        append_only: {
          mode: "insert_only",
          correction_model: "append_new_record_referencing_prior_record",
          forbidden_mutations: ["update", "delete", "truncate", "in_place_redaction"],
        },
        idempotency: {
          duplicate_behavior: "exact_replay_returns_existing_ref",
          collision_behavior: "fail_closed",
        },
        redaction: {
          raw_rejected_command: "not_present",
          raw_rejected_value: "not_present",
          raw_invalid_payload_content: "not_present",
          secret_like_values: "not_present",
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      policy_gate_ref: {
        contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
        decision: "approval_required",
      },
      approval_request_ref: {
        contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
        approval_kind: "ledger_state_change",
      },
      live_execution_allowed: false,
      side_effects: [],
    });

    if (!response.ok) {
      throw new Error("expected successful writer interface inspection");
    }

    expect(response.canonical_record_digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(response.idempotency).toMatchObject({
      canonical_record_digest: response.canonical_record_digest,
      duplicate_behavior: "exact_replay_returns_existing_ref",
      collision_behavior: "fail_closed",
    });
    expect(response.source_refs).toEqual(
      expect.arrayContaining([
        "contract:lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/audit/src/index.ts",
      ]),
    );
  });

  it("fails closed when BP-0040 approval evidence is missing", async () => {
    const response = await inspectAuditLedgerWriterInterfaceGatewayRequest(
      {
        request_id: "req_bp0054_missing_approval",
        actor_id: "agent.codex",
        session_id: "sess_bp0054_0001",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      contract_id: auditLedgerWriterInterfaceGatewayContract.contract_id,
      request_id: "req_bp0054_missing_approval",
      inspected_at: "2026-05-05T00:00:00.000Z",
      request_errors: [],
      writer_errors: [
        {
          code: "audit_ledger_writer.approval_request_required",
          path: "/approval_request",
        },
      ],
      writer_interface: null,
      policy_gate_ref: null,
      approval_request_ref: null,
      canonical_record_digest: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("rm -rf /");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
  });

  it("fails closed when BP-0040 approval evidence does not match BP-0039 policy gate", async () => {
    const response = await inspectAuditLedgerWriterInterfaceGatewayRequest(
      {
        request_id: "req_bp0054_mismatched_approval",
        actor_id: "agent.codex",
        session_id: "sess_bp0054_0001",
        approval_evidence: { mode: "mismatched_policy_gate" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: "req_bp0054_mismatched_approval",
      request_errors: [],
      writer_errors: [
        {
          code: "audit_ledger_writer.approval_policy_mismatch",
          path: "/approval_request/policy_gate_ref/decision_id",
        },
      ],
      writer_interface: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("pol_bp0054_mismatched_approval");
  });

  it("fails closed for malformed requests without raw rejected value echo", async () => {
    const response = await inspectAuditLedgerWriterInterfaceGatewayRequest(
      {
        request_id: "req_bp0054_bad_shape",
        command: "psql $DATABASE_URL -c 'delete from audit_events'",
        approval_evidence: { mode: "valid" },
      },
      { now },
    );

    expect(response).toEqual({
      ok: false,
      contract_id: auditLedgerWriterInterfaceGatewayContract.contract_id,
      request_id: "req_bp0054_bad_shape",
      inspected_at: "2026-05-05T00:00:00.000Z",
      source_docs: expect.any(Array),
      request_errors: [
        {
          code: "audit_ledger_writer_interface.unexpected_field",
          path: "/command",
          message: "Unexpected audit ledger writer interface inspection request field.",
          severity: "error",
        },
      ],
      writer_errors: [],
      writer_interface: null,
      policy_gate_ref: null,
      approval_request_ref: null,
      canonical_record_digest: null,
      idempotency: null,
      append_only: null,
      redaction: null,
      source_refs: [],
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("delete from audit_events");
  });

  it("fails closed for invalid scalar fields without raw rejected value echo", async () => {
    const response = await inspectAuditLedgerWriterInterfaceGatewayRequest(
      {
        request_id: ["req_bad"],
        actor_id: { secret: "secret:lnsat/demo/api-token" },
        session_id: 7,
        approval_evidence: { mode: "valid" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: null,
      request_errors: [
        {
          code: "audit_ledger_writer_interface.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "audit_ledger_writer_interface.invalid_actor_id",
          path: "/actor_id",
        },
        {
          code: "audit_ledger_writer_interface.invalid_session_id",
          path: "/session_id",
        },
      ],
      writer_interface: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("req_bad");
    expect(JSON.stringify(response)).not.toContain("secret:lnsat/demo/api-token");
  });
});
