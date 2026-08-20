import { describe, expect, it } from "vitest";
import {
  createLnsatReadOnlyMcpServer,
  inspectAuditLedgerMigrationApprovalPreviewThroughMcpAdapterContract,
  mcpAuditLedgerMigrationApprovalPreviewToolContract,
  mcpAuditLedgerMigrationApprovalPreviewToolRegistration,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

describe("@lnsat/mcp BP-0050 audit ledger migration approval preview adapter contract", () => {
  it("exposes read-only migration approval preview metadata without side effects", () => {
    expect(mcpAuditLedgerMigrationApprovalPreviewToolContract).toEqual({
      tool: "lnsat.audit.ledger.migration.approval_preview.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.audit_ledger_migration_approval_preview.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/audit-ledger/migrations/approval-preview/inspect",
      authority: ["lnsat.gateway.audit_ledger_migration_approval_preview.v0_1"],
      source_docs: [
        "docs/architecture/POLICY_AND_AUDIT.md",
        "docs/architecture/AUDIT_LEDGER_MIGRATION_ARTIFACTS.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
        "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
        "scripts/check-audit-ledger-migrations.mjs",
        "fixtures/audit/migration-review.md",
      ],
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("delegates valid approval preview inspection to the Gateway contract", async () => {
    const response =
      await inspectAuditLedgerMigrationApprovalPreviewThroughMcpAdapterContract(
        {
          request_id: "req_bp0050_mcp_migration_preview",
          actor_id: "agent.codex",
          session_id: "sess_bp0050_0001",
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      gateway_contract_id: "lnsat.gateway.audit_ledger_migration_approval_preview.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0050_mcp_migration_preview",
        inspected_at: "2026-05-05T00:00:00.000Z",
        operation: "writer.migrate",
        policy_gate_decision: {
          operation: "writer.migrate",
          decision: "approval_required",
          requires_approval: true,
          reason_codes: ["policy.audit_ledger_migration_requires_approval"],
          side_effects: [],
        },
        approval_request: {
          approval_request_id: "apr_bp0050_mcp_migration_preview",
          approval_kind: "audit_ledger_migration",
          approval_status: "requested",
          side_effects: [],
        },
        artifact_refs: {
          sql_artifact:
            "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
          manifest_artifact:
            "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
          static_checker: "scripts/check-audit-ledger-migrations.mjs",
        },
        static_checker_required: {
          command: "npm run audit:migrations:check",
          source_ref: "scripts/check-audit-ledger-migrations.mjs",
          side_effects: [],
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response =
      await inspectAuditLedgerMigrationApprovalPreviewThroughMcpAdapterContract(
        {
          request_id: "req_bp0050_bad_shape",
          command: "psql $DATABASE_URL -f migration.sql",
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: "req_bp0050_bad_shape",
        inspected_at: "2026-05-05T00:00:00.000Z",
        request_errors: [
          expect.objectContaining({
            code: "audit_ledger_migration_approval_preview.unexpected_field",
            path: "/command",
          }),
        ],
        preview: null,
        operation: null,
        policy_gate_decision: null,
        approval_request: null,
        artifact_refs: null,
        static_checker_required: null,
        live_execution_allowed: false,
        raw_input_content: "withheld",
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("migration.sql");
  });

  it("exposes read-only registration metadata for BP-0051", () => {
    expect(mcpAuditLedgerMigrationApprovalPreviewToolRegistration).toMatchObject({
      name: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      title: "Inspect audit ledger migration approval preview",
      description:
        "Read-only audit ledger migration approval preview inspection through the LNSAT Gateway contract.",
      gateway_contract_id: "lnsat.gateway.audit_ledger_migration_approval_preview.v0_1",
      authority: ["lnsat.gateway.audit_ledger_migration_approval_preview.v0_1"],
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("registers the read-only adapter on local MCP server in BP-0051", async () => {
    const server = createLnsatReadOnlyMcpServer({ now: () => now });

    expect(server.listTools().tools.map((tool) => tool.name)).toContain(
      mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
    );

    const response = await server.callTool({
      name: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      arguments: {
        request_id: "req_bp0051_registered_mcp_migration_preview",
        actor_id: "agent.codex",
        session_id: "sess_bp0051_0001",
      },
    });

    expect(response).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.audit_ledger_migration_approval_preview.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0051_registered_mcp_migration_preview",
              operation: "writer.migrate",
              policy_gate_decision: {
                operation: "writer.migrate",
                decision: "approval_required",
                requires_approval: true,
              },
              approval_request: {
                approval_kind: "audit_ledger_migration",
              },
              artifact_refs: {
                sql_artifact:
                  "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
                manifest_artifact:
                  "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
                static_checker: "scripts/check-audit-ledger-migrations.mjs",
              },
              static_checker_required: {
                command: "npm run audit:migrations:check",
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

  it("keeps registered malformed calls fail-closed without raw rejected value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({ now: () => now });
    const response = await server.callTool({
      name: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      arguments: {
        request_id: "req_bp0051_registered_bad_shape",
        command: "psql $DATABASE_URL -f migration.sql",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0051_registered_bad_shape",
              request_errors: [
                expect.objectContaining({
                  code: "audit_ledger_migration_approval_preview.unexpected_field",
                  path: "/command",
                }),
              ],
              raw_input_content: "withheld",
              live_execution_allowed: false,
              side_effects: [],
            },
            live_execution_allowed: false,
            side_effects: [],
          },
        },
      ],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("migration.sql");
  });
});
