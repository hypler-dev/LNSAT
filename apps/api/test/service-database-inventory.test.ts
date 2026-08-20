import { defaultMigrationPlan } from "@lnsat/packets";
import { describe, expect, it } from "vitest";
import {
  inspectServiceDatabaseInventoryGatewayRequest,
  serviceDatabaseInventoryGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-06T00:00:00.000Z");

describe("@lnsat/api BP-0091 service/database inventory Gateway contract", () => {
  it("returns BP-0090 source-only service/database inventory evidence through Gateway", async () => {
    const response = await inspectServiceDatabaseInventoryGatewayRequest(
      {
        request_id: "req_bp0091_service_database_inventory",
        inventory_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0091",
              summary: "Gateway wraps service database inventory evidence",
            },
          ],
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: serviceDatabaseInventoryGatewayContract.contract_id,
      request_id: "req_bp0091_service_database_inventory",
      inspected_at: "2026-05-06T00:00:00.000Z",
      inventory_version: "0.1",
      resource_kinds: ["service", "database", "queue", "tunnel"],
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      missing_evidence: [],
      secret_posture: "references_only_no_values",
      side_effects: [],
    });

    if (!response.ok) {
      throw new Error("expected Gateway inventory success");
    }

    expect(response.service_database_inventory).toMatchObject({
      contract_id: "lnsat.platform.service_database_inventory_migration_planner.v0_1",
      inventory_version: "0.1",
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    });
    expect(response.inventory_items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resource_ref: "service:lnsat-gateway",
          resource_kind: "service",
          dependencies: expect.arrayContaining([
            expect.objectContaining({
              resource_ref: "database:audit-ledger-postgresql",
            }),
          ]),
          mutation_boundary: {
            observation_allowed: true,
            proposal_allowed: true,
            live_mutation_allowed: false,
            secret_values_allowed: false,
          },
        }),
        expect.objectContaining({
          resource_ref: "database:audit-ledger-postgresql",
          resource_kind: "database",
        }),
        expect.objectContaining({
          resource_ref: "queue:audit-ledger-review",
          resource_kind: "queue",
        }),
        expect.objectContaining({
          resource_ref: "tunnel:lnsat-example-invalid",
          resource_kind: "tunnel",
        }),
      ]),
    );
    expect(response.migration_plan).toMatchObject({
      plan_ref: "migration_plan:audit-ledger-schema-v0-1-source-only",
      risk_level: 7,
      dry_run_required: true,
      secret_posture: "references_only_no_values",
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    });
    expect(response.blocked_live_actions).toEqual(
      expect.arrayContaining([
        "database.write.execute",
        "database.migration.execute",
        "service.restart.execute",
        "queue.worker.start",
        "tunnel.dns.write",
      ]),
    );
    expect(response.required_approvals).toEqual(
      expect.arrayContaining([
        "database.migration.approval",
        "service.mutation.approval",
        "rollback.plan.approval",
        "dry_run.evidence.approval",
      ]),
    );
    expect(response.rollback_evidence_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/DATA_MODEL.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(response.dry_run_requirements).toEqual(
      expect.arrayContaining([
        "check:npm-run-audit-migrations-check",
        "review:fixtures/audit/migration-review.md",
      ]),
    );
    expect(response.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
        "ticket:BP-0091: Gateway wraps service database inventory evidence",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/service-database-inventory.ts",
        "apps/api/src/service-database-inventory.ts",
      ]),
    );
  });

  it("fails closed for malformed Gateway requests without raw rejected value echo", async () => {
    const response = await inspectServiceDatabaseInventoryGatewayRequest(
      {
        request_id: 91,
        raw_rejected_value: "postgres://inline-secret@example.invalid/audit",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: null,
      request_errors: [
        {
          code: "service_database_inventory_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "service_database_inventory_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "service_database_inventory_gateway.missing_inventory_request",
          path: "/inventory_request",
        },
      ],
      inventory_errors: [],
      service_database_inventory: null,
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("postgres://inline-secret");
  });

  it("fails closed for live database writes and raw command echo probes", async () => {
    const response = await inspectServiceDatabaseInventoryGatewayRequest(
      {
        request_id: "req_bp0091_live_database_write",
        inventory_request: {
          migration_plan: {
            ...defaultMigrationPlan,
            summary: "run migration and update production rows",
            live_database_write_allowed: true,
          },
          live_database_write_allowed: true,
          command: "psql postgres://user:password@host/db -c 'drop table audit_events'",
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      inventory_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "service_database_inventory.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "service_database_inventory.live_database_write_forbidden",
          path: "/migration_plan/live_database_write_allowed",
        }),
        expect.objectContaining({
          code: "service_database_inventory.live_database_write_forbidden",
          path: "/live_database_write_allowed",
        }),
      ]),
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("postgres://");
    expect(JSON.stringify(response)).not.toContain("password");
    expect(JSON.stringify(response)).not.toContain("drop table");
  });

  it("fails closed for missing rollback evidence", async () => {
    const response = await inspectServiceDatabaseInventoryGatewayRequest(
      {
        request_id: "req_bp0091_missing_rollback",
        inventory_request: {
          migration_plan: {
            ...defaultMigrationPlan,
            rollback: undefined,
          },
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      inventory_errors: [
        {
          code: "service_database_inventory.rollback_evidence_required",
          path: "/migration_plan/rollback",
          message: "Migration plan requires rollback evidence.",
          severity: "error",
        },
      ],
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("fails closed for secret-like values", async () => {
    const response = await inspectServiceDatabaseInventoryGatewayRequest(
      {
        request_id: "req_bp0091_secret_like_values",
        inventory_request: {
          migration_plan: {
            ...defaultMigrationPlan,
            secret_refs: ["DATABASE_URL=postgres://user:password@host/db"],
          },
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      inventory_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "service_database_inventory.secret_value_forbidden",
          path: "/migration_plan/secret_refs/0",
        }),
      ]),
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("postgres://");
    expect(JSON.stringify(response)).not.toContain("password");
  });

  it("fails closed for service mutation requests and side effects", async () => {
    const unsafeInventory = [
      {
        resource_ref: "service:lnsat-gateway",
        resource_kind: "service",
        name: "LNSAT Gateway source-only service record",
        environment: "shared",
        ownership: {
          owner_ref: "owner:lnsat-platform",
          steward_ref: "steward:gateway-operator",
          approval_group: "approval:lnsat-platform-owners",
          escalation_ref: "runbook:service-change-review",
        },
        dependencies: [],
        mutation_boundary: {
          observation_allowed: true,
          proposal_allowed: true,
          live_mutation_allowed: true,
          secret_values_allowed: false,
        },
        source_refs: ["doc:docs/architecture/SUBSTRATES_AND_NODES.md"],
        live_service_mutation_allowed: true,
        live_database_write_allowed: false,
        side_effects: [],
      },
    ];
    const response = await inspectServiceDatabaseInventoryGatewayRequest(
      {
        request_id: "req_bp0091_service_mutation",
        inventory_request: {
          inventory_items: unsafeInventory,
          migration_plan: {
            ...defaultMigrationPlan,
            summary: "restart service after migration",
            live_service_mutation_allowed: true,
          },
          live_service_mutation_allowed: true,
          side_effects: [{ effect_type: "service restart" }],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      inventory_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "service_database_inventory.live_service_mutation_forbidden",
          path: "/inventory_items/0/mutation_boundary/live_mutation_allowed",
        }),
        expect.objectContaining({
          code: "service_database_inventory.live_service_mutation_forbidden",
          path: "/inventory_items/0/live_service_mutation_allowed",
        }),
        expect.objectContaining({
          code: "service_database_inventory.live_service_mutation_forbidden",
          path: "/migration_plan/live_service_mutation_allowed",
        }),
        expect.objectContaining({
          code: "service_database_inventory.live_service_mutation_forbidden",
          path: "/live_service_mutation_allowed",
        }),
        expect.objectContaining({
          code: "service_database_inventory.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("service restart");
  });
});
