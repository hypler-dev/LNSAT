import {
  defaultRuntimeAdapterImplementationDryRunEvidence,
  runtimeAdapterImplementationDryRunEvidenceContract,
} from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectRuntimeAdapterImplementationDryRunEvidenceThroughMcpAdapterContract,
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
  mcpRuntimeAdapterImplementationAuthorizationRequestToolContract,
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

const now = new Date("2026-05-10T00:00:00.000Z");

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

describe("@lnsat/mcp BP-0166 runtime adapter implementation dry-run evidence MCP adapter contract", () => {
  it("exposes contract-only dry-run evidence metadata without registration or side effects", () => {
    expect(mcpRuntimeAdapterImplementationDryRunEvidenceToolContract).toMatchObject({
      tool: "lnsat.platform.runtime_adapter_implementation_dry_run_evidence.inspect",
      status: "contract_only",
      gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_dry_run_evidence.v0_1",
      gateway_method: "POST",
      gateway_path:
        "/v1/platform/runtime-adapter-implementation-dry-run-evidence/inspect",
      authority: ["lnsat.gateway.runtime_adapter_implementation_dry_run_evidence.v0_1"],
      implementation_authority:
        "implementation_dry_run_evidence_only_no_runtime_adapter",
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
      mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.source_docs,
    ).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/runtime-adapter-implementation-dry-run-evidence.ts",
        "apps/api/src/runtime-adapter-implementation-dry-run-evidence.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid dry-run evidence inspection to the Gateway contract", async () => {
    const response =
      await inspectRuntimeAdapterImplementationDryRunEvidenceThroughMcpAdapterContract(
        {
          request_id: "req_bp0166_runtime_adapter_implementation_dry_run_evidence",
          dry_run_evidence_request: {
            source_refs: [
              {
                source_ref: "ticket:BP-0166",
                summary:
                  "MCP adapter delegates runtime adapter implementation dry-run evidence",
              },
            ],
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_dry_run_evidence.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0166_runtime_adapter_implementation_dry_run_evidence",
        inspected_at: "2026-05-10T00:00:00.000Z",
        runtime_adapter_implementation_dry_run_evidence: {
          contract_id: runtimeAdapterImplementationDryRunEvidenceContract.contract_id,
          dry_run_evidence_version: "0.1",
          implementation_dry_run_evidence_authority:
            "implementation_dry_run_evidence_only_no_runtime_adapter",
          runtime_adapter_implementation_allowed: false,
          runtime_adapter_dispatch_allowed: false,
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        source_refs: ["ticket:BP-0166"],
        implementation_dry_run_evidence_authority:
          "implementation_dry_run_evidence_only_no_runtime_adapter",
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
      mcp_registration: false,
      state_changing_tool: false,
      runtime_dispatcher: false,
      runtime_adapter_implementation: false,
      side_effects: [],
    });

    expect(response.gateway_response).toMatchObject({
      packet_selection_refs:
        defaultRuntimeAdapterImplementationDryRunEvidence.packet_selection_refs,
      approval_gate_chain_review_refs:
        defaultRuntimeAdapterImplementationDryRunEvidence.approval_gate_chain_review_refs,
      validation_command_refs:
        defaultRuntimeAdapterImplementationDryRunEvidence.validation_command_refs,
      dry_run_artifact_refs:
        defaultRuntimeAdapterImplementationDryRunEvidence.dry_run_artifact_refs,
      approval_gate_chain_review_snapshot: {
        packet_ref: "packet:BP-0161",
        reviewed_mcp_tool:
          "lnsat.platform.runtime_adapter_implementation_approval_gate.inspect",
        registered_read_only_tool_count: 22,
        side_effects: [],
      },
      denied_runtime_behavior:
        defaultRuntimeAdapterImplementationDryRunEvidence.denied_runtime_behavior,
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationDryRunEvidenceThroughMcpAdapterContract(
        {
          request_id: 166,
          raw_rejected_value:
            "runtime_adapter.implementation.execute TOKEN=inline-secret",
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: null,
        request_errors: [
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence_gateway.unexpected_field",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence_gateway.invalid_request_id",
            path: "/request_id",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence_gateway.missing_dry_run_evidence_request",
            path: "/dry_run_evidence_request",
          }),
        ],
        dry_run_evidence_errors: [],
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
    expect(JSON.stringify(response)).not.toContain("runtime_adapter.implementation");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0163 evidence without raw echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationDryRunEvidenceThroughMcpAdapterContract(
        {
          request_id: "req_bp0166_invalid_delegated_dry_run_evidence",
          dry_run_evidence_request: {
            implementation_dry_run_evidence_authority: "runtime_adapter_implementation",
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
              ...defaultRuntimeAdapterImplementationDryRunEvidence.denied_runtime_behavior,
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
        request_id: "req_bp0166_invalid_delegated_dry_run_evidence",
        request_errors: [],
        dry_run_evidence_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence.unsafe_dry_run_authority",
            path: "/implementation_dry_run_evidence_authority",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence.runtime_adapter_implementation_forbidden",
            path: "/runtime_adapter_implementation_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence.runtime_adapter_dispatch_forbidden",
            path: "/runtime_adapter_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence.live_adapter_invocation_forbidden",
            path: "/live_adapter_invocation_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence.live_broker_dispatch_forbidden",
            path: "/live_broker_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence.live_execution_forbidden",
            path: "/live_execution_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence.secret_value_forbidden",
            path: "/source_refs/0",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence.unexpected_field",
            path: "/denied_runtime_behavior",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "runtime_adapter_implementation_dry_run_evidence.side_effects_forbidden",
            path: "/side_effects",
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
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("dispatch raw runtime adapter");
  });

  it("registers dry-run evidence on local and official read-only MCP surfaces", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const localToolNames = localServer.listTools().tools.map((tool) => tool.name);

    expect(localToolNames).toEqual(registeredToolNames);
    expect(localToolNames).toHaveLength(29);
    expect(localToolNames).toContain(
      mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      mcpKnowledgeSurfaceToolContract.tool,
      mcpAgentContextFirewallToolContract.tool,
    );

    const localResponse = await localServer.callTool({
      name: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      arguments: {
        request_id: "req_bp0167_local_runtime_adapter_implementation_dry_run_evidence",
        dry_run_evidence_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0167",
              summary:
                "Local MCP registration preserves runtime adapter implementation dry-run evidence",
            },
          ],
        },
      },
    });

    expect(localResponse).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      is_error: false,
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
              request_id:
                "req_bp0167_local_runtime_adapter_implementation_dry_run_evidence",
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

    const { client } = await createConnectedSdkClient();
    const tools = await client.listTools();
    const officialToolNames = tools.tools.map((tool) => tool.name);

    expect(officialToolNames).toEqual(registeredToolNames);
    expect(officialToolNames).toHaveLength(29);
    expect(officialToolNames).toContain(
      mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      mcpKnowledgeSurfaceToolContract.tool,
      mcpAgentContextFirewallToolContract.tool,
    );

    const officialResponse = await client.callTool({
      name: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      arguments: {
        request_id:
          "req_bp0167_official_runtime_adapter_implementation_dry_run_evidence",
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

    expect(officialResponse.isError).toBe(false);
    expect(officialResponse.structuredContent).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterImplementationDryRunEvidenceToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_dry_run_evidence.v0_1",
      gateway_response: {
        ok: true,
        request_id:
          "req_bp0167_official_runtime_adapter_implementation_dry_run_evidence",
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
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const server = createLnsatOfficialMcpSdkServer({ now: () => now });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({
    name: "lnsat-bp0166-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
