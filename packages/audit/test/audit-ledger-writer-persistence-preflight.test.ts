import { describe, expect, it } from "vitest";
import {
  AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_CAPABILITY,
  AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET,
  AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
  createAppendOnlyAuditLedgerWriterContract,
  createAuditLedgerWriterPersistencePreflightEvidence,
  type AuditLedgerRecord,
  type AuditLedgerWriterApprovalRequestEvidence,
  type AuditLedgerWriterInterfaceContract,
  type AuditLedgerWriterPersistencePreflightResult,
  type AuditLedgerWriterPolicyGateEvidence,
} from "../src/index.js";

describe("@lnsat/audit writer persistence preflight evidence", () => {
  it("assembles BP-0058 source-only preflight evidence from BP-0052 writer interface evidence", () => {
    const writerInterface = validWriterInterfaceContract();

    const result = createAuditLedgerWriterPersistencePreflightEvidence({
      request_id: "req_bp0059_preflight",
      writer_interface_contract: writerInterface,
    });

    expect(result).toEqual({
      ok: true,
      preflight: {
        contract_id: AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID,
        request_id: "req_bp0059_preflight",
        storage_target: AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET,
        writer_interface_ref: {
          contract_id: AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID,
          request_id: "req_bp0059_append",
          operation: "ledger.record.append",
        },
        policy_gate_ref: writerInterface.policy_gate_ref,
        approval_request_ref: writerInterface.approval_ref,
        record_ref: writerInterface.record_ref,
        idempotency: writerInterface.idempotency,
        append_only: writerInterface.append_only,
        redaction: writerInterface.redaction,
        source_refs: writerInterface.source_refs,
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
      errors: [],
      side_effects: [],
    });
  });

  it("fails closed when BP-0052 writer interface evidence is missing", () => {
    const result = createAuditLedgerWriterPersistencePreflightEvidence({
      request_id: "req_bp0059_missing_writer",
      raw_rejected_value: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        "audit_ledger_persistence_preflight.invalid_request",
        "audit_ledger_persistence_preflight.writer_interface_required",
      ]),
    );
    expect(result).toMatchObject({
      preflight: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(result.errors)).not.toContain("rm -rf /");
  });

  it("fails closed when canonical digest or idempotency evidence is invalid", () => {
    const writerInterface = {
      ...validWriterInterfaceContract(),
      record_ref: {
        ...validWriterInterfaceContract().record_ref,
        canonical_record_digest: "sha256:bad",
      },
      idempotency: {
        ...validWriterInterfaceContract().idempotency,
        collision_behavior: "overwrite",
      },
    };

    const result = createAuditLedgerWriterPersistencePreflightEvidence({
      request_id: "req_bp0059_bad_digest",
      writer_interface_contract: writerInterface,
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        "audit_ledger_persistence_preflight.canonical_digest_required",
        "audit_ledger_persistence_preflight.idempotency_required",
      ]),
    );
    expect(result).toMatchObject({
      preflight: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("fails closed when live execution or side effects appear", () => {
    const writerInterface = {
      ...validWriterInterfaceContract(),
      live_execution_allowed: true,
      side_effects: [
        {
          effect_type: "database_write",
          resource_ref: "database:postgres/audit_events",
          status: "requested",
        },
      ],
    };

    const result = createAuditLedgerWriterPersistencePreflightEvidence({
      request_id: "req_bp0059_live_blocked",
      writer_interface_contract: writerInterface,
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        "audit_ledger_persistence_preflight.live_execution_forbidden",
        "audit_ledger_persistence_preflight.side_effects_forbidden",
      ]),
    );
  });

  it("fails closed when migration artifacts lack BP-0044/BP-0045 source evidence", () => {
    const result = createAuditLedgerWriterPersistencePreflightEvidence({
      request_id: "req_bp0059_bad_artifacts",
      writer_interface_contract: validWriterInterfaceContract(),
      migration_artifact_refs: {
        sql_artifact: "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
        manifest_artifact:
          "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
        static_checker: "scripts/check-audit-ledger-migrations.mjs",
        source_packet_refs: ["BP-0039", "BP-0040", "BP-0052"],
      },
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain(
      "audit_ledger_persistence_preflight.migration_artifact_unverified",
    );
  });
});

function validWriterInterfaceContract(): AuditLedgerWriterInterfaceContract {
  const policyGate = validPolicyGate();
  const approvalRequest = validApprovalRequest(policyGate);
  const result = createAppendOnlyAuditLedgerWriterContract({
    request_id: "req_bp0059_append",
    operation: "ledger.record.append",
    record: validRecord(),
    canonical_record_digest:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    policy_gate_decision: policyGate,
    approval_request: approvalRequest,
  });

  if (!result.ok) {
    throw new Error("Expected valid BP-0052 writer interface fixture.");
  }

  return result.contract;
}

function validPolicyGate(
  overrides: Partial<AuditLedgerWriterPolicyGateEvidence> = {},
): AuditLedgerWriterPolicyGateEvidence {
  return {
    contract_id: AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
    decision_id: "pol_req_bp0059_append",
    request_id: "req_bp0059_append",
    actor_id: "agent.codex",
    session_id: "sess_bp0059_0001",
    operation: "ledger.record.append",
    resource_refs: ["ledger:audit_events"],
    capability: AUDIT_LEDGER_WRITER_CAPABILITY,
    writer_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
    risk_level: 7,
    decision: "approval_required",
    requires_approval: true,
    reason_codes: ["policy.audit_ledger_state_change_requires_approval"],
    side_effects: [],
    created_at: "2026-05-05T00:00:00.000Z",
    ...overrides,
  };
}

function validApprovalRequest(
  policyGate: AuditLedgerWriterPolicyGateEvidence,
): AuditLedgerWriterApprovalRequestEvidence {
  return {
    contract_id: AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
    approval_request_id: "apr_bp0059_append",
    approval_status: "requested",
    approval_kind: "ledger_state_change",
    request_id: policyGate.request_id,
    actor_id: policyGate.actor_id,
    session_id: policyGate.session_id,
    operation: policyGate.operation,
    resource_refs: policyGate.resource_refs,
    requested_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
    writer_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
    risk_level: policyGate.risk_level,
    policy_gate_ref: {
      contract_id: AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
      decision_id: policyGate.decision_id,
      decision: "approval_required",
      requires_approval: true,
      reason_codes: policyGate.reason_codes,
    },
    approver_scope: "owner_or_admin",
    evidence_refs: [
      `policy:${policyGate.decision_id}`,
      `contract:${AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID}`,
      `contract:${AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID}`,
      `contract:${AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID}`,
      `capability:${AUDIT_LEDGER_WRITER_CAPABILITY}`,
      "packet:BP-0036",
      "packet:BP-0039",
      "packet:BP-0040",
      "packet:BP-0052",
    ],
    reason_codes: [
      "approval.audit_ledger_writer_policy_gate_required",
      "policy.audit_ledger_state_change_requires_approval",
    ],
    side_effects: [],
    created_at: "2026-05-05T00:00:00.000Z",
  };
}

function validRecord(): AuditLedgerRecord {
  return {
    ledger_record_id: "alr_bp0059_append_0001",
    event_id:
      "evt_pkt_onboarding_context_lnsat_agent_codex_context_packet_compiled_2026_05_04t00_00_00_000z",
    event_type: "context_packet_compiled",
    result_status: "success",
    actor_ref: "agent.codex",
    session_ref: "sess_bp0059_0001",
    packet_ref: {
      packet_id: "pkt_onboarding_context_lnsat_agent_codex",
      packet_type: "ContextPacket",
      packet_hash:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
    policy_ref: {
      decision_id: "pol_req_bp0059_append",
      decision: "approval_required",
      requires_approval: true,
    },
    approval_ref: {
      approval_id: "apr_bp0059_append",
      decision: "requested",
    },
    adapter_ref: {
      adapter_type: "gateway",
      adapter_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
    },
    resource_refs: ["ledger:audit_events"],
    capability: "audit.ledger.writer.append_only",
    risk_level: 7,
    source_refs: [
      "contract:lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      "fixture:packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
    ],
    reason_codes: [],
    redaction: {
      raw_rejected_command: "not_present",
      raw_rejected_value: "not_present",
      raw_invalid_payload_content: "not_present",
      secret_like_values: "not_present",
    },
    idempotency_key:
      "audit:context_packet_compiled:evt_pkt_onboarding_context_lnsat_agent_codex_context_packet_compiled_2026_05_04t00_00_00_000z",
    created_at: "2026-05-04T00:00:00.000Z",
    observed_at: "2026-05-04T00:00:00.000Z",
    retention_class: "control_plane",
    side_effects: [],
  };
}

function errorCodes(result: AuditLedgerWriterPersistencePreflightResult): string[] {
  return result.ok ? [] : result.errors.map((error) => error.code);
}
