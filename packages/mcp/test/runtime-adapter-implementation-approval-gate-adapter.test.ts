import {
  defaultRuntimeAdapterImplementationApprovalGate,
  runtimeAdapterImplementationApprovalGateContract,
  runtimeAdapterImplementationAuthorizationRequestContract,
} from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectRuntimeAdapterImplementationApprovalGateThroughMcpAdapterContract,
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
  mcpRuntimeAdapterImplementationApprovalGateToolContract,
  mcpRuntimeAdapterImplementationDryRunEvidenceToolContract,
  mcpKnowledgeSurfaceToolContract,
  mcpAgentContextFirewallToolContract,
  mcpRuntimeAdapterImplementationAuthorizationRequestToolContract,
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

describe("@lnsat/mcp BP-0159 runtime adapter implementation approval gate MCP adapter contract", () => {
  it("exposes contract-only approval gate metadata without registration or side effects", () => {
    expect(mcpRuntimeAdapterImplementationApprovalGateToolContract).toMatchObject({
      tool: "lnsat.platform.runtime_adapter_implementation_approval_gate.inspect",
      status: "contract_only",
      gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_approval_gate.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/platform/runtime-adapter-implementation-approval-gate/inspect",
      authority: ["lnsat.gateway.runtime_adapter_implementation_approval_gate.v0_1"],
      implementation_authority: "implementation_approval_gate_only_no_runtime_adapter",
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
    expect(mcpRuntimeAdapterImplementationApprovalGateToolContract.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/runtime-adapter-implementation-approval-gate.ts",
        "apps/api/src/runtime-adapter-implementation-approval-gate.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid approval gate inspection to the Gateway contract", async () => {
    const response =
      await inspectRuntimeAdapterImplementationApprovalGateThroughMcpAdapterContract(
        {
          request_id: "req_bp0159_runtime_adapter_implementation_approval_gate",
          approval_gate_request: {
            source_refs: [
              {
                source_ref: "ticket:BP-0159",
                summary:
                  "MCP adapter delegates runtime adapter implementation approval gate evidence",
              },
            ],
            side_effects: [],
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_approval_gate.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0159_runtime_adapter_implementation_approval_gate",
        inspected_at: "2026-05-09T00:00:00.000Z",
        runtime_adapter_implementation_approval_gate: {
          contract_id: runtimeAdapterImplementationApprovalGateContract.contract_id,
          approval_gate_version: "0.1",
          implementation_approval_gate_authority:
            "implementation_approval_gate_only_no_runtime_adapter",
          runtime_adapter_implementation_allowed: false,
          runtime_adapter_dispatch_allowed: false,
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        implementation_approval_gate_authority:
          "implementation_approval_gate_only_no_runtime_adapter",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      implementation_authority: "implementation_approval_gate_only_no_runtime_adapter",
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
        defaultRuntimeAdapterImplementationApprovalGate.chain_review_refs,
      authorization_request_refs:
        defaultRuntimeAdapterImplementationApprovalGate.authorization_request_refs,
      implementation_plan_refs:
        defaultRuntimeAdapterImplementationApprovalGate.implementation_plan_refs,
      runtime_adapter_implementation_scope_refs:
        defaultRuntimeAdapterImplementationApprovalGate.runtime_adapter_implementation_scope_refs,
      runtime_adapter_readiness_gate_refs:
        defaultRuntimeAdapterImplementationApprovalGate.runtime_adapter_readiness_gate_refs,
      required_policy_gates: expect.arrayContaining([
        "substrate.adapter.implementation_approval_gate.review",
        "substrate.adapter.implementation_authorization_request.review",
      ]),
      required_human_approvals: [
        "approval:human-runtime-adapter-implementation-approval-gate",
      ],
      required_audit_events: expect.arrayContaining(
        defaultRuntimeAdapterImplementationApprovalGate.required_audit_events,
      ),
      source_refs: expect.arrayContaining(["ticket:BP-0159"]),
      authorization_request_chain_review_snapshot: {
        packet_ref: "packet:BP-0155",
        reviewed_source_contract_id:
          runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
        reviewed_gateway_contract_id:
          "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
        reviewed_route:
          "POST /v1/platform/runtime-adapter-implementation-authorization-request/inspect",
        reviewed_mcp_tool:
          "lnsat.platform.runtime_adapter_implementation_authorization_request.inspect",
        registered_read_only_tool_count: 21,
        side_effects: [],
      },
      denied_runtime_behavior:
        defaultRuntimeAdapterImplementationApprovalGate.denied_runtime_behavior,
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationApprovalGateThroughMcpAdapterContract(
        {
          request_id: 159,
          raw_rejected_value:
            "runtime_adapter.implementation.execute TOKEN=inline-secret",
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: null,
        request_errors: [
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate_gateway.unexpected_field",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate_gateway.invalid_request_id",
            path: "/request_id",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate_gateway.missing_approval_gate_request",
            path: "/approval_gate_request",
          }),
        ],
        approval_gate_errors: [],
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
    expect(JSON.stringify(response)).not.toContain("runtime_adapter.implementation");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0156 evidence without raw echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationApprovalGateThroughMcpAdapterContract(
        {
          request_id: "req_bp0159_invalid_delegated_approval_gate",
          approval_gate_request: {
            implementation_approval_gate_authority: "runtime_adapter_implementation",
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
              ...defaultRuntimeAdapterImplementationApprovalGate.denied_runtime_behavior,
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
        request_id: "req_bp0159_invalid_delegated_approval_gate",
        request_errors: [],
        approval_gate_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate.unsafe_approval_authority",
            path: "/implementation_approval_gate_authority",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate.runtime_adapter_implementation_forbidden",
            path: "/runtime_adapter_implementation_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate.runtime_adapter_dispatch_forbidden",
            path: "/runtime_adapter_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate.live_adapter_invocation_forbidden",
            path: "/live_adapter_invocation_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate.live_broker_dispatch_forbidden",
            path: "/live_broker_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate.live_execution_forbidden",
            path: "/live_execution_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate.secret_value_forbidden",
            path: "/source_refs/0",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate.unexpected_field",
            path: "/denied_runtime_behavior",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_approval_gate.side_effects_forbidden",
            path: "/side_effects",
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
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("dispatch raw runtime adapter");
  });

  it("lists the approval gate after BP-0160 registration at twenty-two read-only tools", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const localToolNames = localServer.listTools().tools.map((tool) => tool.name);

    expect(localToolNames).toEqual(registeredToolNames);
    expect(localToolNames).toHaveLength(29);
    expect(localToolNames).toContain(
      mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
    );

    const { client } = await createConnectedSdkClient();
    const tools = await client.listTools();
    const officialToolNames = tools.tools.map((tool) => tool.name);

    expect(officialToolNames).toEqual(registeredToolNames);
    expect(officialToolNames).toHaveLength(29);
    expect(officialToolNames).toContain(
      mcpRuntimeAdapterImplementationApprovalGateToolContract.tool,
    );
  });
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const server = createLnsatOfficialMcpSdkServer({ now: () => now });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({
    name: "lnsat-bp0159-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
