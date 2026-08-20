import { describe, expect, it } from "vitest";
import {
  auditLedgerPersistenceReadinessGatewayContract,
  inspectAuditLedgerPersistenceReadinessGatewayRequest,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

describe("@lnsat/api BP-0073 audit ledger persistence readiness Gateway contract", () => {
  it("returns BP-0071 readiness gate evidence through Gateway inspection", async () => {
    const response = await inspectAuditLedgerPersistenceReadinessGatewayRequest(
      {
        request_id: "req_bp0073_gateway_readiness",
        actor_id: "agent.codex",
        session_id: "sess_bp0073_0001",
        approval_evidence: { mode: "valid" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: auditLedgerPersistenceReadinessGatewayContract.contract_id,
      request_id: "req_bp0073_gateway_readiness",
      inspected_at: "2026-05-05T00:00:00.000Z",
      gate: {
        contract_id:
          "lnsat.audit.audit_ledger_persistence_implementation_readiness_gate.v0_1",
        request_id: "req_bp0073_gateway_readiness",
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
            request_id: "req_bp0073_gateway_readiness",
            storage_target: "audit_events.v0_1",
          },
          database_security_preflight_ref: {
            contract_id: "lnsat.audit.audit_ledger_database_security_preflight.v0_1",
            request_id: "req_bp0073_gateway_readiness",
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
              packet: "BP-0067",
              layer: "gateway_contract",
              source_ref:
                "apps/api/src/audit-ledger-database-security-preflight.ts:inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest",
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

    if (!response.ok) {
      throw new Error("expected successful persistence readiness inspection");
    }

    expect(response.minimum_source_evidence_before_live_scope).toEqual(
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
    expect(response.source_refs).toEqual(
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
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "apps/api/src/audit-ledger-database-security-preflight.ts",
      ]),
    );
  });

  it("fails closed when delegated BP-0067 database security evidence is invalid", async () => {
    const response = await inspectAuditLedgerPersistenceReadinessGatewayRequest(
      {
        request_id: "req_bp0073_invalid_security",
        actor_id: "agent.codex",
        session_id: "sess_bp0073_0001",
        approval_evidence: { mode: "valid" },
        security_evidence: { mode: "invalid_isolation" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
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
  });

  it("fails closed when readiness gate evidence omits BP-0065 database security evidence", async () => {
    const response = await inspectAuditLedgerPersistenceReadinessGatewayRequest(
      {
        request_id: "req_bp0073_missing_database_security",
        actor_id: "agent.codex",
        session_id: "sess_bp0073_0001",
        approval_evidence: { mode: "valid" },
        readiness_evidence: { mode: "missing_database_security" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
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
    expect(JSON.stringify(response)).not.toContain("postgres://inline-secret");
  });

  it("fails closed when minimum source evidence is incomplete", async () => {
    const response = await inspectAuditLedgerPersistenceReadinessGatewayRequest(
      {
        request_id: "req_bp0073_incomplete_source_evidence",
        actor_id: "agent.codex",
        session_id: "sess_bp0073_0001",
        approval_evidence: { mode: "valid" },
        readiness_evidence: { mode: "incomplete_minimum_source_evidence" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      readiness_errors: [
        {
          code: "audit_ledger_persistence_readiness_gate.minimum_source_evidence_required",
          path: "/minimum_source_evidence",
        },
      ],
      gate: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("fails closed when live execution or side effects appear", async () => {
    const response = await inspectAuditLedgerPersistenceReadinessGatewayRequest(
      {
        request_id: "req_bp0073_live_execution",
        actor_id: "agent.codex",
        session_id: "sess_bp0073_0001",
        approval_evidence: { mode: "valid" },
        readiness_evidence: { mode: "live_execution_side_effects" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      readiness_errors: [
        {
          code: "audit_ledger_persistence_readiness_gate.live_execution_forbidden",
          path: "/live_execution_allowed",
        },
        {
          code: "audit_ledger_persistence_readiness_gate.side_effects_forbidden",
          path: "/side_effects",
        },
      ],
      gate: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("database_write");
  });

  it("fails closed for malformed requests without raw rejected value echo", async () => {
    const response = await inspectAuditLedgerPersistenceReadinessGatewayRequest(
      {
        request_id: "req_bp0073_bad_shape",
        command: "psql $DATABASE_URL -c 'alter role app superuser'",
        approval_evidence: { mode: "valid" },
      },
      { now },
    );

    expect(response).toEqual({
      ok: false,
      contract_id: auditLedgerPersistenceReadinessGatewayContract.contract_id,
      request_id: "req_bp0073_bad_shape",
      inspected_at: "2026-05-05T00:00:00.000Z",
      source_docs: expect.any(Array),
      request_errors: [
        {
          code: "audit_ledger_persistence_readiness_gateway.unexpected_field",
          path: "/command",
          message: "Unexpected audit ledger persistence readiness request field.",
          severity: "error",
        },
      ],
      database_security_request_errors: [],
      persistence_request_errors: [],
      writer_request_errors: [],
      writer_errors: [],
      persistence_errors: [],
      security_errors: [],
      readiness_errors: [],
      gate: null,
      readiness: null,
      reviewed_source_chain: null,
      minimum_source_evidence_before_live_scope: [],
      security_requirements: null,
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

  it("fails closed for invalid delegated approval evidence", async () => {
    const response = await inspectAuditLedgerPersistenceReadinessGatewayRequest(
      {
        request_id: "req_bp0073_mismatched_approval",
        actor_id: "agent.codex",
        session_id: "sess_bp0073_0001",
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
      security_errors: [],
      readiness_errors: [],
      gate: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("pol_bp0054_mismatched_approval");
  });
});
