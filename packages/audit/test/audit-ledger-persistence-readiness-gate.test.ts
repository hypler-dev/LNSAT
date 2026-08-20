import { describe, expect, it } from "vitest";
import {
  AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID,
  AUDIT_LEDGER_PERSISTENCE_IMPLEMENTATION_READINESS_GATE_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_CAPABILITY,
  AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET,
  AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
  createAppendOnlyAuditLedgerWriterContract,
  createAuditLedgerDatabaseSecurityPreflightEvidence,
  createAuditLedgerPersistenceImplementationReadinessGateEvidence,
  createAuditLedgerWriterPersistencePreflightEvidence,
  type AuditLedgerRecord,
  type AuditLedgerWriterApprovalRequestEvidence,
  type AuditLedgerWriterPolicyGateEvidence,
  type AuditLedgerPersistenceImplementationReadinessGateResult,
} from "../src/index.js";

describe("@lnsat/audit persistence implementation readiness gate", () => {
  it("assembles BP-0071 source-only readiness evidence from BP-0065 security preflight evidence", () => {
    const databaseSecurityPreflight = validDatabaseSecurityPreflight();

    const result = createAuditLedgerPersistenceImplementationReadinessGateEvidence({
      request_id: "req_bp0071_readiness_gate",
      database_security_preflight: databaseSecurityPreflight,
    });

    expect(result).toEqual({
      ok: true,
      gate: {
        contract_id: AUDIT_LEDGER_PERSISTENCE_IMPLEMENTATION_READINESS_GATE_CONTRACT_ID,
        request_id: "req_bp0071_readiness_gate",
        readiness: {
          status: "source_ready_for_later_scope_request_only",
          live_persistence_scope_allowed: false,
          next_scope_requires_explicit_packet: true,
          gateway_is_security_boundary: true,
          mcp_is_adapter_only: true,
          state_changing_mcp_tools_allowed: false,
        },
        reviewed_source_chain: {
          migration_artifacts: databaseSecurityPreflight.migration_artifact_refs,
          writer_persistence_preflight_ref:
            databaseSecurityPreflight.persistence_preflight_ref,
          database_security_preflight_ref: {
            contract_id: AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID,
            request_id: "req_bp0071_database_security",
            storage_target: AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET,
          },
          layer_refs: [
            {
              packet: "BP-0065",
              layer: "audit_helper",
              source_ref:
                "packages/audit/src/index.ts:createAuditLedgerDatabaseSecurityPreflightEvidence",
            },
            {
              packet: "BP-0066",
              layer: "ui_model",
              source_ref:
                "apps/console/src/lib/console-model.ts:buildAuditLedgerDatabaseSecurityPreflightModel",
            },
            {
              packet: "BP-0067",
              layer: "gateway_contract",
              source_ref:
                "apps/api/src/audit-ledger-database-security-preflight.ts:inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest",
            },
            {
              packet: "BP-0068",
              layer: "fastify_route",
              source_ref:
                "apps/api/src/server.ts:POST /v1/audit-ledger/database-security/preflight/inspect",
            },
            {
              packet: "BP-0069",
              layer: "mcp_adapter",
              source_ref:
                "packages/mcp/src/index.ts:inspectAuditLedgerDatabaseSecurityPreflightThroughMcpAdapterContract",
            },
            {
              packet: "BP-0070",
              layer: "mcp_registration",
              source_ref:
                "packages/mcp/src/index.ts:mcpAuditLedgerDatabaseSecurityPreflightToolRegistration",
            },
          ],
        },
        minimum_source_evidence_before_live_scope: [
          "BP-0044 audit_events.v0_1 SQL artifact and manifest refs",
          "BP-0045 repo-local migration static checker evidence",
          "BP-0058 source-only writer persistence preflight contract",
          "BP-0059 pure writer persistence preflight helper evidence",
          "BP-0065 pure database security preflight helper evidence",
          "BP-0066 UI rendering evidence for database security preflight",
          "BP-0067 Gateway contract evidence for database security preflight",
          "BP-0068 read-only Fastify route evidence for database security preflight",
          "BP-0069 read-only MCP adapter evidence for database security preflight",
          "BP-0070 read-only MCP registration evidence for database security preflight",
          "RLS or approved equivalent isolation source evidence",
          "tenant_id and project_id scope source evidence or approved equivalent boundary",
          "writer/select/migration role boundary and deny-by-default grant evidence",
          "required static, RLS/equivalent, scope, role, grant, and no-bypass tests",
          "secret-reference-only future credential plan",
          "explicit later build packet requesting DB/writer scope through LNSAT Gateway policy and approval",
        ],
        security_requirements: {
          isolation_model: databaseSecurityPreflight.isolation_model,
          tenant_project_scope: databaseSecurityPreflight.tenant_project_scope,
          role_boundaries: databaseSecurityPreflight.role_boundaries,
          deny_by_default_required: true,
          test_requirements_before_live_scope:
            databaseSecurityPreflight.test_requirements_before_live_scope,
        },
        source_refs: [
          "packet:BP-0044",
          "packet:BP-0045",
          "packet:BP-0058",
          "packet:BP-0059",
          "packet:BP-0065",
          "packet:BP-0066",
          "packet:BP-0067",
          "packet:BP-0068",
          "packet:BP-0069",
          "packet:BP-0070",
          "packet:BP-0071",
          "docs:docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
          "docs:docs/architecture/DATA_MODEL.md",
          "docs:docs/architecture/POLICY_AND_AUDIT.md",
          "docs:docs/architecture/MCP_ADAPTER_DESIGN.md",
        ],
        live_execution_allowed: false,
        side_effects: [],
      },
      errors: [],
      side_effects: [],
    });
  });

  it("fails closed when database security preflight evidence is missing", () => {
    const result = createAuditLedgerPersistenceImplementationReadinessGateEvidence({
      request_id: "req_bp0071_missing_security",
      raw_rejected_value: "postgres://inline-secret@example.invalid/audit",
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        "audit_ledger_persistence_readiness_gate.invalid_request",
        "audit_ledger_persistence_readiness_gate.database_security_preflight_required",
      ]),
    );
    expect(result).toMatchObject({
      gate: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(result.errors)).not.toContain("postgres://inline-secret");
  });

  it("fails closed when minimum source evidence omits required packet refs", () => {
    const result = createAuditLedgerPersistenceImplementationReadinessGateEvidence({
      request_id: "req_bp0071_incomplete_source_evidence",
      database_security_preflight: validDatabaseSecurityPreflight(),
      minimum_source_evidence: ["BP-0044 only"],
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain(
      "audit_ledger_persistence_readiness_gate.minimum_source_evidence_required",
    );
  });

  it("fails closed when security posture, live execution, or side effects are unsafe", () => {
    const unsafePreflight = {
      ...validDatabaseSecurityPreflight(),
      isolation_model: {
        mode: "shared_table_no_rls",
        approved_equivalent_isolation_ref: null,
        deny_by_default: false,
        bypass_rls_forbidden: false,
      },
      tenant_project_scope: {
        required_row_scope_fields: ["project_id"],
        scope_source: "future_audit_events_columns_or_approved_equivalent_boundary",
        enforcement: "all_writer_and_select_paths_must_filter_tenant_id_and_project_id",
        missing_scope_behavior: "allow",
      },
      role_boundaries: {
        writer_role: {
          role_ref: "role_ref:audit_ledger_writer",
          allowed_grants: ["insert_audit_events", "update"],
          forbidden_grants: ["delete"],
        },
        select_role: {
          role_ref: "role_ref:audit_ledger_reader",
          allowed_grants: ["select_scoped_audit_events", "unscoped_select"],
          forbidden_grants: ["delete"],
        },
        migration_role: {
          role_ref: "role_ref:audit_ledger_migrator",
          allowed_grants: ["unapproved_ddl"],
          forbidden_grants: ["superuser"],
        },
      },
      test_requirements_before_live_scope: ["static_security_preflight_check"],
      live_execution_allowed: true,
      side_effects: [{ effect_type: "database_write" }],
    };

    const result = createAuditLedgerPersistenceImplementationReadinessGateEvidence({
      request_id: "req_bp0071_unsafe",
      database_security_preflight: unsafePreflight,
      live_execution_allowed: true,
      side_effects: [{ effect_type: "database_write" }],
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        "audit_ledger_persistence_readiness_gate.security_boundary_required",
        "audit_ledger_persistence_readiness_gate.tests_required",
        "audit_ledger_persistence_readiness_gate.live_execution_forbidden",
        "audit_ledger_persistence_readiness_gate.side_effects_forbidden",
      ]),
    );
  });
});

function validDatabaseSecurityPreflight() {
  const persistencePreflight = validPersistencePreflight();
  const result = createAuditLedgerDatabaseSecurityPreflightEvidence({
    request_id: "req_bp0071_database_security",
    persistence_preflight: persistencePreflight,
  });

  if (!result.ok) {
    throw new Error("Expected valid BP-0065 database security preflight fixture.");
  }

  return result.preflight;
}

function validPersistencePreflight() {
  const writerInterfaceResult = createAppendOnlyAuditLedgerWriterContract({
    request_id: "req_bp0071_append",
    operation: "ledger.record.append",
    record: validRecord(),
    canonical_record_digest:
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    policy_gate_decision: validPolicyGate(),
    approval_request: validApprovalRequest(validPolicyGate()),
  });

  if (!writerInterfaceResult.ok) {
    throw new Error("Expected valid BP-0052 writer interface fixture.");
  }

  const result = createAuditLedgerWriterPersistencePreflightEvidence({
    request_id: "req_bp0071_persistence",
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
    decision_id: "pol_req_bp0071_append",
    request_id: "req_bp0071_append",
    actor_id: "agent.codex",
    session_id: "sess_bp0071_0001",
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
    approval_request_id: "apr_bp0071_append",
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
    ledger_record_id: "alr_bp0071_append_0001",
    event_id:
      "evt_pkt_onboarding_context_lnsat_agent_codex_context_packet_compiled_2026_05_05t00_00_00_000z",
    event_type: "context_packet_compiled",
    result_status: "success",
    actor_ref: "agent.codex",
    session_ref: "sess_bp0071_0001",
    packet_ref: {
      packet_id: "pkt_onboarding_context_lnsat_agent_codex",
      packet_type: "ContextPacket",
      packet_hash:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
    policy_ref: {
      decision_id: "pol_req_bp0071_append",
      decision: "approval_required",
      requires_approval: true,
    },
    approval_ref: {
      approval_id: "apr_bp0071_append",
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
      "audit:context_packet_compiled:evt_pkt_onboarding_context_lnsat_agent_codex_context_packet_compiled_2026_05_05t00_00_00_000z",
    created_at: "2026-05-05T00:00:00.000Z",
    observed_at: "2026-05-05T00:00:00.000Z",
    retention_class: "control_plane",
    side_effects: [],
  };
}

function errorCodes(
  result: AuditLedgerPersistenceImplementationReadinessGateResult,
): string[] {
  return result.ok ? [] : result.errors.map((error) => error.code);
}
