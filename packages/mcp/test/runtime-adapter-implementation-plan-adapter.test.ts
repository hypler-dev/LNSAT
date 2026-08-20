import {
  defaultRuntimeAdapterImplementationPlan,
  runtimeAdapterImplementationPlanContract,
  runtimeAdapterImplementationScopeContract,
  runtimeAdapterReadinessGateContract,
} from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  handleLocalStdioSmokeRequestLine,
  inspectRuntimeAdapterImplementationPlanThroughMcpAdapterContract,
  mcpAdapterInvocationAuthorizationBundleToolContract,
  mcpAdapterInvocationPreflightToolContract,
  mcpAdapterInvocationResultToolContract,
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
  mcpRuntimeAdapterImplementationAuthorizationRequestToolContract,
  mcpRuntimeAdapterImplementationApprovalGateToolContract,
  mcpRuntimeAdapterImplementationDryRunEvidenceToolContract,
  mcpKnowledgeSurfaceToolContract,
  mcpAgentContextFirewallToolContract,
  mcpRuntimeAdapterImplementationPlanToolContract,
  mcpRuntimeAdapterImplementationScopeToolContract,
  mcpRuntimeAdapterReadinessGateToolContract,
  mcpServiceDatabaseInventoryToolContract,
  mcpSubstrateAdapterManifestToolContract,
  mcpSubstrateControlIntentToolContract,
} from "../src/index.js";

const now = new Date("2026-05-09T00:00:00.000Z");

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

