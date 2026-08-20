import { defaultMigrationPlan } from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectServiceDatabaseInventoryThroughMcpAdapterContract,
  mcpAuditLedgerDatabaseSecurityPreflightToolContract,
  mcpAuditLedgerMigrationApprovalPreviewToolContract,
  mcpAuditLedgerPersistenceReadinessToolContract,
  mcpAuditLedgerPersistenceScopeRequestToolContract,
  mcpAuditLedgerWriterInterfaceToolContract,
  mcpAuditLedgerWriterPersistencePreflightToolContract,
  mcpBuildPacketStateToolContract,
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
  mcpAdapterInvocationPreflightToolContract,
  mcpAdapterInvocationAuthorizationBundleToolContract,
  mcpAdapterInvocationResultToolContract,
  mcpSubstrateControlIntentToolContract,
} from "../src/index.js";

const now = new Date("2026-05-06T00:00:00.000Z");

const registeredToolNames = [
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

let cleanup: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (cleanup !== null) {
    await cleanup();
    cleanup = null;
  }
});

describe("@lnsat/mcp BP-0093/BP-0094 service/database inventory MCP adapter contract", () => {
  it("exposes read-only service/database inventory adapter metadata without side effects", () => {
    expect(mcpServiceDatabaseInventoryToolContract).toMatchObject({
      tool: "lnsat.platform.service_database_inventory.inspect",
      status: "contract_only",
      gateway_contract_id:
        "lnsat.gateway.service_database_inventory_migration_planner.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/platform/service-database-inventory/inspect",
      authority: ["lnsat.gateway.service_database_inventory_migration_planner.v0_1"],
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    });
    expect(mcpServiceDatabaseInventoryToolContract.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/service-database-inventory.ts",
        "apps/api/src/service-database-inventory.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid service/database inventory inspection to the Gateway contract", async () => {
    const response = await inspectServiceDatabaseInventoryThroughMcpAdapterContract(
      {
        request_id: "req_bp0093_service_database_inventory",
        inventory_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0093",
              summary: "MCP adapter delegates service database inventory evidence",
            },
          ],
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpServiceDatabaseInventoryToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.service_database_inventory_migration_planner.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0093_service_database_inventory",
        inspected_at: "2026-05-06T00:00:00.000Z",
        service_database_inventory: {
          contract_id:
            "lnsat.platform.service_database_inventory_migration_planner.v0_1",
          inventory_version: "0.1",
          live_database_write_allowed: false,
          live_service_mutation_allowed: false,
          side_effects: [],
        },
        inventory_items: expect.arrayContaining([
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
        migration_plan: {
          plan_ref: "migration_plan:audit-ledger-schema-v0-1-source-only",
          risk_level: 7,
          dry_run_required: true,
          secret_posture: "references_only_no_values",
          live_database_write_allowed: false,
          live_service_mutation_allowed: false,
          side_effects: [],
        },
        blocked_live_actions: expect.arrayContaining([
          "database.write.execute",
          "database.migration.execute",
          "service.restart.execute",
          "queue.worker.start",
          "tunnel.dns.write",
        ]),
        required_approvals: expect.arrayContaining([
          "database.migration.approval",
          "service.mutation.approval",
          "rollback.plan.approval",
          "dry_run.evidence.approval",
        ]),
        rollback_evidence_refs: expect.arrayContaining([
          "doc:docs/architecture/DATA_MODEL.md",
          "doc:docs/reference/CONTRACT_PROVENANCE.md",
        ]),
        dry_run_requirements: expect.arrayContaining([
          "check:npm-run-audit-migrations-check",
          "review:fixtures/audit/migration-review.md",
        ]),
        source_refs: expect.arrayContaining([
          "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
          "doc:docs/reference/CONTRACT_PROVENANCE.md",
          "ticket:BP-0093: MCP adapter delegates service database inventory evidence",
        ]),
        live_database_write_allowed: false,
        live_service_mutation_allowed: false,
        side_effects: [],
      },
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response = await inspectServiceDatabaseInventoryThroughMcpAdapterContract(
      {
        request_id: 93,
        raw_rejected_value: "postgres://inline-secret@example.invalid/audit",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpServiceDatabaseInventoryToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: null,
        request_errors: [
          expect.objectContaining({
            code: "service_database_inventory_gateway.unexpected_field",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "service_database_inventory_gateway.invalid_request_id",
            path: "/request_id",
          }),
          expect.objectContaining({
            code: "service_database_inventory_gateway.missing_inventory_request",
            path: "/inventory_request",
          }),
        ],
        inventory_errors: [],
        service_database_inventory: null,
        raw_input_content: "withheld",
        live_database_write_allowed: false,
        live_service_mutation_allowed: false,
        side_effects: [],
      },
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("postgres://inline-secret");
  });

  it("fails closed for invalid delegated BP-0090 inventory evidence without raw echo", async () => {
    const response = await inspectServiceDatabaseInventoryThroughMcpAdapterContract(
      {
        request_id: "req_bp0093_invalid_inventory",
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
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0093_invalid_inventory",
        request_errors: [],
        inventory_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "service_database_inventory.unexpected_field",
            path: "/command",
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
            path: "/migration_plan/live_database_write_allowed",
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
      },
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("postgres://");
    expect(JSON.stringify(response)).not.toContain("password");
    expect(JSON.stringify(response)).not.toContain("drop table");
  });

  it("fails closed for service mutation and side-effect probes without raw echo", async () => {
    const response = await inspectServiceDatabaseInventoryThroughMcpAdapterContract(
      {
        request_id: "req_bp0093_service_mutation",
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
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0093_service_mutation",
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
      },
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("service restart");
  });

  it("registers the adapter on the local MCP surface", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });

    expect(localServer.listTools().tools.map((tool) => tool.name)).toEqual(
      registeredToolNames,
    );
    expect(localServer.listTools().tools).toHaveLength(29);
    expect(localServer.listTools().tools.map((tool) => tool.name)).toContain(
      mcpServiceDatabaseInventoryToolContract.tool,
    );

    const response = await localServer.callTool({
      name: mcpServiceDatabaseInventoryToolContract.tool,
      arguments: {
        request_id: "req_bp0094_service_database_inventory_server",
        inventory_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0094",
              summary: "MCP registration delegates service database inventory evidence",
            },
          ],
          side_effects: [],
        },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpServiceDatabaseInventoryToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpServiceDatabaseInventoryToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.service_database_inventory_migration_planner.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0094_service_database_inventory_server",
              service_database_inventory: {
                live_database_write_allowed: false,
                live_service_mutation_allowed: false,
                side_effects: [],
              },
              inventory_items: expect.arrayContaining([
                expect.objectContaining({ resource_kind: "service" }),
                expect.objectContaining({ resource_kind: "database" }),
                expect.objectContaining({ resource_kind: "queue" }),
                expect.objectContaining({ resource_kind: "tunnel" }),
              ]),
              blocked_live_actions: expect.arrayContaining([
                "database.write.execute",
                "service.restart.execute",
              ]),
              source_refs: expect.arrayContaining([
                "ticket:BP-0094: MCP registration delegates service database inventory evidence",
              ]),
              live_database_write_allowed: false,
              live_service_mutation_allowed: false,
              side_effects: [],
            },
            live_database_write_allowed: false,
            live_service_mutation_allowed: false,
            side_effects: [],
          },
        },
      ],
      side_effects: [],
    });
  });

  it("registers the adapter on the official stdio MCP surface", async () => {
    const { client } = await createConnectedSdkClient();
    const tools = await client.listTools();

    expect(tools.tools.map((tool) => tool.name)).toEqual(registeredToolNames);
    expect(tools.tools).toHaveLength(29);
    expect(tools.tools.map((tool) => tool.name)).toContain(
      mcpServiceDatabaseInventoryToolContract.tool,
    );

    const result = await client.callTool({
      name: mcpServiceDatabaseInventoryToolContract.tool,
      arguments: {
        request_id: "req_bp0094_service_database_inventory_sdk",
        inventory_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0094",
              summary: "Official SDK registration delegates service inventory",
            },
          ],
          side_effects: [],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpServiceDatabaseInventoryToolContract.tool,
      gateway_response: {
        ok: true,
        request_id: "req_bp0094_service_database_inventory_sdk",
        live_database_write_allowed: false,
        live_service_mutation_allowed: false,
        side_effects: [],
      },
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    });
  });
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLnsatOfficialMcpSdkServer({
    now: () => now,
  });
  const client = new Client({
    name: "lnsat-bp0093-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
