import { describe, expect, it } from "vitest";
import {
  auditLedgerDatabaseSecurityPreflightGatewayContract,
  inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

describe("@lnsat/api BP-0067 audit ledger database security preflight gateway contract", () => {
  it("returns BP-0065 database security preflight evidence through Gateway inspection", async () => {
    const response = await inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest(
      {
        request_id: "req_bp0067_gateway_security",
        actor_id: "agent.codex",
        session_id: "sess_bp0067_0001",
        approval_evidence: { mode: "valid" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: auditLedgerDatabaseSecurityPreflightGatewayContract.contract_id,
      request_id: "req_bp0067_gateway_security",
      inspected_at: "2026-05-05T00:00:00.000Z",
      preflight: {
        contract_id: "lnsat.audit.audit_ledger_database_security_preflight.v0_1",
        request_id: "req_bp0067_gateway_security",
        security_target: {
          storage_target: "audit_events.v0_1",
          table: "audit_events",
          schema_version: "audit_events.v0_1",
        },
        persistence_preflight_ref: {
          contract_id: "lnsat.audit.audit_ledger_writer_persistence_preflight.v0_1",
          request_id: "req_bp0067_gateway_security",
          storage_target: "audit_events.v0_1",
        },
        policy_gate_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
          decision_id: "pol_req_bp0067_gateway_security",
          decision: "approval_required",
          requires_approval: true,
        },
        approval_request_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
          approval_request_id: "apr_bp0067_gateway_security",
          approval_status: "requested",
          approval_kind: "ledger_state_change",
          policy_gate_decision_id: "pol_req_bp0067_gateway_security",
        },
        writer_interface_ref: {
          contract_id: "lnsat.audit.audit_ledger_writer_interface.v0_1",
          request_id: "req_bp0067_gateway_security",
          operation: "ledger.record.append",
        },
        migration_artifact_refs: {
          sql_artifact:
            "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
          manifest_artifact:
            "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
          static_checker: "scripts/check-audit-ledger-migrations.mjs",
          source_packet_refs: ["BP-0039", "BP-0040", "BP-0044", "BP-0045", "BP-0052"],
        },
        isolation_model: {
          mode: "postgresql_rls",
          approved_equivalent_isolation_ref: null,
          deny_by_default: true,
          bypass_rls_forbidden: true,
        },
        tenant_project_scope: {
          required_row_scope_fields: ["tenant_id", "project_id"],
          missing_scope_behavior: "fail_closed",
        },
        role_boundaries: {
          writer_role: {
            allowed_grants: ["insert_audit_events", "select_idempotency_lookup_scoped"],
            forbidden_grants: expect.arrayContaining([
              "update",
              "delete",
              "truncate",
              "superuser",
              "bypassrls",
              "unscoped_select",
            ]),
          },
          select_role: {
            allowed_grants: ["select_scoped_audit_events"],
            forbidden_grants: expect.arrayContaining([
              "insert",
              "update",
              "delete",
              "truncate",
              "superuser",
              "bypassrls",
              "unscoped_select",
            ]),
          },
          migration_role: {
            allowed_grants: ["approved_migration_execution_only"],
            forbidden_grants: expect.arrayContaining([
              "runtime_writer_use",
              "unapproved_ddl",
              "superuser",
              "bypassrls",
            ]),
          },
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });

    if (!response.ok) {
      throw new Error("expected successful database security preflight inspection");
    }

    expect(response.test_requirements_before_live_scope).toEqual([
      "static_security_preflight_check",
      "rls_policy_or_equivalent_isolation_test",
      "tenant_project_scope_enforcement_test",
      "writer_role_grant_test",
      "select_role_grant_test",
      "deny_by_default_no_public_access_test",
      "no_bypassrls_or_superuser_writer_test",
    ]);
    expect(response.source_refs).toEqual(
      expect.arrayContaining([
        "packet:BP-0044",
        "packet:BP-0045",
        "packet:BP-0058",
        "packet:BP-0059",
        "packet:BP-0065",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "apps/api/src/audit-ledger-writer-persistence-preflight.ts",
      ]),
    );
  });

  it("fails closed when BP-0059 persistence preflight evidence is missing", async () => {
    const response = await inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest(
      {
        request_id: "req_bp0067_missing_persistence",
        actor_id: "agent.codex",
        session_id: "sess_bp0067_0001",
        approval_evidence: { mode: "valid" },
        security_evidence: { mode: "missing_persistence_preflight" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      persistence_errors: [],
      security_errors: [
        {
          code: "audit_ledger_database_security_preflight.invalid_request",
          path: "/raw_rejected_value",
        },
        {
          code: "audit_ledger_database_security_preflight.persistence_preflight_required",
          path: "/persistence_preflight",
        },
      ],
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("drop table audit_events");
  });

  it("fails closed when isolation evidence is invalid", async () => {
    const response = await inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest(
      {
        request_id: "req_bp0067_bad_isolation",
        actor_id: "agent.codex",
        session_id: "sess_bp0067_0001",
        approval_evidence: { mode: "valid" },
        security_evidence: { mode: "invalid_isolation" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      security_errors: [
        {
          code: "audit_ledger_database_security_preflight.rls_or_equivalent_required",
          path: "/isolation_model/mode",
        },
        {
          code: "audit_ledger_database_security_preflight.grants_deny_by_default_required",
          path: "/isolation_model",
        },
      ],
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("fails closed when tenant scope, grants, or tests are unsafe", async () => {
    const response = await inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest(
      {
        request_id: "req_bp0067_unsafe_boundary",
        actor_id: "agent.codex",
        session_id: "sess_bp0067_0001",
        approval_evidence: { mode: "valid" },
        security_evidence: { mode: "unsafe_scope_roles_tests" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      security_errors: expect.arrayContaining([
        {
          code: "audit_ledger_database_security_preflight.tenant_project_scope_required",
          path: "/tenant_project_scope/required_row_scope_fields",
          message:
            "future rows must carry tenant_id and project_id scope fields or approved equivalent isolation.",
          severity: "error",
        },
        {
          code: "audit_ledger_database_security_preflight.grants_deny_by_default_required",
          path: "/role_boundaries/writer_role/forbidden_grants",
          message: "role boundary must deny dangerous or unscoped grants by default.",
          severity: "error",
        },
        {
          code: "audit_ledger_database_security_preflight.tests_required",
          path: "/test_requirements",
          message:
            "security preflight must require static, RLS/equivalent, scope, role, and deny-by-default tests.",
          severity: "error",
        },
      ]),
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("fails closed when live execution or side effects appear", async () => {
    const response = await inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest(
      {
        request_id: "req_bp0067_live_execution",
        actor_id: "agent.codex",
        session_id: "sess_bp0067_0001",
        approval_evidence: { mode: "valid" },
        security_evidence: { mode: "live_execution_side_effects" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      security_errors: [
        {
          code: "audit_ledger_database_security_preflight.live_execution_forbidden",
          path: "/live_execution_allowed",
        },
        {
          code: "audit_ledger_database_security_preflight.side_effects_forbidden",
          path: "/side_effects",
        },
      ],
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("database_write");
  });

  it("fails closed when delegated persistence preflight evidence is invalid", async () => {
    const response = await inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest(
      {
        request_id: "req_bp0067_bad_persistence",
        actor_id: "agent.codex",
        session_id: "sess_bp0067_0001",
        approval_evidence: { mode: "valid" },
        persistence_evidence: { mode: "missing_migration_artifacts" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      persistence_errors: [
        {
          code: "audit_ledger_persistence_preflight.migration_artifact_unverified",
          path: "/migration_artifact_refs/source_packet_refs",
        },
      ],
      security_errors: [],
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("fails closed for malformed requests without raw rejected value echo", async () => {
    const response = await inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest(
      {
        request_id: "req_bp0067_bad_shape",
        command: "psql $DATABASE_URL -c 'alter role app superuser'",
        approval_evidence: { mode: "valid" },
      },
      { now },
    );

    expect(response).toEqual({
      ok: false,
      contract_id: auditLedgerDatabaseSecurityPreflightGatewayContract.contract_id,
      request_id: "req_bp0067_bad_shape",
      inspected_at: "2026-05-05T00:00:00.000Z",
      source_docs: expect.any(Array),
      request_errors: [
        {
          code: "audit_ledger_database_security_preflight_gateway.unexpected_field",
          path: "/command",
          message: "Unexpected audit ledger database security preflight request field.",
          severity: "error",
        },
      ],
      persistence_request_errors: [],
      writer_request_errors: [],
      writer_errors: [],
      persistence_errors: [],
      security_errors: [],
      preflight: null,
      persistence_preflight_ref: null,
      policy_gate_ref: null,
      approval_request_ref: null,
      writer_interface_ref: null,
      migration_artifact_refs: null,
      isolation_model: null,
      tenant_project_scope: null,
      role_boundaries: null,
      test_requirements_before_live_scope: [],
      source_refs: [],
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("alter role");
    expect(JSON.stringify(response)).not.toContain("superuser");
  });

  it("fails closed for invalid scalar fields without raw rejected value echo", async () => {
    const response = await inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest(
      {
        request_id: ["req_bad"],
        actor_id: { secret: "secret:lnsat/demo/db-token" },
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
          code: "audit_ledger_database_security_preflight_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "audit_ledger_database_security_preflight_gateway.invalid_actor_id",
          path: "/actor_id",
        },
        {
          code: "audit_ledger_database_security_preflight_gateway.invalid_session_id",
          path: "/session_id",
        },
      ],
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("req_bad");
    expect(JSON.stringify(response)).not.toContain("secret:lnsat/demo/db-token");
  });

  it("fails closed when delegated approval evidence is invalid before security preflight", async () => {
    const response = await inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest(
      {
        request_id: "req_bp0067_mismatched_approval",
        actor_id: "agent.codex",
        session_id: "sess_bp0067_0001",
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
      persistence_errors: [],
      security_errors: [],
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("pol_bp0054_mismatched_approval");
  });
});
