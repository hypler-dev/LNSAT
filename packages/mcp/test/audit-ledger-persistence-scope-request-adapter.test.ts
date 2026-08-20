import { describe, expect, it } from "vitest";
import {
  createLnsatReadOnlyMcpServer,
  inspectAuditLedgerPersistenceScopeRequestThroughMcpAdapterContract,
  mcpAuditLedgerDatabaseSecurityPreflightToolContract,
  mcpAuditLedgerMigrationApprovalPreviewToolContract,
  mcpAuditLedgerPersistenceReadinessToolContract,
  mcpAuditLedgerPersistenceScopeRequestToolContract,
  mcpAuditLedgerPersistenceScopeRequestToolRegistration,
  mcpAuditLedgerWriterInterfaceToolContract,
  mcpAuditLedgerWriterPersistencePreflightToolContract,
  mcpBuildPacketStateToolContract,
  mcpAdapterInvocationPreflightToolContract,
  mcpAdapterInvocationAuthorizationBundleToolContract,
  mcpAdapterInvocationResultToolContract,
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

const now = new Date("2026-05-06T00:00:00.000Z");

describe("@lnsat/mcp BP-0079 audit ledger persistence scope request MCP adapter contract", () => {
  it("exposes read-only persistence scope request metadata without side effects", () => {
    expect(mcpAuditLedgerPersistenceScopeRequestToolContract).toEqual({
      tool: "lnsat.audit.ledger.persistence_scope_request.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.audit_ledger_persistence_scope_request.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/audit-ledger/persistence-scope/request/inspect",
      authority: ["lnsat.gateway.audit_ledger_persistence_scope_request.v0_1"],
      source_docs: [
        "docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
        "docs/architecture/POLICY_AND_AUDIT.md",
        "docs/architecture/DATA_MODEL.md",
        "docs/architecture/MCP_ADAPTER_DESIGN.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/audit/src/index.ts",
        "apps/api/src/audit-ledger-persistence-readiness-gate.ts",
        "apps/api/src/audit-ledger-persistence-scope-request.ts",
        "packages/mcp/src/index.ts",
      ],
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("exposes read-only persistence scope request registration metadata", () => {
    expect(mcpAuditLedgerPersistenceScopeRequestToolRegistration).toMatchObject({
      name: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      title: "Inspect audit ledger persistence scope request",
      gateway_contract_id: "lnsat.gateway.audit_ledger_persistence_scope_request.v0_1",
      authority: ["lnsat.gateway.audit_ledger_persistence_scope_request.v0_1"],
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("delegates valid persistence scope requests with direct Gateway readiness evidence", async () => {
    const response =
      await inspectAuditLedgerPersistenceScopeRequestThroughMcpAdapterContract(
        {
          request_id: "req_bp0079_scope_direct",
          actor_id: "agent.codex",
          session_id: "sess_bp0079_0001",
          approval_evidence: { mode: "valid" },
          readiness_source: { mode: "direct_gateway_evidence" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      gateway_contract_id: "lnsat.gateway.audit_ledger_persistence_scope_request.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0079_scope_direct",
        inspected_at: "2026-05-06T00:00:00.000Z",
        scope_request: {
          contract_id: "lnsat.audit.audit_ledger_persistence_scope_request.v0_1",
          scope_request: {
            status: "source_scope_request_ready_for_later_review_only",
            gateway_owned: true,
            gateway_policy_and_approval_required: true,
            live_database_scope_requested_now: false,
            live_writer_scope_requested_now: false,
            live_persistence_scope_allowed: false,
            mcp_remains_adapter_only: true,
            state_changing_mcp_tools_allowed: false,
          },
          readiness_source: {
            kind: "direct_gateway_evidence",
            gateway_contract_id:
              "lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1",
            source_packet_refs: ["BP-0071", "BP-0073"],
          },
          live_execution_allowed: false,
          side_effects: [],
        },
        minimum_source_evidence_before_live_scope: expect.arrayContaining([
          "BP-0044 audit_events.v0_1 SQL artifact and manifest refs",
          "BP-0045 repo-local migration static checker evidence",
          "BP-0058 source-only writer persistence preflight contract",
          "BP-0059 pure writer persistence preflight helper evidence",
          "BP-0065 pure database security preflight helper evidence",
          "BP-0076 registered read-only MCP persistence readiness inspection evidence",
          "explicit BP-0077 Gateway-owned source-only scope request before DB or writer scope can be proposed",
        ]),
        source_refs: expect.arrayContaining([
          "packet:BP-0044",
          "packet:BP-0045",
          "packet:BP-0058",
          "packet:BP-0059",
          "packet:BP-0065",
          "packet:BP-0071",
          "packet:BP-0076",
          "packet:BP-0077",
        ]),
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("preserves BP-0076 registered MCP readiness inspection as source-only evidence", async () => {
    const response =
      await inspectAuditLedgerPersistenceScopeRequestThroughMcpAdapterContract(
        {
          request_id: "req_bp0079_scope_mcp",
          actor_id: "agent.codex",
          session_id: "sess_bp0079_0001",
          approval_evidence: { mode: "valid" },
          readiness_source: { mode: "registered_mcp_inspection_evidence" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      gateway_response: {
        ok: true,
        readiness_source: {
          kind: "registered_mcp_inspection_evidence",
          tool: "lnsat.audit.ledger.persistence_readiness.inspect",
          registration_packet: "BP-0076",
          read_only_registration: true,
          source_packet_refs: ["BP-0071", "BP-0075", "BP-0076"],
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response =
      await inspectAuditLedgerPersistenceScopeRequestThroughMcpAdapterContract(
        {
          request_id: "req_bp0079_bad_shape",
          command:
            "psql $DATABASE_URL -c 'alter table audit_events disable row level security'",
          approval_evidence: { mode: "valid" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: "req_bp0079_bad_shape",
        request_errors: [
          expect.objectContaining({
            code: "audit_ledger_persistence_scope_request_gateway.unexpected_field",
            path: "/command",
          }),
        ],
        scope_request: null,
        live_execution_allowed: false,
        raw_input_content: "withheld",
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("disable row level security");
  });

  it("fails closed for invalid delegated readiness evidence without raw rejected value echo", async () => {
    const response =
      await inspectAuditLedgerPersistenceScopeRequestThroughMcpAdapterContract(
        {
          request_id: "req_bp0079_invalid_readiness",
          actor_id: "agent.codex",
          session_id: "sess_bp0079_0001",
          approval_evidence: { mode: "valid" },
          readiness_evidence: { mode: "missing_database_security" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0079_invalid_readiness",
        readiness_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "audit_ledger_persistence_readiness_gate.database_security_preflight_required",
          }),
        ]),
        scope_request: null,
        raw_input_content: "withheld",
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("postgres://inline-secret");
  });

  it("fails closed for invalid readiness source and live side effects without raw value echo", async () => {
    const invalidSource =
      await inspectAuditLedgerPersistenceScopeRequestThroughMcpAdapterContract(
        {
          request_id: "req_bp0079_invalid_source",
          actor_id: "agent.codex",
          session_id: "sess_bp0079_0001",
          approval_evidence: { mode: "valid" },
          readiness_source: { mode: "invalid_mcp_readiness_source" },
        },
        { now },
      );

    expect(invalidSource).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        scope_request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "audit_ledger_persistence_scope_request.readiness_source_required",
          }),
        ]),
        raw_input_content: "withheld",
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(invalidSource)).not.toContain(
      "lnsat.audit.ledger.writer.append",
    );

    const liveExecution =
      await inspectAuditLedgerPersistenceScopeRequestThroughMcpAdapterContract(
        {
          request_id: "req_bp0079_live_execution",
          actor_id: "agent.codex",
          session_id: "sess_bp0079_0001",
          approval_evidence: { mode: "valid" },
          scope_evidence: { mode: "live_execution_side_effects" },
        },
        { now },
      );

    expect(liveExecution).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        scope_request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "audit_ledger_persistence_scope_request.live_execution_forbidden",
          }),
          expect.objectContaining({
            code: "audit_ledger_persistence_scope_request.side_effects_forbidden",
          }),
        ]),
        raw_input_content: "withheld",
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(liveExecution)).not.toContain("database_write");
  });

  it("registers the adapter on local MCP surfaces as the tenth read-only inspection tool", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });

    expect(localServer.listTools().tools.map((tool) => tool.name)).toEqual([
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
    ]);
    expect(localServer.listTools().tools).toHaveLength(29);

    const response = await localServer.callTool({
      name: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      arguments: {
        request_id: "req_bp0080_scope_local_registered",
        actor_id: "agent.codex",
        session_id: "sess_bp0080_local",
        approval_evidence: { mode: "valid" },
        readiness_source: { mode: "direct_gateway_evidence" },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAuditLedgerPersistenceScopeRequestToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.audit_ledger_persistence_scope_request.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0080_scope_local_registered",
              scope_request: {
                readiness_source: {
                  kind: "direct_gateway_evidence",
                  source_packet_refs: ["BP-0071", "BP-0073"],
                },
                live_execution_allowed: false,
                side_effects: [],
              },
              live_execution_allowed: false,
              side_effects: [],
            },
            live_execution_allowed: false,
            side_effects: [],
          },
        },
      ],
    });
  });
});
