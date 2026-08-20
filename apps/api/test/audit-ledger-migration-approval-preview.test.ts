import { describe, expect, it } from "vitest";
import {
  auditLedgerMigrationApprovalPreviewGatewayContract,
  inspectAuditLedgerMigrationApprovalPreviewGatewayRequest,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

describe("@lnsat/api BP-0048 audit ledger migration approval preview gateway contract", () => {
  it("returns deterministic BP-0046 migration approval preview evidence", () => {
    const response = inspectAuditLedgerMigrationApprovalPreviewGatewayRequest(
      {
        request_id: "req_bp0048_gateway_migration_preview",
        actor_id: "agent.codex",
        session_id: "sess_bp0048_0001",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: auditLedgerMigrationApprovalPreviewGatewayContract.contract_id,
      request_id: "req_bp0048_gateway_migration_preview",
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
        approval_request_id: "apr_bp0048_gateway_migration_preview",
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

    if (!response.ok) {
      throw new Error("expected successful migration approval preview inspection");
    }

    expect(response.preview).toMatchObject({
      contract_id: "lnsat.policy.audit_ledger_migration_approval_preview.v0_1",
      preview_id: "aprev_bp0048_gateway_migration_preview",
      operation: "writer.migrate",
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
        "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
        "scripts/check-audit-ledger-migrations.mjs",
      ]),
    );
  });

  it("uses deterministic defaults for empty Gateway requests", () => {
    const response = inspectAuditLedgerMigrationApprovalPreviewGatewayRequest(
      {},
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      request_id: "req_bp0048_audit_events_migration_preview",
      operation: "writer.migrate",
      policy_gate_decision: {
        decision: "approval_required",
      },
      approval_request: {
        approval_kind: "audit_ledger_migration",
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed Gateway requests without raw rejected value echo", () => {
    const response = inspectAuditLedgerMigrationApprovalPreviewGatewayRequest(
      {
        request_id: "req_bp0048_bad_shape",
        command: "psql $DATABASE_URL -f migration.sql",
      },
      { now },
    );

    expect(response).toEqual({
      ok: false,
      contract_id: auditLedgerMigrationApprovalPreviewGatewayContract.contract_id,
      request_id: "req_bp0048_bad_shape",
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
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("migration.sql");
  });

  it("fails closed for invalid scalar fields without raw rejected value echo", () => {
    const response = inspectAuditLedgerMigrationApprovalPreviewGatewayRequest(
      {
        request_id: ["req_bad"],
        actor_id: { secret: "secret:lnsat/demo/api-token" },
        session_id: 7,
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: null,
      request_errors: [
        {
          code: "audit_ledger_migration_approval_preview.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "audit_ledger_migration_approval_preview.invalid_actor_id",
          path: "/actor_id",
        },
        {
          code: "audit_ledger_migration_approval_preview.invalid_session_id",
          path: "/session_id",
        },
      ],
      preview: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("req_bad");
    expect(JSON.stringify(response)).not.toContain("secret:lnsat/demo/api-token");
  });
});
