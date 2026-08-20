import { describe, expect, it } from "vitest";
import {
  createLnsatReadOnlyMcpServer,
  inspectAuditLedgerDatabaseSecurityPreflightThroughMcpAdapterContract,
  mcpAuditLedgerDatabaseSecurityPreflightToolContract,
  mcpAuditLedgerMigrationApprovalPreviewToolContract,
  mcpAuditLedgerPersistenceReadinessToolContract,
  mcpAuditLedgerPersistenceScopeRequestToolContract,
  mcpAuditLedgerWriterInterfaceToolContract,
  mcpAuditLedgerWriterPersistencePreflightToolContract,
  mcpBuildPacketStateToolContract,
  mcpAdapterInvocationPreflightToolContract,
  mcpAdapterInvocationAuthorizationBundleToolContract,
  mcpAdapterInvocationResultToolContract,
  mcpCapabilityBrokerRequestToolContract,
  mcpOnboardingContextInspectionToolContract,
  mcpOnboardingProfileInspectionToolContract,
  mcpPacketInspectionToolContract,
  mcpRuntimeAdapterImplementationScopeToolContract,
  mcpRuntimeAdapterImplementationAuthorizationRequestToolContract,
  mcpRuntimeAdapterImplementationApprovalGateToolContract,
  mcpRuntimeAdapterImplementationDryRunEvidenceToolContract,
  mcpKnowledgeSurfaceToolContract,
  mcpAgentContextFirewallToolContract,
  mcpRuntimeAdapterImplementationPlanToolContract,
  mcpRuntimeAdapterReadinessGateToolContract,
  mcpServiceDatabaseInventoryToolContract,
  mcpSubstrateAdapterManifestToolContract,
  mcpSubstrateControlIntentToolContract,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

describe("@lnsat/mcp BP-0069 audit ledger database security preflight MCP adapter contract", () => {
  it("exposes read-only database security preflight metadata without side effects", () => {
    expect(mcpAuditLedgerDatabaseSecurityPreflightToolContract).toEqual({
      tool: "lnsat.audit.ledger.database_security_preflight.inspect",
      status: "contract_only",
      gateway_contract_id:
        "lnsat.gateway.audit_ledger_database_security_preflight.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/audit-ledger/database-security/preflight/inspect",
      authority: ["lnsat.gateway.audit_ledger_database_security_preflight.v0_1"],
      source_docs: [
        "docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
        "docs/architecture/POLICY_AND_AUDIT.md",
        "docs/architecture/DATA_MODEL.md",
        "docs/architecture/MCP_ADAPTER_DESIGN.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/audit/src/index.ts",
        "apps/api/src/audit-ledger-writer-persistence-preflight.ts",
        "apps/api/src/audit-ledger-database-security-preflight.ts",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/mcp/src/index.ts",
      ],
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("delegates valid database security preflight inspection to the Gateway contract", async () => {
    const response =
      await inspectAuditLedgerDatabaseSecurityPreflightThroughMcpAdapterContract(
        {
          request_id: "req_bp0069_mcp_database_security",
          actor_id: "agent.codex",
          session_id: "sess_bp0069_0001",
          approval_evidence: { mode: "valid" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.audit_ledger_database_security_preflight.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0069_mcp_database_security",
        inspected_at: "2026-05-05T00:00:00.000Z",
        preflight: {
          contract_id: "lnsat.audit.audit_ledger_database_security_preflight.v0_1",
          security_target: {
            storage_target: "audit_events.v0_1",
            table: "audit_events",
            schema_version: "audit_events.v0_1",
          },
          persistence_preflight_ref: {
            contract_id: "lnsat.audit.audit_ledger_writer_persistence_preflight.v0_1",
            storage_target: "audit_events.v0_1",
          },
          migration_artifact_refs: {
            sql_artifact:
              "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
            manifest_artifact:
              "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
            static_checker: "scripts/check-audit-ledger-migrations.mjs",
            source_packet_refs: expect.arrayContaining([
              "BP-0039",
              "BP-0040",
              "BP-0044",
              "BP-0045",
              "BP-0052",
            ]),
          },
          isolation_model: {
            mode: "postgresql_rls",
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
          test_requirements_before_live_scope: [
            "static_security_preflight_check",
            "rls_policy_or_equivalent_isolation_test",
            "tenant_project_scope_enforcement_test",
            "writer_role_grant_test",
            "select_role_grant_test",
            "deny_by_default_no_public_access_test",
            "no_bypassrls_or_superuser_writer_test",
          ],
          live_execution_allowed: false,
          side_effects: [],
        },
        source_refs: expect.arrayContaining([
          "packet:BP-0044",
          "packet:BP-0045",
          "packet:BP-0058",
          "packet:BP-0059",
          "packet:BP-0065",
        ]),
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response =
      await inspectAuditLedgerDatabaseSecurityPreflightThroughMcpAdapterContract(
        {
          request_id: "req_bp0069_bad_shape",
          command:
            "psql $DATABASE_URL -c 'alter table audit_events disable row level security'",
          approval_evidence: { mode: "valid" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: "req_bp0069_bad_shape",
        request_errors: [
          expect.objectContaining({
            code: "audit_ledger_database_security_preflight_gateway.unexpected_field",
            path: "/command",
          }),
        ],
        preflight: null,
        live_execution_allowed: false,
        raw_input_content: "withheld",
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("disable row level security");
  });

  it("fails closed for invalid database security evidence without raw rejected value echo", async () => {
    const response =
      await inspectAuditLedgerDatabaseSecurityPreflightThroughMcpAdapterContract(
        {
          request_id: "req_bp0069_bad_security",
          actor_id: "agent.codex",
          session_id: "sess_bp0069_0001",
          approval_evidence: { mode: "valid" },
          security_evidence: { mode: "unsafe_scope_roles_tests" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0069_bad_security",
        request_errors: [],
        security_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "audit_ledger_database_security_preflight.tenant_project_scope_required",
          }),
          expect.objectContaining({
            code: "audit_ledger_database_security_preflight.grants_deny_by_default_required",
          }),
          expect.objectContaining({
            code: "audit_ledger_database_security_preflight.tests_required",
          }),
        ]),
        preflight: null,
        raw_input_content: "withheld",
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("unscoped_select_allowed");
    expect(JSON.stringify(response)).not.toContain("unapproved_ddl");
  });

  it("fails closed for invalid delegated approval evidence without secret-like echo", async () => {
    const response =
      await inspectAuditLedgerDatabaseSecurityPreflightThroughMcpAdapterContract(
        {
          request_id: "req_bp0069_invalid_approval",
          approval_evidence: { mode: "secret:lnsat/demo/api-token" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0069_invalid_approval",
        request_errors: [
          {
            code: "audit_ledger_database_security_preflight_gateway.invalid_approval_evidence",
            path: "/approval_evidence/mode",
            severity: "error",
          },
        ],
        preflight: null,
        raw_input_content: "withheld",
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("secret:lnsat/demo/api-token");
  });

  it("registers the adapter on the local read-only MCP server", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const expectedRegisteredTools = [
      mcpPacketInspectionToolContract.tool,
      "lnsat.project.state.inspect.v0_1",
      mcpBuildPacketStateToolContract.tool,
      mcpOnboardingProfileInspectionToolContract.tool,
      mcpOnboardingContextInspectionToolContract.tool,
      mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      mcpAuditLedgerWriterInterfaceToolContract.tool,
      mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      mcpAuditLedgerPersistenceReadinessToolContract.tool,
      mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      "lnsat.hardware.inventory.inspect",
      "lnsat.hardware.allocation.recommendation.inspect",
      "lnsat.performance.telemetry.inspect",
      mcpServiceDatabaseInventoryToolContract.tool,
      mcpSubstrateControlIntentToolContract.tool,
      mcpCapabilityBrokerRequestToolContract.tool,
      mcpSubstrateAdapterManifestToolContract.tool,
      mcpAdapterInvocationPreflightToolContract.tool,
      mcpAdapterInvocationResultToolContract.tool,
      mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      mcpRuntimeAdapterReadinessGateToolContract.tool,
      mcpRuntimeAdapterImplementationScopeToolContract.tool,
      mcpRuntimeAdapterImplementationPlanToolContract.tool,
      mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      mcpKnowledgeSurfaceToolContract.tool,
      mcpAgentContextFirewallToolContract.tool,
    ];

    expect(localServer.listTools().tools.map((tool) => tool.name)).toEqual(
      expectedRegisteredTools,
    );
    await expect(
      localServer.callTool({
        name: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
        arguments: {
          request_id: "req_bp0069_unregistered_local",
          approval_evidence: { mode: "valid" },
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      tool: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.audit_ledger_database_security_preflight.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0069_unregistered_local",
              preflight: {
                contract_id:
                  "lnsat.audit.audit_ledger_database_security_preflight.v0_1",
                live_execution_allowed: false,
                side_effects: [],
              },
              live_execution_allowed: false,
              side_effects: [],
            },
            live_execution_allowed: false,
            side_effects: [],
          },
        },
      ],
      side_effects: [],
    });
  });

  it("keeps registered malformed local calls fail-closed without raw rejected value echo", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });

    const response = await localServer.callTool({
      name: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0070_registered_local_bad_shape",
        command:
          "psql $DATABASE_URL -c 'alter table audit_events disable row level security'",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0070_registered_local_bad_shape",
              request_errors: [
                expect.objectContaining({
                  code: "audit_ledger_database_security_preflight_gateway.unexpected_field",
                  path: "/command",
                }),
              ],
              preflight: null,
              raw_input_content: "withheld",
              live_execution_allowed: false,
              side_effects: [],
            },
            live_execution_allowed: false,
            side_effects: [],
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("disable row level security");
  });
});
