import {
  defaultCapabilityBrokerRequest,
  defaultSubstrateControlIntent,
  substrateControlIntentContract,
} from "@lnsat/packets";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectCapabilityBrokerRequestThroughMcpAdapterContract,
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

describe("@lnsat/mcp BP-0105 capability broker request MCP adapter contract", () => {
  it("exposes read-only capability broker request adapter metadata without side effects", () => {
    expect(mcpCapabilityBrokerRequestToolContract).toMatchObject({
      tool: "lnsat.platform.capability_broker_request.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.capability_broker_request.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/platform/capability-broker-request/inspect",
      authority: ["lnsat.gateway.capability_broker_request.v0_1"],
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(mcpCapabilityBrokerRequestToolContract.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/capability-broker-request.ts",
        "apps/api/src/capability-broker-request.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid capability broker request inspection to the Gateway contract", async () => {
    const response = await inspectCapabilityBrokerRequestThroughMcpAdapterContract(
      {
        request_id: "req_bp0105_capability_broker_request",
        broker_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0105",
              summary: "MCP adapter delegates capability broker request evidence",
            },
          ],
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpCapabilityBrokerRequestToolContract.tool,
      gateway_contract_id: "lnsat.gateway.capability_broker_request.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0105_capability_broker_request",
        inspected_at: "2026-05-06T00:00:00.000Z",
        capability_broker_request: {
          contract_id: "lnsat.platform.capability_broker_request.v0_1",
          request_version: "0.1",
          requested_actor: {
            actor_ref: "agent:codex",
            actor_type: "agent",
            role_ref: "role:ops_assistant",
          },
          capability: "service.restart.request",
          risk_level: 5,
          target_substrate_kind: "services",
          requested_control_mode: "approval_gated_mutation",
          broker_decision_posture: "classify_and_propose_only_no_dispatch",
          proposed_adapter_class: "service_control_adapter",
          proposed_adapter_authority: "proposal_only_no_dispatch",
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
        substrate_control_intent_refs: [
          {
            intent_ref: "intent:bp0096-substrate-control-intent",
            evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
            contract_id: substrateControlIntentContract.contract_id,
            summary: "BP-0096 source-only substrate control intent evidence",
          },
        ],
        required_policy_gates: expect.arrayContaining([
          "capability.broker.policy.review",
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
          result_packet_ref: "result_packet:capability-broker-request",
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
            rollback_ref: "rollback:capability-broker-request-review",
            owner_ref: "owner:lnsat-platform",
          }),
        ]),
        blocked_broker_dispatch_actions: expect.arrayContaining([
          "capability.broker.dispatch.execute",
          "substrate.adapter.invoke",
          "runtime.execution.start",
          "database.write.execute",
          "service.restart.execute",
          "dns.cloudflare.write",
          "ssh.raw.execute",
          "docker.runner.start",
          "node_agent.exec",
          "git.command.execute",
        ]),
        denied_broker_dispatch_behavior: expect.arrayContaining([
          "broker classifies request only",
          "broker proposes adapter class only",
          "broker does not invoke substrate adapter",
        ]),
        denied_live_behavior: expect.arrayContaining([
          "no live broker dispatch",
          "no live execution",
          "no secret values",
        ]),
        source_refs: expect.arrayContaining([
          "ticket:BP-0105: MCP adapter delegates capability broker request evidence",
        ]),
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response = await inspectCapabilityBrokerRequestThroughMcpAdapterContract(
      {
        request_id: 105,
        raw_rejected_value: "capability.broker.dispatch.execute TOKEN=inline-secret",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpCapabilityBrokerRequestToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: null,
        request_errors: [
          expect.objectContaining({
            code: "capability_broker_request_gateway.unexpected_field",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "capability_broker_request_gateway.invalid_request_id",
            path: "/request_id",
          }),
          expect.objectContaining({
            code: "capability_broker_request_gateway.missing_broker_request",
            path: "/broker_request",
          }),
        ],
        broker_errors: [],
        capability_broker_request: null,
        raw_input_content: "withheld",
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("capability.broker.dispatch");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0102 evidence without raw echo", async () => {
    const response = await inspectCapabilityBrokerRequestThroughMcpAdapterContract(
      {
        request_id: "req_bp0105_invalid_delegated_broker_request",
        broker_request: {
          ...defaultCapabilityBrokerRequest,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and dispatch raw command",
            },
          ],
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          side_effects: [{ effect_type: "dispatch" }],
          command: "rm -rf /",
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0105_invalid_delegated_broker_request",
        request_errors: [],
        broker_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "capability_broker_request.live_broker_dispatch_forbidden",
            path: "/live_broker_dispatch_allowed",
          }),
          expect.objectContaining({
            code: "capability_broker_request.live_execution_forbidden",
            path: "/live_execution_allowed",
          }),
          expect.objectContaining({
            code: "capability_broker_request.secret_value_forbidden",
            path: "/source_refs/0",
          }),
          expect.objectContaining({
            code: "capability_broker_request.unexpected_field",
            path: "/command",
          }),
          expect.objectContaining({
            code: "capability_broker_request.side_effects_forbidden",
            path: "/side_effects",
          }),
        ]),
        capability_broker_request: null,
        raw_input_content: "withheld",
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("dispatch raw command");
  });

  it("preserves observation broker request without dispatch, execution, or side effects", async () => {
    const response = await inspectCapabilityBrokerRequestThroughMcpAdapterContract(
      {
        request_id: "req_bp0105_observation_broker_request",
        broker_request: {
          requested_actor: {
            actor_ref: "human:jeff",
            actor_type: "human",
            role_ref: "role:owner",
          },
          capability: "service.status.read",
          risk_level: 0,
          target_substrate_kind: "services",
          requested_control_mode: "observation",
          source_refs: [
            {
              source_ref: "ticket:BP-0105",
              summary: "MCP adapter wraps observation-only broker request",
            },
          ],
          substrate_control_intent_refs: [
            {
              intent_ref: "intent:bp0096-observation",
              evidence_ref: "evidence:bp0096-observation",
              contract_id: substrateControlIntentContract.contract_id,
              summary: "source-only observation substrate control intent",
            },
          ],
          policy_gate_refs: [
            {
              gate_ref: "capability.broker.policy.review",
              decision_ref: "policy_decision:service-status-read",
              required: true,
            },
          ],
          approval_refs: [],
          audit_event_plan: defaultSubstrateControlIntent.audit_event_plan,
          result_expectations: defaultCapabilityBrokerRequest.result_expectations,
          rollback_expectations: [],
          proposed_adapter_class: "service_control_adapter",
          blocked_broker_dispatch_actions:
            defaultCapabilityBrokerRequest.blocked_broker_dispatch_actions,
          denied_broker_dispatch_behavior:
            defaultCapabilityBrokerRequest.denied_broker_dispatch_behavior,
          denied_live_behavior: ["no live broker dispatch", "no live execution"],
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
        request_id: "req_bp0105_observation_broker_request",
        requested_actor: {
          actor_ref: "human:jeff",
          actor_type: "human",
          role_ref: "role:owner",
        },
        capability: "service.status.read",
        risk_level: 0,
        requested_control_mode: "observation",
        required_approvals: [],
        rollback_expectations: [],
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("registers the local MCP surface at exactly twenty-two read-only tools", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const toolNames = localServer.listTools().tools.map((tool) => tool.name);

    expect(toolNames).toEqual(registeredToolNames);
    expect(toolNames).toHaveLength(29);
    expect(toolNames).toContain(mcpCapabilityBrokerRequestToolContract.tool);

    const response = await localServer.callTool({
      name: mcpCapabilityBrokerRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0106_registered_local_call",
        broker_request: { side_effects: [] },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      tool: mcpCapabilityBrokerRequestToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpCapabilityBrokerRequestToolContract.tool,
            gateway_response: {
              ok: true,
              request_id: "req_bp0106_registered_local_call",
              capability_broker_request: {
                contract_id: "lnsat.platform.capability_broker_request.v0_1",
                live_broker_dispatch_allowed: false,
                live_execution_allowed: false,
                side_effects: [],
              },
              live_broker_dispatch_allowed: false,
              live_execution_allowed: false,
              side_effects: [],
            },
            live_broker_dispatch_allowed: false,
            live_execution_allowed: false,
            side_effects: [],
          },
        },
      ],
      side_effects: [],
    });
  });

  it("registers the official stdio MCP surface at exactly twenty-two read-only tools", async () => {
    const { client } = await createConnectedSdkClient();
    const tools = await client.listTools();
    const toolNames = tools.tools.map((tool) => tool.name);

    expect(toolNames).toEqual(registeredToolNames);
    expect(toolNames).toHaveLength(29);
    expect(toolNames).toContain(mcpCapabilityBrokerRequestToolContract.tool);
  });
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLnsatOfficialMcpSdkServer({
    now: () => now,
  });
  const client = new Client({
    name: "lnsat-bp0105-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
