import { afterAll, describe, expect, it } from "vitest";
import {
  auditLedgerMigrationApprovalPreviewGatewayContract,
  buildApiGateway,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

describe("@lnsat/api BP-0049 audit ledger migration approval preview route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects migration approval preview evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: auditLedgerMigrationApprovalPreviewGatewayContract.method,
      url: auditLedgerMigrationApprovalPreviewGatewayContract.path,
      payload: {
        request_id: "req_bp0049_route_migration_preview",
        actor_id: "agent.codex",
        session_id: "sess_bp0049_0001",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      contract_id: auditLedgerMigrationApprovalPreviewGatewayContract.contract_id,
      request_id: "req_bp0049_route_migration_preview",
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
        approval_request_id: "apr_bp0049_route_migration_preview",
        approval_kind: "audit_ledger_migration",
        approval_status: "requested",
        side_effects: [],
      },
      artifact_refs: {
        sql_artifact: "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
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
    });
  });

  it("maps malformed Gateway requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerMigrationApprovalPreviewGatewayContract.method,
      url: auditLedgerMigrationApprovalPreviewGatewayContract.path,
      payload: {
        request_id: "req_bp0049_bad_route_shape",
        command: "psql $DATABASE_URL -f migration.sql",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      ok: false,
      contract_id: auditLedgerMigrationApprovalPreviewGatewayContract.contract_id,
      request_id: "req_bp0049_bad_route_shape",
      inspected_at: "2026-05-05T00:00:00.000Z",
      source_docs: expect.any(Array),
      request_errors: [
        {
          code: "audit_ledger_migration_approval_preview.unexpected_field",
          path: "/command",
          message: "Unexpected audit ledger migration approval preview request field.",
          severity: "error",
        },
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
    });
    expect(response.body).not.toContain("psql");
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("migration.sql");
  });
});
