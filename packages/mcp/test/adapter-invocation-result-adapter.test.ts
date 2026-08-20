import {
  adapterInvocationPreflightContract,
  adapterInvocationResultContract,
  defaultAdapterInvocationResult,
} from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectAdapterInvocationResultThroughMcpAdapterContract,
  mcpAdapterInvocationPreflightToolContract,
  mcpAdapterInvocationAuthorizationBundleToolContract,
  mcpAdapterInvocationResultToolContract,
  mcpAdapterInvocationResultToolRegistration,
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

const now = new Date("2026-05-08T00:00:00.000Z");

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

describe("@lnsat/mcp BP-0123 adapter invocation result MCP adapter contract", () => {
  it("exposes read-only adapter invocation result metadata without registration or side effects", () => {
    expect(mcpAdapterInvocationResultToolContract).toMatchObject({
      tool: "lnsat.platform.adapter_invocation_result.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.adapter_invocation_result.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/platform/adapter-invocation-result/inspect",
      authority: ["lnsat.gateway.adapter_invocation_result.v0_1"],
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(mcpAdapterInvocationResultToolRegistration).toMatchObject({
      name: mcpAdapterInvocationResultToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      side_effects: [],
    });
    expect(mcpAdapterInvocationResultToolContract.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/adapter-invocation-result.ts",
        "apps/api/src/adapter-invocation-result.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid adapter invocation result inspection to the Gateway contract", async () => {
    const response = await inspectAdapterInvocationResultThroughMcpAdapterContract(
      {
        request_id: "req_bp0123_adapter_invocation_result",
        result_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0123",
              summary: "MCP adapter delegates adapter invocation result evidence",
            },
          ],
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpAdapterInvocationResultToolContract.tool,
      gateway_contract_id: "lnsat.gateway.adapter_invocation_result.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0123_adapter_invocation_result",
        inspected_at: "2026-05-08T00:00:00.000Z",
        adapter_invocation_result: {
          contract_id: adapterInvocationResultContract.contract_id,
          result_version: "0.1",
          result_identity: {
            result_ref: "result:service-control-adapter-invocation",
            result_name: "Service control adapter invocation result evidence",
            owner_ref: "owner:lnsat-platform",
          },
          adapter_identity: {
            adapter_ref: "adapter:service-control-manifest",
            adapter_name: "Service control proposal adapter manifest",
            owner_ref: "owner:lnsat-platform",
          },
          adapter_class: "service_control_adapter",
          requested_actor: {
            actor_ref: "agent:codex",
            actor_type: "agent",
            role_ref: "role:ops_assistant",
          },
          capability: "service.restart.request",
          risk_level: 5,
          target_substrate_kind: "services",
          requested_control_mode: "approval_gated_mutation",
          observed_status: "completed",
          result_authority: "result_evidence_only_no_execution",
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        result_authority: "result_evidence_only_no_execution",
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

    expect(response.gateway_response).toMatchObject({
      adapter_invocation_preflight_refs: [
        {
          preflight_ref: "preflight:service-control-adapter-invocation",
          evidence_ref: "evidence:bp0114-adapter-invocation-preflight",
          contract_id: adapterInvocationPreflightContract.contract_id,
          summary: "BP-0114 source-only adapter invocation preflight evidence",
        },
      ],
      expected_result_refs: [
        {
          result_ref: "result_packet:adapter-invocation-preflight",
          evidence_ref: "evidence:bp0114-result-expectations",
          summary: "BP-0114 expected result evidence before any runtime adapter exists",
        },
      ],
      rollback_refs: expect.arrayContaining([
        {
          rollback_ref: "rollback:adapter-invocation-preflight-review",
          required_for_risk_level_at_or_above: 4,
          owner_ref: "owner:lnsat-platform",
          evidence_refs: [
            "doc:docs/architecture/POLICY_AND_AUDIT.md",
            "doc:docs/reference/CONTRACT_PROVENANCE.md",
          ],
        },
      ]),
      required_policy_gates: expect.arrayContaining([
        "substrate.adapter.invocation.result.review",
        "substrate.adapter.invocation.preflight.review",
      ]),
      required_approvals: expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
      required_audit_events: expect.arrayContaining([
        "tool_requested",
        "policy_checked",
        "approval_requested",
        "approval_granted",
        "tool_denied",
        "runbook_started",
        "runbook_completed",
        "decision_recorded",
      ]),
      output_evidence_refs: [
        {
          evidence_ref: "evidence:operator-visible-adapter-result-output",
          summary: "source-only output evidence ref, no live adapter output included",
        },
      ],
      error_evidence_refs: [
        {
          evidence_ref: "evidence:operator-visible-adapter-result-error-state",
          summary: "source-only error evidence ref, no raw runtime error included",
        },
      ],
      denied_live_behavior: expect.arrayContaining([
        "no live adapter invocation",
        "no live broker dispatch",
        "no live execution",
        "result evidence does not invoke adapter",
        "result evidence does not execute rollback",
      ]),
      source_refs: expect.arrayContaining([
        "ticket:BP-0123: MCP adapter delegates adapter invocation result evidence",
      ]),
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response = await inspectAdapterInvocationResultThroughMcpAdapterContract(
      {
        request_id: 123,
        raw_rejected_value: "substrate.adapter.invoke TOKEN=inline-secret",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAdapterInvocationResultToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: null,
        request_errors: [
          expect.objectContaining({
            code: "adapter_invocation_result_gateway.unexpected_field",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "adapter_invocation_result_gateway.invalid_request_id",
            path: "/request_id",
          }),
          expect.objectContaining({
            code: "adapter_invocation_result_gateway.missing_result_request",
            path: "/result_request",
          }),
        ],
        result_errors: [],
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
    expect(JSON.stringify(response)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0120 evidence without raw echo", async () => {
    const response = await inspectAdapterInvocationResultThroughMcpAdapterContract(
      {
        request_id: "req_bp0123_invalid_delegated_result",
        result_request: {
          ...defaultAdapterInvocationResult,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and invoke raw adapter command",
            },
          ],
          live_adapter_invocation_allowed: true,
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          side_effects: [{ effect_type: "adapter_invocation" }],
          command: "rm -rf /",
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0123_invalid_delegated_result",
        request_errors: [],
        result_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "adapter_invocation_result.live_adapter_invocation_forbidden",
            path: "/live_adapter_invocation_allowed",
          }),
          expect.objectContaining({
            code: "adapter_invocation_result.live_broker_dispatch_forbidden",
            path: "/live_broker_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "adapter_invocation_result.live_execution_forbidden",
            path: "/live_execution_allowed",
          }),
          expect.objectContaining({
            code: "adapter_invocation_result.secret_value_forbidden",
            path: "/source_refs/0",
          }),
          expect.objectContaining({
            code: "adapter_invocation_result.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "adapter_invocation_result.side_effects_forbidden",
            path: "/side_effects",
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
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("invoke raw adapter command");
  });

  it("registers adapter invocation result on local and official read-only MCP surfaces", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const localToolNames = localServer.listTools().tools.map((tool) => tool.name);

    expect(localToolNames).toEqual(registeredToolNames);
    expect(localToolNames).toHaveLength(29);
    expect(localToolNames).toContain(mcpAdapterInvocationResultToolContract.tool);

    const localResponse = await localServer.callTool({
      name: mcpAdapterInvocationResultToolContract.tool,
      arguments: {
        request_id: "req_bp0124_registered_local_call",
        result_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0124",
              summary:
                "Registered local MCP inspection preserves adapter invocation result evidence",
            },
          ],
          side_effects: [],
        },
      },
    });

    expect(localResponse).toMatchObject({
      ok: true,
      tool: mcpAdapterInvocationResultToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAdapterInvocationResultToolContract.tool,
            gateway_contract_id: "lnsat.gateway.adapter_invocation_result.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0124_registered_local_call",
              adapter_invocation_result: {
                contract_id: adapterInvocationResultContract.contract_id,
                observed_status: "completed",
                result_authority: "result_evidence_only_no_execution",
                live_adapter_invocation_allowed: false,
                live_broker_dispatch_allowed: false,
                live_execution_allowed: false,
                side_effects: [],
              },
              source_refs: expect.arrayContaining([
                "ticket:BP-0124: Registered local MCP inspection preserves adapter invocation result evidence",
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
          },
        },
      ],
      side_effects: [],
    });

    const { client } = await createConnectedSdkClient();
    const tools = await client.listTools();
    const officialToolNames = tools.tools.map((tool) => tool.name);

    expect(officialToolNames).toEqual(registeredToolNames);
    expect(officialToolNames).toHaveLength(29);
    expect(officialToolNames).toContain(mcpAdapterInvocationResultToolContract.tool);

    const officialResponse = await client.callTool({
      name: mcpAdapterInvocationResultToolContract.tool,
      arguments: {
        request_id: "req_bp0124_registered_official_call",
        result_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0124",
              summary:
                "Official SDK registration preserves adapter invocation result evidence",
            },
          ],
          side_effects: [],
        },
      },
    });

    expect(officialResponse.isError).toBe(false);
    expect(officialResponse.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAdapterInvocationResultToolContract.tool,
      gateway_contract_id: "lnsat.gateway.adapter_invocation_result.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0124_registered_official_call",
        adapter_invocation_result: {
          contract_id: adapterInvocationResultContract.contract_id,
          observed_status: "completed",
          result_authority: "result_evidence_only_no_execution",
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
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

  it("keeps invalid registered adapter invocation result calls fail-closed without raw value echo", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const localResponse = await localServer.callTool({
      name: mcpAdapterInvocationResultToolContract.tool,
      arguments: {
        request_id: "req_bp0124_registered_local_invalid",
        command: "substrate.adapter.invoke TOKEN=inline-secret",
      },
    });

    expect(localResponse).toMatchObject({
      ok: false,
      tool: mcpAdapterInvocationResultToolContract.tool,
      is_error: true,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0124_registered_local_invalid",
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
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(localResponse)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(localResponse)).not.toContain("TOKEN=inline-secret");

    const { client } = await createConnectedSdkClient();
    const officialResponse = await client.callTool({
      name: mcpAdapterInvocationResultToolContract.tool,
      arguments: {
        request_id: "req_bp0124_registered_official_invalid",
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

    expect(officialResponse.isError).toBe(true);
    expect(officialResponse.structuredContent).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0124_registered_official_invalid",
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
    expect(JSON.stringify(officialResponse)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(officialResponse)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(officialResponse)).not.toContain("side_effect_probe");
  });
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLnsatOfficialMcpSdkServer({
    now: () => now,
  });
  const client = new Client({
    name: "lnsat-bp0123-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
