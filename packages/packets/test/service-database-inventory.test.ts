import { describe, expect, it } from "vitest";
import {
  createServiceDatabaseInventory,
  defaultInventoryItems,
  defaultMigrationPlan,
  serviceDatabaseInventoryContract,
  type InventoryItemEvidence,
  type MigrationPlanEvidence,
} from "../src/index.js";

describe("service/database inventory and migration planner contract", () => {
  it("emits source-only inventory and migration planner evidence", () => {
    const result = createServiceDatabaseInventory();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected service/database inventory success");
    }

    expect(result.service_database_inventory).toMatchObject({
      contract_id: serviceDatabaseInventoryContract.contract_id,
      inventory_version: "0.1",
      resource_kinds: ["service", "database", "queue", "tunnel"],
      migration_plan_kinds: [
        "schema_migration",
        "data_migration",
        "service_cutover",
        "queue_drain",
        "tunnel_routing_change",
      ],
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
      missing_evidence: [],
      secret_posture: "references_only_no_values",
    });
    expect(result.service_database_inventory.inventory_items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resource_ref: "service:lnsat-gateway",
          resource_kind: "service",
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
    expect(result.service_database_inventory.migration_plan).toMatchObject({
      plan_ref: "migration_plan:audit-ledger-schema-v0-1-source-only",
      plan_kind: "schema_migration",
      risk_level: 7,
      dry_run_required: true,
      secret_refs: [],
      secret_posture: "references_only_no_values",
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    });
    expect(result.service_database_inventory.blocked_live_actions).toEqual(
      expect.arrayContaining([
        "database.write.execute",
        "database.migration.execute",
        "service.restart.execute",
        "service.config.write",
        "queue.worker.start",
        "tunnel.dns.write",
      ]),
    );
    expect(result.service_database_inventory.required_approvals).toEqual(
      expect.arrayContaining([
        "database.migration.approval",
        "service.mutation.approval",
        "rollback.plan.approval",
        "dry_run.evidence.approval",
      ]),
    );
    expect(result.service_database_inventory.rollback_evidence_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/DATA_MODEL.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.service_database_inventory.dry_run_requirements).toEqual(
      expect.arrayContaining([
        "check:npm-run-audit-migrations-check",
        "review:fixtures/audit/migration-review.md",
      ]),
    );
    expect(result.service_database_inventory.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
        "ticket:BP-0090: source-only service database inventory and migration planner contract",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("accepts source refs and secret references while keeping secret values out", () => {
    const result = createServiceDatabaseInventory({
      migration_plan: {
        ...defaultMigrationPlan,
        secret_refs: ["secret_ref:lnsat/audit-ledger/migration-role"],
      },
      source_refs: [
        {
          source_ref: "ticket:BP-0090",
          summary: "inventory planner stays source-only and approval-gated",
        },
      ],
      side_effects: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected secret reference success");
    }

    expect(result.service_database_inventory.migration_plan.secret_refs).toEqual([
      "secret_ref:lnsat/audit-ledger/migration-role",
    ]);
    expect(result.service_database_inventory.secret_posture).toBe(
      "references_only_no_values",
    );
    expect(result.service_database_inventory.source_refs).toEqual(
      expect.arrayContaining([
        "ticket:BP-0090: inventory planner stays source-only and approval-gated",
      ]),
    );
  });

  it("fails closed for live database writes", () => {
    const result = createServiceDatabaseInventory({
      migration_plan: {
        ...defaultMigrationPlan,
        summary: "run migration and update production rows",
        live_database_write_allowed: true,
      },
      live_database_write_allowed: true,
      command: "psql postgres://user:password@host/db -c 'drop table audit_events'",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected live database write failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "service_database_inventory.unexpected_field",
          path: "/command",
          message: "Unexpected service/database inventory request field.",
          severity: "error",
        },
        {
          code: "service_database_inventory.invalid_migration_plan",
          path: "/migration_plan/summary",
          message: "Migration plan summary must be a safe non-secret string.",
          severity: "error",
        },
        {
          code: "service_database_inventory.live_database_write_forbidden",
          path: "/migration_plan/live_database_write_allowed",
          message: "Migration plan cannot enable live database writes.",
          severity: "error",
        },
        {
          code: "service_database_inventory.live_database_write_forbidden",
          path: "/live_database_write_allowed",
          message:
            "Service/database inventory contract cannot enable live database writes.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("password");
    expect(JSON.stringify(result)).not.toContain("drop table");
  });

  it("fails closed when rollback evidence is missing", () => {
    const migrationPlan = {
      ...defaultMigrationPlan,
      rollback: undefined,
    };
    const result = createServiceDatabaseInventory({ migration_plan: migrationPlan });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing rollback failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "service_database_inventory.rollback_evidence_required",
          path: "/migration_plan/rollback",
          message: "Migration plan requires rollback evidence.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for secret-like values", () => {
    const unsafeInventory: InventoryItemEvidence[] = [
      {
        ...defaultInventoryItems[0],
        name: "Gateway uses DATABASE_URL TOKEN",
      },
      ...defaultInventoryItems.slice(1),
    ];
    const unsafePlan: MigrationPlanEvidence = {
      ...defaultMigrationPlan,
      secret_refs: ["DATABASE_URL=postgres://user:password@host/db"],
    };
    const result = createServiceDatabaseInventory({
      inventory_items: unsafeInventory,
      migration_plan: unsafePlan,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected secret-like value failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "service_database_inventory.invalid_inventory_item",
          path: "/inventory_items/0/name",
          message: "Inventory item name must be a safe non-secret string.",
          severity: "error",
        },
        {
          code: "service_database_inventory.secret_value_forbidden",
          path: "/migration_plan/secret_refs/0",
          message:
            "Secret values are forbidden; only secret_ref references are allowed.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("password");
  });

  it("fails closed for service mutation requests", () => {
    const unsafeInventory: InventoryItemEvidence[] = [
      {
        ...defaultInventoryItems[0],
        mutation_boundary: {
          ...defaultInventoryItems[0].mutation_boundary,
          live_mutation_allowed: true,
        },
        live_service_mutation_allowed: true,
      },
      ...defaultInventoryItems.slice(1),
    ];
    const result = createServiceDatabaseInventory({
      inventory_items: unsafeInventory,
      migration_plan: {
        ...defaultMigrationPlan,
        summary: "restart service after migration",
        live_service_mutation_allowed: true,
      },
      live_service_mutation_allowed: true,
      side_effects: [{ effect_type: "service restart" }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected service mutation failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "service_database_inventory.live_service_mutation_forbidden",
          path: "/inventory_items/0/mutation_boundary/live_mutation_allowed",
          message: "Inventory boundary cannot allow live mutation.",
          severity: "error",
        },
        {
          code: "service_database_inventory.live_service_mutation_forbidden",
          path: "/inventory_items/0/live_service_mutation_allowed",
          message: "Inventory item cannot enable live service mutation.",
          severity: "error",
        },
        {
          code: "service_database_inventory.invalid_migration_plan",
          path: "/migration_plan/summary",
          message: "Migration plan summary must be a safe non-secret string.",
          severity: "error",
        },
        {
          code: "service_database_inventory.live_service_mutation_forbidden",
          path: "/migration_plan/live_service_mutation_allowed",
          message: "Migration plan cannot enable live service mutation.",
          severity: "error",
        },
        {
          code: "service_database_inventory.live_service_mutation_forbidden",
          path: "/live_service_mutation_allowed",
          message:
            "Service/database inventory contract cannot enable live service mutation.",
          severity: "error",
        },
        {
          code: "service_database_inventory.side_effects_forbidden",
          path: "/side_effects",
          message:
            "Service/database inventory contract must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("service restart");
  });
});
