import { afterAll, describe, expect, it } from "vitest";
import {
  auditLedgerWriterPersistencePreflightGatewayContract,
  buildApiGateway,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

describe("@lnsat/api BP-0062 audit ledger writer persistence preflight route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects persistence preflight evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: auditLedgerWriterPersistencePreflightGatewayContract.method,
      url: auditLedgerWriterPersistencePreflightGatewayContract.path,
      payload: {
        request_id: "req_bp0062_route_preflight",
        actor_id: "agent.codex",
        session_id: "sess_bp0062_0001",
        approval_evidence: { mode: "valid" },
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      contract_id: auditLedgerWriterPersistencePreflightGatewayContract.contract_id,
      request_id: "req_bp0062_route_preflight",
      inspected_at: "2026-05-05T00:00:00.000Z",
      preflight: {
        contract_id: "lnsat.audit.audit_ledger_writer_persistence_preflight.v0_1",
        request_id: "req_bp0062_route_preflight",
        storage_target: "audit_events.v0_1",
        writer_interface_ref: {
          contract_id: "lnsat.audit.audit_ledger_writer_interface.v0_1",
          request_id: "req_bp0062_route_preflight",
          operation: "ledger.record.append",
        },
        policy_gate_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
          decision_id: "pol_req_bp0062_route_preflight",
          decision: "approval_required",
          requires_approval: true,
          reason_codes: ["policy.audit_ledger_state_change_requires_approval"],
        },
        approval_request_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
          approval_request_id: "apr_bp0062_route_preflight",
          approval_status: "requested",
          approval_kind: "ledger_state_change",
          policy_gate_decision_id: "pol_req_bp0062_route_preflight",
        },
        idempotency: {
          duplicate_behavior: "exact_replay_returns_existing_ref",
          collision_behavior: "fail_closed",
        },
        append_only: {
          mode: "insert_only",
          correction_model: "append_new_record_referencing_prior_record",
          forbidden_mutations: ["update", "delete", "truncate", "in_place_redaction"],
        },
        redaction: {
          raw_rejected_command: "not_present",
          raw_rejected_value: "not_present",
          raw_invalid_payload_content: "not_present",
          secret_like_values: "not_present",
        },
        migration_artifact_refs: {
          sql_artifact:
            "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
          manifest_artifact:
            "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
          static_checker: "scripts/check-audit-ledger-migrations.mjs",
          source_packet_refs: ["BP-0039", "BP-0040", "BP-0044", "BP-0045", "BP-0052"],
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      writer_interface_ref: {
        contract_id: "lnsat.audit.audit_ledger_writer_interface.v0_1",
        operation: "ledger.record.append",
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
    expect(body.idempotency).toMatchObject({
      canonical_record_digest: body.canonical_record_digest,
      duplicate_behavior: "exact_replay_returns_existing_ref",
      collision_behavior: "fail_closed",
    });
    expect(body.source_refs).toEqual(
      expect.arrayContaining([
        "contract:lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      ]),
    );
    expect(body.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "apps/api/src/audit-ledger-writer-persistence-preflight.ts",
      ]),
    );
  });

  it("maps malformed Gateway requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerWriterPersistencePreflightGatewayContract.method,
      url: auditLedgerWriterPersistencePreflightGatewayContract.path,
      payload: {
        request_id: "req_bp0062_bad_route_shape",
        command: "docker run --rm psql $DATABASE_URL",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      ok: false,
      contract_id: auditLedgerWriterPersistencePreflightGatewayContract.contract_id,
      request_id: "req_bp0062_bad_route_shape",
      inspected_at: "2026-05-05T00:00:00.000Z",
      source_docs: expect.any(Array),
      request_errors: [
        {
          code: "audit_ledger_writer_persistence_preflight.unexpected_field",
          path: "/command",
          message:
            "Unexpected audit ledger writer persistence preflight request field.",
          severity: "error",
        },
      ],
      writer_request_errors: [],
      writer_errors: [],
      preflight_errors: [],
      preflight: null,
      writer_interface_ref: null,
      policy_gate_ref: null,
      approval_request_ref: null,
      canonical_record_digest: null,
      idempotency: null,
      append_only: null,
      redaction: null,
      source_refs: [],
      migration_artifact_refs: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("docker run");
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("psql");
  });

  it("maps invalid preflight evidence to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerWriterPersistencePreflightGatewayContract.method,
      url: auditLedgerWriterPersistencePreflightGatewayContract.path,
      payload: {
        request_id: "req_bp0062_missing_writer",
        actor_id: "agent.codex",
        session_id: "sess_bp0062_0001",
        approval_evidence: { mode: "valid" },
        preflight_evidence: { mode: "missing_writer_interface" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0062_missing_writer",
      request_errors: [],
      writer_errors: [],
      preflight_errors: [
        {
          code: "audit_ledger_persistence_preflight.invalid_request",
          path: "/raw_rejected_value",
        },
        {
          code: "audit_ledger_persistence_preflight.writer_interface_required",
          path: "/writer_interface_contract",
        },
      ],
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("psql");
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("delete from audit_events");
  });

  it("maps invalid approval evidence to 400 without secret-like value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerWriterPersistencePreflightGatewayContract.method,
      url: auditLedgerWriterPersistencePreflightGatewayContract.path,
      payload: {
        request_id: "req_bp0062_invalid_approval",
        approval_evidence: { mode: "secret:lnsat/demo/api-token" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0062_invalid_approval",
      request_errors: [
        {
          code: "audit_ledger_writer_persistence_preflight.invalid_approval_evidence",
          path: "/approval_evidence/mode",
        },
      ],
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("secret:lnsat/demo/api-token");
  });
});
