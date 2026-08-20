import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  defaultAdapterInvocationPreflight,
  defaultAdapterInvocationResult,
} from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatOfficialStdioTransport,
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
  mcpOfficialStdioTransportDecision,
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

const now = new Date("2026-05-03T00:00:00.000Z");
const fixtureRoot = join(process.cwd(), "../../packages/packets/fixtures");

let cleanup: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (cleanup !== null) {
    await cleanup();
    cleanup = null;
  }
});

describe("@lnsat/mcp BP-0015 official SDK local stdio transport", () => {
  it("records the approved official SDK dependency path", () => {
    expect(mcpOfficialStdioTransportDecision).toEqual({
      status: "bp-0015-official-sdk-local-stdio-transport",
      official_sdk_track: "v2.x",
      official_sdk_package: "@modelcontextprotocol/server",
      official_sdk_version_checked: "2.0.0",
      protocol_version: "2026-07-28",
      protocol_modes: ["legacy", "auto", "2026-07-28"],
      target_transport_import: "@modelcontextprotocol/server/stdio",
      target_server_import: "@modelcontextprotocol/server",
      dependency_step: {
        approval_required: true,
        approved_in_bp0015: true,
        package_install_performed: true,
        peer_packages: [
          "@modelcontextprotocol/core",
          "@modelcontextprotocol/node",
          "zod",
          "@cfworker/json-schema",
        ],
        reason:
          "Approved MCP 2026 migration pins official split v2 packages and retains bounded legacy compatibility.",
      },
      local_transport:
        "official StdioServerTransport over BP-0013 read-only server registration; no network listener or live deployment",
      side_effects: [],
    });
  });

  it("constructs the official local stdio transport without starting it", () => {
    expect(createLnsatOfficialStdioTransport()).toBeInstanceOf(StdioServerTransport);
  });

  it("exposes a local official stdio process entrypoint", async () => {
    const packageJson = JSON.parse(
      await readFile(join(process.cwd(), "package.json"), "utf8"),
    );

    expect(packageJson.bin).toEqual({
      "lnsat-mcp-stdio": "dist/stdio.js",
    });
  });

  it("lists only the registered read-only tools through the official SDK server", async () => {
    const { client } = await createConnectedSdkClient();
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
      title: "Inspect LNSAT packet",
      description:
        "Read-only packet inspection through the LNSAT Gateway packet inspection contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[1]).toMatchObject({
      name: "lnsat.project.state.inspect.v0_1",
      title: "Inspect LNSAT project state",
      description:
        "Versioned read-only project-state inspection sourced from synthetic public fixtures.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[2]).toMatchObject({
      name: mcpBuildPacketStateToolContract.tool,
      title: "Read LNSAT build packet state",
      description: "Read-only project state sourced from synthetic public fixtures.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[3]).toMatchObject({
      name: mcpOnboardingProfileInspectionToolContract.tool,
      title: "Inspect LNSAT onboarding profiles",
      description:
        "Read-only onboarding profile inspection through the LNSAT Gateway onboarding profile inspection contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[4]).toMatchObject({
      name: mcpOnboardingContextInspectionToolContract.tool,
      title: "Inspect LNSAT onboarding ContextPacket",
      description:
        "Read-only onboarding ContextPacket inspection through the LNSAT Gateway onboarding ContextPacket inspection contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[5]).toMatchObject({
      name: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      title: "Inspect audit ledger migration approval preview",
      description:
        "Read-only audit ledger migration approval preview inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[6]).toMatchObject({
      name: mcpAuditLedgerWriterInterfaceToolContract.tool,
      title: "Inspect audit ledger writer interface",
      description:
        "Read-only audit ledger writer interface inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[7]).toMatchObject({
      name: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      title: "Inspect audit writer persistence preflight",
      description:
        "Read-only audit writer persistence preflight inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[8]).toMatchObject({
      name: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      title: "Inspect audit ledger database security preflight",
      description:
        "Read-only audit ledger database security preflight inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[9]).toMatchObject({
      name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      title: "Inspect audit ledger persistence readiness",
      description:
        "Read-only audit ledger persistence readiness inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[10]).toMatchObject({
      name: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      title: "Inspect audit ledger persistence scope request",
      description:
        "Read-only audit ledger persistence scope request inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[11]).toMatchObject({
      name: mcpHardwareInventoryInspectionToolContract.tool,
      title: "Inspect caller-supplied hardware inventory",
      description:
        "Read-only caller-supplied hardware inventory inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[12]).toMatchObject({
      name: "lnsat.hardware.allocation.recommendation.inspect",
      title: "Inspect caller-supplied hardware allocation recommendation request",
      description:
        "Read-only caller-supplied HAE recommendation inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[13]).toMatchObject({
      name: "lnsat.performance.telemetry.inspect",
      title: "Inspect caller-supplied performance telemetry",
      description:
        "Read-only caller-supplied performance telemetry inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[14]).toMatchObject({
      name: mcpServiceDatabaseInventoryToolContract.tool,
      title: "Inspect service and database inventory",
      description:
        "Read-only service and database inventory inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[15]).toMatchObject({
      name: mcpSubstrateControlIntentToolContract.tool,
      title: "Inspect substrate control intent",
      description:
        "Read-only substrate control intent inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[16]).toMatchObject({
      name: mcpCapabilityBrokerRequestToolContract.tool,
      title: "Inspect capability broker request",
      description:
        "Read-only capability broker request inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[17]).toMatchObject({
      name: mcpSubstrateAdapterManifestToolContract.tool,
      title: "Inspect substrate adapter manifest",
      description:
        "Read-only substrate adapter manifest inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[18]).toMatchObject({
      name: mcpAdapterInvocationPreflightToolContract.tool,
      title: "Inspect adapter invocation preflight",
      description:
        "Read-only adapter invocation preflight inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[19]).toMatchObject({
      name: mcpAdapterInvocationResultToolContract.tool,
      title: "Inspect adapter invocation result",
      description:
        "Read-only adapter invocation result inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[20]).toMatchObject({
      name: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      title: "Inspect adapter invocation authorization bundle",
      description:
        "Read-only adapter invocation authorization bundle inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[21]).toMatchObject({
      name: mcpRuntimeAdapterReadinessGateToolContract.tool,
      title: "Inspect runtime adapter readiness gate",
      description:
        "Read-only runtime adapter readiness gate inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[22]).toMatchObject({
      name: mcpRuntimeAdapterImplementationScopeToolContract.tool,
      title: "Inspect runtime adapter implementation scope",
      description:
        "Read-only runtime adapter implementation scope inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[23]).toMatchObject({
      name: mcpRuntimeAdapterImplementationPlanToolContract.tool,
      title: "Inspect runtime adapter implementation plan",
      description:
        "Read-only runtime adapter implementation plan inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[24]).toMatchObject({
      name: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      title: "Inspect runtime adapter implementation authorization request",
      description:
        "Read-only runtime adapter implementation authorization request inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[25]).toMatchObject({
      name: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      title: "Inspect runtime adapter implementation approval gate",
      description:
        "Read-only runtime adapter implementation approval gate inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[26]).toMatchObject({
      name: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      title: "Inspect runtime adapter implementation dry-run evidence",
      description:
        "Read-only runtime adapter implementation dry-run evidence inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[27]).toMatchObject({
      name: mcpKnowledgeSurfaceToolContract.tool,
      title: "Inspect LNSAT knowledge surface",
      description:
        "Read-only source, search, and context inspection through LNSAT Gateway knowledge contracts.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tools.tools[28]).toMatchObject({
      name: mcpAgentContextFirewallToolContract.tool,
      title: "Inspect agent context firewall",
      description:
        "Read-only agent context firewall inspection through the LNSAT Gateway contract.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
  });

  it("routes runtime adapter implementation approval gate through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      arguments: {
        request_id: "req_bp0160_sdk_runtime_adapter_implementation_approval_gate",
        approval_gate_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0160",
              summary:
                "Official SDK registration preserves runtime adapter implementation approval gate evidence",
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
        request_id: "req_bp0160_sdk_runtime_adapter_implementation_approval_gate",
        inspected_at: "2026-05-03T00:00:00.000Z",
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

  it("keeps invalid runtime adapter implementation approval gate SDK calls fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      arguments: {
        request_id:
          "req_bp0160_sdk_runtime_adapter_implementation_approval_gate_invalid",
        command: "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id:
          "req_bp0160_sdk_runtime_adapter_implementation_approval_gate_invalid",
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

  it("routes runtime adapter implementation dry-run evidence through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      arguments: {
        request_id: "req_bp0167_sdk_runtime_adapter_implementation_dry_run",
        dry_run_evidence_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0167",
              summary:
                "Official SDK registration preserves runtime adapter implementation dry-run evidence",
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
        request_id: "req_bp0167_sdk_runtime_adapter_implementation_dry_run",
        inspected_at: "2026-05-03T00:00:00.000Z",
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

  it("keeps invalid runtime adapter implementation dry-run evidence SDK calls fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      arguments: {
        request_id: "req_bp0167_sdk_runtime_adapter_implementation_dry_run_invalid",
        command: "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0167_sdk_runtime_adapter_implementation_dry_run_invalid",
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

  it("routes service database inventory through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpServiceDatabaseInventoryToolContract.tool,
      arguments: {
        request_id: "req_bp0094_sdk_service_database_inventory",
        inventory_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0094",
              summary: "Official SDK registration preserves inventory evidence",
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
        request_id: "req_bp0094_sdk_service_database_inventory",
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
          "ticket:BP-0094: Official SDK registration preserves inventory evidence",
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

  it("keeps invalid service database inventory SDK calls fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpServiceDatabaseInventoryToolContract.tool,
      arguments: {
        request_id: "req_bp0094_sdk_service_database_inventory_invalid",
        command: "psql postgres://user:password@host/db -c 'drop table audit_events'",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0094_sdk_service_database_inventory_invalid",
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

  it("routes substrate control intent through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpSubstrateControlIntentToolContract.tool,
      arguments: {
        request_id: "req_bp0100_sdk_substrate_control_intent",
        intent_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0100",
              summary:
                "Official SDK registration preserves substrate control intent evidence",
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
        request_id: "req_bp0100_sdk_substrate_control_intent",
        inspected_at: "2026-05-03T00:00:00.000Z",
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
          "ticket:BP-0100: Official SDK registration preserves substrate control intent evidence",
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

  it("keeps invalid substrate control intent SDK calls fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpSubstrateControlIntentToolContract.tool,
      arguments: {
        request_id: "req_bp0100_sdk_substrate_control_intent_invalid",
        intent_request: {
          live_substrate_mutation_allowed: true,
          live_execution_allowed: true,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and run raw command",
            },
          ],
          side_effects: [{ effect_type: "service_restart" }],
          command: "ssh host 'sudo systemctl restart lnsat'",
        },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0100_sdk_substrate_control_intent_invalid",
        intent_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "substrate_control_intent.live_substrate_mutation_forbidden",
          }),
          expect.objectContaining({
            code: "substrate_control_intent.live_execution_forbidden",
          }),
          expect.objectContaining({
            code: "substrate_control_intent.secret_value_forbidden",
          }),
          expect.objectContaining({
            code: "substrate_control_intent.side_effects_forbidden",
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
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("ssh host");
    expect(JSON.stringify(result)).not.toContain("service_restart");
  });

  it("routes capability broker request through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpCapabilityBrokerRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0106_sdk_capability_broker_request",
        broker_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0106",
              summary:
                "Official SDK registration preserves capability broker request evidence",
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
        request_id: "req_bp0106_sdk_capability_broker_request",
        inspected_at: "2026-05-03T00:00:00.000Z",
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
        source_refs: expect.arrayContaining([
          "ticket:BP-0106: Official SDK registration preserves capability broker request evidence",
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

  it("keeps invalid capability broker request SDK calls fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpCapabilityBrokerRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0106_sdk_capability_broker_request_invalid",
        broker_request: {
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and dispatch raw command",
            },
          ],
          side_effects: [{ effect_type: "dispatch" }],
          command: "capability.broker.dispatch.execute",
        },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0106_sdk_capability_broker_request_invalid",
        broker_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "capability_broker_request.live_broker_dispatch_forbidden",
          }),
          expect.objectContaining({
            code: "capability_broker_request.live_execution_forbidden",
          }),
          expect.objectContaining({
            code: "capability_broker_request.secret_value_forbidden",
          }),
          expect.objectContaining({
            code: "capability_broker_request.side_effects_forbidden",
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
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("capability.broker.dispatch");
    expect(JSON.stringify(result)).not.toContain("dispatch raw command");
  });

  it("routes substrate adapter manifest through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpSubstrateAdapterManifestToolContract.tool,
      arguments: {
        request_id: "req_bp0112_sdk_substrate_adapter_manifest",
        manifest_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0112",
              summary:
                "Official SDK registration preserves substrate adapter manifest evidence",
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
        request_id: "req_bp0112_sdk_substrate_adapter_manifest",
        inspected_at: "2026-05-03T00:00:00.000Z",
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
        source_refs: expect.arrayContaining([
          "ticket:BP-0112: Official SDK registration preserves substrate adapter manifest evidence",
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

  it("keeps invalid substrate adapter manifest SDK calls fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpSubstrateAdapterManifestToolContract.tool,
      arguments: {
        request_id: "req_bp0112_sdk_substrate_adapter_manifest_invalid",
        manifest_request: {
          live_adapter_invocation_allowed: true,
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and invoke raw adapter command",
            },
          ],
          side_effects: [{ effect_type: "side_effect_probe" }],
          command: "substrate.adapter.invoke",
        },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0112_sdk_substrate_adapter_manifest_invalid",
        manifest_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "substrate_adapter_manifest.live_adapter_invocation_forbidden",
          }),
          expect.objectContaining({
            code: "substrate_adapter_manifest.live_broker_dispatch_forbidden",
          }),
          expect.objectContaining({
            code: "substrate_adapter_manifest.live_execution_forbidden",
          }),
          expect.objectContaining({
            code: "substrate_adapter_manifest.secret_value_forbidden",
          }),
          expect.objectContaining({
            code: "substrate_adapter_manifest.side_effects_forbidden",
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
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(result)).not.toContain("side_effect_probe");
  });

  it("routes adapter invocation preflight through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAdapterInvocationPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0118_sdk_adapter_invocation_preflight",
        preflight_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0118",
              summary:
                "Official SDK registration preserves adapter invocation preflight evidence",
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
        request_id: "req_bp0118_sdk_adapter_invocation_preflight",
        inspected_at: "2026-05-03T00:00:00.000Z",
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
        source_refs: expect.arrayContaining([
          "ticket:BP-0118: Official SDK registration preserves adapter invocation preflight evidence",
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

  it("keeps invalid adapter invocation preflight SDK calls fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAdapterInvocationPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0118_sdk_adapter_invocation_preflight_invalid",
        preflight_request: {
          ...defaultAdapterInvocationPreflight,
          live_adapter_invocation_allowed: true,
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and invoke raw adapter command",
            },
          ],
          side_effects: [{ effect_type: "side_effect_probe" }],
          command: "substrate.adapter.invoke",
        },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0118_sdk_adapter_invocation_preflight_invalid",
        preflight_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "adapter_invocation_preflight.live_adapter_invocation_forbidden",
          }),
          expect.objectContaining({
            code: "adapter_invocation_preflight.live_broker_dispatch_forbidden",
          }),
          expect.objectContaining({
            code: "adapter_invocation_preflight.live_execution_forbidden",
          }),
          expect.objectContaining({
            code: "adapter_invocation_preflight.secret_value_forbidden",
          }),
          expect.objectContaining({
            code: "adapter_invocation_preflight.side_effects_forbidden",
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
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(result)).not.toContain("side_effect_probe");
  });

  it("routes adapter invocation result through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAdapterInvocationResultToolContract.tool,
      arguments: {
        request_id: "req_bp0124_sdk_adapter_invocation_result",
        result_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0124",
              summary:
                "Official SDK registration preserves adapter invocation result evidence",
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
        request_id: "req_bp0124_sdk_adapter_invocation_result",
        inspected_at: "2026-05-03T00:00:00.000Z",
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
        source_refs: expect.arrayContaining([
          "ticket:BP-0124: Official SDK registration preserves adapter invocation result evidence",
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

  it("keeps invalid adapter invocation result SDK calls fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAdapterInvocationResultToolContract.tool,
      arguments: {
        request_id: "req_bp0124_sdk_adapter_invocation_result_invalid",
        result_request: {
          ...defaultAdapterInvocationResult,
          live_adapter_invocation_allowed: true,
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and invoke raw adapter command",
            },
          ],
          side_effects: [{ effect_type: "side_effect_probe" }],
          command: "substrate.adapter.invoke",
        },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0124_sdk_adapter_invocation_result_invalid",
        result_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "adapter_invocation_result.live_adapter_invocation_forbidden",
          }),
          expect.objectContaining({
            code: "adapter_invocation_result.live_broker_dispatch_forbidden",
          }),
          expect.objectContaining({
            code: "adapter_invocation_result.live_execution_forbidden",
          }),
          expect.objectContaining({
            code: "adapter_invocation_result.secret_value_forbidden",
          }),
          expect.objectContaining({
            code: "adapter_invocation_result.side_effects_forbidden",
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
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(result)).not.toContain("side_effect_probe");
  });

  it("routes adapter invocation authorization bundle through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      arguments: {
        request_id: "req_bp0130_sdk_adapter_invocation_authorization_bundle",
        bundle_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0130",
              summary:
                "Official SDK registration preserves adapter invocation authorization bundle evidence",
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
        request_id: "req_bp0130_sdk_adapter_invocation_authorization_bundle",
        inspected_at: "2026-05-03T00:00:00.000Z",
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
        source_refs: expect.arrayContaining(["ticket:BP-0130"]),
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

  it("keeps invalid adapter invocation authorization bundle SDK calls fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      arguments: {
        request_id: "req_bp0130_sdk_adapter_invocation_authorization_bundle_invalid",
        command: "adapter.invoke.execute TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0130_sdk_adapter_invocation_authorization_bundle_invalid",
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

  it("routes runtime adapter readiness gate through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterReadinessGateToolContract.tool,
      arguments: {
        request_id: "req_bp0136_sdk_runtime_adapter_readiness_gate",
        readiness_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0136",
              summary:
                "Official SDK registration preserves runtime adapter readiness gate evidence",
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
        request_id: "req_bp0136_sdk_runtime_adapter_readiness_gate",
        inspected_at: "2026-05-03T00:00:00.000Z",
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
        source_refs: expect.arrayContaining(["ticket:BP-0136"]),
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

  it("keeps invalid runtime adapter readiness gate SDK calls fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpRuntimeAdapterReadinessGateToolContract.tool,
      arguments: {
        request_id: "req_bp0136_sdk_runtime_adapter_readiness_gate_invalid",
        command: "runtime_adapter.dispatch.execute TOKEN=inline-secret",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0136_sdk_runtime_adapter_readiness_gate_invalid",
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

  it("routes audit ledger persistence scope requests through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0080_sdk_persistence_scope_request",
        actor_id: "agent.codex",
        session_id: "sess_bp0080_sdk",
        approval_evidence: { mode: "valid" },
        readiness_source: { mode: "registered_mcp_inspection_evidence" },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      gateway_contract_id: "lnsat.gateway.audit_ledger_persistence_scope_request.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0080_sdk_persistence_scope_request",
        inspected_at: "2026-05-03T00:00:00.000Z",
        scope_request: {
          contract_id: "lnsat.audit.audit_ledger_persistence_scope_request.v0_1",
          readiness_source: {
            kind: "registered_mcp_inspection_evidence",
            tool: "lnsat.audit.ledger.persistence_readiness.inspect",
            registration_packet: "BP-0076",
            read_only_registration: true,
            source_packet_refs: ["BP-0071", "BP-0075", "BP-0076"],
          },
          live_execution_allowed: false,
          side_effects: [],
        },
        minimum_source_evidence_before_live_scope: expect.arrayContaining([
          "BP-0044 audit_events.v0_1 SQL artifact and manifest refs",
          "BP-0058 source-only writer persistence preflight contract",
          "BP-0065 pure database security preflight helper evidence",
          "BP-0076 registered read-only MCP persistence readiness inspection evidence",
        ]),
        source_refs: expect.arrayContaining([
          "packet:BP-0044",
          "packet:BP-0058",
          "packet:BP-0065",
          "packet:BP-0076",
          "packet:BP-0077",
        ]),
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid audit ledger persistence scope SDK calls fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0080_sdk_persistence_scope_request_invalid",
        actor_id: "agent.codex",
        session_id: "sess_bp0080_sdk",
        approval_evidence: { mode: "valid" },
        readiness_source: { mode: "invalid_mcp_readiness_source" },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0080_sdk_persistence_scope_request_invalid",
        scope_request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "audit_ledger_persistence_scope_request.readiness_source_required",
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
    expect(JSON.stringify(result)).not.toContain("lnsat.audit.ledger.writer.append");
  });

  it("routes audit ledger persistence readiness through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      arguments: {
        request_id: "req_bp0076_sdk_persistence_readiness",
        actor_id: "agent.codex",
        session_id: "sess_bp0076_sdk",
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
        request_id: "req_bp0076_sdk_persistence_readiness",
        inspected_at: "2026-05-03T00:00:00.000Z",
        gate: {
          contract_id:
            "lnsat.audit.audit_ledger_persistence_implementation_readiness_gate.v0_1",
          reviewed_source_chain: {
            layer_refs: expect.arrayContaining([
              {
                packet: "BP-0069",
                layer: "mcp_adapter",
                source_ref:
                  "packages/mcp/src/index.ts:inspectAuditLedgerDatabaseSecurityPreflightThroughMcpAdapterContract",
              },
              {
                packet: "BP-0070",
                layer: "mcp_registration",
                source_ref:
                  "packages/mcp/src/index.ts:mcpAuditLedgerDatabaseSecurityPreflightToolRegistration",
              },
            ]),
          },
          live_execution_allowed: false,
          side_effects: [],
        },
        minimum_source_evidence_before_live_scope: expect.arrayContaining([
          "BP-0044 audit_events.v0_1 SQL artifact and manifest refs",
          "BP-0058 source-only writer persistence preflight contract",
          "BP-0065 pure database security preflight helper evidence",
          "BP-0070 read-only MCP registration evidence for database security preflight",
        ]),
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid audit ledger persistence readiness evidence fail-closed through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      arguments: {
        request_id: "req_bp0076_sdk_persistence_readiness_invalid",
        actor_id: "agent.codex",
        session_id: "sess_bp0076_sdk",
        approval_evidence: { mode: "valid" },
        readiness_evidence: { mode: "missing_database_security" },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0076_sdk_persistence_readiness_invalid",
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

  it("routes audit ledger database security preflight through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0070_sdk_database_security",
        actor_id: "agent.codex",
        session_id: "sess_bp0070_sdk",
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
        request_id: "req_bp0070_sdk_database_security",
        inspected_at: "2026-05-03T00:00:00.000Z",
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
          role_boundaries: {
            writer_role: {
              forbidden_grants: expect.arrayContaining([
                "update",
                "delete",
                "truncate",
                "superuser",
                "bypassrls",
                "unscoped_select",
              ]),
            },
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

  it("keeps invalid audit ledger database security SDK calls fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0070_sdk_database_security_invalid",
        actor_id: "agent.codex",
        session_id: "sess_bp0070_sdk",
        approval_evidence: { mode: "valid" },
        security_evidence: { mode: "unsafe_scope_roles_tests" },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0070_sdk_database_security_invalid",
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

  it("routes audit writer persistence preflight through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0064_sdk_preflight",
        actor_id: "agent.codex",
        session_id: "sess_bp0064_sdk",
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
        request_id: "req_bp0064_sdk_preflight",
        inspected_at: "2026-05-03T00:00:00.000Z",
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
        approval_request_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
          approval_kind: "ledger_state_change",
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid audit writer persistence preflight SDK calls fail-closed without approval value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0064_sdk_preflight_invalid",
        approval_evidence: { mode: "secret:lnsat/demo/api-token" },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0064_sdk_preflight_invalid",
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

  it("routes audit ledger writer interface through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAuditLedgerWriterInterfaceToolContract.tool,
      arguments: {
        request_id: "req_bp0057_sdk_writer_interface",
        actor_id: "agent.codex",
        session_id: "sess_bp0057_sdk",
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
        request_id: "req_bp0057_sdk_writer_interface",
        inspected_at: "2026-05-03T00:00:00.000Z",
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
        approval_request_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
          approval_kind: "ledger_state_change",
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid audit ledger writer interface SDK calls fail-closed without approval value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAuditLedgerWriterInterfaceToolContract.tool,
      arguments: {
        request_id: "req_bp0057_sdk_writer_interface_invalid",
        approval_evidence: { mode: "secret:lnsat/demo/api-token" },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0057_sdk_writer_interface_invalid",
        request_errors: [
          {
            code: "audit_ledger_writer_interface.invalid_approval_evidence",
            path: "/approval_evidence/mode",
            severity: "error",
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
    expect(JSON.stringify(result)).not.toContain("secret:lnsat/demo/api-token");
  });

  it("routes audit ledger migration approval preview through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      arguments: {
        request_id: "req_bp0051_sdk_migration_preview",
        actor_id: "agent.codex",
        session_id: "sess_bp0051_sdk",
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      gateway_contract_id: "lnsat.gateway.audit_ledger_migration_approval_preview.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0051_sdk_migration_preview",
        inspected_at: "2026-05-03T00:00:00.000Z",
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

  it("keeps malformed audit ledger migration approval preview SDK calls fail-closed without raw command echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      arguments: {
        request_id: "req_bp0051_sdk_migration_preview_bad_shape",
        command: "psql $DATABASE_URL -f migration.sql",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0051_sdk_migration_preview_bad_shape",
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

  it("routes onboarding ContextPacket inspection through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpOnboardingContextInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0032_sdk_context",
        session_id: "sess_onboarding_context_0001",
        created_at: "2026-05-03T00:00:00.000Z",
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpOnboardingContextInspectionToolContract.tool,
      gateway_contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0032_sdk_context",
        inspected_at: "2026-05-03T00:00:00.000Z",
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

  it("keeps malformed onboarding ContextPacket SDK calls fail-closed without command echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpOnboardingContextInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0032_sdk_context_bad_shape",
        command: "rm -rf /",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0032_sdk_context_bad_shape",
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

  it("keeps onboarding ContextPacket SDK compiler failures fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpOnboardingContextInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0032_sdk_context_bad_created_at",
        created_at: "secret:lnsat/demo/api-token",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0032_sdk_context_bad_created_at",
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

  it("routes onboarding profile inspection through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpOnboardingProfileInspectionToolContract.tool,
      arguments: { request_id: "req_bp0026_sdk_profiles" },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpOnboardingProfileInspectionToolContract.tool,
      gateway_contract_id: "lnsat.gateway.onboarding_profile_inspection.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0026_sdk_profiles",
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

  it("keeps malformed onboarding profile SDK calls fail-closed without command echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpOnboardingProfileInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0026_sdk_bad_shape",
        shell: "npm test -- --runInBand",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0026_sdk_bad_shape",
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

  it("keeps unsupported onboarding profile SDK kinds fail-closed without raw value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpOnboardingProfileInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0026_sdk_bad_kind",
        profile_kind: "agent; shell.exec npm test",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0026_sdk_bad_kind",
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

  it("reads build packet state through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpBuildPacketStateToolContract.tool,
      arguments: { request_id: "req_bp0017_sdk", packet_id: "BP-0017" },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpBuildPacketStateToolContract.tool,
      request_id: "req_bp0017_sdk",
      build_state: {
        project: "example-agent-project",
        current_phase: "Evaluation",
      },
      selected_packet: {
        packet_id: "BP-0017",
        source_path: "fixtures/project-state/packets/BP-0017.json",
      },
      side_effects: [],
    });
  });

  it("inspects canonical project state through official SDK registration", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpProjectStateToolContract.tool,
      arguments: {
        request_id: "req_project_state_sdk",
        item_id: "state-item-api-inspection",
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
        request_id: "req_project_state_sdk",
        selected_item: {
          item_id: "state-item-api-inspection",
          source_path: "fixtures/project-state/items/state-item-api-inspection.json",
        },
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("keeps malformed build packet state calls fail-closed without command echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpBuildPacketStateToolContract.tool,
      arguments: {
        request_id: "req_bp0017_sdk_bad_shape",
        shell: "npm test -- --runInBand",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      request_id: "req_bp0017_sdk_bad_shape",
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

  it("calls valid packets through official SDK registration and Gateway inspection", async () => {
    const { client } = await createConnectedSdkClient();
    const packet = await readFixture("valid/context-packet.json");
    const result = await client.callTool({
      name: mcpPacketInspectionToolContract.tool,
      arguments: { request_id: "req_bp0015_valid", packet },
    });

    const structured = result.structuredContent as Record<string, unknown>;
    expect(result.isError).toBe(false);
    expect(structured).toMatchObject({
      ok: true,
      tool: mcpPacketInspectionToolContract.tool,
      gateway_contract_id: "lnsat.gateway.packet_inspection.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0015_valid",
        received_at: "2026-05-03T00:00:00.000Z",
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
    expect(
      JSON.parse(result.content[0].type === "text" ? result.content[0].text : "{}"),
    ).toMatchObject({
      ok: true,
      gateway_response: {
        ok: true,
        request_id: "req_bp0015_valid",
      },
    });
  });

  it("keeps invalid packet responses fail-closed without secret echo", async () => {
    const { client } = await createConnectedSdkClient();
    const packet = await readFixture("invalid/rejects-secret-value.json");
    const result = await client.callTool({
      name: mcpPacketInspectionToolContract.tool,
      arguments: { request_id: "req_bp0015_secret", packet },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0015_secret",
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

  it("routes malformed official SDK tool arguments through Gateway validation without command echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpPacketInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0015_bad_shape",
        shell: "npm test",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0015_bad_shape",
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
    expect(JSON.stringify(result)).not.toContain("npm test");
  });
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLnsatOfficialMcpSdkServer({
    now: () => now,
  });
  const client = new Client({
    name: "lnsat-bp0015-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}

async function readFixture(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(fixtureRoot, path), "utf8"));
}
