import { describe, expect, it } from "vitest";
import {
  AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_CAPABILITY,
  AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID,
  AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET,
  AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
  createAppendOnlyAuditLedgerWriterContract,
  createAuditLedgerDatabaseSecurityPreflightEvidence,
  createAuditLedgerWriterPersistencePreflightEvidence,
  type AuditLedgerDatabaseSecurityPreflightResult,
  type AuditLedgerRecord,
  type AuditLedgerWriterApprovalRequestEvidence,
  type AuditLedgerWriterPolicyGateEvidence,
} from "../src/index.js";

describe("@lnsat/audit database security preflight evidence", () => {
  it("assembles BP-0065 source-only PostgreSQL security evidence from BP-0059 preflight evidence", () => {
    const persistencePreflight = validPersistencePreflight();

    const result = createAuditLedgerDatabaseSecurityPreflightEvidence({
      request_id: "req_bp0065_security",
      persistence_preflight: persistencePreflight,
    });

    expect(result).toEqual({
      ok: true,
      preflight: {
        contract_id: AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID,
        request_id: "req_bp0065_security",
        security_target: {
          storage_target: AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET,
          table: "audit_events",
          schema_version: "audit_events.v0_1",
        },
        persistence_preflight_ref: {
          contract_id: AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID,
          request_id: "req_bp0065_persistence",
          storage_target: AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET,
        },
        policy_gate_ref: persistencePreflight.policy_gate_ref,
        approval_request_ref: persistencePreflight.approval_request_ref,
        writer_interface_ref: persistencePreflight.writer_interface_ref,
        migration_artifact_refs: persistencePreflight.migration_artifact_refs,
        isolation_model: {
          mode: "postgresql_rls",
          approved_equivalent_isolation_ref: null,
          deny_by_default: true,
          bypass_rls_forbidden: true,
        },
        tenant_project_scope: {
          required_row_scope_fields: ["tenant_id", "project_id"],
          scope_source: "future_audit_events_columns_or_approved_equivalent_boundary",
          enforcement:
            "all_writer_and_select_paths_must_filter_tenant_id_and_project_id",
          missing_scope_behavior: "fail_closed",
        },
        role_boundaries: {
          writer_role: {
            role_ref: "role_ref:audit_ledger_writer",
            allowed_grants: ["insert_audit_events", "select_idempotency_lookup_scoped"],
            forbidden_grants: [
              "update",
              "delete",
              "truncate",
              "alter",
              "drop",
              "superuser",
              "bypassrls",
              "unscoped_select",
            ],
          },
          select_role: {
            role_ref: "role_ref:audit_ledger_reader",
            allowed_grants: ["select_scoped_audit_events"],
            forbidden_grants: [
              "insert",
              "update",
              "delete",
              "truncate",
              "alter",
              "drop",
              "superuser",
              "bypassrls",
              "unscoped_select",
            ],
          },
          migration_role: {
            role_ref: "role_ref:audit_ledger_migrator",
            allowed_grants: ["approved_migration_execution_only"],
            forbidden_grants: [
              "runtime_writer_use",
              "unapproved_ddl",
              "superuser",
              "bypassrls",
              "secret_inline_credentials",
            ],
          },
        },
        test_requirements_before_live_scope: [
          "static_security_preflight_check",
          "rls_policy_or_equivalent_isolation_test",
          "tenant_project_scope_enforcement_test",
          "writer_role_grant_test",
          "select_role_grant_test",
          "deny_by_default_no_public_access_test",
          "no_bypassrls_or_superuser_writer_test",
        ],
        source_refs: [
          "packet:BP-0044",
          "packet:BP-0045",
          "packet:BP-0058",
          "packet:BP-0059",
          "packet:BP-0065",
          "docs:docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
          "docs:docs/architecture/DATA_MODEL.md",
          "docs:docs/architecture/POLICY_AND_AUDIT.md",
        ],
        live_execution_allowed: false,
        side_effects: [],
      },
      errors: [],
      side_effects: [],
    });
  });

  it("fails closed when BP-0059 persistence preflight evidence is missing", () => {
    const result = createAuditLedgerDatabaseSecurityPreflightEvidence({
      request_id: "req_bp0065_missing_persistence",
      raw_rejected_value: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        "audit_ledger_database_security_preflight.invalid_request",
        "audit_ledger_database_security_preflight.persistence_preflight_required",
      ]),
    );
    expect(result).toMatchObject({
      preflight: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(result.errors)).not.toContain("rm -rf /");
  });

  it("fails closed without RLS or approved equivalent isolation evidence", () => {
    const result = createAuditLedgerDatabaseSecurityPreflightEvidence({
      request_id: "req_bp0065_bad_isolation",
      persistence_preflight: validPersistencePreflight(),
      isolation_model: {
        mode: "shared_table_no_rls",
        approved_equivalent_isolation_ref: null,
        deny_by_default: false,
        bypass_rls_forbidden: false,
      },
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        "audit_ledger_database_security_preflight.rls_or_equivalent_required",
        "audit_ledger_database_security_preflight.grants_deny_by_default_required",
      ]),
    );
  });

  it("fails closed when tenant scope, grants, tests, live execution, or side effects are unsafe", () => {
    const result = createAuditLedgerDatabaseSecurityPreflightEvidence({
      request_id: "req_bp0065_unsafe_boundary",
      persistence_preflight: validPersistencePreflight(),
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
      test_requirements: ["static_security_preflight_check"],
      live_execution_allowed: true,
      side_effects: [{ effect_type: "database_write" }],
    });

    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        "audit_ledger_database_security_preflight.tenant_project_scope_required",
        "audit_ledger_database_security_preflight.grants_deny_by_default_required",
        "audit_ledger_database_security_preflight.tests_required",
        "audit_ledger_database_security_preflight.live_execution_forbidden",
        "audit_ledger_database_security_preflight.side_effects_forbidden",
      ]),
    );
  });
});

function validPersistencePreflight() {
  const writerInterfaceResult = createAppendOnlyAuditLedgerWriterContract({
    request_id: "req_bp0065_append",
    operation: "ledger.record.append",
    record: validRecord(),
    canonical_record_digest:
      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    policy_gate_decision: validPolicyGate(),
    approval_request: validApprovalRequest(validPolicyGate()),
  });

  if (!writerInterfaceResult.ok) {
    throw new Error("Expected valid BP-0052 writer interface fixture.");
  }

  const result = createAuditLedgerWriterPersistencePreflightEvidence({
    request_id: "req_bp0065_persistence",
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
    decision_id: "pol_req_bp0065_append",
    request_id: "req_bp0065_append",
    actor_id: "agent.codex",
    session_id: "sess_bp0065_0001",
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
    approval_request_id: "apr_bp0065_append",
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
    ledger_record_id: "alr_bp0065_append_0001",
    event_id:
      "evt_pkt_onboarding_context_lnsat_agent_codex_context_packet_compiled_2026_05_05t00_00_00_000z",
    event_type: "context_packet_compiled",
    result_status: "success",
    actor_ref: "agent.codex",
    session_ref: "sess_bp0065_0001",
    packet_ref: {
      packet_id: "pkt_onboarding_context_lnsat_agent_codex",
      packet_type: "ContextPacket",
      packet_hash:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
    policy_ref: {
      decision_id: "pol_req_bp0065_append",
      decision: "approval_required",
      requires_approval: true,
    },
    approval_ref: {
      approval_id: "apr_bp0065_append",
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

function errorCodes(result: AuditLedgerDatabaseSecurityPreflightResult): string[] {
  return result.ok ? [] : result.errors.map((error) => error.code);
}
