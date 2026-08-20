import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { afterEach, describe, expect, it } from "vitest";
import {
  mcpAdapterInvocationAuthorizationBundleToolContract,
  mcpAuditLedgerDatabaseSecurityPreflightToolContract,
  mcpAuditLedgerMigrationApprovalPreviewToolContract,
  mcpAuditLedgerPersistenceReadinessToolContract,
  mcpAuditLedgerPersistenceScopeRequestToolContract,
  mcpHardwareInventoryInspectionToolContract,
  mcpAuditLedgerWriterInterfaceToolContract,
  mcpAuditLedgerWriterPersistencePreflightToolContract,
  mcpBuildPacketStateToolContract,
  mcpCapabilityBrokerRequestToolContract,
  mcpAdapterInvocationResultToolContract,
  mcpOnboardingContextInspectionToolContract,
  mcpOnboardingProfileInspectionToolContract,
  mcpPacketInspectionToolContract,
  mcpProjectStateToolContract,
  mcpRuntimeAdapterImplementationAuthorizationRequestToolContract,
  mcpRuntimeAdapterImplementationApprovalGateToolContract,
  mcpRuntimeAdapterImplementationDryRunEvidenceToolContract,
  mcpKnowledgeSurfaceToolContract,
  mcpAgentContextFirewallToolContract,
  mcpRuntimeAdapterImplementationScopeToolContract,
  mcpRuntimeAdapterImplementationPlanToolContract,
  mcpRuntimeAdapterReadinessGateToolContract,
  mcpServiceDatabaseInventoryToolContract,
  mcpSubstrateAdapterManifestToolContract,
  mcpAdapterInvocationPreflightToolContract,
  mcpSubstrateControlIntentToolContract,
} from "../src/index.js";

const fixtureRoot = join(process.cwd(), "../../packages/packets/fixtures");

let cleanup: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (cleanup !== null) {
    await cleanup();
    cleanup = null;
  }
});

