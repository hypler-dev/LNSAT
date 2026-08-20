import {
  defaultRuntimeAdapterImplementationAuthorizationRequest,
  runtimeAdapterImplementationAuthorizationRequestContract,
  runtimeAdapterImplementationPlanContract,
} from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  handleLocalStdioSmokeRequestLine,
  inspectRuntimeAdapterImplementationAuthorizationRequestThroughMcpAdapterContract,
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

describe("@lnsat/mcp BP-0153 runtime adapter implementation authorization request MCP adapter contract", () => {
  it("exposes contract-only authorization request metadata without registration or side effects", () => {
    expect(
      mcpRuntimeAdapterImplementationAuthorizationRequestToolContract,
    ).toMatchObject({
      tool: "lnsat.platform.runtime_adapter_implementation_authorization_request.inspect",
      status: "contract_only",
      gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
      gateway_method: "POST",
      gateway_path:
        "/v1/platform/runtime-adapter-implementation-authorization-request/inspect",
      authority: [
        "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
      ],
      implementation_authority:
        "implementation_authorization_request_only_no_runtime_adapter",
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
    expect(
      mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.source_docs,
    ).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/runtime-adapter-implementation-authorization-request.ts",
        "apps/api/src/runtime-adapter-implementation-authorization-request.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid authorization request inspection to the Gateway contract", async () => {
    const response =
      await inspectRuntimeAdapterImplementationAuthorizationRequestThroughMcpAdapterContract(
        {
          request_id: "req_bp0153_runtime_adapter_authorization_request",
          authorization_request: {
            source_refs: [
              {
                source_ref: "ticket:BP-0153",
                summary:
                  "MCP adapter delegates runtime adapter implementation authorization request evidence",
              },
            ],
            side_effects: [],
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0153_runtime_adapter_authorization_request",
        inspected_at: "2026-05-09T00:00:00.000Z",
        runtime_adapter_implementation_authorization_request: {
          contract_id:
            runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
          authorization_request_version: "0.1",
          implementation_authorization_request_authority:
            "implementation_authorization_request_only_no_runtime_adapter",
          runtime_adapter_implementation_allowed: false,
          runtime_adapter_dispatch_allowed: false,
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        implementation_authorization_request_authority:
          "implementation_authorization_request_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      implementation_authority:
        "implementation_authorization_request_only_no_runtime_adapter",
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
      chain_review_refs:
        defaultRuntimeAdapterImplementationAuthorizationRequest.chain_review_refs,
      implementation_plan_refs:
        defaultRuntimeAdapterImplementationAuthorizationRequest.implementation_plan_refs,
      runtime_adapter_implementation_scope_refs:
        defaultRuntimeAdapterImplementationAuthorizationRequest.runtime_adapter_implementation_scope_refs,
      runtime_adapter_readiness_gate_refs:
        defaultRuntimeAdapterImplementationAuthorizationRequest.runtime_adapter_readiness_gate_refs,
      planned_files_modules:
        defaultRuntimeAdapterImplementationAuthorizationRequest.planned_files_modules,
      implementation_steps:
        defaultRuntimeAdapterImplementationAuthorizationRequest.implementation_steps,
      validation_commands:
        defaultRuntimeAdapterImplementationAuthorizationRequest.validation_commands,
      dry_run_plan:
        defaultRuntimeAdapterImplementationAuthorizationRequest.dry_run_plan,
      rollback_refs:
        defaultRuntimeAdapterImplementationAuthorizationRequest.rollback_refs,
      required_policy_gates: expect.arrayContaining([
        "substrate.adapter.implementation_authorization_request.review",
        "substrate.adapter.implementation_plan.review",
      ]),
      required_approvals: expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
      required_audit_events: expect.arrayContaining(
        defaultRuntimeAdapterImplementationAuthorizationRequest.required_audit_events,
      ),
      source_refs: expect.arrayContaining(["ticket:BP-0153"]),
      future_implementation_packet_ref:
        defaultRuntimeAdapterImplementationAuthorizationRequest.future_implementation_packet_ref,
      chain_review_snapshot: {
        packet_ref: "packet:BP-0149",
        reviewed_source_contract_id:
          runtimeAdapterImplementationPlanContract.contract_id,
        reviewed_gateway_contract_id:
          "lnsat.gateway.runtime_adapter_implementation_plan.v0_1",
        reviewed_route: "POST /v1/platform/runtime-adapter-implementation-plan/inspect",
        reviewed_mcp_tool: "lnsat.platform.runtime_adapter_implementation_plan.inspect",
        registered_read_only_tool_count: 20,
        side_effects: [],
      },
      implementation_plan_evidence_snapshot: {
        contract_id: runtimeAdapterImplementationPlanContract.contract_id,
        implementation_plan_authority: "implementation_plan_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      denied_runtime_behavior:
        defaultRuntimeAdapterImplementationAuthorizationRequest.denied_runtime_behavior,
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationAuthorizationRequestThroughMcpAdapterContract(
        {
          request_id: 153,
          raw_rejected_value:
            "runtime_adapter.implementation.execute TOKEN=inline-secret",
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: null,
        request_errors: [
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request_gateway.unexpected_field",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request_gateway.invalid_request_id",
            path: "/request_id",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request_gateway.missing_authorization_request",
            path: "/authorization_request",
          }),
        ],
        authorization_request_errors: [],
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
    expect(JSON.stringify(response)).not.toContain("runtime_adapter.implementation");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0150 evidence without raw echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationAuthorizationRequestThroughMcpAdapterContract(
        {
          request_id: "req_bp0153_invalid_delegated_authorization_request",
          authorization_request: {
            capability: "adapter.invoke.execute",
            implementation_authorization_request_authority:
              "runtime_adapter_implementation",
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
              ...defaultRuntimeAdapterImplementationAuthorizationRequest.denied_runtime_behavior,
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
        request_id: "req_bp0153_invalid_delegated_authorization_request",
        request_errors: [],
        authorization_request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
            path: "/capability",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
            path: "/implementation_authorization_request_authority",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
            path: "/adapter_class",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request.runtime_adapter_implementation_forbidden",
            path: "/runtime_adapter_implementation_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request.runtime_adapter_dispatch_forbidden",
            path: "/runtime_adapter_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request.live_adapter_invocation_forbidden",
            path: "/live_adapter_invocation_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request.live_broker_dispatch_forbidden",
            path: "/live_broker_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request.live_execution_forbidden",
            path: "/live_execution_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request.secret_value_forbidden",
            path: "/source_refs/0",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request.unexpected_field",
            path: "/denied_runtime_behavior",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_authorization_request.side_effects_forbidden",
            path: "/side_effects",
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
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("dispatch raw runtime adapter");
  });

  it("registers authorization request inspection on local, stdio, and official SDK read-only MCP surfaces", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const localToolNames = localServer.listTools().tools.map((tool) => tool.name);

    expect(localToolNames).toEqual(registeredToolNames);
    expect(localToolNames).toHaveLength(29);
    expect(localToolNames).toContain(
      mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
    );

    const localCall = await localServer.callTool({
      name: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0154_registered_local_authorization_request",
        authorization_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0154",
              summary:
                "Registered local MCP inspection preserves runtime adapter implementation authorization request evidence",
            },
          ],
          side_effects: [],
        },
      },
    });
    expect(localCall).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0154_registered_local_authorization_request",
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
              source_refs: expect.arrayContaining(["ticket:BP-0154"]),
              runtime_adapter_implementation_allowed: false,
              runtime_adapter_dispatch_allowed: false,
              live_adapter_invocation_allowed: false,
              live_broker_dispatch_allowed: false,
              live_execution_allowed: false,
              side_effects: [],
            },
            implementation_authority:
              "implementation_authorization_request_only_no_runtime_adapter",
            runtime_adapter_implementation_allowed: false,
            runtime_adapter_dispatch_allowed: false,
            live_adapter_invocation_allowed: false,
            live_broker_dispatch_allowed: false,
            live_execution_allowed: false,
            state_changing_tool: false,
            runtime_dispatcher: false,
            runtime_adapter_implementation: false,
            side_effects: [],
          },
        },
      ],
      side_effects: [],
    });

    const stdioResponse = await handleLocalStdioSmokeRequestLine(
      JSON.stringify({
        request_id: "req_bp0154_registered_stdio_authorization_request",
        tool_call: {
          name: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
          arguments: {
            request_id: "req_bp0154_registered_stdio_authorization_request",
            authorization_request: { side_effects: [] },
          },
        },
      }),
      { now: () => now },
    );
    expect(stdioResponse).toMatchObject({
      ok: true,
      request_id: "req_bp0154_registered_stdio_authorization_request",
      mcp_response: {
        ok: true,
        tool: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
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
      mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
    );

    const officialCall = await client.callTool({
      name: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0154_official_authorization_request",
        authorization_request: { side_effects: [] },
      },
    });

    expect(officialCall.isError).toBe(false);
    expect(officialCall.structuredContent).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0154_official_authorization_request",
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

  it("keeps registered authorization request calls fail-closed without raw rejected value echo", async () => {
    const server = createLnsatReadOnlyMcpServer({ now: () => now });
    const response = await server.callTool({
      name: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0154_registered_authorization_request_invalid",
        command: "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpRuntimeAdapterImplementationAuthorizationRequestToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0154_registered_authorization_request_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("runtime_adapter.implementation");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLnsatOfficialMcpSdkServer({
    now: () => now,
  });
  const client = new Client({
    name: "lnsat-bp0153-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
