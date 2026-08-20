import { describe, expect, it } from "vitest";
import {
  AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_CAPABILITY,
  AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
  createAppendOnlyAuditLedgerWriterContract,
  type AuditLedgerRecord,
  type AuditLedgerWriterApprovalRequestEvidence,
  type AuditLedgerWriterInterfaceResult,
  type AuditLedgerWriterPolicyGateEvidence,
} from "../src/index.js";

describe("@lnsat/audit append-only writer interface contract", () => {
  it("builds a pure writer interface contract from validated record and BP-0039/BP-0040 evidence", () => {
    const record = validRecord();
    const policyGate = validPolicyGate();
    const approvalRequest = validApprovalRequest(policyGate);

    const result = createAppendOnlyAuditLedgerWriterContract({
      request_id: "req_bp0052_append",
      operation: "ledger.record.append",
      record,
      canonical_record_digest:
        "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      policy_gate_decision: policyGate,
      approval_request: approvalRequest,
    });

    expect(result).toEqual({
      ok: true,
      contract: {
        contract_id: AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID,
        request_id: "req_bp0052_append",
        operation: "ledger.record.append",
        record_ref: {
          ledger_record_id: "alr_bp0052_append_0001",
          event_id:
            "evt_pkt_onboarding_context_lnsat_agent_codex_context_packet_compiled_2026_05_04t00_00_00_000z",
          idempotency_key:
            "audit:context_packet_compiled:evt_pkt_onboarding_context_lnsat_agent_codex_context_packet_compiled_2026_05_04t00_00_00_000z",
          canonical_record_digest:
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        },
        policy_gate_ref: {
          contract_id: AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
          decision_id: "pol_req_bp0052_append",
          decision: "approval_required",
          requires_approval: true,
          reason_codes: ["policy.audit_ledger_state_change_requires_approval"],
        },
        approval_ref: {
          contract_id: AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
          approval_request_id: "apr_bp0052_append",
          approval_status: "requested",
          approval_kind: "ledger_state_change",
          policy_gate_decision_id: "pol_req_bp0052_append",
        },
        append_only: {
          mode: "insert_only",
          correction_model: "append_new_record_referencing_prior_record",
          forbidden_mutations: ["update", "delete", "truncate", "in_place_redaction"],
        },
        idempotency: {
          idempotency_key:
            "audit:context_packet_compiled:evt_pkt_onboarding_context_lnsat_agent_codex_context_packet_compiled_2026_05_04t00_00_00_000z",
          canonical_record_digest:
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          duplicate_behavior: "exact_replay_returns_existing_ref",
          collision_behavior: "fail_closed",
        },
        redaction: {
          raw_rejected_command: "not_present",
          raw_rejected_value: "not_present",
          raw_invalid_payload_content: "not_present",
          secret_like_values: "not_present",
        },
        source_refs: [
          "contract:lnsat.gateway.onboarding_context_packet_inspection.v0_1",
          "fixture:packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        ],
        live_execution_allowed: false,
        side_effects: [],
      },
      errors: [],
      side_effects: [],
    });
  });

  it("fails closed when BP-0040 approval evidence is missing", () => {
    const result = createAppendOnlyAuditLedgerWriterContract({
      request_id: "req_bp0052_missing_approval",
      operation: "ledger.record.append",
      record: validRecord(),
      canonical_record_digest:
        "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      policy_gate_decision: validPolicyGate({
        request_id: "req_bp0052_missing_approval",
        decision_id: "pol_req_bp0052_missing_approval",
      }),
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain(
      "audit_ledger_writer.approval_request_required",
    );
    expect(result).toMatchObject({
      contract: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(result.errors)).not.toContain("rm -rf /");
  });

  it("fails closed when approval evidence does not reference supplied policy gate", () => {
    const policyGate = validPolicyGate({
      request_id: "req_bp0052_mismatch",
      decision_id: "pol_req_bp0052_mismatch",
    });
    const approvalRequest = validApprovalRequest(policyGate);
    approvalRequest.policy_gate_ref.decision_id = "pol_wrong_decision";

    const result = createAppendOnlyAuditLedgerWriterContract({
      request_id: "req_bp0052_mismatch",
      operation: "ledger.record.append",
      record: validRecord(),
      canonical_record_digest:
        "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      policy_gate_decision: policyGate,
      approval_request: approvalRequest,
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual([
      "audit_ledger_writer.approval_policy_mismatch",
    ]);
    expect(result).toMatchObject({
      contract: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("fails closed when state-changing writer evidence is not approval_required", () => {
    const policyGate = {
      ...validPolicyGate({
        request_id: "req_bp0052_allow_gate",
        decision_id: "pol_req_bp0052_allow_gate",
      }),
      decision: "allow",
      requires_approval: false,
      reason_codes: [],
    };
    const approvalRequest = validApprovalRequest(validPolicyGate());

    const result = createAppendOnlyAuditLedgerWriterContract({
      request_id: "req_bp0052_allow_gate",
      operation: "ledger.record.append",
      record: validRecord(),
      canonical_record_digest:
        "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      policy_gate_decision: policyGate,
      approval_request: approvalRequest,
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        "audit_ledger_writer.policy_gate_invalid",
        "audit_ledger_writer.approval_policy_mismatch",
      ]),
    );
    expect(JSON.stringify(result.errors)).not.toContain("allow_gate");
  });
});

function validPolicyGate(
  overrides: Partial<AuditLedgerWriterPolicyGateEvidence> = {},
): AuditLedgerWriterPolicyGateEvidence {
  return {
    contract_id: AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
    decision_id: "pol_req_bp0052_append",
    request_id: "req_bp0052_append",
    actor_id: "agent.codex",
    session_id: "sess_bp0052_0001",
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
    approval_request_id: "apr_bp0052_append",
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
      `capability:${AUDIT_LEDGER_WRITER_CAPABILITY}`,
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
    ledger_record_id: "alr_bp0052_append_0001",
    event_id:
      "evt_pkt_onboarding_context_lnsat_agent_codex_context_packet_compiled_2026_05_04t00_00_00_000z",
    event_type: "context_packet_compiled",
    result_status: "success",
    actor_ref: "agent.codex",
    session_ref: "sess_bp0052_0001",
    packet_ref: {
      packet_id: "pkt_onboarding_context_lnsat_agent_codex",
      packet_type: "ContextPacket",
      packet_hash:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
    policy_ref: {
      decision_id: "pol_req_bp0052_append",
      decision: "approval_required",
      requires_approval: true,
    },
    approval_ref: {
      approval_id: "apr_bp0052_append",
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

function errorCodes(result: AuditLedgerWriterInterfaceResult): string[] {
  return result.ok ? [] : result.errors.map((error) => error.code);
}