describe("@lnsat/mcp BP-0147 runtime adapter implementation plan MCP adapter contract", () => {
  it("exposes contract-only implementation plan metadata without registration or side effects", () => {
    expect(mcpRuntimeAdapterImplementationPlanToolContract).toMatchObject({
      tool: "lnsat.platform.runtime_adapter_implementation_plan.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.runtime_adapter_implementation_plan.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/platform/runtime-adapter-implementation-plan/inspect",
      authority: ["lnsat.gateway.runtime_adapter_implementation_plan.v0_1"],
      implementation_authority: "implementation_plan_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      mcp_registration: false,
      state_changing_tool: false,
      runtime_dispatcher: false,
      runtime_adapter_implementation: false,
      side_effects: [],
    });
    expect(mcpRuntimeAdapterImplementationPlanToolContract.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/runtime-adapter-implementation-plan.ts",
        "apps/api/src/runtime-adapter-implementation-plan.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid implementation plan inspection to the Gateway contract", async () => {
    const response =
      await inspectRuntimeAdapterImplementationPlanThroughMcpAdapterContract(
        {
          request_id: "req_bp0147_runtime_adapter_implementation_plan",
          implementation_plan_request: {
            source_refs: [
              {
                source_ref: "ticket:BP-0147",
                summary:
                  "MCP adapter delegates runtime adapter implementation plan evidence",
              },
            ],
            side_effects: [],
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationPlanToolContract.tool,
      gateway_contract_id: "lnsat.gateway.runtime_adapter_implementation_plan.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0147_runtime_adapter_implementation_plan",
        inspected_at: "2026-05-09T00:00:00.000Z",
        runtime_adapter_implementation_plan: {
          contract_id: runtimeAdapterImplementationPlanContract.contract_id,
          implementation_plan_version: "0.1",
          implementation_plan_authority: "implementation_plan_only_no_runtime_adapter",
          runtime_adapter_implementation_allowed: false,
          runtime_adapter_dispatch_allowed: false,
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        implementation_plan_authority: "implementation_plan_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      implementation_authority: "implementation_plan_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      mcp_registration: false,
      state_changing_tool: false,
      runtime_dispatcher: false,
      runtime_adapter_implementation: false,
      side_effects: [],
    });

    expect(response.gateway_response).toMatchObject({
      runtime_adapter_implementation_scope_refs:
        defaultRuntimeAdapterImplementationPlan.runtime_adapter_implementation_scope_refs,
      runtime_adapter_readiness_gate_refs:
        defaultRuntimeAdapterImplementationPlan.runtime_adapter_readiness_gate_refs,
      planned_files_modules:
        defaultRuntimeAdapterImplementationPlan.planned_files_modules,
      implementation_steps:
        defaultRuntimeAdapterImplementationPlan.implementation_steps,
      validation_commands: defaultRuntimeAdapterImplementationPlan.validation_commands,
      dry_run_plan: defaultRuntimeAdapterImplementationPlan.dry_run_plan,
      rollback_refs: defaultRuntimeAdapterImplementationPlan.rollback_refs,
      required_policy_gates: expect.arrayContaining([
        "substrate.adapter.implementation_plan.review",
        "substrate.adapter.implementation_scope.review",
        "substrate.adapter.runtime_readiness_gate.review",
      ]),
      required_approvals: expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
      required_audit_events: expect.arrayContaining(
        defaultRuntimeAdapterImplementationPlan.required_audit_events,
      ),
      source_refs: expect.arrayContaining(["ticket:BP-0147"]),
      scope_evidence_snapshot: {
        contract_id: runtimeAdapterImplementationScopeContract.contract_id,
        implementation_authority: "implementation_scope_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      readiness_evidence_snapshot: {
        contract_id: runtimeAdapterReadinessGateContract.contract_id,
        readiness_authority: "readiness_gate_only_no_runtime_invocation",
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      denied_runtime_behavior:
        defaultRuntimeAdapterImplementationPlan.denied_runtime_behavior,
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationPlanThroughMcpAdapterContract(
        {
          request_id: 147,
          raw_rejected_value:
            "runtime_adapter.implementation.execute TOKEN=inline-secret",
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpRuntimeAdapterImplementationPlanToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: null,
        request_errors: [
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan_gateway.unexpected_field",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan_gateway.invalid_request_id",
            path: "/request_id",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan_gateway.missing_implementation_plan_request",
            path: "/implementation_plan_request",
          }),
        ],
        implementation_plan_errors: [],
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
    expect(JSON.stringify(response)).not.toContain("runtime_adapter.implementation");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0144 evidence without raw echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationPlanThroughMcpAdapterContract(
        {
          request_id: "req_bp0147_invalid_delegated_implementation_plan",
          implementation_plan_request: {
            capability: "adapter.invoke.execute",
            implementation_plan_authority: "runtime_adapter_implementation",
            adapter_class: "root.shell.adapter",
            runtime_adapter_implementation_allowed: true,
            runtime_adapter_dispatch_allowed: true,
            live_adapter_invocation_allowed: true,
            live_broker_dispatch_allowed: true,
            live_execution_allowed: true,
            source_refs: [
              {
                source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
                summary:
                  "read DATABASE_URL and dispatch raw runtime adapter implementation",
              },
            ],
            denied_runtime_behavior: [
              ...defaultRuntimeAdapterImplementationPlan.denied_runtime_behavior,
              "runtime_adapter.implementation.execute",
            ],
            side_effects: [{ effect_type: "runtime_adapter_implementation" }],
            command: "rm -rf /",
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0147_invalid_delegated_implementation_plan",
        request_errors: [],
        implementation_plan_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan.unsafe_implementation_authority",
            path: "/capability",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan.unsafe_implementation_authority",
            path: "/adapter_class",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan.unsafe_implementation_authority",
            path: "/implementation_plan_authority",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan.runtime_adapter_implementation_forbidden",
            path: "/runtime_adapter_implementation_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan.runtime_adapter_dispatch_forbidden",
            path: "/runtime_adapter_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan.live_adapter_invocation_forbidden",
            path: "/live_adapter_invocation_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan.live_broker_dispatch_forbidden",
            path: "/live_broker_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan.live_execution_forbidden",
            path: "/live_execution_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan.secret_value_forbidden",
            path: "/source_refs/0",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan.unexpected_field",
            path: "/denied_runtime_behavior",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_plan.side_effects_forbidden",
            path: "/side_effects",
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
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("dispatch raw runtime");
  });

  it("registers local, official SDK, and stdio MCP surfaces with twenty-two read-only tools", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const localToolNames = localServer.listTools().tools.map((tool) => tool.name);

    expect(localToolNames).toEqual(registeredToolNames);
    expect(localToolNames).toHaveLength(29);

    const localCall = await localServer.callTool({
      name: mcpRuntimeAdapterImplementationPlanToolContract.tool,
      arguments: {
        request_id: "req_bp0148_registered_local_plan",
        implementation_plan_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0148",
              summary:
                "Registered local MCP inspection preserves runtime adapter implementation plan evidence",
            },
          ],
          side_effects: [],
        },
      },
    });
    expect(localCall).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationPlanToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpRuntimeAdapterImplementationPlanToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.runtime_adapter_implementation_plan.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0148_registered_local_plan",
              runtime_adapter_implementation_plan: {
                contract_id: runtimeAdapterImplementationPlanContract.contract_id,
                implementation_plan_authority:
                  "implementation_plan_only_no_runtime_adapter",
                runtime_adapter_implementation_allowed: false,
                runtime_adapter_dispatch_allowed: false,
                live_adapter_invocation_allowed: false,
                live_broker_dispatch_allowed: false,
                live_execution_allowed: false,
                side_effects: [],
              },
              source_refs: expect.arrayContaining(["ticket:BP-0148"]),
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
          },
        },
      ],
      side_effects: [],
    });

    const invalidLocalCall = await localServer.callTool({
      name: mcpRuntimeAdapterImplementationPlanToolContract.tool,
      arguments: {
        request_id: "req_bp0148_registered_local_plan_invalid",
        command: "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
    });
    expect(invalidLocalCall).toMatchObject({
      ok: false,
      tool: mcpRuntimeAdapterImplementationPlanToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0148_registered_local_plan_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(invalidLocalCall)).not.toContain(
      "runtime_adapter.implementation",
    );
    expect(JSON.stringify(invalidLocalCall)).not.toContain("TOKEN=inline-secret");

    const stdioResponse = await handleLocalStdioSmokeRequestLine(
      JSON.stringify({
        request_id: "req_bp0148_registered_stdio_plan",
        tool_call: {
          name: mcpRuntimeAdapterImplementationPlanToolContract.tool,
          arguments: {
            request_id: "req_bp0148_registered_stdio_plan",
            implementation_plan_request: { side_effects: [] },
          },
        },
      }),
      { now: () => now },
    );
    expect(stdioResponse).toMatchObject({
      ok: true,
      request_id: "req_bp0148_registered_stdio_plan",
      mcp_response: {
        ok: true,
        tool: mcpRuntimeAdapterImplementationPlanToolContract.tool,
        is_error: false,
        side_effects: [],
      },
      side_effects: [],
    });

    const { client } = await createConnectedSdkClient();
    const tools = await client.listTools();
    const officialToolNames = tools.tools.map((tool) => tool.name);

    expect(officialToolNames).toEqual(registeredToolNames);
    expect(officialToolNames).toHaveLength(29);

    const officialCall = await client.callTool({
      name: mcpRuntimeAdapterImplementationPlanToolContract.tool,
      arguments: {
        request_id: "req_bp0148_registered_sdk_plan",
        implementation_plan_request: { side_effects: [] },
      },
    });
    expect(officialCall.isError).toBe(false);
    expect(officialCall.structuredContent).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationPlanToolContract.tool,
      gateway_contract_id: "lnsat.gateway.runtime_adapter_implementation_plan.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0148_registered_sdk_plan",
        runtime_adapter_implementation_plan: {
          contract_id: runtimeAdapterImplementationPlanContract.contract_id,
          implementation_plan_authority: "implementation_plan_only_no_runtime_adapter",
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
      },
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
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
    name: "lnsat-bp0147-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
