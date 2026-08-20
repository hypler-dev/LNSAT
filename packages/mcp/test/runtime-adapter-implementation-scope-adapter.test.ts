import {
  defaultRuntimeAdapterImplementationScope,
  runtimeAdapterImplementationScopeContract,
} from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  handleLocalStdioSmokeRequestLine,
  inspectRuntimeAdapterImplementationScopeThroughMcpAdapterContract,
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

describe("@lnsat/mcp BP-0141 runtime adapter implementation scope MCP adapter contract", () => {
  it("exposes read-only implementation scope metadata without registration or side effects", () => {
    expect(mcpRuntimeAdapterImplementationScopeToolContract).toMatchObject({
      tool: "lnsat.platform.runtime_adapter_implementation_scope.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.runtime_adapter_implementation_scope.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/platform/runtime-adapter-implementation-scope/inspect",
      authority: ["lnsat.gateway.runtime_adapter_implementation_scope.v0_1"],
      implementation_authority: "implementation_scope_only_no_runtime_adapter",
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
    expect(mcpRuntimeAdapterImplementationScopeToolContract.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/runtime-adapter-implementation-scope.ts",
        "apps/api/src/runtime-adapter-implementation-scope.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid implementation scope inspection to the Gateway contract", async () => {
    const response =
      await inspectRuntimeAdapterImplementationScopeThroughMcpAdapterContract(
        {
          request_id: "req_bp0141_runtime_adapter_implementation_scope",
          implementation_scope_request: {
            source_refs: [
              {
                source_ref: "ticket:BP-0141",
                summary:
                  "MCP adapter delegates runtime adapter implementation scope evidence",
              },
            ],
            side_effects: [],
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationScopeToolContract.tool,
      gateway_contract_id: "lnsat.gateway.runtime_adapter_implementation_scope.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0141_runtime_adapter_implementation_scope",
        inspected_at: "2026-05-09T00:00:00.000Z",
        runtime_adapter_implementation_scope: {
          contract_id: runtimeAdapterImplementationScopeContract.contract_id,
          implementation_scope_version: "0.1",
          implementation_authority: "implementation_scope_only_no_runtime_adapter",
          runtime_adapter_implementation_allowed: false,
          runtime_adapter_dispatch_allowed: false,
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        implementation_authority: "implementation_scope_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      implementation_authority: "implementation_scope_only_no_runtime_adapter",
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
      runtime_adapter_readiness_gate_refs:
        defaultRuntimeAdapterImplementationScope.runtime_adapter_readiness_gate_refs,
      implementation_boundaries:
        defaultRuntimeAdapterImplementationScope.implementation_boundaries,
      allowed_source_zones:
        defaultRuntimeAdapterImplementationScope.allowed_source_zones,
      required_tests: defaultRuntimeAdapterImplementationScope.required_tests,
      dry_run_expectations:
        defaultRuntimeAdapterImplementationScope.dry_run_expectations,
      rollback_refs: defaultRuntimeAdapterImplementationScope.rollback_refs,
      required_policy_gates: expect.arrayContaining([
        "substrate.adapter.implementation_scope.review",
        "substrate.adapter.runtime_readiness_gate.review",
      ]),
      required_approvals: expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
      required_audit_events: expect.arrayContaining(
        defaultRuntimeAdapterImplementationScope.required_audit_events,
      ),
      source_refs: expect.arrayContaining(["ticket:BP-0141"]),
      readiness_evidence_snapshot: {
        contract_id: "lnsat.platform.runtime_adapter_readiness_gate.v0_1",
        readiness_authority: "readiness_gate_only_no_runtime_invocation",
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      denied_runtime_behavior:
        defaultRuntimeAdapterImplementationScope.denied_runtime_behavior,
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationScopeThroughMcpAdapterContract(
        {
          request_id: 141,
          raw_rejected_value: "runtime_adapter.implement TOKEN=inline-secret",
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpRuntimeAdapterImplementationScopeToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: null,
        request_errors: [
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope_gateway.unexpected_field",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope_gateway.invalid_request_id",
            path: "/request_id",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope_gateway.missing_implementation_scope_request",
            path: "/implementation_scope_request",
          }),
        ],
        implementation_scope_errors: [],
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
    expect(JSON.stringify(response)).not.toContain("runtime_adapter.implement");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0138 evidence without raw echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationScopeThroughMcpAdapterContract(
        {
          request_id: "req_bp0141_invalid_delegated_implementation_scope",
          implementation_scope_request: {
            ...defaultRuntimeAdapterImplementationScope,
            source_refs: [
              {
                source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
                summary: "read DATABASE_URL and implement runtime adapter",
              },
            ],
            implementation_authority: "implementation_grants_runtime_adapter",
            runtime_adapter_implementation_allowed: true,
            runtime_adapter_dispatch_allowed: true,
            live_adapter_invocation_allowed: true,
            live_broker_dispatch_allowed: true,
            live_execution_allowed: true,
            denied_runtime_behavior: [
              ...defaultRuntimeAdapterImplementationScope.denied_runtime_behavior,
              "runtime adapter implementation allowed",
            ],
            command: "docker run --privileged adapter",
            side_effects: [{ effect_type: "runtime_adapter_implementation" }],
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0141_invalid_delegated_implementation_scope",
        request_errors: [],
        implementation_scope_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope.unsafe_implementation_authority",
            path: "/implementation_authority",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope.runtime_adapter_implementation_forbidden",
            path: "/runtime_adapter_implementation_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope.runtime_adapter_dispatch_forbidden",
            path: "/runtime_adapter_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope.live_adapter_invocation_forbidden",
            path: "/live_adapter_invocation_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope.live_broker_dispatch_forbidden",
            path: "/live_broker_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope.live_execution_forbidden",
            path: "/live_execution_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope.secret_value_forbidden",
            path: "/source_refs/0",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope.unexpected_field",
            path: "/denied_runtime_behavior",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_scope.side_effects_forbidden",
            path: "/side_effects",
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
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("docker run");
    expect(JSON.stringify(response)).not.toContain("implement runtime adapter");
  });

  it("registers implementation scope inspection on local, official SDK, and built stdio read-only surfaces", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const localToolNames = localServer.listTools().tools.map((tool) => tool.name);

    expect(localToolNames).toEqual(registeredToolNames);
    expect(localToolNames).toHaveLength(29);
    expect(localToolNames).toContain(
      mcpRuntimeAdapterImplementationScopeToolContract.tool,
      mcpRuntimeAdapterImplementationPlanToolContract.tool,
    );

    const localCall = await localServer.callTool({
      name: mcpRuntimeAdapterImplementationScopeToolContract.tool,
      arguments: {
        request_id: "req_bp0142_registered_local_implementation_scope",
        implementation_scope_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0142",
              summary:
                "Registered local MCP inspection preserves runtime adapter implementation scope evidence",
            },
          ],
          side_effects: [],
        },
      },
    });
    expect(localCall).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationScopeToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpRuntimeAdapterImplementationScopeToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.runtime_adapter_implementation_scope.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0142_registered_local_implementation_scope",
              runtime_adapter_implementation_scope: {
                contract_id: "lnsat.platform.runtime_adapter_implementation_scope.v0_1",
                implementation_authority:
                  "implementation_scope_only_no_runtime_adapter",
                runtime_adapter_implementation_allowed: false,
                runtime_adapter_dispatch_allowed: false,
                live_adapter_invocation_allowed: false,
                live_broker_dispatch_allowed: false,
                live_execution_allowed: false,
                side_effects: [],
              },
              source_refs: expect.arrayContaining(["ticket:BP-0142"]),
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

    const stdioResponse = await handleLocalStdioSmokeRequestLine(
      JSON.stringify({
        request_id: "req_bp0142_registered_stdio_call",
        tool_call: {
          name: mcpRuntimeAdapterImplementationScopeToolContract.tool,
          arguments: {
            request_id: "req_bp0142_registered_stdio_call",
            implementation_scope_request: {
              source_refs: [
                {
                  source_ref: "ticket:BP-0142",
                  summary:
                    "Registered local stdio inspection preserves runtime adapter implementation scope evidence",
                },
              ],
              side_effects: [],
            },
          },
        },
      }),
      { now: () => now },
    );
    expect(stdioResponse).toMatchObject({
      ok: true,
      request_id: "req_bp0142_registered_stdio_call",
      mcp_response: {
        ok: true,
        is_error: false,
        tool: mcpRuntimeAdapterImplementationScopeToolContract.tool,
        side_effects: [],
      },
      side_effects: [],
    });

    const { client } = await createConnectedSdkClient();
    const tools = await client.listTools();
    const officialToolNames = tools.tools.map((tool) => tool.name);

    expect(officialToolNames).toEqual(registeredToolNames);
    expect(officialToolNames).toHaveLength(29);
    expect(officialToolNames).toContain(
      mcpRuntimeAdapterImplementationScopeToolContract.tool,
      mcpRuntimeAdapterImplementationPlanToolContract.tool,
    );

    const officialCall = await client.callTool({
      name: mcpRuntimeAdapterImplementationScopeToolContract.tool,
      arguments: {
        request_id: "req_bp0142_registered_official_implementation_scope",
        implementation_scope_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0142",
              summary:
                "Official SDK registration preserves runtime adapter implementation scope evidence",
            },
          ],
          side_effects: [],
        },
      },
    });
    expect(officialCall.isError).toBe(false);
    expect(officialCall.structuredContent).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationScopeToolContract.tool,
      gateway_contract_id: "lnsat.gateway.runtime_adapter_implementation_scope.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0142_registered_official_implementation_scope",
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
        source_refs: expect.arrayContaining(["ticket:BP-0142"]),
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

  it("keeps malformed registered calls fail-closed without raw value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({ now: () => now });
    const response = await server.callTool({
      name: mcpRuntimeAdapterImplementationScopeToolContract.tool,
      arguments: {
        request_id: "req_bp0142_invalid_registered_implementation_scope",
        command: "runtime_adapter.implement TOKEN=inline-secret",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpRuntimeAdapterImplementationScopeToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0142_invalid_registered_implementation_scope",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("runtime_adapter.implement");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLnsatOfficialMcpSdkServer({
    now: () => now,
  });
  const client = new Client({
    name: "lnsat-bp0141-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