describe("@lnsat/mcp BP-0016 local official stdio client smoke", () => {
  it("lists only registered read-only tools through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const tools = await client.listTools();

    expect(tools.tools.map((tool) => tool.name)).toEqual([
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
    ]);
    expect(tools.tools).toHaveLength(29);
    expect(tools.tools[0]).toMatchObject({
      name: mcpPacketInspectionToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[1]).toMatchObject({
      name: "lnsat.project.state.inspect.v0_1",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[2]).toMatchObject({
      name: mcpBuildPacketStateToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[3]).toMatchObject({
      name: mcpOnboardingProfileInspectionToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[4]).toMatchObject({
      name: mcpOnboardingContextInspectionToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[5]).toMatchObject({
      name: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[6]).toMatchObject({
      name: mcpAuditLedgerWriterInterfaceToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[7]).toMatchObject({
      name: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[8]).toMatchObject({
      name: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[9]).toMatchObject({
      name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[10]).toMatchObject({
      name: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[11]).toMatchObject({
      name: mcpHardwareInventoryInspectionToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[12]).toMatchObject({
      name: "lnsat.hardware.allocation.recommendation.inspect",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[13]).toMatchObject({
      name: "lnsat.performance.telemetry.inspect",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[14]).toMatchObject({
      name: mcpServiceDatabaseInventoryToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[15]).toMatchObject({
      name: mcpSubstrateControlIntentToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[16]).toMatchObject({
      name: mcpCapabilityBrokerRequestToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[17]).toMatchObject({
      name: mcpSubstrateAdapterManifestToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[18]).toMatchObject({
      name: mcpAdapterInvocationPreflightToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[19]).toMatchObject({
      name: mcpAdapterInvocationResultToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[20]).toMatchObject({
      name: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[21]).toMatchObject({
      name: mcpRuntimeAdapterReadinessGateToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[22]).toMatchObject({
      name: mcpRuntimeAdapterImplementationScopeToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[23]).toMatchObject({
      name: mcpRuntimeAdapterImplementationPlanToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[24]).toMatchObject({
      name: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[25]).toMatchObject({
      name: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[26]).toMatchObject({
      name: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[27]).toMatchObject({
      name: mcpKnowledgeSurfaceToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[28]).toMatchObject({
      name: mcpAgentContextFirewallToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
  });

  it("routes runtime adapter implementation approval gate through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      arguments: {
        request_id: "req_bp0160_stdio_runtime_adapter_implementation_approval_gate",
        approval_gate_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0160",
              summary:
                "Built stdio registration preserves runtime adapter implementation approval gate evidence",
            },
          ],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_approval_gate.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0160_stdio_runtime_adapter_implementation_approval_gate",
        runtime_adapter_implementation_approval_gate: {
          contract_id:
            "lnsat.platform.runtime_adapter_implementation_approval_gate.v0_1",
          implementation_approval_gate_authority:
            "implementation_approval_gate_only_no_runtime_adapter",
          runtime_adapter_implementation_allowed: false,
          runtime_adapter_dispatch_allowed: false,
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        source_refs: expect.arrayContaining(["ticket:BP-0160"]),
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid runtime adapter implementation approval gate evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      arguments: {
        request_id:
          "req_bp0160_stdio_runtime_adapter_implementation_approval_gate_invalid",
        command: "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id:
          "req_bp0160_stdio_runtime_adapter_implementation_approval_gate_invalid",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate_gateway.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate_gateway.missing_approval_gate_request",
            path: "/approval_gate_request",
          }),
        ]),
        runtime_adapter_implementation_approval_gate: null,
        raw_input_content: "withheld",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("runtime_adapter.implementation");
    expect(JSON.stringify(result)).not.toContain("TOKEN=inline-secret");
  });

  it("routes runtime adapter implementation dry-run evidence through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      arguments: {
        request_id: "req_bp0167_stdio_runtime_adapter_implementation_dry_run",
        dry_run_evidence_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0167",
              summary:
                "Built stdio registration preserves runtime adapter implementation dry-run evidence",
            },
          ],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_dry_run_evidence.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0167_stdio_runtime_adapter_implementation_dry_run",
        runtime_adapter_implementation_dry_run_evidence: {
          contract_id:
            "lnsat.platform.runtime_adapter_implementation_dry_run_evidence.v0_1",
          implementation_dry_run_evidence_authority:
            "implementation_dry_run_evidence_only_no_runtime_adapter",
          runtime_adapter_implementation_allowed: false,
          runtime_adapter_dispatch_allowed: false,
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        source_refs: expect.arrayContaining(["ticket:BP-0167"]),
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      implementation_authority:
        "implementation_dry_run_evidence_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid runtime adapter implementation dry-run evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      arguments: {
        request_id: "req_bp0167_stdio_runtime_adapter_implementation_dry_run_invalid",
        command: "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0167_stdio_runtime_adapter_implementation_dry_run_invalid",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence_gateway.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence_gateway.missing_dry_run_evidence_request",
            path: "/dry_run_evidence_request",
          }),
        ]),
        runtime_adapter_implementation_dry_run_evidence: null,
        raw_input_content: "withheld",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("runtime_adapter.implementation");
    expect(JSON.stringify(result)).not.toContain("TOKEN=inline-secret");
  });

  it("routes service database inventory through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpServiceDatabaseInventoryToolContract.tool,
      arguments: {
        request_id: "req_bp0094_stdio_service_database_inventory",
        inventory_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0094",
              summary: "Built stdio registration preserves inventory evidence",
            },
          ],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpServiceDatabaseInventoryToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.service_database_inventory_migration_planner.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0094_stdio_service_database_inventory",
        service_database_inventory: {
          contract_id:
            "lnsat.platform.service_database_inventory_migration_planner.v0_1",
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
        live_database_write_allowed: false,
        live_service_mutation_allowed: false,
        side_effects: [],
      },
      live_database_write_allowed: false,
      live_service_mutation_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid service database inventory evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpServiceDatabaseInventoryToolContract.tool,
      arguments: {
        request_id: "req_bp0094_stdio_service_database_inventory_invalid",
        command: "psql postgres://user:password@host/db -c 'drop table audit_events'",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0094_stdio_service_database_inventory_invalid",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "service_database_inventory_gateway.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "service_database_inventory_gateway.missing_inventory_request",
            path: "/inventory_request",
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
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("password");
    expect(JSON.stringify(result)).not.toContain("drop table");
  });

  it("routes substrate control intent through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpSubstrateControlIntentToolContract.tool,
      arguments: {
        request_id: "req_bp0100_stdio_substrate_control_intent",
        intent_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0100",
              summary:
                "Built stdio registration preserves substrate control intent evidence",
            },
          ],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpSubstrateControlIntentToolContract.tool,
      gateway_contract_id: "lnsat.gateway.substrate_control_intent.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0100_stdio_substrate_control_intent",
        substrate_control_intent: {
          contract_id: "lnsat.platform.substrate_control_intent.v0_1",
          target_substrate_kind: "services",
          requested_control_mode: "approval_gated_mutation",
          secret_posture: "references_only_no_values",
          live_substrate_mutation_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        required_policy_gates: expect.arrayContaining([
          "execution.approval.required",
          "services.mutation.approval",
          "substrate.intent.policy.review",
        ]),
        required_approvals: expect.arrayContaining([
          "approval:human-substrate-control",
          "approval:rollback-owner",
        ]),
        source_refs: expect.arrayContaining([
          "ticket:BP-0100: Built stdio registration preserves substrate control intent evidence",
        ]),
        live_substrate_mutation_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid substrate control intent evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpSubstrateControlIntentToolContract.tool,
      arguments: {
        request_id: "req_bp0100_stdio_substrate_control_intent_invalid",
        command: "ssh host 'sudo systemctl restart lnsat'",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0100_stdio_substrate_control_intent_invalid",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "substrate_control_intent_gateway.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "substrate_control_intent_gateway.missing_intent_request",
            path: "/intent_request",
          }),
        ]),
        substrate_control_intent: null,
        raw_input_content: "withheld",
        live_substrate_mutation_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("ssh host");
    expect(JSON.stringify(result)).not.toContain("systemctl restart");
  });

  it("routes capability broker request through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpCapabilityBrokerRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0106_stdio_capability_broker_request",
        broker_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0106",
              summary:
                "Built stdio registration preserves capability broker request evidence",
            },
          ],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpCapabilityBrokerRequestToolContract.tool,
      gateway_contract_id: "lnsat.gateway.capability_broker_request.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0106_stdio_capability_broker_request",
        capability_broker_request: {
          contract_id: "lnsat.platform.capability_broker_request.v0_1",
          broker_decision_posture: "classify_and_propose_only_no_dispatch",
          proposed_adapter_authority: "proposal_only_no_dispatch",
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        required_policy_gates: expect.arrayContaining([
          "capability.broker.policy.review",
          "substrate.intent.policy.review",
        ]),
        required_approvals: expect.arrayContaining([
          "approval:human-substrate-control",
          "approval:rollback-owner",
        ]),
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid capability broker request evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpCapabilityBrokerRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0106_stdio_capability_broker_request_invalid",
        command: "capability.broker.dispatch.execute TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0106_stdio_capability_broker_request_invalid",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "capability_broker_request_gateway.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "capability_broker_request_gateway.missing_broker_request",
            path: "/broker_request",
          }),
        ]),
        capability_broker_request: null,
        raw_input_content: "withheld",
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("capability.broker.dispatch");
    expect(JSON.stringify(result)).not.toContain("TOKEN=inline-secret");
  });

  it("routes substrate adapter manifest through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpSubstrateAdapterManifestToolContract.tool,
      arguments: {
        request_id: "req_bp0112_stdio_substrate_adapter_manifest",
        manifest_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0112",
              summary:
                "Built stdio registration preserves substrate adapter manifest evidence",
            },
          ],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpSubstrateAdapterManifestToolContract.tool,
      gateway_contract_id: "lnsat.gateway.substrate_adapter_manifest.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0112_stdio_substrate_adapter_manifest",
        substrate_adapter_manifest: {
          contract_id: "lnsat.platform.substrate_adapter_manifest.v0_1",
          adapter_class: "service_control_adapter",
          adapter_authority: "manifest_only_no_invocation",
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        required_policy_gates: expect.arrayContaining([
          "capability.broker.policy.review",
          "services.mutation.approval",
          "substrate.adapter.manifest.review",
        ]),
        required_approvals: expect.arrayContaining([
          "approval:human-substrate-control",
          "approval:rollback-owner",
        ]),
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid substrate adapter manifest evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpSubstrateAdapterManifestToolContract.tool,
      arguments: {
        request_id: "req_bp0112_stdio_substrate_adapter_manifest_invalid",
        command: "substrate.adapter.invoke TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0112_stdio_substrate_adapter_manifest_invalid",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "substrate_adapter_manifest_gateway.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "substrate_adapter_manifest_gateway.missing_manifest_request",
            path: "/manifest_request",
          }),
        ]),
        substrate_adapter_manifest: null,
        raw_input_content: "withheld",
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(result)).not.toContain("TOKEN=inline-secret");
  });

  it("routes adapter invocation preflight through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAdapterInvocationPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0118_stdio_adapter_invocation_preflight",
        preflight_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0118",
              summary:
                "Built stdio registration preserves adapter invocation preflight evidence",
            },
          ],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAdapterInvocationPreflightToolContract.tool,
      gateway_contract_id: "lnsat.gateway.adapter_invocation_preflight.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0118_stdio_adapter_invocation_preflight",
        adapter_invocation_preflight: {
          contract_id: "lnsat.platform.adapter_invocation_preflight.v0_1",
          adapter_class: "service_control_adapter",
          adapter_authority: "preflight_only_no_invocation",
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        required_policy_gates: expect.arrayContaining([
          "capability.broker.policy.review",
          "substrate.adapter.invocation.preflight.review",
          "substrate.adapter.manifest.review",
        ]),
        required_approvals: expect.arrayContaining([
          "approval:human-substrate-control",
          "approval:rollback-owner",
        ]),
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid adapter invocation preflight evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAdapterInvocationPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0118_stdio_adapter_invocation_preflight_invalid",
        command: "substrate.adapter.invoke TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0118_stdio_adapter_invocation_preflight_invalid",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "adapter_invocation_preflight_gateway.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "adapter_invocation_preflight_gateway.missing_preflight_request",
            path: "/preflight_request",
          }),
        ]),
        adapter_invocation_preflight: null,
        raw_input_content: "withheld",
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(result)).not.toContain("TOKEN=inline-secret");
  });

  it("routes adapter invocation result through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAdapterInvocationResultToolContract.tool,
      arguments: {
        request_id: "req_bp0124_stdio_adapter_invocation_result",
        result_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0124",
              summary:
                "Built stdio registration preserves adapter invocation result evidence",
            },
          ],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAdapterInvocationResultToolContract.tool,
      gateway_contract_id: "lnsat.gateway.adapter_invocation_result.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0124_stdio_adapter_invocation_result",
        adapter_invocation_result: {
          contract_id: "lnsat.platform.adapter_invocation_result.v0_1",
          observed_status: "completed",
          result_authority: "result_evidence_only_no_execution",
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        required_policy_gates: expect.arrayContaining([
          "substrate.adapter.invocation.result.review",
          "substrate.adapter.invocation.preflight.review",
        ]),
        required_approvals: expect.arrayContaining([
          "approval:human-substrate-control",
          "approval:rollback-owner",
        ]),
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid adapter invocation result evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAdapterInvocationResultToolContract.tool,
      arguments: {
        request_id: "req_bp0124_stdio_adapter_invocation_result_invalid",
        command: "substrate.adapter.invoke TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0124_stdio_adapter_invocation_result_invalid",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "adapter_invocation_result_gateway.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "adapter_invocation_result_gateway.missing_result_request",
            path: "/result_request",
          }),
        ]),
        adapter_invocation_result: null,
        raw_input_content: "withheld",
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(result)).not.toContain("TOKEN=inline-secret");
  });

  it("routes adapter invocation authorization bundle through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      arguments: {
        request_id: "req_bp0130_stdio_adapter_invocation_authorization_bundle",
        bundle_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0130",
              summary:
                "Built stdio registration preserves adapter invocation authorization bundle evidence",
            },
          ],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      gateway_contract_id: "lnsat.gateway.adapter_invocation_authorization_bundle.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0130_stdio_adapter_invocation_authorization_bundle",
        adapter_invocation_authorization_bundle: {
          contract_id: "lnsat.platform.adapter_invocation_authorization_bundle.v0_1",
          authorization_authority: "authorization_bundle_only_no_invocation",
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        required_policy_gates: expect.arrayContaining([
          "substrate.adapter.invocation.authorization_bundle.review",
          "substrate.adapter.invocation.result.review",
        ]),
        required_approvals: expect.arrayContaining([
          "approval:human-substrate-control",
          "approval:rollback-owner",
        ]),
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid adapter invocation authorization bundle evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      arguments: {
        request_id: "req_bp0130_stdio_adapter_invocation_authorization_bundle_invalid",
        command: "adapter.invoke.execute TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0130_stdio_adapter_invocation_authorization_bundle_invalid",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "adapter_invocation_authorization_bundle_gateway.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "adapter_invocation_authorization_bundle_gateway.missing_bundle_request",
            path: "/bundle_request",
          }),
        ]),
        adapter_invocation_authorization_bundle: null,
        raw_input_content: "withheld",
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("adapter.invoke.execute");
    expect(JSON.stringify(result)).not.toContain("TOKEN=inline-secret");
  });

  it("routes runtime adapter readiness gate through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterReadinessGateToolContract.tool,
      arguments: {
        request_id: "req_bp0136_stdio_runtime_adapter_readiness_gate",
        readiness_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0136",
              summary:
                "Built stdio registration preserves runtime adapter readiness gate evidence",
            },
          ],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterReadinessGateToolContract.tool,
      gateway_contract_id: "lnsat.gateway.runtime_adapter_readiness_gate.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0136_stdio_runtime_adapter_readiness_gate",
        runtime_adapter_readiness_gate: {
          contract_id: "lnsat.platform.runtime_adapter_readiness_gate.v0_1",
          readiness_authority: "readiness_gate_only_no_runtime_invocation",
          runtime_adapter_dispatch_allowed: false,
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        required_policy_gates: expect.arrayContaining([
          "substrate.adapter.runtime_readiness_gate.review",
          "substrate.adapter.invocation.result.review",
        ]),
        required_approvals: expect.arrayContaining([
          "approval:human-substrate-control",
          "approval:rollback-owner",
        ]),
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid runtime adapter readiness gate evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterReadinessGateToolContract.tool,
      arguments: {
        request_id: "req_bp0136_stdio_runtime_adapter_readiness_gate_invalid",
        command: "runtime_adapter.dispatch.execute TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0136_stdio_runtime_adapter_readiness_gate_invalid",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "runtime_adapter_readiness_gate_gateway.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "runtime_adapter_readiness_gate_gateway.missing_readiness_request",
            path: "/readiness_request",
          }),
        ]),
        runtime_adapter_readiness_gate: null,
        raw_input_content: "withheld",
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("runtime_adapter.dispatch");
    expect(JSON.stringify(result)).not.toContain("TOKEN=inline-secret");
  });

  it("routes runtime adapter implementation scope through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationScopeToolContract.tool,
      arguments: {
        request_id: "req_bp0142_stdio_runtime_adapter_implementation_scope",
        implementation_scope_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0142",
              summary:
                "Built stdio registration preserves runtime adapter implementation scope evidence",
            },
          ],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationScopeToolContract.tool,
      gateway_contract_id: "lnsat.gateway.runtime_adapter_implementation_scope.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0142_stdio_runtime_adapter_implementation_scope",
        runtime_adapter_implementation_scope: {
          contract_id: "lnsat.platform.runtime_adapter_implementation_scope.v0_1",
          implementation_authority: "implementation_scope_only_no_runtime_adapter",
          runtime_adapter_implementation_allowed: false,
          runtime_adapter_dispatch_allowed: false,
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        required_policy_gates: expect.arrayContaining([
          "substrate.adapter.implementation_scope.review",
          "substrate.adapter.runtime_readiness_gate.review",
        ]),
        required_approvals: expect.arrayContaining([
          "approval:human-substrate-control",
          "approval:rollback-owner",
        ]),
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid runtime adapter implementation scope evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationScopeToolContract.tool,
      arguments: {
        request_id: "req_bp0142_stdio_runtime_adapter_implementation_scope_invalid",
        command: "runtime_adapter.implement TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0142_stdio_runtime_adapter_implementation_scope_invalid",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope_gateway.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope_gateway.missing_implementation_scope_request",
            path: "/implementation_scope_request",
          }),
        ]),
        runtime_adapter_implementation_scope: null,
        raw_input_content: "withheld",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("runtime_adapter.implement");
    expect(JSON.stringify(result)).not.toContain("TOKEN=inline-secret");
  });

  it("routes runtime adapter implementation plan through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationPlanToolContract.tool,
      arguments: {
        request_id: "req_bp0148_stdio_runtime_adapter_implementation_plan",
        implementation_plan_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0148",
              summary:
                "Built stdio registration preserves runtime adapter implementation plan evidence",
            },
          ],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationPlanToolContract.tool,
      gateway_contract_id: "lnsat.gateway.runtime_adapter_implementation_plan.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0148_stdio_runtime_adapter_implementation_plan",
        runtime_adapter_implementation_plan: {
          contract_id: "lnsat.platform.runtime_adapter_implementation_plan.v0_1",
          implementation_plan_authority: "implementation_plan_only_no_runtime_adapter",
          runtime_adapter_implementation_allowed: false,
          runtime_adapter_dispatch_allowed: false,
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        required_policy_gates: expect.arrayContaining([
          "substrate.adapter.implementation_plan.review",
          "substrate.adapter.implementation_scope.review",
        ]),
        required_approvals: expect.arrayContaining([
          "approval:human-substrate-control",
          "approval:rollback-owner",
        ]),
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid runtime adapter implementation plan evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationPlanToolContract.tool,
      arguments: {
        request_id: "req_bp0148_stdio_runtime_adapter_implementation_plan_invalid",
        command: "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0148_stdio_runtime_adapter_implementation_plan_invalid",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan_gateway.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan_gateway.missing_implementation_plan_request",
            path: "/implementation_plan_request",
          }),
        ]),
        runtime_adapter_implementation_plan: null,
        raw_input_content: "withheld",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("runtime_adapter.implementation");
    expect(JSON.stringify(result)).not.toContain("TOKEN=inline-secret");
  });

  it("routes runtime adapter implementation authorization request through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      arguments: {
        request_id:
          "req_bp0154_stdio_runtime_adapter_implementation_authorization_request",
        authorization_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0154",
              summary:
                "Built stdio registration preserves runtime adapter implementation authorization request evidence",
            },
          ],
        },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
      gateway_response: {
        ok: true,
        request_id:
          "req_bp0154_stdio_runtime_adapter_implementation_authorization_request",
        runtime_adapter_implementation_authorization_request: {
          contract_id:
            "lnsat.platform.runtime_adapter_implementation_authorization_request.v0_1",
          implementation_authorization_request_authority:
            "implementation_authorization_request_only_no_runtime_adapter",
          runtime_adapter_implementation_allowed: false,
          runtime_adapter_dispatch_allowed: false,
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        required_policy_gates: expect.arrayContaining([
          "substrate.adapter.implementation_authorization_request.review",
          "substrate.adapter.implementation_plan.review",
        ]),
        required_approvals: expect.arrayContaining([
          "approval:human-substrate-control",
          "approval:rollback-owner",
        ]),
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid runtime adapter implementation authorization request evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      arguments: {
        request_id:
          "req_bp0154_stdio_runtime_adapter_implementation_authorization_request_invalid",
        command: "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id:
          "req_bp0154_stdio_runtime_adapter_implementation_authorization_request_invalid",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request_gateway.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request_gateway.missing_authorization_request",
            path: "/authorization_request",
          }),
        ]),
        runtime_adapter_implementation_authorization_request: null,
        raw_input_content: "withheld",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("runtime_adapter.implementation");
    expect(JSON.stringify(result)).not.toContain("TOKEN=inline-secret");
  });

  it("routes audit ledger persistence scope requests through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0080_stdio_persistence_scope_request",
        actor_id: "agent.codex",
        session_id: "sess_bp0080_stdio",
        approval_evidence: { mode: "valid" },
        readiness_source: { mode: "direct_gateway_evidence" },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      gateway_contract_id: "lnsat.gateway.audit_ledger_persistence_scope_request.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0080_stdio_persistence_scope_request",
        scope_request: {
          contract_id: "lnsat.audit.audit_ledger_persistence_scope_request.v0_1",
          readiness_source: {
            kind: "direct_gateway_evidence",
            source_packet_refs: ["BP-0071", "BP-0073"],
          },
          live_execution_allowed: false,
          side_effects: [],
        },
        minimum_source_evidence_before_live_scope: expect.arrayContaining([
          "BP-0044 audit_events.v0_1 SQL artifact and manifest refs",
          "BP-0059 pure writer persistence preflight helper evidence",
          "BP-0076 registered read-only MCP persistence readiness inspection evidence",
        ]),
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid audit ledger persistence scope evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0080_stdio_persistence_scope_request_invalid",
        actor_id: "agent.codex",
        session_id: "sess_bp0080_stdio",
        approval_evidence: { mode: "valid" },
        scope_evidence: { mode: "live_execution_side_effects" },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0080_stdio_persistence_scope_request_invalid",
        scope_request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "audit_ledger_persistence_scope_request.live_execution_forbidden",
          }),
          expect.objectContaining({
            code: "audit_ledger_persistence_scope_request.side_effects_forbidden",
          }),
        ]),
        scope_request: null,
        raw_input_content: "withheld",
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("database_write");
  });

  it("routes audit ledger persistence readiness through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      arguments: {
        request_id: "req_bp0076_stdio_persistence_readiness",
        actor_id: "agent.codex",
        session_id: "sess_bp0076_stdio",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      gateway_contract_id: "lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0076_stdio_persistence_readiness",
        gate: {
          contract_id:
            "lnsat.audit.audit_ledger_persistence_implementation_readiness_gate.v0_1",
          readiness: {
            status: "source_ready_for_later_scope_request_only",
            live_persistence_scope_allowed: false,
            gateway_is_security_boundary: true,
            mcp_is_adapter_only: true,
            state_changing_mcp_tools_allowed: false,
          },
          security_requirements: {
            isolation_model: {
              mode: "postgresql_rls",
              deny_by_default: true,
              bypass_rls_forbidden: true,
            },
            deny_by_default_required: true,
          },
          live_execution_allowed: false,
          side_effects: [],
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid audit ledger persistence readiness evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      arguments: {
        request_id: "req_bp0076_stdio_persistence_readiness_invalid",
        actor_id: "agent.codex",
        session_id: "sess_bp0076_stdio",
        approval_evidence: { mode: "valid" },
        readiness_evidence: { mode: "missing_database_security" },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0076_stdio_persistence_readiness_invalid",
        readiness_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "audit_ledger_persistence_readiness_gate.database_security_preflight_required",
          }),
        ]),
        gate: null,
        raw_input_content: "withheld",
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("postgres://inline-secret");
  });

  it("routes audit ledger database security preflight through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0070_stdio_database_security",
        actor_id: "agent.codex",
        session_id: "sess_bp0070_stdio",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.audit_ledger_database_security_preflight.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0070_stdio_database_security",
        preflight: {
          contract_id: "lnsat.audit.audit_ledger_database_security_preflight.v0_1",
          security_target: {
            storage_target: "audit_events.v0_1",
            table: "audit_events",
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
          test_requirements_before_live_scope: expect.arrayContaining([
            "static_security_preflight_check",
            "rls_policy_or_equivalent_isolation_test",
            "tenant_project_scope_enforcement_test",
            "writer_role_grant_test",
            "select_role_grant_test",
            "deny_by_default_no_public_access_test",
            "no_bypassrls_or_superuser_writer_test",
          ]),
          live_execution_allowed: false,
          side_effects: [],
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid audit ledger database security evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0070_stdio_database_security_invalid",
        actor_id: "agent.codex",
        session_id: "sess_bp0070_stdio",
        approval_evidence: { mode: "valid" },
        security_evidence: { mode: "unsafe_scope_roles_tests" },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0070_stdio_database_security_invalid",
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
    expect(JSON.stringify(result)).not.toContain("unscoped_select_allowed");
    expect(JSON.stringify(result)).not.toContain("unapproved_ddl");
  });

  it("routes audit writer persistence preflight through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0064_stdio_preflight",
        actor_id: "agent.codex",
        session_id: "sess_bp0064_stdio",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.audit_ledger_writer_persistence_preflight.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0064_stdio_preflight",
        preflight: {
          contract_id: "lnsat.audit.audit_ledger_writer_persistence_preflight.v0_1",
          storage_target: "audit_events.v0_1",
          writer_interface_ref: {
            contract_id: "lnsat.audit.audit_ledger_writer_interface.v0_1",
            operation: "ledger.record.append",
          },
          policy_gate_ref: {
            contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
            decision: "approval_required",
            requires_approval: true,
          },
          approval_request_ref: {
            contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
            approval_kind: "ledger_state_change",
          },
          idempotency: {
            duplicate_behavior: "exact_replay_returns_existing_ref",
            collision_behavior: "fail_closed",
          },
          live_execution_allowed: false,
          side_effects: [],
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid audit writer persistence preflight approval evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0064_stdio_preflight_invalid",
        approval_evidence: { mode: "secret:lnsat/demo/api-token" },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0064_stdio_preflight_invalid",
        request_errors: [
          {
            code: "audit_ledger_writer_persistence_preflight.invalid_approval_evidence",
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
    expect(JSON.stringify(result)).not.toContain("secret:lnsat/demo/api-token");
  });

  it("routes audit ledger writer interface through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAuditLedgerWriterInterfaceToolContract.tool,
      arguments: {
        request_id: "req_bp0057_stdio_writer_interface",
        actor_id: "agent.codex",
        session_id: "sess_bp0057_stdio",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerWriterInterfaceToolContract.tool,
      gateway_contract_id: "lnsat.gateway.audit_ledger_writer_interface.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0057_stdio_writer_interface",
        writer_interface: {
          contract_id: "lnsat.audit.audit_ledger_writer_interface.v0_1",
          operation: "ledger.record.append",
          policy_gate_ref: {
            contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
            decision: "approval_required",
            requires_approval: true,
          },
          approval_ref: {
            contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
            approval_kind: "ledger_state_change",
          },
          idempotency: {
            duplicate_behavior: "exact_replay_returns_existing_ref",
            collision_behavior: "fail_closed",
          },
          live_execution_allowed: false,
          side_effects: [],
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps missing audit ledger writer interface approval evidence fail-closed through built stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAuditLedgerWriterInterfaceToolContract.tool,
      arguments: {
        request_id: "req_bp0057_stdio_writer_interface_missing_approval",
        actor_id: "agent.codex",
        session_id: "sess_bp0057_stdio",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0057_stdio_writer_interface_missing_approval",
        writer_errors: [
          {
            code: "audit_ledger_writer.approval_request_required",
            path: "/approval_request",
          },
        ],
        writer_interface: null,
        raw_input_content: "withheld",
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("routes audit ledger migration approval preview through built lnsat-mcp-stdio", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      arguments: {
        request_id: "req_bp0051_stdio_migration_preview",
        actor_id: "agent.codex",
        session_id: "sess_bp0051_stdio",
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      gateway_contract_id: "lnsat.gateway.audit_ledger_migration_approval_preview.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0051_stdio_migration_preview",
        operation: "writer.migrate",
        policy_gate_decision: {
          operation: "writer.migrate",
          decision: "approval_required",
          requires_approval: true,
          side_effects: [],
        },
        approval_request: {
          approval_kind: "audit_ledger_migration",
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

  it("keeps malformed audit ledger migration approval preview stdio calls fail-closed without command echo", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      arguments: {
        request_id: "req_bp0051_stdio_migration_preview_bad_shape",
        command: "psql $DATABASE_URL -f migration.sql",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0051_stdio_migration_preview_bad_shape",
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
    });
    expect(JSON.stringify(result)).not.toContain("psql");
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("migration.sql");
  });

  it("routes onboarding ContextPacket inspection calls through Gateway inspection", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpOnboardingContextInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0032_stdio_context",
        session_id: "sess_onboarding_context_0001",
        created_at: "2026-05-04T00:00:00.000Z",
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpOnboardingContextInspectionToolContract.tool,
      gateway_contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0032_stdio_context",
        packet_ref: {
          packet_id: "pkt_onboarding_context_lnsat_agent_codex",
          packet_type: "ContextPacket",
          packet_hash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        },
        validation: {
          ok: true,
          errors: [],
        },
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("keeps malformed onboarding ContextPacket stdio calls fail-closed without command echo", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpOnboardingContextInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0032_stdio_context_bad_shape",
        command: "rm -rf /",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0032_stdio_context_bad_shape",
        request_errors: [
          expect.objectContaining({
            code: "onboarding_context_inspection.unexpected_field",
            path: "/command",
          }),
        ],
        raw_input_content: "withheld",
        side_effects: [],
      },
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("rm -rf /");
  });

  it("keeps onboarding ContextPacket stdio compiler failures fail-closed without raw value echo", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpOnboardingContextInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0032_stdio_context_bad_created_at",
        created_at: "secret:lnsat/demo/api-token",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0032_stdio_context_bad_created_at",
        compiler_errors: [
          expect.objectContaining({
            code: "onboarding_context.invalid_created_at",
            path: "/created_at",
          }),
        ],
        trusted_source_refs: [],
        packet_ref: null,
        raw_input_content: "withheld",
        side_effects: [],
      },
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("secret:lnsat/demo/api-token");
    expect(JSON.stringify(result)).not.toContain("redacted-inline-agent-secret");
  });

  it("routes onboarding profile inspection calls through Gateway inspection", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpOnboardingProfileInspectionToolContract.tool,
      arguments: { request_id: "req_bp0026_stdio_profiles" },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpOnboardingProfileInspectionToolContract.tool,
      gateway_contract_id: "lnsat.gateway.onboarding_profile_inspection.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0026_stdio_profiles",
        summary: {
          total: 9,
          valid: 2,
          rejected: 7,
          side_effects: [],
        },
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("keeps malformed onboarding profile stdio calls fail-closed without command echo", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpOnboardingProfileInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0026_stdio_bad_shape",
        shell: "npm test -- --runInBand",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0026_stdio_bad_shape",
        errors: [
          expect.objectContaining({
            code: "onboarding_profile.unexpected_field",
            path: "/shell",
          }),
        ],
        side_effects: [],
      },
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("npm test -- --runInBand");
  });

  it("keeps unsupported onboarding profile stdio kinds fail-closed without raw value echo", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpOnboardingProfileInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0026_stdio_bad_kind",
        profile_kind: "agent; shell.exec npm test",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0026_stdio_bad_kind",
        errors: [
          expect.objectContaining({
            code: "onboarding_profile.invalid_profile_kind",
            path: "/profile_kind",
          }),
        ],
        side_effects: [],
      },
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("agent; shell.exec npm test");
    expect(JSON.stringify(result)).not.toContain("shell.exec");
  });

  it("routes build packet state calls through repo-local docs", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpBuildPacketStateToolContract.tool,
      arguments: { request_id: "req_bp0017_stdio", packet_id: "BP-0017" },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpBuildPacketStateToolContract.tool,
      request_id: "req_bp0017_stdio",
      source_docs: expect.arrayContaining([
        "fixtures/project-state/status.json",
        "fixtures/project-state/board.md",
        "fixtures/project-state/packet-log.md",
        "fixtures/project-state/packets/BP-0017.json",
      ]),
      build_state: {
        project: "example-agent-project",
        current_phase: "Evaluation",
      },
      selected_packet: {
        packet_id: "BP-0017",
      },
      side_effects: [],
    });
  });

  it("routes canonical project-state calls through the Gateway contract", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpProjectStateToolContract.tool,
      arguments: {
        request_id: "req_project_state_stdio",
        item_id: "state-item-mcp-inspection",
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpProjectStateToolContract.tool,
      gateway_contract_id: "lnsat.gateway.project_state.v0_1",
      gateway_response: {
        ok: true,
        schema_version: "0.1",
        request_id: "req_project_state_stdio",
        selected_item: {
          item_id: "state-item-mcp-inspection",
          source_path: "fixtures/project-state/items/state-item-mcp-inspection.json",
        },
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("routes valid packet calls through Gateway inspection", async () => {
    const { client } = await createBuiltStdioClient();
    const packet = await readFixture("valid/context-packet.json");
    const result = await client.callTool({
      name: mcpPacketInspectionToolContract.tool,
      arguments: { request_id: "req_bp0016_valid", packet },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpPacketInspectionToolContract.tool,
      gateway_contract_id: "lnsat.gateway.packet_inspection.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0016_valid",
        validation: {
          ok: true,
          errors: [],
        },
        policy_decision: {
          decision: "allow",
        },
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("keeps invalid packet responses fail-closed without secret echo", async () => {
    const { client } = await createBuiltStdioClient();
    const packet = await readFixture("invalid/rejects-secret-value.json");
    const result = await client.callTool({
      name: mcpPacketInspectionToolContract.tool,
      arguments: { request_id: "req_bp0016_secret", packet },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0016_secret",
        packet_ref: null,
        canonical_json: null,
        policy_decision: null,
        validation: {
          ok: false,
          errors: [
            expect.objectContaining({
              code: "packet.secret_value_embedded",
              path: "/constraints/secret_value",
            }),
          ],
        },
        side_effects: [],
      },
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("do-not-store-secret-values");
  });

  it("keeps malformed calls fail-closed without rejected command echo", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpPacketInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0016_bad_shape",
        shell: "npm test -- --runInBand",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0016_bad_shape",
        request_errors: [
          expect.objectContaining({
            code: "gateway.unexpected_field",
            path: "/shell",
          }),
          expect.objectContaining({
            code: "gateway.missing_packet",
            path: "/packet",
          }),
        ],
        validation: {
          ok: false,
          errors: [],
        },
        side_effects: [],
      },
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("npm test -- --runInBand");
  });

  it("keeps malformed build state calls fail-closed without rejected command echo", async () => {
    const { client } = await createBuiltStdioClient();
    const result = await client.callTool({
      name: mcpBuildPacketStateToolContract.tool,
      arguments: {
        request_id: "req_bp0017_stdio_bad_shape",
        shell: "npm test -- --runInBand",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      request_id: "req_bp0017_stdio_bad_shape",
      errors: [
        expect.objectContaining({
          code: "build_state.unexpected_field",
          path: "/shell",
        }),
      ],
      side_effects: [],
    });
    expect(JSON.stringify(result)).not.toContain("npm test -- --runInBand");
  });
});

async function createBuiltStdioClient(): Promise<{ client: Client }> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(process.cwd(), "dist/stdio.js")],
    cwd: process.cwd(),
    stderr: "pipe",
  });
  const client = new Client({
    name: "lnsat-bp0016-stdio-client-smoke",
    version: "0.1.0",
  });

  await client.connect(transport);
  cleanup = async () => {
    await client.close();
  };

  return { client };
}

async function readFixture(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(fixtureRoot, path), "utf8"));
}
