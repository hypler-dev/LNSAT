import {
  capabilityBrokerRequestContract,
  defaultAdapterInvocationPreflight,
  substrateAdapterManifestContract,
  substrateControlIntentContract,
} from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectAdapterInvocationPreflightThroughMcpAdapterContract,
  mcpAdapterInvocationPreflightToolContract,
  mcpAdapterInvocationAuthorizationBundleToolContract,
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

const now = new Date("2026-05-07T00:00:00.000Z");

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

describe("@lnsat/mcp BP-0117 adapter invocation preflight MCP adapter contract", () => {
  it("exposes read-only adapter invocation preflight adapter metadata without side effects", () => {
    expect(mcpAdapterInvocationPreflightToolContract).toMatchObject({
      tool: "lnsat.platform.adapter_invocation_preflight.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.adapter_invocation_preflight.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/platform/adapter-invocation-preflight/inspect",
      authority: ["lnsat.gateway.adapter_invocation_preflight.v0_1"],
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(mcpAdapterInvocationPreflightToolContract.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/adapter-invocation-preflight.ts",
        "apps/api/src/adapter-invocation-preflight.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid adapter invocation preflight inspection to the Gateway contract", async () => {
    const response = await inspectAdapterInvocationPreflightThroughMcpAdapterContract(
      {
        request_id: "req_bp0117_adapter_invocation_preflight",
        preflight_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0117",
              summary: "MCP adapter delegates adapter invocation preflight evidence",
            },
          ],
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpAdapterInvocationPreflightToolContract.tool,
      gateway_contract_id: "lnsat.gateway.adapter_invocation_preflight.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0117_adapter_invocation_preflight",
        inspected_at: "2026-05-07T00:00:00.000Z",
        adapter_invocation_preflight: {
          contract_id: "lnsat.platform.adapter_invocation_preflight.v0_1",
          preflight_version: "0.1",
          preflight_identity: {
            preflight_ref: "preflight:service-control-adapter-invocation",
            preflight_name: "Service control adapter invocation preflight",
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
          adapter_class: "service_control_adapter",
          adapter_authority: "preflight_only_no_invocation",
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        adapter_authority: "preflight_only_no_invocation",
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
      required_input_evidence_refs: [
        {
          evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
          contract_id: substrateControlIntentContract.contract_id,
          summary:
            "BP-0096 substrate control intent evidence required before preflight",
        },
        {
          evidence_ref: "evidence:bp0102-capability-broker-request",
          contract_id: capabilityBrokerRequestContract.contract_id,
          summary: "BP-0102 broker request evidence required before preflight",
        },
        {
          evidence_ref: "evidence:bp0108-substrate-adapter-manifest",
          contract_id: substrateAdapterManifestContract.contract_id,
          summary: "BP-0108 adapter manifest evidence required before preflight",
        },
      ],
      required_policy_gates: expect.arrayContaining([
        "capability.broker.policy.review",
        "substrate.adapter.invocation.preflight.review",
        "substrate.adapter.manifest.review",
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
      denied_adapter_behavior: expect.arrayContaining([
        "preflight classifies adapter invocation only",
        "preflight does not instantiate adapter",
        "preflight does not invoke substrate control",
      ]),
      denied_live_behavior: expect.arrayContaining([
        "no live broker dispatch",
        "no live adapter invocation",
        "no live execution",
      ]),
      source_refs: expect.arrayContaining([
        "ticket:BP-0117: MCP adapter delegates adapter invocation preflight evidence",
      ]),
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response = await inspectAdapterInvocationPreflightThroughMcpAdapterContract(
      {
        request_id: 117,
        raw_rejected_value: "substrate.adapter.invoke TOKEN=inline-secret",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAdapterInvocationPreflightToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: null,
        request_errors: [
          expect.objectContaining({
            code: "adapter_invocation_preflight_gateway.unexpected_field",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "adapter_invocation_preflight_gateway.invalid_request_id",
            path: "/request_id",
          }),
          expect.objectContaining({
            code: "adapter_invocation_preflight_gateway.missing_preflight_request",
            path: "/preflight_request",
          }),
        ],
        preflight_errors: [],
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
    expect(JSON.stringify(response)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0114 evidence without raw echo", async () => {
    const response = await inspectAdapterInvocationPreflightThroughMcpAdapterContract(
      {
        request_id: "req_bp0117_invalid_delegated_preflight",
        preflight_request: {
          ...defaultAdapterInvocationPreflight,
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
        request_id: "req_bp0117_invalid_delegated_preflight",
        request_errors: [],
        preflight_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "adapter_invocation_preflight.live_adapter_invocation_forbidden",
            path: "/live_adapter_invocation_allowed",
          }),
          expect.objectContaining({
            code: "adapter_invocation_preflight.live_broker_dispatch_forbidden",
            path: "/live_broker_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "adapter_invocation_preflight.live_execution_forbidden",
            path: "/live_execution_allowed",
          }),
          expect.objectContaining({
            code: "adapter_invocation_preflight.secret_value_forbidden",
            path: "/source_refs/0",
          }),
          expect.objectContaining({
            code: "adapter_invocation_preflight.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "adapter_invocation_preflight.side_effects_forbidden",
            path: "/side_effects",
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
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("invoke raw adapter command");
  });

  it("registers local and official MCP calls at exactly twenty-two read-only tools", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const localToolNames = localServer.listTools().tools.map((tool) => tool.name);

    expect(localToolNames).toEqual(registeredToolNames);
    expect(localToolNames).toHaveLength(29);
    expect(localToolNames).toContain(mcpAdapterInvocationPreflightToolContract.tool);

    const localResponse = await localServer.callTool({
      name: mcpAdapterInvocationPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0118_registered_local_call",
        preflight_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0118",
              summary:
                "Registered local MCP inspection preserves adapter invocation preflight evidence",
            },
          ],
          side_effects: [],
        },
      },
    });

    expect(localResponse).toMatchObject({
      ok: true,
      tool: mcpAdapterInvocationPreflightToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAdapterInvocationPreflightToolContract.tool,
            gateway_contract_id: "lnsat.gateway.adapter_invocation_preflight.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0118_registered_local_call",
              adapter_invocation_preflight: {
                contract_id: "lnsat.platform.adapter_invocation_preflight.v0_1",
                adapter_authority: "preflight_only_no_invocation",
                live_adapter_invocation_allowed: false,
                live_broker_dispatch_allowed: false,
                live_execution_allowed: false,
                side_effects: [],
              },
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
    expect(officialToolNames).toContain(mcpAdapterInvocationPreflightToolContract.tool);

    const result = await client.callTool({
      name: mcpAdapterInvocationPreflightToolContract.tool,
      arguments: {
        request_id: "req_bp0118_registered_sdk_call",
        preflight_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0118",
              summary:
                "Registered official SDK MCP inspection preserves adapter invocation preflight evidence",
            },
          ],
          side_effects: [],
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
        request_id: "req_bp0118_registered_sdk_call",
        adapter_invocation_preflight: {
          contract_id: "lnsat.platform.adapter_invocation_preflight.v0_1",
          adapter_authority: "preflight_only_no_invocation",
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        source_refs: expect.arrayContaining([
          "ticket:BP-0118: Registered official SDK MCP inspection preserves adapter invocation preflight evidence",
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
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLnsatOfficialMcpSdkServer({
    now: () => now,
  });
  const client = new Client({
    name: "lnsat-bp0117-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
