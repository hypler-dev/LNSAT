import { afterAll, describe, expect, it } from "vitest";
import {
  auditLedgerPersistenceReadinessGatewayContract,
  buildApiGateway,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

describe("@lnsat/api BP-0074 audit ledger persistence readiness route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects persistence readiness evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: auditLedgerPersistenceReadinessGatewayContract.method,
      url: auditLedgerPersistenceReadinessGatewayContract.path,
      payload: {
        request_id: "req_bp0074_route_readiness",
        actor_id: "agent.codex",
        session_id: "sess_bp0074_0001",
        approval_evidence: { mode: "valid" },
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      contract_id: auditLedgerPersistenceReadinessGatewayContract.contract_id,
      request_id: "req_bp0074_route_readiness",
      inspected_at: "2026-05-05T00:00:00.000Z",
      gate: {
        contract_id:
          "lnsat.audit.audit_ledger_persistence_implementation_readiness_gate.v0_1",
        request_id: "req_bp0074_route_readiness",
        readiness: {
          status: "source_ready_for_later_scope_request_only",
          live_persistence_scope_allowed: false,
          next_scope_requires_explicit_packet: true,
          gateway_is_security_boundary: true,
          mcp_is_adapter_only: true,
          state_changing_mcp_tools_allowed: false,
        },
        reviewed_source_chain: {
          migration_artifacts: {
            sql_artifact:
              "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
            manifest_artifact:
              "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
            static_checker: "scripts/check-audit-ledger-migrations.mjs",
            source_packet_refs: ["BP-0039", "BP-0040", "BP-0044", "BP-0045", "BP-0052"],
          },
          writer_persistence_preflight_ref: {
            contract_id: "lnsat.audit.audit_ledger_writer_persistence_preflight.v0_1",
            request_id: "req_bp0074_route_readiness",
            storage_target: "audit_events.v0_1",
          },
          database_security_preflight_ref: {
            contract_id: "lnsat.audit.audit_ledger_database_security_preflight.v0_1",
            request_id: "req_bp0074_route_readiness",
            storage_target: "audit_events.v0_1",
          },
          layer_refs: expect.arrayContaining([
            {
              packet: "BP-0065",
              layer: "audit_helper",
              source_ref:
                "packages/audit/src/index.ts:createAuditLedgerDatabaseSecurityPreflightEvidence",
            },
            {
              packet: "BP-0068",
              layer: "fastify_route",
              source_ref:
                "apps/api/src/server.ts:POST /v1/audit-ledger/database-security/preflight/inspect",
            },
            {
              packet: "BP-0070",
              layer: "mcp_registration",
              source_ref:
                "packages/mcp/src/index.ts:mcpAuditLedgerDatabaseSecurityPreflightToolRegistration",
            },
          ]),
        },
        security_requirements: {
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
              allowed_grants: [
                "insert_audit_events",
                "select_idempotency_lookup_scoped",
              ],
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
          deny_by_default_required: true,
          test_requirements_before_live_scope: [
            "static_security_preflight_check",
            "rls_policy_or_equivalent_isolation_test",
            "tenant_project_scope_enforcement_test",
            "writer_role_grant_test",
            "select_role_grant_test",
            "deny_by_default_no_public_access_test",
            "no_bypassrls_or_superuser_writer_test",
          ],
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(body.minimum_source_evidence_before_live_scope).toEqual(
      expect.arrayContaining([
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
        "secret-reference-only future credential plan",
        "explicit later build packet requesting DB/writer scope through LNSAT Gateway policy and approval",
      ]),
    );
    expect(body.source_refs).toEqual(
      expect.arrayContaining([
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
      ]),
    );
    expect(body.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "apps/api/src/audit-ledger-database-security-preflight.ts",
        "apps/api/src/audit-ledger-persistence-readiness-gate.ts",
      ]),
    );
  });

  it("maps malformed Gateway requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerPersistenceReadinessGatewayContract.method,
      url: auditLedgerPersistenceReadinessGatewayContract.path,
      payload: {
        request_id: "req_bp0074_bad_route_shape",
        command: "psql $DATABASE_URL -c 'alter role app superuser'",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      contract_id: auditLedgerPersistenceReadinessGatewayContract.contract_id,
      request_id: "req_bp0074_bad_route_shape",
      request_errors: [
        {
          code: "audit_ledger_persistence_readiness_gateway.unexpected_field",
          path: "/command",
        },
      ],
      gate: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("psql");
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("alter role");
    expect(response.body).not.toContain("superuser");
  });

  it("maps invalid delegated database security evidence to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerPersistenceReadinessGatewayContract.method,
      url: auditLedgerPersistenceReadinessGatewayContract.path,
      payload: {
        request_id: "req_bp0074_invalid_security",
        actor_id: "agent.codex",
        session_id: "sess_bp0074_0001",
        approval_evidence: { mode: "valid" },
        security_evidence: { mode: "invalid_isolation" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0074_invalid_security",
      request_errors: [],
      database_security_request_errors: [],
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
      readiness_errors: [],
      gate: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("psql");
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("drop table audit_events");
  });

  it("maps invalid readiness evidence to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerPersistenceReadinessGatewayContract.method,
      url: auditLedgerPersistenceReadinessGatewayContract.path,
      payload: {
        request_id: "req_bp0074_missing_database_security",
        actor_id: "agent.codex",
        session_id: "sess_bp0074_0001",
        approval_evidence: { mode: "valid" },
        readiness_evidence: { mode: "missing_database_security" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0074_missing_database_security",
      request_errors: [],
      security_errors: [],
      readiness_errors: [
        {
          code: "audit_ledger_persistence_readiness_gate.invalid_request",
          path: "/raw_rejected_value",
        },
        {
          code: "audit_ledger_persistence_readiness_gate.database_security_preflight_required",
          path: "/database_security_preflight",
        },
      ],
      gate: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("postgres://inline-secret");
  });

  it("maps invalid delegated approval evidence to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerPersistenceReadinessGatewayContract.method,
      url: auditLedgerPersistenceReadinessGatewayContract.path,
      payload: {
        request_id: "req_bp0074_mismatched_approval",
        actor_id: "agent.codex",
        session_id: "sess_bp0074_0001",
        approval_evidence: { mode: "mismatched_policy_gate" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0074_mismatched_approval",
      request_errors: [],
      writer_errors: [
        {
          code: "audit_ledger_writer.approval_policy_mismatch",
          path: "/approval_request/policy_gate_ref/decision_id",
        },
      ],
      security_errors: [],
      readiness_errors: [],
      gate: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("pol_bp0054_mismatched_approval");
  });
});
