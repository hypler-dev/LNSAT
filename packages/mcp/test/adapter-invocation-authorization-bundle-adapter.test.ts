import {
  adapterInvocationAuthorizationBundleContract,
  adapterInvocationPreflightContract,
  capabilityBrokerRequestContract,
  defaultAdapterInvocationAuthorizationBundle,
  substrateAdapterManifestContract,
  substrateControlIntentContract,
} from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectAdapterInvocationAuthorizationBundleThroughMcpAdapterContract,
  mcpAdapterInvocationAuthorizationBundleToolContract,
  mcpAdapterInvocationAuthorizationBundleToolRegistration,
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

describe("@lnsat/mcp BP-0129 adapter invocation authorization bundle MCP adapter contract", () => {
  it("exposes read-only authorization bundle metadata without registration or side effects", () => {
    expect(mcpAdapterInvocationAuthorizationBundleToolContract).toMatchObject({
      tool: "lnsat.platform.adapter_invocation_authorization_bundle.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.adapter_invocation_authorization_bundle.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/platform/adapter-invocation-authorization-bundle/inspect",
      authority: ["lnsat.gateway.adapter_invocation_authorization_bundle.v0_1"],
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(mcpAdapterInvocationAuthorizationBundleToolRegistration).toMatchObject({
      name: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      side_effects: [],
    });
    expect(mcpAdapterInvocationAuthorizationBundleToolContract.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/adapter-invocation-authorization-bundle.ts",
        "apps/api/src/adapter-invocation-authorization-bundle.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid authorization bundle inspection to the Gateway contract", async () => {
    const response =
      await inspectAdapterInvocationAuthorizationBundleThroughMcpAdapterContract(
        {
          request_id: "req_bp0129_adapter_invocation_authorization_bundle",
          bundle_request: {
            source_refs: [
              {
                source_ref: "ticket:BP-0129",
                summary:
                  "MCP adapter delegates adapter invocation authorization bundle evidence",
              },
            ],
            side_effects: [],
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      gateway_contract_id: "lnsat.gateway.adapter_invocation_authorization_bundle.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0129_adapter_invocation_authorization_bundle",
        inspected_at: "2026-05-08T00:00:00.000Z",
        adapter_invocation_authorization_bundle: {
          contract_id: adapterInvocationAuthorizationBundleContract.contract_id,
          bundle_version: "0.1",
          bundle_identity: {
            bundle_ref: "authorization_bundle:service-control-adapter-invocation",
            bundle_name: "Service control adapter invocation authorization bundle",
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
          authorization_authority: "authorization_bundle_only_no_invocation",
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        authorization_authority: "authorization_bundle_only_no_invocation",
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
      adapter_invocation_preflight_refs: [
        {
          preflight_ref: "preflight:service-control-adapter-invocation",
          evidence_ref: "evidence:bp0114-adapter-invocation-preflight",
          contract_id: adapterInvocationPreflightContract.contract_id,
          summary: "BP-0114 source-only adapter invocation preflight evidence",
        },
      ],
      required_policy_gates: expect.arrayContaining([
        "substrate.adapter.invocation.authorization_bundle.review",
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
        "authorization bundle does not invoke adapter",
        "authorization bundle does not dispatch broker request",
      ]),
      source_refs: expect.arrayContaining(["ticket:BP-0129"]),
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response =
      await inspectAdapterInvocationAuthorizationBundleThroughMcpAdapterContract(
        {
          request_id: 129,
          raw_rejected_value: "adapter.invoke.execute TOKEN=inline-secret",
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: null,
        request_errors: [
          expect.objectContaining({
            code: "adapter_invocation_authorization_bundle_gateway.unexpected_field",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "adapter_invocation_authorization_bundle_gateway.invalid_request_id",
            path: "/request_id",
          }),
          expect.objectContaining({
            code: "adapter_invocation_authorization_bundle_gateway.missing_bundle_request",
            path: "/bundle_request",
          }),
        ],
        bundle_errors: [],
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
    expect(JSON.stringify(response)).not.toContain("adapter.invoke.execute");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0126 evidence without raw echo", async () => {
    const response =
      await inspectAdapterInvocationAuthorizationBundleThroughMcpAdapterContract(
        {
          request_id: "req_bp0129_invalid_delegated_authorization_bundle",
          bundle_request: {
            ...defaultAdapterInvocationAuthorizationBundle,
            source_refs: [
              {
                source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
                summary: "read DATABASE_URL and invoke raw adapter command",
              },
            ],
            live_adapter_invocation_allowed: true,
            live_broker_dispatch_allowed: true,
            live_execution_allowed: true,
            authorization_authority: "authorization_grants_execution",
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
        request_id: "req_bp0129_invalid_delegated_authorization_bundle",
        request_errors: [],
        bundle_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "adapter_invocation_authorization_bundle.unsafe_authorization_authority",
            path: "/authorization_authority",
          }),
          expect.objectContaining({
            code: "adapter_invocation_authorization_bundle.live_adapter_invocation_forbidden",
            path: "/live_adapter_invocation_allowed",
          }),
          expect.objectContaining({
            code: "adapter_invocation_authorization_bundle.live_broker_dispatch_forbidden",
            path: "/live_broker_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "adapter_invocation_authorization_bundle.live_execution_forbidden",
            path: "/live_execution_allowed",
          }),
          expect.objectContaining({
            code: "adapter_invocation_authorization_bundle.secret_value_forbidden",
            path: "/source_refs/0",
          }),
          expect.objectContaining({
            code: "adapter_invocation_authorization_bundle.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "adapter_invocation_authorization_bundle.side_effects_forbidden",
            path: "/side_effects",
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
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("invoke raw adapter command");
  });

  it("registers local and official MCP calls without granting live invocation", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const localToolNames = localServer.listTools().tools.map((tool) => tool.name);

    expect(localToolNames).toEqual(registeredToolNames);
    expect(localToolNames).toHaveLength(29);
    expect(localToolNames).toContain(
      mcpAdapterInvocationAuthorizationBundleToolContract.tool,
    );

    const localResponse = await localServer.callTool({
      name: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      arguments: {
        request_id: "req_bp0130_registered_local_authorization_bundle",
        bundle_request: { side_effects: [] },
      },
    });

    expect(localResponse).toMatchObject({
      ok: true,
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
              request_id: "req_bp0130_registered_local_authorization_bundle",
              authorization_authority: "authorization_bundle_only_no_invocation",
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
    });

    const { client } = await createConnectedSdkClient();
    const tools = await client.listTools();
    const officialToolNames = tools.tools.map((tool) => tool.name);

    expect(officialToolNames).toEqual(registeredToolNames);
    expect(officialToolNames).toHaveLength(29);
    expect(officialToolNames).toContain(
      mcpAdapterInvocationAuthorizationBundleToolContract.tool,
    );

    const officialResponse = await client.callTool({
      name: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      arguments: {
        request_id: "req_bp0130_registered_official_authorization_bundle",
        bundle_request: { side_effects: [] },
      },
    });

    expect(officialResponse.isError).toBe(false);
    expect(officialResponse.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAdapterInvocationAuthorizationBundleToolContract.tool,
      gateway_contract_id: "lnsat.gateway.adapter_invocation_authorization_bundle.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0130_registered_official_authorization_bundle",
        authorization_authority: "authorization_bundle_only_no_invocation",
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
    name: "lnsat-bp0129-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
