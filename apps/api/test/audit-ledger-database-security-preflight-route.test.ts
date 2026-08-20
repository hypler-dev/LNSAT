import { afterAll, describe, expect, it } from "vitest";
import {
  auditLedgerDatabaseSecurityPreflightGatewayContract,
  buildApiGateway,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

describe("@lnsat/api BP-0068 audit ledger database security preflight route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects database security preflight evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: auditLedgerDatabaseSecurityPreflightGatewayContract.method,
      url: auditLedgerDatabaseSecurityPreflightGatewayContract.path,
      payload: {
        request_id: "req_bp0068_route_security",
        actor_id: "agent.codex",
        session_id: "sess_bp0068_0001",
        approval_evidence: { mode: "valid" },
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      contract_id: auditLedgerDatabaseSecurityPreflightGatewayContract.contract_id,
      request_id: "req_bp0068_route_security",
      inspected_at: "2026-05-05T00:00:00.000Z",
      preflight: {
        contract_id: "lnsat.audit.audit_ledger_database_security_preflight.v0_1",
        request_id: "req_bp0068_route_security",
        security_target: {
          storage_target: "audit_events.v0_1",
          table: "audit_events",
          schema_version: "audit_events.v0_1",
        },
        persistence_preflight_ref: {
          contract_id: "lnsat.audit.audit_ledger_writer_persistence_preflight.v0_1",
          request_id: "req_bp0068_route_security",
          storage_target: "audit_events.v0_1",
        },
        policy_gate_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
          decision_id: "pol_req_bp0068_route_security",
          decision: "approval_required",
          requires_approval: true,
        },
        approval_request_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
          approval_request_id: "apr_bp0068_route_security",
          approval_status: "requested",
          approval_kind: "ledger_state_change",
          policy_gate_decision_id: "pol_req_bp0068_route_security",
        },
        writer_interface_ref: {
          contract_id: "lnsat.audit.audit_ledger_writer_interface.v0_1",
          request_id: "req_bp0068_route_security",
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
    expect(body.test_requirements_before_live_scope).toEqual([
      "static_security_preflight_check",
      "rls_policy_or_equivalent_isolation_test",
      "tenant_project_scope_enforcement_test",
      "writer_role_grant_test",
      "select_role_grant_test",
      "deny_by_default_no_public_access_test",
      "no_bypassrls_or_superuser_writer_test",
    ]);
    expect(body.source_refs).toEqual(
      expect.arrayContaining([
        "packet:BP-0044",
        "packet:BP-0045",
        "packet:BP-0058",
        "packet:BP-0059",
        "packet:BP-0065",
      ]),
    );
    expect(body.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "apps/api/src/audit-ledger-database-security-preflight.ts",
      ]),
    );
  });

  it("maps malformed Gateway requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerDatabaseSecurityPreflightGatewayContract.method,
      url: auditLedgerDatabaseSecurityPreflightGatewayContract.path,
      payload: {
        request_id: "req_bp0068_bad_route_shape",
        command: "psql $DATABASE_URL -c 'alter role app superuser'",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      contract_id: auditLedgerDatabaseSecurityPreflightGatewayContract.contract_id,
      request_id: "req_bp0068_bad_route_shape",
      request_errors: [
        {
          code: "audit_ledger_database_security_preflight_gateway.unexpected_field",
          path: "/command",
        },
      ],
      preflight: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("psql");
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("alter role");
    expect(response.body).not.toContain("superuser");
  });

  it("maps invalid database security evidence to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerDatabaseSecurityPreflightGatewayContract.method,
      url: auditLedgerDatabaseSecurityPreflightGatewayContract.path,
      payload: {
        request_id: "req_bp0068_invalid_security",
        actor_id: "agent.codex",
        session_id: "sess_bp0068_0001",
        approval_evidence: { mode: "valid" },
        security_evidence: { mode: "missing_persistence_preflight" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0068_invalid_security",
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
    expect(response.body).not.toContain("psql");
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("drop table audit_events");
  });

  it("maps invalid delegated approval evidence to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerDatabaseSecurityPreflightGatewayContract.method,
      url: auditLedgerDatabaseSecurityPreflightGatewayContract.path,
      payload: {
        request_id: "req_bp0068_mismatched_approval",
        actor_id: "agent.codex",
        session_id: "sess_bp0068_0001",
        approval_evidence: { mode: "mismatched_policy_gate" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0068_mismatched_approval",
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
    expect(response.body).not.toContain("pol_bp0054_mismatched_approval");
  });
});
