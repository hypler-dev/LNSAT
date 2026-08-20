import { defaultSubstrateControlIntent } from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectSubstrateControlIntentThroughMcpAdapterContract,
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

const now = new Date("2026-05-06T00:00:00.000Z");

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

describe("@lnsat/mcp BP-0099 substrate control intent MCP adapter contract", () => {
  it("exposes read-only substrate control intent adapter metadata without side effects", () => {
    expect(mcpSubstrateControlIntentToolContract).toMatchObject({
      tool: "lnsat.platform.substrate_control_intent.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.substrate_control_intent.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/platform/substrate-control-intent/inspect",
      authority: ["lnsat.gateway.substrate_control_intent.v0_1"],
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(mcpSubstrateControlIntentToolContract.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/substrate-control-intent.ts",
        "apps/api/src/substrate-control-intent.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid substrate control intent inspection to the Gateway contract", async () => {
    const response = await inspectSubstrateControlIntentThroughMcpAdapterContract(
      {
        request_id: "req_bp0099_substrate_control_intent",
        intent_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0099",
              summary: "MCP adapter delegates substrate control intent evidence",
            },
          ],
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpSubstrateControlIntentToolContract.tool,
      gateway_contract_id: "lnsat.gateway.substrate_control_intent.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0099_substrate_control_intent",
        inspected_at: "2026-05-06T00:00:00.000Z",
        substrate_control_intent: {
          contract_id: "lnsat.platform.substrate_control_intent.v0_1",
          intent_version: "0.1",
          requested_actor: {
            actor_ref: "agent:codex",
            actor_type: "agent",
            role_ref: "role:ops_assistant",
          },
          capability: "service.restart.request",
          risk_level: 5,
          target_substrate_kind: "services",
          requested_control_mode: "approval_gated_mutation",
          secret_posture: "references_only_no_values",
          live_substrate_mutation_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        required_packet_family_refs: {
          capability: ["packet_family:capability"],
          execution: ["packet_family:execution"],
          environment: ["packet_family:environment"],
          audit: ["packet_family:audit"],
          results: ["packet_family:results"],
          rollback: ["packet_family:rollback"],
        },
        lifecycle_refs: expect.arrayContaining([
          expect.objectContaining({
            packet_type: "CapabilityPacket",
            lifecycle_ref: "lifecycle:CapabilityPacket:approval_required",
          }),
          expect.objectContaining({
            packet_type: "ExecutionPacket",
            lifecycle_ref: "lifecycle:ExecutionPacket:approved",
          }),
        ]),
        required_policy_gates: expect.arrayContaining([
          "execution.approval.required",
          "services.mutation.approval",
          "substrate.intent.policy.review",
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
        result_expectations: {
          result_packet_ref: "result_packet:substrate-control-intent",
          expected_statuses: [
            "approved",
            "denied",
            "completed",
            "failed",
            "rolled_back",
          ],
        },
        rollback_expectations: expect.arrayContaining([
          expect.objectContaining({
            rollback_ref: "rollback:service-control-intent-review",
            owner_ref: "owner:lnsat-platform",
          }),
        ]),
        blocked_live_actions: expect.arrayContaining([
          "substrate.mutation.execute",
          "runtime.execution.start",
          "database.write.execute",
          "service.restart.execute",
          "dns.cloudflare.write",
          "ssh.raw.execute",
          "docker.runner.start",
          "node_agent.exec",
          "git.command.execute",
        ]),
        denied_live_behavior: expect.arrayContaining([
          "no live substrate mutation",
          "no live execution",
          "no secret values",
        ]),
        source_refs: expect.arrayContaining([
          "ticket:BP-0099: MCP adapter delegates substrate control intent evidence",
        ]),
        live_substrate_mutation_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response = await inspectSubstrateControlIntentThroughMcpAdapterContract(
      {
        request_id: 99,
        raw_rejected_value: "ssh.raw.execute TOKEN=inline-secret",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpSubstrateControlIntentToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: null,
        request_errors: [
          expect.objectContaining({
            code: "substrate_control_intent_gateway.unexpected_field",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "substrate_control_intent_gateway.invalid_request_id",
            path: "/request_id",
          }),
          expect.objectContaining({
            code: "substrate_control_intent_gateway.missing_intent_request",
            path: "/intent_request",
          }),
        ],
        intent_errors: [],
        substrate_control_intent: null,
        raw_input_content: "withheld",
        live_substrate_mutation_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("ssh.raw.execute");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0096 evidence without raw echo", async () => {
    const response = await inspectSubstrateControlIntentThroughMcpAdapterContract(
      {
        request_id: "req_bp0099_invalid_delegated_intent",
        intent_request: {
          ...defaultSubstrateControlIntent,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and then run raw command",
            },
          ],
          live_substrate_mutation_allowed: true,
          live_execution_allowed: true,
          side_effects: [{ effect_type: "deploy" }],
          command: "rm -rf /",
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0099_invalid_delegated_intent",
        request_errors: [],
        intent_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "substrate_control_intent.live_substrate_mutation_forbidden",
            path: "/live_substrate_mutation_allowed",
          }),
          expect.objectContaining({
            code: "substrate_control_intent.live_execution_forbidden",
            path: "/live_execution_allowed",
          }),
          expect.objectContaining({
            code: "substrate_control_intent.secret_value_forbidden",
            path: "/source_refs/0",
          }),
          expect.objectContaining({
            code: "substrate_control_intent.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "substrate_control_intent.side_effects_forbidden",
            path: "/side_effects",
          }),
        ]),
        substrate_control_intent: null,
        raw_input_content: "withheld",
        live_substrate_mutation_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("deploy");
  });

  it("registers substrate control intent on the local MCP surface with twenty-two read-only tools", () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const toolNames = localServer.listTools().tools.map((tool) => tool.name);

    expect(toolNames).toEqual(registeredToolNames);
    expect(toolNames).toHaveLength(29);
    expect(toolNames).toContain(mcpSubstrateControlIntentToolContract.tool);
    expect(localServer.listTools().tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: mcpSubstrateControlIntentToolContract.tool,
          annotations: expect.objectContaining({
            readOnlyHint: true,
            destructiveHint: false,
          }),
          live_substrate_mutation_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        }),
      ]),
    );
  });

  it("registers substrate control intent on the official stdio MCP surface with twenty-two read-only tools", async () => {
    const { client } = await createConnectedSdkClient();
    const tools = await client.listTools();
    const toolNames = tools.tools.map((tool) => tool.name);

    expect(toolNames).toEqual(registeredToolNames);
    expect(toolNames).toHaveLength(29);
    expect(toolNames).toContain(mcpSubstrateControlIntentToolContract.tool);
    expect(tools.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: mcpSubstrateControlIntentToolContract.tool,
          annotations: expect.objectContaining({
            readOnlyHint: true,
            destructiveHint: false,
          }),
          title: "Inspect substrate control intent",
        }),
      ]),
    );
  });
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLnsatOfficialMcpSdkServer({
    now: () => now,
  });
  const client = new Client({
    name: "lnsat-bp0099-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
