import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createLnsatReadOnlyMcpServer,
  mcpAdapterInvocationAuthorizationBundleToolContract,
  mcpAuditLedgerDatabaseSecurityPreflightToolContract,
  mcpAuditLedgerMigrationApprovalPreviewToolContract,
  mcpAuditLedgerPersistenceReadinessToolContract,
  mcpAuditLedgerPersistenceScopeRequestToolContract,
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
  mcpServiceDatabaseInventoryToolContract,
  mcpSubstrateAdapterManifestToolContract,
  mcpAdapterInvocationPreflightToolContract,
  mcpSubstrateControlIntentToolContract,
  mcpRuntimeAdapterReadinessGateToolContract,
} from "../src/index.js";

const now = new Date("2026-05-03T00:00:00.000Z");
const fixtureRoot = join(process.cwd(), "../../packages/packets/fixtures");

describe("@lnsat/mcp read-only server registration", () => {
  it("lists only the registered read-only MCP tools", () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });

    const response = server.listTools();

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      status: "bp-0013-read-only-server-registration",
      side_effects: [],
    });
    expect(response.tools.map((tool) => tool.name)).toEqual([
      mcpPacketInspectionToolContract.tool,
      mcpProjectStateToolContract.tool,
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
    expect(response.tools).toHaveLength(29);
    expect(response.tools).toEqual([
      expect.objectContaining({
        name: mcpPacketInspectionToolContract.tool,
        gateway_contract_id: "lnsat.gateway.packet_inspection.v0_1",
        authority: ["lnsat.gateway.packet_inspection.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpProjectStateToolContract.tool,
        authority: ["synthetic-project-state-fixtures"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpBuildPacketStateToolContract.tool,
        authority: ["synthetic-project-state-fixtures"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpOnboardingProfileInspectionToolContract.tool,
        gateway_contract_id: "lnsat.gateway.onboarding_profile_inspection.v0_1",
        authority: ["lnsat.gateway.onboarding_profile_inspection.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpOnboardingContextInspectionToolContract.tool,
        gateway_contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
        authority: ["lnsat.gateway.onboarding_context_packet_inspection.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
        gateway_contract_id:
          "lnsat.gateway.audit_ledger_migration_approval_preview.v0_1",
        authority: ["lnsat.gateway.audit_ledger_migration_approval_preview.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpAuditLedgerWriterInterfaceToolContract.tool,
        gateway_contract_id: "lnsat.gateway.audit_ledger_writer_interface.v0_1",
        authority: ["lnsat.gateway.audit_ledger_writer_interface.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
        gateway_contract_id:
          "lnsat.gateway.audit_ledger_writer_persistence_preflight.v0_1",
        authority: ["lnsat.gateway.audit_ledger_writer_persistence_preflight.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
        gateway_contract_id:
          "lnsat.gateway.audit_ledger_database_security_preflight.v0_1",
        authority: ["lnsat.gateway.audit_ledger_database_security_preflight.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
        gateway_contract_id:
          "lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1",
        authority: ["lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
        gateway_contract_id:
          "lnsat.gateway.audit_ledger_persistence_scope_request.v0_1",
        authority: ["lnsat.gateway.audit_ledger_persistence_scope_request.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: "lnsat.hardware.inventory.inspect",
        gateway_contract_id: "lnsat.gateway.hardware_inventory.inspect.v0_1",
        authority: ["lnsat.gateway.hardware_inventory.inspect.v0_1"],
        supplied_inventory_only: true,
        read_only: true,
        recommendation_only: true,
        node_agent_allowed: false,
        placement_allowed: false,
        telemetry_collection_allowed: false,
        runtime_allowed: false,
        database_write_allowed: false,
        network_access_allowed: false,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        side_effects: [],
      }),
      expect.objectContaining({
        name: "lnsat.hardware.allocation.recommendation.inspect",
        gateway_contract_id:
          "lnsat.gateway.hardware_allocation_recommendation.inspect.v0_1",
        caller_supplied_hae_only: true,
        read_only: true,
        recommendation_only: true,
        simulation_only: true,
        placement_allowed: false,
        drain_allowed: false,
        runtime_allowed: false,
        database_write_allowed: false,
        network_access_allowed: false,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        side_effects: [],
      }),
      expect.objectContaining({
        name: "lnsat.performance.telemetry.inspect",
        gateway_contract_id: "lnsat.gateway.performance_telemetry.inspect.v0_1",
        authority: ["lnsat.gateway.performance_telemetry.inspect.v0_1"],
        supplied_telemetry_only: true,
        read_only: true,
        recommendation_only: true,
        collector_allowed: false,
        node_agent_allowed: false,
        hardware_probe_allowed: false,
        benchmark_execution_allowed: false,
        placement_allowed: false,
        alert_dispatch_allowed: false,
        runtime_allowed: false,
        database_write_allowed: false,
        network_access_allowed: false,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpServiceDatabaseInventoryToolContract.tool,
        gateway_contract_id:
          "lnsat.gateway.service_database_inventory_migration_planner.v0_1",
        authority: ["lnsat.gateway.service_database_inventory_migration_planner.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        live_database_write_allowed: false,
        live_service_mutation_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpSubstrateControlIntentToolContract.tool,
        gateway_contract_id: "lnsat.gateway.substrate_control_intent.v0_1",
        authority: ["lnsat.gateway.substrate_control_intent.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        live_substrate_mutation_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpCapabilityBrokerRequestToolContract.tool,
        gateway_contract_id: "lnsat.gateway.capability_broker_request.v0_1",
        authority: ["lnsat.gateway.capability_broker_request.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpSubstrateAdapterManifestToolContract.tool,
        gateway_contract_id: "lnsat.gateway.substrate_adapter_manifest.v0_1",
        authority: ["lnsat.gateway.substrate_adapter_manifest.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpAdapterInvocationPreflightToolContract.tool,
        gateway_contract_id: "lnsat.gateway.adapter_invocation_preflight.v0_1",
        authority: ["lnsat.gateway.adapter_invocation_preflight.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpAdapterInvocationResultToolContract.tool,
        gateway_contract_id: "lnsat.gateway.adapter_invocation_result.v0_1",
        authority: ["lnsat.gateway.adapter_invocation_result.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
        gateway_contract_id:
          "lnsat.gateway.adapter_invocation_authorization_bundle.v0_1",
        authority: ["lnsat.gateway.adapter_invocation_authorization_bundle.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpRuntimeAdapterReadinessGateToolContract.tool,
        gateway_contract_id: "lnsat.gateway.runtime_adapter_readiness_gate.v0_1",
        authority: ["lnsat.gateway.runtime_adapter_readiness_gate.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpRuntimeAdapterImplementationScopeToolContract.tool,
        gateway_contract_id: "lnsat.gateway.runtime_adapter_implementation_scope.v0_1",
        authority: ["lnsat.gateway.runtime_adapter_implementation_scope.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        implementation_authority: "implementation_scope_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpRuntimeAdapterImplementationPlanToolContract.tool,
        gateway_contract_id: "lnsat.gateway.runtime_adapter_implementation_plan.v0_1",
        authority: ["lnsat.gateway.runtime_adapter_implementation_plan.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        implementation_authority: "implementation_plan_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
        gateway_contract_id:
          "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
        authority: [
          "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
        ],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        implementation_authority:
          "implementation_authorization_request_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
        gateway_contract_id:
          "lnsat.gateway.runtime_adapter_implementation_approval_gate.v0_1",
        authority: ["lnsat.gateway.runtime_adapter_implementation_approval_gate.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        implementation_authority:
          "implementation_approval_gate_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
        gateway_contract_id:
          "lnsat.gateway.runtime_adapter_implementation_dry_run_evidence.v0_1",
        authority: [
          "lnsat.gateway.runtime_adapter_implementation_dry_run_evidence.v0_1",
        ],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        implementation_authority:
          "implementation_dry_run_evidence_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpKnowledgeSurfaceToolContract.tool,
        gateway_contract_ids: [
          "lnsat.gateway.knowledge.sources.v0_1",
          "lnsat.gateway.knowledge.search.v0_1",
          "lnsat.gateway.knowledge.context_compile.v0_1",
        ],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        source_search_context_only: true,
        read_only: true,
        mutation_allowed: false,
        state_changing_tool: false,
        side_effects: [],
      }),
      expect.objectContaining({
        name: mcpAgentContextFirewallToolContract.tool,
        gateway_contract_id: "lnsat.gateway.agent_context_firewall.v0_1",
        authority: ["lnsat.gateway.agent_context_firewall.v0_1"],
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        provider_dispatch_allowed: false,
        runtime_mutation_allowed: false,
        side_effects: [],
      }),
    ]);
  });

  it("calls runtime adapter implementation approval gate through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      arguments: {
        request_id: "req_bp0160_runtime_adapter_implementation_approval_gate_server",
        approval_gate_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0160",
              summary:
                "Registered local MCP inspection preserves runtime adapter implementation approval gate evidence",
            },
          ],
        },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.runtime_adapter_implementation_approval_gate.v0_1",
            gateway_response: {
              ok: true,
              request_id:
                "req_bp0160_runtime_adapter_implementation_approval_gate_server",
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
          },
        },
      ],
    });
  });

  it("keeps invalid runtime adapter implementation approval gate calls fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      arguments: {
        request_id: "req_bp0160_runtime_adapter_implementation_approval_gate_invalid",
        command: "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id:
                "req_bp0160_runtime_adapter_implementation_approval_gate_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("runtime_adapter.implementation");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("calls runtime adapter implementation dry-run evidence through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      arguments: {
        request_id: "req_bp0167_runtime_adapter_implementation_dry_run_server",
        dry_run_evidence_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0167",
              summary:
                "Registered local MCP inspection preserves runtime adapter implementation dry-run evidence",
            },
          ],
        },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.runtime_adapter_implementation_dry_run_evidence.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0167_runtime_adapter_implementation_dry_run_server",
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
          },
        },
      ],
    });
  });

  it("keeps invalid runtime adapter implementation dry-run evidence calls fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      arguments: {
        request_id: "req_bp0167_runtime_adapter_implementation_dry_run_invalid",
        command: "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0167_runtime_adapter_implementation_dry_run_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("runtime_adapter.implementation");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("calls adapter invocation authorization bundle through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      arguments: {
        request_id: "req_bp0130_adapter_invocation_authorization_bundle_server",
        bundle_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0130",
              summary:
                "Registered local MCP inspection preserves adapter invocation authorization bundle evidence",
            },
          ],
        },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.adapter_invocation_authorization_bundle.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0130_adapter_invocation_authorization_bundle_server",
              adapter_invocation_authorization_bundle: {
                contract_id:
                  "lnsat.platform.adapter_invocation_authorization_bundle.v0_1",
                authorization_authority: "authorization_bundle_only_no_invocation",
                live_adapter_invocation_allowed: false,
                live_broker_dispatch_allowed: false,
                live_execution_allowed: false,
                side_effects: [],
              },
              source_refs: expect.arrayContaining(["ticket:BP-0130"]),
              live_adapter_invocation_allowed: false,
              live_broker_dispatch_allowed: false,
              live_execution_allowed: false,
              side_effects: [],
            },
            live_adapter_invocation_allowed: false,
            live_broker_dispatch_allowed: false,
            live_execution_allowed: false,
          },
        },
      ],
    });
  });

  it("keeps invalid adapter invocation authorization bundle calls fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      arguments: {
        request_id: "req_bp0130_adapter_invocation_authorization_bundle_invalid",
        command: "adapter.invoke.execute TOKEN=inline-secret",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0130_adapter_invocation_authorization_bundle_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("adapter.invoke.execute");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("calls runtime adapter readiness gate through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpRuntimeAdapterReadinessGateToolContract.tool,
      arguments: {
        request_id: "req_bp0136_runtime_adapter_readiness_gate_server",
        readiness_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0136",
              summary:
                "Registered local MCP inspection preserves runtime adapter readiness gate evidence",
            },
          ],
        },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpRuntimeAdapterReadinessGateToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpRuntimeAdapterReadinessGateToolContract.tool,
            gateway_contract_id: "lnsat.gateway.runtime_adapter_readiness_gate.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0136_runtime_adapter_readiness_gate_server",
              runtime_adapter_readiness_gate: {
                contract_id: "lnsat.platform.runtime_adapter_readiness_gate.v0_1",
                readiness_authority: "readiness_gate_only_no_runtime_invocation",
                runtime_adapter_dispatch_allowed: false,
                live_adapter_invocation_allowed: false,
                live_broker_dispatch_allowed: false,
                live_execution_allowed: false,
                side_effects: [],
              },
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
          },
        },
      ],
    });
  });

  it("keeps invalid runtime adapter readiness gate calls fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpRuntimeAdapterReadinessGateToolContract.tool,
      arguments: {
        request_id: "req_bp0136_runtime_adapter_readiness_gate_invalid",
        command: "runtime_adapter.dispatch.execute TOKEN=inline-secret",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpRuntimeAdapterReadinessGateToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0136_runtime_adapter_readiness_gate_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("runtime_adapter.dispatch");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("calls service database inventory through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpServiceDatabaseInventoryToolContract.tool,
      arguments: {
        request_id: "req_bp0094_service_database_inventory_server",
        inventory_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0094",
              summary: "Registered local MCP inspection preserves inventory evidence",
            },
          ],
        },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpServiceDatabaseInventoryToolContract.tool,
      is_error: false,
      side_effects: [],
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
                "ticket:BP-0094: Registered local MCP inspection preserves inventory evidence",
              ]),
              live_database_write_allowed: false,
              live_service_mutation_allowed: false,
              side_effects: [],
            },
            live_database_write_allowed: false,
            live_service_mutation_allowed: false,
          },
        },
      ],
    });
  });

  it("keeps invalid service database inventory calls fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpServiceDatabaseInventoryToolContract.tool,
      arguments: {
        request_id: "req_bp0094_service_database_inventory_invalid",
        command: "psql postgres://user:password@host/db -c 'drop table audit_events'",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpServiceDatabaseInventoryToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0094_service_database_inventory_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("postgres://");
    expect(JSON.stringify(response)).not.toContain("password");
    expect(JSON.stringify(response)).not.toContain("drop table");
  });

  it("calls substrate control intent through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpSubstrateControlIntentToolContract.tool,
      arguments: {
        request_id: "req_bp0100_substrate_control_intent_server",
        intent_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0100",
              summary:
                "Registered local MCP inspection preserves substrate control intent evidence",
            },
          ],
        },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpSubstrateControlIntentToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpSubstrateControlIntentToolContract.tool,
            gateway_contract_id: "lnsat.gateway.substrate_control_intent.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0100_substrate_control_intent_server",
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
              blocked_live_actions: expect.arrayContaining([
                "substrate.mutation.execute",
                "runtime.execution.start",
                "database.write.execute",
                "service.restart.execute",
                "dns.cloudflare.write",
                "ssh.raw.execute",
                "docker.runner.start",
                "node_agent.exec",
                "git.command.execute",
              ]),
              source_refs: expect.arrayContaining([
                "ticket:BP-0100: Registered local MCP inspection preserves substrate control intent evidence",
              ]),
              live_substrate_mutation_allowed: false,
              live_execution_allowed: false,
              side_effects: [],
            },
            live_substrate_mutation_allowed: false,
            live_execution_allowed: false,
          },
        },
      ],
    });
  });

  it("keeps invalid substrate control intent calls fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpSubstrateControlIntentToolContract.tool,
      arguments: {
        request_id: "req_bp0100_substrate_control_intent_invalid",
        command: "ssh host 'sudo systemctl restart lnsat'",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpSubstrateControlIntentToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0100_substrate_control_intent_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("ssh host");
    expect(JSON.stringify(response)).not.toContain("systemctl restart");
  });

  it("calls capability broker request through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpCapabilityBrokerRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0106_capability_broker_request_server",
        broker_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0106",
              summary:
                "Registered local MCP inspection preserves capability broker request evidence",
            },
          ],
        },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpCapabilityBrokerRequestToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpCapabilityBrokerRequestToolContract.tool,
            gateway_contract_id: "lnsat.gateway.capability_broker_request.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0106_capability_broker_request_server",
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
                "ticket:BP-0106: Registered local MCP inspection preserves capability broker request evidence",
              ]),
              live_broker_dispatch_allowed: false,
              live_execution_allowed: false,
              side_effects: [],
            },
            live_broker_dispatch_allowed: false,
            live_execution_allowed: false,
          },
        },
      ],
    });
  });

  it("keeps invalid capability broker request calls fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpCapabilityBrokerRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0106_capability_broker_request_invalid",
        command: "capability.broker.dispatch.execute TOKEN=inline-secret",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpCapabilityBrokerRequestToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0106_capability_broker_request_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("capability.broker.dispatch");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("calls substrate adapter manifest through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpSubstrateAdapterManifestToolContract.tool,
      arguments: {
        request_id: "req_bp0112_substrate_adapter_manifest_server",
        manifest_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0112",
              summary:
                "Registered local MCP inspection preserves substrate adapter manifest evidence",
            },
          ],
        },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpSubstrateAdapterManifestToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpSubstrateAdapterManifestToolContract.tool,
            gateway_contract_id: "lnsat.gateway.substrate_adapter_manifest.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0112_substrate_adapter_manifest_server",
              substrate_adapter_manifest: {
                contract_id: "lnsat.platform.substrate_adapter_manifest.v0_1",
                adapter_class: "service_control_adapter",
                adapter_authority: "manifest_only_no_invocation",
                live_adapter_invocation_allowed: false,
                live_broker_dispatch_allowed: false,
                live_execution_allowed: false,
                side_effects: [],
              },
              supported_substrate_kinds: ["services"],
              supported_control_modes: [
                "approval_gated_mutation",
                "observation",
                "proposal",
              ],
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
                "ticket:BP-0112: Registered local MCP inspection preserves substrate adapter manifest evidence",
              ]),
              live_adapter_invocation_allowed: false,
              live_broker_dispatch_allowed: false,
              live_execution_allowed: false,
              side_effects: [],
            },
            live_adapter_invocation_allowed: false,
            live_broker_dispatch_allowed: false,
            live_execution_allowed: false,
          },
        },
      ],
    });
  });

  it("keeps invalid substrate adapter manifest calls fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpSubstrateAdapterManifestToolContract.tool,
      arguments: {
        request_id: "req_bp0112_substrate_adapter_manifest_invalid",
        command: "substrate.adapter.invoke TOKEN=inline-secret",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpSubstrateAdapterManifestToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0112_substrate_adapter_manifest_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("calls adapter invocation preflight through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAdapterInvocationPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0118_adapter_invocation_preflight_server",
        preflight_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0118",
              summary:
                "Registered local MCP inspection preserves adapter invocation preflight evidence",
            },
          ],
        },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpAdapterInvocationPreflightToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAdapterInvocationPreflightToolContract.tool,
            gateway_contract_id: "lnsat.gateway.adapter_invocation_preflight.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0118_adapter_invocation_preflight_server",
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
                "ticket:BP-0118: Registered local MCP inspection preserves adapter invocation preflight evidence",
              ]),
              live_adapter_invocation_allowed: false,
              live_broker_dispatch_allowed: false,
              live_execution_allowed: false,
              side_effects: [],
            },
            live_adapter_invocation_allowed: false,
            live_broker_dispatch_allowed: false,
            live_execution_allowed: false,
          },
        },
      ],
    });
  });

  it("keeps invalid adapter invocation preflight calls fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAdapterInvocationPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0118_adapter_invocation_preflight_invalid",
        command: "substrate.adapter.invoke TOKEN=inline-secret",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAdapterInvocationPreflightToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0118_adapter_invocation_preflight_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("calls audit ledger persistence scope request through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0080_persistence_scope_request_server",
        actor_id: "agent.codex",
        session_id: "sess_bp0080_server",
        approval_evidence: { mode: "valid" },
        readiness_source: { mode: "registered_mcp_inspection_evidence" },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.audit_ledger_persistence_scope_request.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0080_persistence_scope_request_server",
              scope_request: {
                contract_id: "lnsat.audit.audit_ledger_persistence_scope_request.v0_1",
                readiness_source: {
                  kind: "registered_mcp_inspection_evidence",
                  tool: "lnsat.audit.ledger.persistence_readiness.inspect",
                  registration_packet: "BP-0076",
                  read_only_registration: true,
                },
                live_execution_allowed: false,
                side_effects: [],
              },
              minimum_source_evidence_before_live_scope: expect.arrayContaining([
                "BP-0044 audit_events.v0_1 SQL artifact and manifest refs",
                "BP-0045 repo-local migration static checker evidence",
                "BP-0076 registered read-only MCP persistence readiness inspection evidence",
                "explicit BP-0077 Gateway-owned source-only scope request before DB or writer scope can be proposed",
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
          },
        },
      ],
    });
  });

  it("keeps invalid audit ledger persistence scope requests fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0080_persistence_scope_request_invalid",
        actor_id: "agent.codex",
        session_id: "sess_bp0080_server",
        approval_evidence: { mode: "valid" },
        readiness_evidence: { mode: "missing_database_security" },
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0080_persistence_scope_request_invalid",
              readiness_errors: expect.arrayContaining([
                expect.objectContaining({
                  code: "audit_ledger_persistence_readiness_gate.database_security_preflight_required",
                }),
              ]),
              scope_request: null,
              raw_input_content: "withheld",
              live_execution_allowed: false,
              side_effects: [],
            },
            live_execution_allowed: false,
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("postgres://inline-secret");
  });

  it("calls audit ledger persistence readiness through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      arguments: {
        request_id: "req_bp0076_persistence_readiness_server",
        actor_id: "agent.codex",
        session_id: "sess_bp0076_server",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAuditLedgerPersistenceReadinessToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0076_persistence_readiness_server",
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
                live_execution_allowed: false,
                side_effects: [],
              },
              minimum_source_evidence_before_live_scope: expect.arrayContaining([
                "BP-0044 audit_events.v0_1 SQL artifact and manifest refs",
                "BP-0045 repo-local migration static checker evidence",
                "BP-0069 read-only MCP adapter evidence for database security preflight",
                "BP-0070 read-only MCP registration evidence for database security preflight",
              ]),
              live_execution_allowed: false,
              side_effects: [],
            },
            live_execution_allowed: false,
          },
        },
      ],
    });
  });

  it("keeps invalid audit ledger persistence readiness evidence fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      arguments: {
        request_id: "req_bp0076_persistence_readiness_invalid",
        actor_id: "agent.codex",
        session_id: "sess_bp0076_server",
        approval_evidence: { mode: "valid" },
        readiness_evidence: { mode: "missing_database_security" },
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0076_persistence_readiness_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("postgres://inline-secret");
  });

  it("calls audit ledger database security preflight through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0070_database_security_server",
        actor_id: "agent.codex",
        session_id: "sess_bp0070_server",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      is_error: false,
      side_effects: [],
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
              request_id: "req_bp0070_database_security_server",
              inspected_at: "2026-05-03T00:00:00.000Z",
              preflight: {
                contract_id:
                  "lnsat.audit.audit_ledger_database_security_preflight.v0_1",
                security_target: {
                  storage_target: "audit_events.v0_1",
                  table: "audit_events",
                },
                persistence_preflight_ref: {
                  contract_id:
                    "lnsat.audit.audit_ledger_writer_persistence_preflight.v0_1",
                  storage_target: "audit_events.v0_1",
                },
                migration_artifact_refs: {
                  sql_artifact:
                    "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
                  manifest_artifact:
                    "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
                  static_checker: "scripts/check-audit-ledger-migrations.mjs",
                  source_packet_refs: expect.arrayContaining([
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
          },
        },
      ],
    });
  });

  it("keeps malformed audit ledger database security preflight calls fail-closed without raw command echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0070_database_security_bad_shape",
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
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0070_database_security_bad_shape",
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
          },
        },
      ],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("disable row level security");
  });

  it("keeps invalid audit ledger database security evidence fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAuditLedgerDatabaseSecurityPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0070_database_security_invalid",
        actor_id: "agent.codex",
        session_id: "sess_bp0070_server",
        approval_evidence: { mode: "valid" },
        security_evidence: { mode: "unsafe_scope_roles_tests" },
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
              request_id: "req_bp0070_database_security_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("unscoped_select_allowed");
    expect(JSON.stringify(response)).not.toContain("unapproved_ddl");
  });

  it("calls audit writer persistence preflight through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0064_preflight_server",
        actor_id: "agent.codex",
        session_id: "sess_bp0064_server",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.audit_ledger_writer_persistence_preflight.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0064_preflight_server",
              inspected_at: "2026-05-03T00:00:00.000Z",
              preflight: {
                contract_id:
                  "lnsat.audit.audit_ledger_writer_persistence_preflight.v0_1",
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
                append_only: {
                  mode: "insert_only",
                  forbidden_mutations: [
                    "update",
                    "delete",
                    "truncate",
                    "in_place_redaction",
                  ],
                },
                redaction: {
                  raw_rejected_command: "not_present",
                  raw_rejected_value: "not_present",
                  raw_invalid_payload_content: "not_present",
                  secret_like_values: "not_present",
                },
                migration_artifact_refs: {
                  sql_artifact:
                    "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
                  manifest_artifact:
                    "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
                  static_checker: "scripts/check-audit-ledger-migrations.mjs",
                  source_packet_refs: [
                    "BP-0039",
                    "BP-0040",
                    "BP-0044",
                    "BP-0045",
                    "BP-0052",
                  ],
                },
                live_execution_allowed: false,
                side_effects: [],
              },
              writer_interface_ref: {
                contract_id: "lnsat.audit.audit_ledger_writer_interface.v0_1",
              },
              approval_request_ref: {
                contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
                approval_kind: "ledger_state_change",
              },
              live_execution_allowed: false,
              side_effects: [],
            },
            live_execution_allowed: false,
          },
        },
      ],
    });
    expect(
      response.ok &&
        response.content[0].json.gateway_response.ok &&
        response.content[0].json.gateway_response.canonical_record_digest,
    ).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("keeps malformed audit writer persistence preflight calls fail-closed without raw command echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0064_preflight_bad_shape",
        command: "psql $DATABASE_URL -c 'delete from audit_events'",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      is_error: true,
      error: null,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0064_preflight_bad_shape",
              request_errors: [
                expect.objectContaining({
                  code: "audit_ledger_writer_persistence_preflight.unexpected_field",
                  path: "/command",
                }),
              ],
              preflight: null,
              raw_input_content: "withheld",
              live_execution_allowed: false,
              side_effects: [],
            },
            live_execution_allowed: false,
          },
        },
      ],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("delete from audit_events");
  });

  it("calls audit ledger writer interface through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAuditLedgerWriterInterfaceToolContract.tool,
      arguments: {
        request_id: "req_bp0057_writer_interface_server",
        actor_id: "agent.codex",
        session_id: "sess_bp0057_server",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpAuditLedgerWriterInterfaceToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAuditLedgerWriterInterfaceToolContract.tool,
            gateway_contract_id: "lnsat.gateway.audit_ledger_writer_interface.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0057_writer_interface_server",
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
                append_only: {
                  mode: "insert_only",
                  forbidden_mutations: [
                    "update",
                    "delete",
                    "truncate",
                    "in_place_redaction",
                  ],
                },
                idempotency: {
                  duplicate_behavior: "exact_replay_returns_existing_ref",
                  collision_behavior: "fail_closed",
                },
                redaction: {
                  raw_rejected_command: "not_present",
                  raw_rejected_value: "not_present",
                  raw_invalid_payload_content: "not_present",
                  secret_like_values: "not_present",
                },
                live_execution_allowed: false,
                side_effects: [],
              },
              policy_gate_ref: {
                contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
                decision: "approval_required",
              },
              approval_request_ref: {
                contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
                approval_kind: "ledger_state_change",
              },
              live_execution_allowed: false,
              side_effects: [],
            },
            live_execution_allowed: false,
          },
        },
      ],
    });
    expect(
      response.ok &&
        response.content[0].json.gateway_response.ok &&
        response.content[0].json.gateway_response.canonical_record_digest,
    ).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("keeps malformed audit ledger writer interface calls fail-closed without raw command echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAuditLedgerWriterInterfaceToolContract.tool,
      arguments: {
        request_id: "req_bp0057_writer_interface_bad_shape",
        command: "psql $DATABASE_URL -c 'delete from audit_events'",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerWriterInterfaceToolContract.tool,
      is_error: true,
      error: null,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0057_writer_interface_bad_shape",
              request_errors: [
                expect.objectContaining({
                  code: "audit_ledger_writer_interface.unexpected_field",
                  path: "/command",
                }),
              ],
              writer_interface: null,
              raw_input_content: "withheld",
              live_execution_allowed: false,
              side_effects: [],
            },
            live_execution_allowed: false,
          },
        },
      ],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("delete from audit_events");
  });

  it("calls audit ledger migration approval preview through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      arguments: {
        request_id: "req_bp0051_migration_preview_server",
        actor_id: "agent.codex",
        session_id: "sess_bp0051_server",
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      is_error: false,
      side_effects: [],
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
              request_id: "req_bp0051_migration_preview_server",
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
          },
        },
      ],
    });
  });

  it("keeps malformed audit ledger migration approval preview calls fail-closed without raw command echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      arguments: {
        request_id: "req_bp0051_migration_preview_bad_shape",
        command: "psql $DATABASE_URL -f migration.sql",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerMigrationApprovalPreviewToolContract.tool,
      is_error: true,
      error: null,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0051_migration_preview_bad_shape",
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
          },
        },
      ],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("migration.sql");
  });

  it("calls onboarding ContextPacket inspection through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpOnboardingContextInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0032_onboarding_context",
        session_id: "sess_onboarding_context_0001",
        created_at: "2026-05-03T00:00:00.000Z",
      },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpOnboardingContextInspectionToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpOnboardingContextInspectionToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0032_onboarding_context",
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
          },
        },
      ],
    });
  });

  it("keeps malformed onboarding ContextPacket calls fail-closed without raw command echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpOnboardingContextInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0032_context_bad_shape",
        command: "rm -rf /",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpOnboardingContextInspectionToolContract.tool,
      is_error: true,
      error: null,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0032_context_bad_shape",
              request_errors: [
                expect.objectContaining({
                  code: "onboarding_context_inspection.unexpected_field",
                  path: "/command",
                }),
              ],
              raw_input_content: "withheld",
              side_effects: [],
            },
          },
        },
      ],
    });
    expect(JSON.stringify(response)).not.toContain("rm -rf /");
  });

  it("keeps onboarding ContextPacket compiler failures fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpOnboardingContextInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0032_context_bad_created_at",
        created_at: "secret:lnsat/demo/api-token",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpOnboardingContextInspectionToolContract.tool,
      is_error: true,
      error: null,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0032_context_bad_created_at",
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
          },
        },
      ],
    });
    expect(JSON.stringify(response)).not.toContain("secret:lnsat/demo/api-token");
    expect(JSON.stringify(response)).not.toContain("redacted-inline-agent-secret");
  });

  it("calls onboarding profile inspection through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpOnboardingProfileInspectionToolContract.tool,
      arguments: { request_id: "req_bp0026_onboarding_profiles" },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpOnboardingProfileInspectionToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpOnboardingProfileInspectionToolContract.tool,
            gateway_contract_id: "lnsat.gateway.onboarding_profile_inspection.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0026_onboarding_profiles",
              summary: {
                total: 9,
                valid: 2,
                rejected: 7,
                side_effects: [],
              },
              side_effects: [],
            },
          },
        },
      ],
    });
  });

  it("keeps malformed onboarding profile calls fail-closed without raw command echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpOnboardingProfileInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0026_bad_shape",
        shell: "npm test -- --runInBand",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpOnboardingProfileInspectionToolContract.tool,
      is_error: true,
      error: null,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0026_bad_shape",
              errors: [
                expect.objectContaining({
                  code: "onboarding_profile.unexpected_field",
                  path: "/shell",
                }),
              ],
              side_effects: [],
            },
          },
        },
      ],
    });
    expect(JSON.stringify(response)).not.toContain("npm test -- --runInBand");
  });

  it("keeps unsupported onboarding profile kinds fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpOnboardingProfileInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0026_bad_kind",
        profile_kind: "agent; shell.exec npm test",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpOnboardingProfileInspectionToolContract.tool,
      is_error: true,
      error: null,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0026_bad_kind",
              errors: [
                expect.objectContaining({
                  code: "onboarding_profile.invalid_profile_kind",
                  path: "/profile_kind",
                }),
              ],
              side_effects: [],
            },
          },
        },
      ],
    });
    expect(JSON.stringify(response)).not.toContain("agent; shell.exec npm test");
    expect(JSON.stringify(response)).not.toContain("shell.exec");
  });

  it("reads build packet state through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpBuildPacketStateToolContract.tool,
      arguments: { request_id: "req_bp0017_server", packet_id: "BP-0017" },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpBuildPacketStateToolContract.tool,
      is_error: false,
      side_effects: [],
    });
    expect(response.ok && response.content[0].json).toMatchObject({
      ok: true,
      tool: mcpBuildPacketStateToolContract.tool,
      request_id: "req_bp0017_server",
      build_state: {
        project: "example-agent-project",
        name: "Example Agent Project",
      },
      selected_packet: {
        packet_id: "BP-0017",
        source_path: "fixtures/project-state/packets/BP-0017.json",
      },
      side_effects: [],
    });
  });

  it("reads project state through the canonical versioned MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpProjectStateToolContract.tool,
      arguments: {
        request_id: "req_project_state",
        item_id: "state-item-mcp-inspection",
      },
    });

    expect(response).toMatchObject({
      ok: true,
      tool: mcpProjectStateToolContract.tool,
      is_error: false,
      side_effects: [],
    });
    expect(response.ok && response.content[0].json).toMatchObject({
      ok: true,
      tool: mcpProjectStateToolContract.tool,
      gateway_contract_id: "lnsat.gateway.project_state.v0_1",
      gateway_response: {
        ok: true,
        schema_version: "0.1",
        request_id: "req_project_state",
        selected_item: {
          item_id: "state-item-mcp-inspection",
        },
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("rejects malformed build packet state calls without raw command echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpBuildPacketStateToolContract.tool,
      arguments: {
        request_id: "req_bp0017_bad_shape",
        shell: "npm test -- --runInBand",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpBuildPacketStateToolContract.tool,
      is_error: true,
      error: null,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: false,
            request_id: "req_bp0017_bad_shape",
            errors: [
              expect.objectContaining({
                code: "build_state.unexpected_field",
                path: "/shell",
              }),
            ],
          },
        },
      ],
    });
    expect(JSON.stringify(response)).not.toContain("npm test -- --runInBand");
  });

  it("calls valid packets through the registered read-only MCP endpoint", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const packet = await readFixture("valid/context-packet.json");
    const response = await server.callTool({
      name: mcpPacketInspectionToolContract.tool,
      arguments: { request_id: "req_bp0013_valid", packet },
    });

    expect(response).toMatchObject({
      ok: true,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: mcpPacketInspectionToolContract.tool,
      is_error: false,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpPacketInspectionToolContract.tool,
            gateway_contract_id: "lnsat.gateway.packet_inspection.v0_1",
            side_effects: [],
            gateway_response: {
              ok: true,
              request_id: "req_bp0013_valid",
              received_at: "2026-05-03T00:00:00.000Z",
              validation: {
                ok: true,
                errors: [],
              },
              policy_decision: {
                decision: "allow",
                requires_approval: false,
              },
            },
          },
        },
      ],
    });
    expect(
      response.ok &&
        response.content[0].json.gateway_response.ok &&
        response.content[0].json.gateway_response.packet_ref.packet_hash,
    ).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("keeps invalid packet responses fail-closed without secret echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const packet = await readFixture("invalid/rejects-secret-value.json");
    const response = await server.callTool({
      name: mcpPacketInspectionToolContract.tool,
      arguments: { request_id: "req_bp0013_secret", packet },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpPacketInspectionToolContract.tool,
      is_error: true,
      error: null,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0013_secret",
              packet_ref: null,
              canonical_json: null,
              policy_decision: null,
              validation: {
                ok: false,
                errors: [
                  expect.objectContaining({
                    code: "packet.secret_value_embedded",
                    path: "/constraints/secret_value",
                    severity: "error",
                  }),
                ],
              },
              side_effects: [],
            },
          },
        },
      ],
    });
    expect(JSON.stringify(response)).not.toContain("do-not-store-secret-values");
  });

  it("routes malformed tool arguments through Gateway validation without raw command echo", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: mcpPacketInspectionToolContract.tool,
      arguments: {
        request_id: "req_bp0013_bad_shape",
        shell: "npm test",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpPacketInspectionToolContract.tool,
      is_error: true,
      error: null,
      side_effects: [],
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0013_bad_shape",
              packet_ref: null,
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
            },
          },
        },
      ],
    });
    expect(JSON.stringify(response)).not.toContain("npm test");
  });

  it("rejects unknown MCP tools without dispatching arguments", async () => {
    const server = createLnsatReadOnlyMcpServer({
      now: () => now,
    });
    const response = await server.callTool({
      name: "shell.exec",
      arguments: {
        shell: "npm test",
      },
    });

    expect(response).toEqual({
      ok: false,
      server_id: "lnsat.mcp.read_only.v0_1",
      tool: null,
      is_error: true,
      content: [],
      error: {
        code: "mcp.unknown_tool",
        path: "/name",
        message: "MCP tool is not registered on this read-only server.",
        severity: "error",
      },
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("shell.exec");
    expect(JSON.stringify(response)).not.toContain("npm test");
  });
});

async function readFixture(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(fixtureRoot, path), "utf8"));
}
