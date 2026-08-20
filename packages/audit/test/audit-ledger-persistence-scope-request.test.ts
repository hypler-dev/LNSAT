import { describe, expect, it } from "vitest";
import {
  AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID,
  AUDIT_LEDGER_PERSISTENCE_IMPLEMENTATION_READINESS_GATE_CONTRACT_ID,
  AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID,
  AUDIT_LEDGER_PERSISTENCE_READINESS_MCP_TOOL,
  AUDIT_LEDGER_PERSISTENCE_SCOPE_REQUEST_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_CAPABILITY,
  AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET,
  AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
  createAppendOnlyAuditLedgerWriterContract,
  createAuditLedgerDatabaseSecurityPreflightEvidence,
  createAuditLedgerPersistenceImplementationReadinessGateEvidence,
  createAuditLedgerPersistenceScopeRequestEvidence,
  createAuditLedgerWriterPersistencePreflightEvidence,
  type AuditLedgerPersistenceScopeRequestResult,
  type AuditLedgerRecord,
  type AuditLedgerWriterApprovalRequestEvidence,
  type AuditLedgerWriterPolicyGateEvidence,
} from "../src/index.js";

describe("@lnsat/audit BP-0077 persistence scope request contract", () => {
  it("assembles Gateway-owned source-only scope request from BP-0076 MCP readiness evidence", () => {
    const readinessGate = validReadinessGate();

    const result = createAuditLedgerPersistenceScopeRequestEvidence({
      request_id: "req_bp0077_scope_request",
      readiness_gate: readinessGate,
      readiness_source: {
        kind: "registered_mcp_inspection_evidence",
        tool: AUDIT_LEDGER_PERSISTENCE_READINESS_MCP_TOOL,
        gateway_contract_id: AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID,
        gateway_request_id: readinessGate.request_id,
        registration_packet: "BP-0076",
        read_only_registration: true,
        source_packet_refs: ["BP-0071", "BP-0075", "BP-0076"],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      scope_request: {
        contract_id: AUDIT_LEDGER_PERSISTENCE_SCOPE_REQUEST_CONTRACT_ID,
        request_id: "req_bp0077_scope_request",
        scope_request: {
          status: "source_scope_request_ready_for_later_review_only",
          requested_scope: "audit_ledger_persistence_implementation",
          gateway_owned: true,
          gateway_policy_and_approval_required: true,
          live_database_scope_requested_now: false,
          live_writer_scope_requested_now: false,
          live_persistence_scope_allowed: false,
          later_scope_requires_explicit_packet: true,
          mcp_remains_adapter_only: true,
          state_changing_mcp_tools_allowed: false,
        },
        readiness_gate_ref: {
          contract_id:
            AUDIT_LEDGER_PERSISTENCE_IMPLEMENTATION_READINESS_GATE_CONTRACT_ID,
          request_id: "req_bp0077_readiness_gate",
          readiness_status: "source_ready_for_later_scope_request_only",
        },
        readiness_source: {
          kind: "registered_mcp_inspection_evidence",
          tool: AUDIT_LEDGER_PERSISTENCE_READINESS_MCP_TOOL,
          registration_packet: "BP-0076",
          read_only_registration: true,
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      errors: [],
      side_effects: [],
    });

    if (!result.ok) {
      throw new Error("expected successful BP-0077 scope request evidence");
    }

    expect(result.scope_request.minimum_source_evidence_before_live_scope).toEqual(
      expect.arrayContaining([
        "BP-0044 audit_events.v0_1 SQL artifact and manifest refs",
        "BP-0045 repo-local migration static checker evidence",
        "BP-0058 source-only writer persistence preflight contract",
        "BP-0059 pure writer persistence preflight helper evidence",
        "BP-0065 pure database security preflight helper evidence",
        "BP-0070 read-only MCP registration evidence for database security preflight",
        "BP-0071 source-only persistence readiness gate evidence",
        "BP-0076 registered read-only MCP persistence readiness inspection evidence",
        "explicit BP-0077 Gateway-owned source-only scope request before DB or writer scope can be proposed",
      ]),
    );
    expect(result.scope_request.source_refs).toEqual(
      expect.arrayContaining([
        "packet:BP-0044",
        "packet:BP-0045",
        "packet:BP-0058",
        "packet:BP-0059",
        "packet:BP-0065",
        "packet:BP-0071",
        "packet:BP-0076",
        "packet:BP-0077",
      ]),
    );
  });

  it("also accepts direct Gateway readiness evidence", () => {
    const readinessGate = validReadinessGate();

    const result = createAuditLedgerPersistenceScopeRequestEvidence({
      request_id: "req_bp0077_direct_gateway",
      readiness_gate: readinessGate,
      readiness_source: {
        kind: "direct_gateway_evidence",
        gateway_contract_id: AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID,
        gateway_request_id: readinessGate.request_id,
        source_packet_refs: ["BP-0071", "BP-0073"],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      scope_request: {
        readiness_source: {
          kind: "direct_gateway_evidence",
          gateway_contract_id: AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID,
          gateway_request_id: "req_bp0077_readiness_gate",
        },
        live_execution_allowed: false,
        side_effects: [],
      },
    });
  });

  it("fails closed when readiness gate evidence is missing without raw rejected value echo", () => {
    const result = createAuditLedgerPersistenceScopeRequestEvidence({
      request_id: "req_bp0077_missing_readiness",
      readiness_source: {
        kind: "registered_mcp_inspection_evidence",
        tool: AUDIT_LEDGER_PERSISTENCE_READINESS_MCP_TOOL,
        gateway_contract_id: AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID,
        gateway_request_id: "req_bp0077_readiness_gate",
        registration_packet: "BP-0076",
        read_only_registration: true,
        source_packet_refs: ["BP-0071", "BP-0075", "BP-0076"],
      },
      raw_rejected_value: "postgres://inline-secret@example.invalid/audit",
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        "audit_ledger_persistence_scope_request.invalid_request",
        "audit_ledger_persistence_scope_request.readiness_gate_required",
      ]),
    );
    expect(result).toMatchObject({
      scope_request: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("postgres://inline-secret");
  });

  it("fails closed for invalid MCP readiness source and unsafe live behavior", () => {
    const result = createAuditLedgerPersistenceScopeRequestEvidence({
      request_id: "req_bp0077_invalid_source",
      readiness_gate: validReadinessGate(),
      readiness_source: {
        kind: "registered_mcp_inspection_evidence",
        tool: "lnsat.audit.ledger.persistence_readiness.write",
        gateway_contract_id: AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID,
        gateway_request_id: "req_bp0077_readiness_gate",
        registration_packet: "BP-0076",
        read_only_registration: false,
        source_packet_refs: ["BP-0075"],
      },
      live_execution_allowed: true,
      side_effects: [{ effect_type: "database_write" }],
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        "audit_ledger_persistence_scope_request.readiness_source_required",
        "audit_ledger_persistence_scope_request.live_execution_forbidden",
        "audit_ledger_persistence_scope_request.side_effects_forbidden",
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("database_write");
  });
});

function validReadinessGate() {
  const result = createAuditLedgerPersistenceImplementationReadinessGateEvidence({
    request_id: "req_bp0077_readiness_gate",
    database_security_preflight: validDatabaseSecurityPreflight(),
  });

  if (!result.ok) {
    throw new Error("Expected valid BP-0071 readiness gate fixture.");
  }

  return result.gate;
}

function validDatabaseSecurityPreflight() {
  const result = createAuditLedgerDatabaseSecurityPreflightEvidence({
    request_id: "req_bp0077_database_security",
    persistence_preflight: validPersistencePreflight(),
  });

  if (!result.ok) {
    throw new Error("Expected valid BP-0065 database security preflight fixture.");
  }

  return result.preflight;
}

function validPersistencePreflight() {
  const writerInterfaceResult = createAppendOnlyAuditLedgerWriterContract({
    request_id: "req_bp0077_append",
    operation: "ledger.record.append",
    record: validRecord(),
    canonical_record_digest:
      "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    policy_gate_decision: validPolicyGate(),
    approval_request: validApprovalRequest(validPolicyGate()),
  });

  if (!writerInterfaceResult.ok) {
    throw new Error("Expected valid BP-0052 writer interface fixture.");
  }

  const result = createAuditLedgerWriterPersistencePreflightEvidence({
    request_id: "req_bp0077_persistence",
    writer_interface_contract: writerInterfaceResult.contract,
    migration_artifact_refs: {
      sql_artifact: "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
      manifest_artifact:
        "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
      static_checker: "scripts/check-audit-ledger-migrations.mjs",
      source_packet_refs: [
        "BP-0039",
        "BP-0040",
        "BP-0044",
        "BP-0045",
        "BP-0052",
        "BP-0058",
        "BP-0059",
      ],
    },
  });

  if (!result.ok) {
    throw new Error("Expected valid BP-0059 persistence preflight fixture.");
  }

  return result.preflight;
}

function validPolicyGate(
  overrides: Partial<AuditLedgerWriterPolicyGateEvidence> = {},
): AuditLedgerWriterPolicyGateEvidence {
  return {
    contract_id: AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
    decision_id: "pol_req_bp0077_append",
    request_id: "req_bp0077_append",
    actor_id: "agent.codex",
    session_id: "sess_bp0077_0001",
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
    approval_request_id: "apr_bp0077_append",
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
      `contract:${AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID}`,
      `contract:${AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID}`,
      `capability:${AUDIT_LEDGER_WRITER_CAPABILITY}`,
      `storage:${AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET}`,
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
    ledger_record_id: "alr_bp0077_append_0001",
    event_id:
      "evt_pkt_onboarding_context_lnsat_agent_codex_scope_request_2026_05_05t00_00_00_000z",
    event_type: "context_packet_compiled",
    result_status: "success",
    actor_ref: "agent.codex",
    session_ref: "sess_bp0077_0001",
    packet_ref: {
      packet_id: "pkt_onboarding_context_lnsat_agent_codex",
      packet_type: "ContextPacket",
      packet_hash:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
    policy_ref: {
      decision_id: "pol_req_bp0077_append",
      decision: "approval_required",
      requires_approval: true,
    },
    approval_ref: {
      approval_id: "apr_bp0077_append",
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
      "audit:context_packet_compiled:evt_pkt_onboarding_context_lnsat_agent_codex_scope_request_2026_05_05t00_00_00_000z",
    created_at: "2026-05-05T00:00:00.000Z",
    observed_at: "2026-05-05T00:00:00.000Z",
    retention_class: "control_plane",
    side_effects: [],
  };
}

function errorCodes(result: AuditLedgerPersistenceScopeRequestResult): string[] {
  return result.ok ? [] : result.errors.map((error) => error.code);
}
