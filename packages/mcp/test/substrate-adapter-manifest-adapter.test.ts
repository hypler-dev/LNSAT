import {
  capabilityBrokerRequestContract,
  defaultSubstrateAdapterManifest,
  substrateControlIntentContract,
} from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectSubstrateAdapterManifestThroughMcpAdapterContract,
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
  mcpAdapterInvocationPreflightToolContract,
  mcpAdapterInvocationAuthorizationBundleToolContract,
  mcpAdapterInvocationResultToolContract,
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

describe("@lnsat/mcp BP-0111 substrate adapter manifest MCP adapter contract", () => {
  it("exposes read-only substrate adapter manifest adapter metadata without side effects", () => {
    expect(mcpSubstrateAdapterManifestToolContract).toMatchObject({
      tool: "lnsat.platform.substrate_adapter_manifest.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.substrate_adapter_manifest.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/platform/substrate-adapter-manifest/inspect",
      authority: ["lnsat.gateway.substrate_adapter_manifest.v0_1"],
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(mcpSubstrateAdapterManifestToolContract.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/substrate-adapter-manifest.ts",
        "apps/api/src/substrate-adapter-manifest.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid substrate adapter manifest inspection to the Gateway contract", async () => {
    const response = await inspectSubstrateAdapterManifestThroughMcpAdapterContract(
      {
        request_id: "req_bp0111_substrate_adapter_manifest",
        manifest_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0111",
              summary: "MCP adapter delegates substrate adapter manifest evidence",
            },
          ],
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpSubstrateAdapterManifestToolContract.tool,
      gateway_contract_id: "lnsat.gateway.substrate_adapter_manifest.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0111_substrate_adapter_manifest",
        inspected_at: "2026-05-07T00:00:00.000Z",
        substrate_adapter_manifest: {
          contract_id: "lnsat.platform.substrate_adapter_manifest.v0_1",
          manifest_version: "0.1",
          adapter_identity: {
            adapter_ref: "adapter:service-control-manifest",
            adapter_name: "Service control proposal adapter manifest",
            owner_ref: "owner:lnsat-platform",
          },
          adapter_class: "service_control_adapter",
          supported_substrate_kinds: ["services"],
          supported_control_modes: [
            "approval_gated_mutation",
            "observation",
            "proposal",
          ],
          adapter_authority: "manifest_only_no_invocation",
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        adapter_authority: "manifest_only_no_invocation",
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
      accepted_capability_refs: [
        {
          capability_ref: "capability:service-restart-request",
          capability: "service.restart.request",
          evidence_ref: "evidence:bp0102-capability-broker-request",
          summary: "BP-0102 source-only capability broker request evidence",
        },
      ],
      required_input_evidence_refs: [
        {
          evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
          contract_id: substrateControlIntentContract.contract_id,
          summary: "BP-0096 substrate control intent evidence required before adapters",
        },
        {
          evidence_ref: "evidence:bp0102-capability-broker-request",
          contract_id: capabilityBrokerRequestContract.contract_id,
          summary: "BP-0102 broker request evidence required before adapter selection",
        },
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
        "manifest describes adapter only",
        "manifest does not instantiate adapter",
        "manifest does not invoke substrate control",
      ]),
      denied_live_behavior: expect.arrayContaining([
        "no live broker dispatch",
        "no live adapter invocation",
        "no live execution",
      ]),
      source_refs: expect.arrayContaining([
        "ticket:BP-0111: MCP adapter delegates substrate adapter manifest evidence",
      ]),
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response = await inspectSubstrateAdapterManifestThroughMcpAdapterContract(
      {
        request_id: 111,
        raw_rejected_value: "substrate.adapter.invoke TOKEN=inline-secret",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpSubstrateAdapterManifestToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: null,
        request_errors: [
          expect.objectContaining({
            code: "substrate_adapter_manifest_gateway.unexpected_field",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "substrate_adapter_manifest_gateway.invalid_request_id",
            path: "/request_id",
          }),
          expect.objectContaining({
            code: "substrate_adapter_manifest_gateway.missing_manifest_request",
            path: "/manifest_request",
          }),
        ],
        manifest_errors: [],
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
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0108 evidence without raw echo", async () => {
    const response = await inspectSubstrateAdapterManifestThroughMcpAdapterContract(
      {
        request_id: "req_bp0111_invalid_delegated_manifest",
        manifest_request: {
          ...defaultSubstrateAdapterManifest,
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
        request_id: "req_bp0111_invalid_delegated_manifest",
        request_errors: [],
        manifest_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "substrate_adapter_manifest.live_adapter_invocation_forbidden",
            path: "/live_adapter_invocation_allowed",
          }),
          expect.objectContaining({
            code: "substrate_adapter_manifest.live_broker_dispatch_forbidden",
            path: "/live_broker_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "substrate_adapter_manifest.live_execution_forbidden",
            path: "/live_execution_allowed",
          }),
          expect.objectContaining({
            code: "substrate_adapter_manifest.secret_value_forbidden",
            path: "/source_refs/0",
          }),
          expect.objectContaining({
            code: "substrate_adapter_manifest.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "substrate_adapter_manifest.side_effects_forbidden",
            path: "/side_effects",
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
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("invoke raw adapter command");
  });

  it("preserves observation-only manifest without invocation, dispatch, execution, or side effects", async () => {
    const response = await inspectSubstrateAdapterManifestThroughMcpAdapterContract(
      {
        request_id: "req_bp0111_observation_manifest",
        manifest_request: {
          adapter_identity: {
            adapter_ref: "adapter:service-observation-manifest",
            adapter_name: "Service observation manifest",
            owner_ref: "owner:lnsat-platform",
          },
          adapter_class: "no_adapter_dispatch",
          supported_substrate_kinds: ["services"],
          supported_control_modes: ["observation"],
          accepted_capability_refs: [
            {
              capability_ref: "capability:service-status-read",
              capability: "service.status.read",
              evidence_ref: "evidence:bp0102-service-status-read",
              summary: "source-only service status broker request",
            },
          ],
          required_input_evidence_refs: [
            {
              evidence_ref: "evidence:bp0102-service-status-read",
              contract_id: capabilityBrokerRequestContract.contract_id,
              summary: "source-only broker request evidence",
            },
          ],
          source_refs: [
            {
              source_ref: "ticket:BP-0111",
              summary: "MCP adapter wraps observation-only adapter manifest",
            },
          ],
          policy_gate_refs: [
            {
              gate_ref: "substrate.adapter.manifest.review",
              decision_ref: "policy_decision:service-observation-manifest",
              required: true,
            },
          ],
          approval_refs: [],
          audit_event_plan: defaultSubstrateAdapterManifest.audit_event_plan,
          result_expectations: defaultSubstrateAdapterManifest.result_expectations,
          rollback_expectations: [],
          denied_adapter_behavior: ["manifest describes adapter only"],
          denied_live_behavior: ["no live adapter invocation", "no live execution"],
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      gateway_response: {
        ok: true,
        request_id: "req_bp0111_observation_manifest",
        adapter_identity: {
          adapter_ref: "adapter:service-observation-manifest",
          adapter_name: "Service observation manifest",
          owner_ref: "owner:lnsat-platform",
        },
        adapter_class: "no_adapter_dispatch",
        supported_control_modes: ["observation"],
        required_approvals: [],
        rollback_expectations: [],
        adapter_authority: "manifest_only_no_invocation",
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

  it("keeps local and official MCP registration lists at exactly twenty-two read-only tools after BP-0142 registration", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const localToolNames = localServer.listTools().tools.map((tool) => tool.name);

    expect(localToolNames).toEqual(registeredToolNames);
    expect(localToolNames).toHaveLength(29);
    expect(localToolNames).toContain(mcpSubstrateAdapterManifestToolContract.tool);

    const { client } = await createConnectedSdkClient();
    const tools = await client.listTools();
    const officialToolNames = tools.tools.map((tool) => tool.name);

    expect(officialToolNames).toEqual(registeredToolNames);
    expect(officialToolNames).toHaveLength(29);
    expect(officialToolNames).toContain(mcpSubstrateAdapterManifestToolContract.tool);
  });
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLnsatOfficialMcpSdkServer({
    now: () => now,
  });
  const client = new Client({
    name: "lnsat-bp0111-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
