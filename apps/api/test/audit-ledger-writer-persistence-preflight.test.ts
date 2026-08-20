import { describe, expect, it } from "vitest";
import {
  auditLedgerWriterPersistencePreflightGatewayContract,
  inspectAuditLedgerWriterPersistencePreflightGatewayRequest,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

describe("@lnsat/api BP-0061 audit ledger writer persistence preflight gateway contract", () => {
  it("returns BP-0059 persistence preflight evidence through Gateway inspection", async () => {
    const response = await inspectAuditLedgerWriterPersistencePreflightGatewayRequest(
      {
        request_id: "req_bp0061_gateway_preflight",
        actor_id: "agent.codex",
        session_id: "sess_bp0061_0001",
        approval_evidence: { mode: "valid" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: auditLedgerWriterPersistencePreflightGatewayContract.contract_id,
      request_id: "req_bp0061_gateway_preflight",
      inspected_at: "2026-05-05T00:00:00.000Z",
      preflight: {
        contract_id: "lnsat.audit.audit_ledger_writer_persistence_preflight.v0_1",
        request_id: "req_bp0061_gateway_preflight",
        storage_target: "audit_events.v0_1",
        writer_interface_ref: {
          contract_id: "lnsat.audit.audit_ledger_writer_interface.v0_1",
          request_id: "req_bp0061_gateway_preflight",
          operation: "ledger.record.append",
        },
        policy_gate_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
          decision_id: "pol_req_bp0061_gateway_preflight",
          decision: "approval_required",
          requires_approval: true,
          reason_codes: ["policy.audit_ledger_state_change_requires_approval"],
        },
        approval_request_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
          approval_request_id: "apr_bp0061_gateway_preflight",
          approval_status: "requested",
          approval_kind: "ledger_state_change",
          policy_gate_decision_id: "pol_req_bp0061_gateway_preflight",
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
      live_execution_allowed: false,
      side_effects: [],
    });

    if (!response.ok) {
      throw new Error("expected successful persistence preflight inspection");
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
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/audit/src/index.ts",
      ]),
    );
  });

  it("fails closed when BP-0052 writer interface evidence is missing", async () => {
    const response = await inspectAuditLedgerWriterPersistencePreflightGatewayRequest(
      {
        request_id: "req_bp0061_missing_writer",
        actor_id: "agent.codex",
        session_id: "sess_bp0061_0001",
        approval_evidence: { mode: "valid" },
        preflight_evidence: { mode: "missing_writer_interface" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      contract_id: auditLedgerWriterPersistencePreflightGatewayContract.contract_id,
      request_id: "req_bp0061_missing_writer",
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
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("delete from audit_events");
  });

  it("fails closed when canonical digest or idempotency evidence is invalid", async () => {
    const response = await inspectAuditLedgerWriterPersistencePreflightGatewayRequest(
      {
        request_id: "req_bp0061_bad_digest",
        actor_id: "agent.codex",
        session_id: "sess_bp0061_0001",
        approval_evidence: { mode: "valid" },
        preflight_evidence: { mode: "bad_digest_idempotency" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      writer_errors: [],
      preflight_errors: [
        {
          code: "audit_ledger_persistence_preflight.canonical_digest_required",
          path: "/writer_interface_contract/record_ref/canonical_record_digest",
        },
        {
          code: "audit_ledger_persistence_preflight.idempotency_required",
          path: "/writer_interface_contract/idempotency",
        },
      ],
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("fails closed when live execution or side effects appear", async () => {
    const response = await inspectAuditLedgerWriterPersistencePreflightGatewayRequest(
      {
        request_id: "req_bp0061_live_execution",
        actor_id: "agent.codex",
        session_id: "sess_bp0061_0001",
        approval_evidence: { mode: "valid" },
        preflight_evidence: { mode: "live_execution_side_effects" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      writer_errors: [],
      preflight_errors: [
        {
          code: "audit_ledger_persistence_preflight.live_execution_forbidden",
          path: "/writer_interface_contract/live_execution_allowed",
        },
        {
          code: "audit_ledger_persistence_preflight.side_effects_forbidden",
          path: "/writer_interface_contract/side_effects",
        },
      ],
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("database_write");
  });

  it("fails closed when BP-0044/BP-0045 migration artifact refs are missing", async () => {
    const response = await inspectAuditLedgerWriterPersistencePreflightGatewayRequest(
      {
        request_id: "req_bp0061_bad_artifacts",
        actor_id: "agent.codex",
        session_id: "sess_bp0061_0001",
        approval_evidence: { mode: "valid" },
        preflight_evidence: { mode: "missing_migration_artifacts" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      writer_errors: [],
      preflight_errors: [
        {
          code: "audit_ledger_persistence_preflight.migration_artifact_unverified",
          path: "/migration_artifact_refs/source_packet_refs",
        },
      ],
      migration_artifact_refs: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("fails closed for malformed requests without raw rejected value echo", async () => {
    const response = await inspectAuditLedgerWriterPersistencePreflightGatewayRequest(
      {
        request_id: "req_bp0061_bad_shape",
        command: "docker run --rm psql $DATABASE_URL",
        approval_evidence: { mode: "valid" },
      },
      { now },
    );

    expect(response).toEqual({
      ok: false,
      contract_id: auditLedgerWriterPersistencePreflightGatewayContract.contract_id,
      request_id: "req_bp0061_bad_shape",
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
    expect(JSON.stringify(response)).not.toContain("docker run");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("psql");
  });

  it("fails closed for invalid scalar fields without raw rejected value echo", async () => {
    const response = await inspectAuditLedgerWriterPersistencePreflightGatewayRequest(
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
          code: "audit_ledger_writer_persistence_preflight.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "audit_ledger_writer_persistence_preflight.invalid_actor_id",
          path: "/actor_id",
        },
        {
          code: "audit_ledger_writer_persistence_preflight.invalid_session_id",
          path: "/session_id",
        },
      ],
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("req_bad");
    expect(JSON.stringify(response)).not.toContain("secret:lnsat/demo/api-token");
  });

  it("fails closed when BP-0040 approval evidence is invalid before preflight", async () => {
    const response = await inspectAuditLedgerWriterPersistencePreflightGatewayRequest(
      {
        request_id: "req_bp0061_mismatched_approval",
        actor_id: "agent.codex",
        session_id: "sess_bp0061_0001",
        approval_evidence: { mode: "mismatched_policy_gate" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      writer_errors: [
        {
          code: "audit_ledger_writer.approval_policy_mismatch",
          path: "/approval_request/policy_gate_ref/decision_id",
        },
      ],
      preflight_errors: [],
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("pol_bp0054_mismatched_approval");
  });
});
