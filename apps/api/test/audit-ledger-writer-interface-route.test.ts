import { afterAll, describe, expect, it } from "vitest";
import {
  auditLedgerWriterInterfaceGatewayContract,
  buildApiGateway,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

describe("@lnsat/api BP-0055 audit ledger writer interface route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects writer interface evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: auditLedgerWriterInterfaceGatewayContract.method,
      url: auditLedgerWriterInterfaceGatewayContract.path,
      payload: {
        request_id: "req_bp0055_route_append",
        actor_id: "agent.codex",
        session_id: "sess_bp0055_0001",
        approval_evidence: { mode: "valid" },
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      contract_id: auditLedgerWriterInterfaceGatewayContract.contract_id,
      request_id: "req_bp0055_route_append",
      inspected_at: "2026-05-05T00:00:00.000Z",
      writer_interface: {
        contract_id: "lnsat.audit.audit_ledger_writer_interface.v0_1",
        operation: "ledger.record.append",
        policy_gate_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
          decision_id: "pol_req_bp0055_route_append",
          decision: "approval_required",
          requires_approval: true,
          reason_codes: ["policy.audit_ledger_state_change_requires_approval"],
        },
        approval_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
          approval_request_id: "apr_bp0055_route_append",
          approval_status: "requested",
          approval_kind: "ledger_state_change",
          policy_gate_decision_id: "pol_req_bp0055_route_append",
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
      idempotency: {
        duplicate_behavior: "exact_replay_returns_existing_ref",
        collision_behavior: "fail_closed",
      },
      append_only: {
        mode: "insert_only",
        correction_model: "append_new_record_referencing_prior_record",
      },
      redaction: {
        raw_rejected_command: "not_present",
        raw_rejected_value: "not_present",
        raw_invalid_payload_content: "not_present",
        secret_like_values: "not_present",
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(body.canonical_record_digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(body.source_refs).toEqual(
      expect.arrayContaining([
        "contract:lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      ]),
    );
    expect(body.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/audit/src/index.ts",
      ]),
    );
  });

  it("maps malformed Gateway requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerWriterInterfaceGatewayContract.method,
      url: auditLedgerWriterInterfaceGatewayContract.path,
      payload: {
        request_id: "req_bp0055_bad_route_shape",
        command: "psql $DATABASE_URL -c 'delete from audit_events'",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      ok: false,
      contract_id: auditLedgerWriterInterfaceGatewayContract.contract_id,
      request_id: "req_bp0055_bad_route_shape",
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
    expect(response.body).not.toContain("psql");
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("delete from audit_events");
  });

  it("maps missing approval evidence to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerWriterInterfaceGatewayContract.method,
      url: auditLedgerWriterInterfaceGatewayContract.path,
      payload: {
        request_id: "req_bp0055_missing_approval",
        actor_id: "agent.codex",
        session_id: "sess_bp0055_0001",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0055_missing_approval",
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
    expect(response.body).not.toContain("rm -rf /");
    expect(response.body).not.toContain("DATABASE_URL");
  });

  it("maps mismatched approval evidence to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerWriterInterfaceGatewayContract.method,
      url: auditLedgerWriterInterfaceGatewayContract.path,
      payload: {
        request_id: "req_bp0055_mismatched_approval",
        actor_id: "agent.codex",
        session_id: "sess_bp0055_0001",
        approval_evidence: { mode: "mismatched_policy_gate" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0055_mismatched_approval",
      request_errors: [],
      writer_errors: [
        {
          code: "audit_ledger_writer.approval_policy_mismatch",
          path: "/approval_request/policy_gate_ref/decision_id",
        },
      ],
      writer_interface: null,
      policy_gate_ref: null,
      approval_request_ref: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("pol_bp0054_mismatched_approval");
  });

  it("maps invalid approval evidence to 400 without secret-like value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerWriterInterfaceGatewayContract.method,
      url: auditLedgerWriterInterfaceGatewayContract.path,
      payload: {
        request_id: "req_bp0055_invalid_approval",
        approval_evidence: { mode: "secret:lnsat/demo/api-token" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0055_invalid_approval",
      request_errors: [
        {
          code: "audit_ledger_writer_interface.invalid_approval_evidence",
          path: "/approval_evidence/mode",
        },
      ],
      writer_interface: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("secret:lnsat/demo/api-token");
  });
});
