import {
  adapterInvocationAuthorizationBundleContract,
  adapterInvocationPreflightContract,
  capabilityBrokerRequestContract,
  defaultRuntimeAdapterReadinessGate,
  runtimeAdapterReadinessGateContract,
  substrateAdapterManifestContract,
  substrateControlIntentContract,
} from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  handleLocalStdioSmokeRequestLine,
  inspectRuntimeAdapterReadinessGateThroughMcpAdapterContract,
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

describe("@lnsat/mcp BP-0135 runtime adapter readiness gate MCP adapter contract", () => {
  it("exposes read-only readiness gate metadata without registration or side effects", () => {
    expect(mcpRuntimeAdapterReadinessGateToolContract).toMatchObject({
      tool: "lnsat.platform.runtime_adapter_readiness_gate.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.runtime_adapter_readiness_gate.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/platform/runtime-adapter-readiness-gate/inspect",
      authority: ["lnsat.gateway.runtime_adapter_readiness_gate.v0_1"],
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(mcpRuntimeAdapterReadinessGateToolContract.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/runtime-adapter-readiness-gate.ts",
        "apps/api/src/runtime-adapter-readiness-gate.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid readiness gate inspection to the Gateway contract", async () => {
    const response = await inspectRuntimeAdapterReadinessGateThroughMcpAdapterContract(
      {
        request_id: "req_bp0135_runtime_adapter_readiness_gate",
        readiness_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0135",
              summary: "MCP adapter delegates runtime adapter readiness gate evidence",
            },
          ],
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpRuntimeAdapterReadinessGateToolContract.tool,
      gateway_contract_id: "lnsat.gateway.runtime_adapter_readiness_gate.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0135_runtime_adapter_readiness_gate",
        inspected_at: "2026-05-08T00:00:00.000Z",
        runtime_adapter_readiness_gate: {
          contract_id: runtimeAdapterReadinessGateContract.contract_id,
          readiness_version: "0.1",
          readiness_identity: {
            readiness_ref: "readiness_gate:service-control-adapter-runtime-readiness",
            readiness_name: "Service control runtime adapter readiness gate",
            owner_ref: "owner:lnsat-platform",
          },
          requested_actor: {
            actor_ref: "agent:codex",
            actor_type: "agent",
            role_ref: "role:ops_assistant",
          },
          capability: "service.restart.request",
          risk_level: 5,
          target_substrate_kind: "services",
          requested_control_mode: "approval_gated_mutation",
          readiness_authority: "readiness_gate_only_no_runtime_invocation",
          runtime_adapter_dispatch_allowed: false,
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        readiness_authority: "readiness_gate_only_no_runtime_invocation",
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

    expect(response.gateway_response).toMatchObject({
      substrate_control_intent_refs: [
        {
          intent_ref: "intent:bp0096-substrate-control-intent",
          evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
          contract_id: substrateControlIntentContract.contract_id,
          summary: "BP-0096 source-only substrate control intent evidence",
        },
      ],
      capability_broker_request_refs: [
        {
          request_ref: "request:bp0102-capability-broker-request",
          evidence_ref: "evidence:bp0102-capability-broker-request",
          contract_id: capabilityBrokerRequestContract.contract_id,
          summary: "BP-0102 source-only capability broker request evidence",
        },
      ],
      substrate_adapter_manifest_refs: [
        {
          manifest_ref: "manifest:bp0108-substrate-adapter-manifest",
          evidence_ref: "evidence:bp0108-substrate-adapter-manifest",
          contract_id: substrateAdapterManifestContract.contract_id,
          summary: "BP-0108 source-only substrate adapter manifest evidence",
        },
      ],
      adapter_invocation_preflight_refs: [
        {
          preflight_ref: "preflight:service-control-adapter-invocation",
          evidence_ref: "evidence:bp0114-adapter-invocation-preflight",
          contract_id: adapterInvocationPreflightContract.contract_id,
          summary: "BP-0114 source-only adapter invocation preflight evidence",
        },
      ],
      adapter_invocation_authorization_bundle_refs: [
        {
          bundle_ref: "authorization_bundle:service-control-adapter-invocation",
          evidence_ref: "evidence:bp0126-adapter-invocation-authorization-bundle",
          contract_id: adapterInvocationAuthorizationBundleContract.contract_id,
          summary:
            "BP-0126 source-only adapter invocation authorization bundle evidence",
        },
      ],
      required_policy_gates: expect.arrayContaining([
        "substrate.adapter.runtime_readiness_gate.review",
        "substrate.adapter.invocation.result.review",
      ]),
      required_approvals: expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
      denied_live_behavior: expect.arrayContaining([
        "no live adapter invocation",
        "no live broker dispatch",
        "no live execution",
        "readiness gate does not invoke adapter",
        "readiness gate does not dispatch broker request",
      ]),
      source_refs: expect.arrayContaining(["ticket:BP-0135"]),
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response = await inspectRuntimeAdapterReadinessGateThroughMcpAdapterContract(
      {
        request_id: 135,
        raw_rejected_value: "runtime_adapter.dispatch.execute TOKEN=inline-secret",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpRuntimeAdapterReadinessGateToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: null,
        request_errors: [
          expect.objectContaining({
            code: "runtime_adapter_readiness_gate_gateway.unexpected_field",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "runtime_adapter_readiness_gate_gateway.invalid_request_id",
            path: "/request_id",
          }),
          expect.objectContaining({
            code: "runtime_adapter_readiness_gate_gateway.missing_readiness_request",
            path: "/readiness_request",
          }),
        ],
        readiness_errors: [],
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
    expect(JSON.stringify(response)).not.toContain("runtime_adapter.dispatch");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0132 evidence without raw echo", async () => {
    const response = await inspectRuntimeAdapterReadinessGateThroughMcpAdapterContract(
      {
        request_id: "req_bp0135_invalid_delegated_readiness_gate",
        readiness_request: {
          ...defaultRuntimeAdapterReadinessGate,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and dispatch raw runtime adapter command",
            },
          ],
          runtime_adapter_dispatch_allowed: true,
          live_adapter_invocation_allowed: true,
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          readiness_authority: "readiness_grants_execution",
          side_effects: [{ effect_type: "runtime_adapter_dispatch" }],
          command: "rm -rf /",
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0135_invalid_delegated_readiness_gate",
        request_errors: [],
        readiness_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "runtime_adapter_readiness_gate.unsafe_readiness_authority",
            path: "/readiness_authority",
          }),
          expect.objectContaining({
            code: "runtime_adapter_readiness_gate.runtime_adapter_dispatch_forbidden",
            path: "/runtime_adapter_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_readiness_gate.live_adapter_invocation_forbidden",
            path: "/live_adapter_invocation_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_readiness_gate.live_broker_dispatch_forbidden",
            path: "/live_broker_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_readiness_gate.live_execution_forbidden",
            path: "/live_execution_allowed",
          }),
          expect.objectContaining({
            code: "runtime_adapter_readiness_gate.secret_value_forbidden",
            path: "/source_refs/0",
          }),
          expect.objectContaining({
            code: "runtime_adapter_readiness_gate.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "runtime_adapter_readiness_gate.side_effects_forbidden",
            path: "/side_effects",
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
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain(
      "dispatch raw runtime adapter command",
    );
  });

  it("keeps local, official SDK, and built stdio MCP registration lists read-only after BP-0136 registration", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const localToolNames = localServer.listTools().tools.map((tool) => tool.name);

    expect(localToolNames).toEqual(registeredToolNames);
    expect(localToolNames).toHaveLength(29);
    expect(localToolNames).toContain(mcpRuntimeAdapterReadinessGateToolContract.tool);

    const localCall = await localServer.callTool({
      name: mcpRuntimeAdapterReadinessGateToolContract.tool,
      arguments: {
        request_id: "req_bp0136_registered_local_call",
        readiness_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0136",
              summary: "Local registration preserves readiness evidence",
            },
          ],
          side_effects: [],
        },
      },
    });
    expect(localCall).toMatchObject({
      ok: true,
      is_error: false,
      tool: mcpRuntimeAdapterReadinessGateToolContract.tool,
      content: [
        {
          type: "json",
          json: {
            ok: true,
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
        request_id: "req_bp0136_registered_stdio_call",
        tool_call: {
          name: mcpRuntimeAdapterReadinessGateToolContract.tool,
          arguments: {
            request_id: "req_bp0136_registered_stdio_call",
            readiness_request: {
              source_refs: [
                {
                  source_ref: "ticket:BP-0136",
                  summary: "Local stdio registration preserves readiness evidence",
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
      request_id: "req_bp0136_registered_stdio_call",
      mcp_response: {
        ok: true,
        is_error: false,
        tool: mcpRuntimeAdapterReadinessGateToolContract.tool,
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
      mcpRuntimeAdapterReadinessGateToolContract.tool,
    );
  });
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLnsatOfficialMcpSdkServer({
    now: () => now,
  });
  const client = new Client({
    name: "lnsat-bp0135-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
