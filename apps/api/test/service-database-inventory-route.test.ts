import { defaultMigrationPlan } from "@lnsat/packets";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  serviceDatabaseInventoryGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-06T00:00:00.000Z");

describe("@lnsat/api BP-0092 service/database inventory route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects service/database inventory evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: serviceDatabaseInventoryGatewayContract.method,
      url: serviceDatabaseInventoryGatewayContract.path,
      payload: {
        request_id: "req_bp0092_route_service_database_inventory",
        inventory_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0092",
              summary: "Fastify route exposes Gateway inventory evidence",
            },
          ],
          side_effects: [],
        },
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      contract_id: serviceDatabaseInventoryGatewayContract.contract_id,
      request_id: "req_bp0092_route_service_database_inventory",
      inspected_at: "2026-05-06T00:00:00.000Z",
      service_database_inventory: {
        contract_id: "lnsat.platform.service_database_inventory_migration_planner.v0_1",
        inventory_version: "0.1",
        live_database_write_allowed: false,
        live_service_mutation_allowed: false,
        side_effects: [],
      },
      inventory_version: "0.1",
      resource_kinds: ["service", "database", "queue", "tunnel"],
      migration_plan: {
        plan_ref: "migration_plan:audit-ledger-schema-v0-1-source-only",
        risk_level: 7,
        dry_run_required: true,
        secret_posture: "references_only_no_values",
        live_database_write_allowed: false,
        live_service_mutation_allowed: false,
        side_effects: [],
      },
      secret_posture: "references_only_no_values",
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      missing_evidence: [],
      side_effects: [],
    });
    expect(body.inventory_items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resource_ref: "service:lnsat-gateway",
          resource_kind: "service",
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
    expect(body.blocked_live_actions).toEqual(
      expect.arrayContaining([
        "database.write.execute",
        "database.migration.execute",
        "service.restart.execute",
        "queue.worker.start",
        "tunnel.dns.write",
      ]),
    );
    expect(body.required_approvals).toEqual(
      expect.arrayContaining([
        "database.migration.approval",
        "service.mutation.approval",
        "rollback.plan.approval",
        "dry_run.evidence.approval",
      ]),
    );
    expect(body.rollback_evidence_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/DATA_MODEL.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(body.dry_run_requirements).toEqual(
      expect.arrayContaining([
        "check:npm-run-audit-migrations-check",
        "review:fixtures/audit/migration-review.md",
      ]),
    );
    expect(body.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
        "ticket:BP-0092: Fastify route exposes Gateway inventory evidence",
      ]),
    );
  });

  it("maps malformed Gateway requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: serviceDatabaseInventoryGatewayContract.method,
      url: serviceDatabaseInventoryGatewayContract.path,
      payload: {
        request_id: 92,
        raw_rejected_value: "postgres://inline-secret@example.invalid/audit",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      contract_id: serviceDatabaseInventoryGatewayContract.contract_id,
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
      raw_input_content: "withheld",
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    });
    expect(response.body).not.toContain("postgres://inline-secret");
  });

  it("maps invalid delegated BP-0090 inventory evidence to 400 without raw echo", async () => {
    const response = await gateway.inject({
      method: serviceDatabaseInventoryGatewayContract.method,
      url: serviceDatabaseInventoryGatewayContract.path,
      payload: {
        request_id: "req_bp0092_invalid_inventory",
        inventory_request: {
          migration_plan: {
            ...defaultMigrationPlan,
            rollback: undefined,
            live_database_write_allowed: true,
            secret_refs: ["DATABASE_URL=postgres://user:password@host/db"],
          },
          live_database_write_allowed: true,
          command: "psql postgres://user:password@host/db -c 'drop table audit_events'",
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0092_invalid_inventory",
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
          code: "service_database_inventory.rollback_evidence_required",
          path: "/migration_plan/rollback",
        }),
        expect.objectContaining({
          code: "service_database_inventory.secret_value_forbidden",
          path: "/migration_plan/secret_refs/0",
        }),
        expect.objectContaining({
          code: "service_database_inventory.live_database_write_forbidden",
          path: "/live_database_write_allowed",
        }),
      ]),
      service_database_inventory: null,
      raw_input_content: "withheld",
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    });
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("postgres://");
    expect(response.body).not.toContain("password");
    expect(response.body).not.toContain("drop table");
  });

  it("maps service mutation and side-effect probes to 400 without raw echo", async () => {
    const response = await gateway.inject({
      method: serviceDatabaseInventoryGatewayContract.method,
      url: serviceDatabaseInventoryGatewayContract.path,
      payload: {
        request_id: "req_bp0092_service_mutation",
        inventory_request: {
          migration_plan: {
            ...defaultMigrationPlan,
            summary: "restart service after migration",
            live_service_mutation_allowed: true,
          },
          live_service_mutation_allowed: true,
          side_effects: [{ effect_type: "service restart" }],
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0092_service_mutation",
      request_errors: [],
      inventory_errors: expect.arrayContaining([
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
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    });
    expect(response.body).not.toContain("service restart");
  });
});
