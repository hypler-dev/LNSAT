import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectAuditLedgerPersistenceReadinessThroughMcpAdapterContract,
  mcpAuditLedgerDatabaseSecurityPreflightToolContract,
  mcpAuditLedgerMigrationApprovalPreviewToolContract,
  mcpAuditLedgerPersistenceReadinessToolRegistration,
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

const now = new Date("2026-05-05T00:00:00.000Z");

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

describe("@lnsat/mcp BP-0075 audit ledger persistence readiness MCP adapter contract", () => {
  it("exposes read-only persistence readiness metadata without side effects", () => {
    expect(mcpAuditLedgerPersistenceReadinessToolContract).toEqual({
      tool: "lnsat.audit.ledger.persistence_readiness.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/audit-ledger/persistence-readiness/inspect",
      authority: ["lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1"],
      source_docs: [
        "docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
        "docs/architecture/POLICY_AND_AUDIT.md",
        "docs/architecture/DATA_MODEL.md",
        "docs/architecture/MCP_ADAPTER_DESIGN.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/audit/src/index.ts",
        "apps/api/src/audit-ledger-database-security-preflight.ts",
        "apps/api/src/audit-ledger-persistence-readiness-gate.ts",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/mcp/src/index.ts",
      ],
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(mcpAuditLedgerPersistenceReadinessToolRegistration).toMatchObject({
      name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      gateway_contract_id: "lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1",
      authority: ["lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1"],
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

  it("delegates valid persistence readiness inspection to the Gateway contract", async () => {
    const response =
      await inspectAuditLedgerPersistenceReadinessThroughMcpAdapterContract(
        {
          request_id: "req_bp0075_mcp_persistence_readiness",
          actor_id: "agent.codex",
          session_id: "sess_bp0075_0001",
          approval_evidence: { mode: "valid" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      gateway_contract_id: "lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0075_mcp_persistence_readiness",
        inspected_at: "2026-05-05T00:00:00.000Z",
        gate: {
          contract_id:
            "lnsat.audit.audit_ledger_persistence_implementation_readiness_gate.v0_1",
          readiness: {
            status: "source_ready_for_later_scope_request_only",
            live_persistence_scope_allowed: false,
            next_scope_requires_explicit_packet: true,
            gateway_is_security_boundary: true,
            mcp_is_adapter_only: true,
            state_changing_mcp_tools_allowed: false,
          },
          reviewed_source_chain: {
            migration_artifacts: {
              source_packet_refs: expect.arrayContaining([
                "BP-0044",
                "BP-0045",
                "BP-0052",
              ]),
            },
            writer_persistence_preflight_ref: {
              contract_id: "lnsat.audit.audit_ledger_writer_persistence_preflight.v0_1",
              request_id: "req_bp0075_mcp_persistence_readiness",
              storage_target: "audit_events.v0_1",
            },
            database_security_preflight_ref: {
              contract_id: "lnsat.audit.audit_ledger_database_security_preflight.v0_1",
              request_id: "req_bp0075_mcp_persistence_readiness",
              storage_target: "audit_events.v0_1",
            },
            layer_refs: expect.arrayContaining([
              {
                packet: "BP-0069",
                layer: "mcp_adapter",
                source_ref:
                  "packages/mcp/src/index.ts:inspectAuditLedgerDatabaseSecurityPreflightThroughMcpAdapterContract",
              },
              {
                packet: "BP-0070",
                layer: "mcp_registration",
                source_ref:
                  "packages/mcp/src/index.ts:mcpAuditLedgerDatabaseSecurityPreflightToolRegistration",
              },
            ]),
          },
          security_requirements: {
            isolation_model: {
              mode: "postgresql_rls",
              deny_by_default: true,
              bypass_rls_forbidden: true,
            },
            tenant_project_scope: {
              required_row_scope_fields: ["tenant_id", "project_id"],
              missing_scope_behavior: "fail_closed",
            },
            deny_by_default_required: true,
            test_requirements_before_live_scope: [
              "static_security_preflight_check",
              "rls_policy_or_equivalent_isolation_test",
              "tenant_project_scope_enforcement_test",
              "writer_role_grant_test",
              "select_role_grant_test",
              "deny_by_default_no_public_access_test",
              "no_bypassrls_or_superuser_writer_test",
            ],
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
          "BP-0069 read-only MCP adapter evidence for database security preflight",
          "BP-0070 read-only MCP registration evidence for database security preflight",
          "secret-reference-only future credential plan",
          "explicit later build packet requesting DB/writer scope through LNSAT Gateway policy and approval",
        ]),
        source_refs: expect.arrayContaining([
          "packet:BP-0044",
          "packet:BP-0045",
          "packet:BP-0058",
          "packet:BP-0059",
          "packet:BP-0065",
          "packet:BP-0066",
          "packet:BP-0067",
          "packet:BP-0068",
          "packet:BP-0069",
          "packet:BP-0070",
          "packet:BP-0071",
        ]),
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response =
      await inspectAuditLedgerPersistenceReadinessThroughMcpAdapterContract(
        {
          request_id: "req_bp0075_bad_shape",
          command: "psql $DATABASE_URL -c 'alter role app superuser'",
          approval_evidence: { mode: "valid" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: "req_bp0075_bad_shape",
        request_errors: [
          expect.objectContaining({
            code: "audit_ledger_persistence_readiness_gateway.unexpected_field",
            path: "/command",
          }),
        ],
        gate: null,
        live_execution_allowed: false,
        raw_input_content: "withheld",
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("alter role");
    expect(JSON.stringify(response)).not.toContain("superuser");
  });

  it("fails closed for invalid delegated database security evidence without raw rejected value echo", async () => {
    const response =
      await inspectAuditLedgerPersistenceReadinessThroughMcpAdapterContract(
        {
          request_id: "req_bp0075_invalid_security",
          actor_id: "agent.codex",
          session_id: "sess_bp0075_0001",
          approval_evidence: { mode: "valid" },
          security_evidence: { mode: "unsafe_scope_roles_tests" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0075_invalid_security",
        security_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "audit_ledger_database_security_preflight.tenant_project_scope_required",
          }),
          expect.objectContaining({
            code: "audit_ledger_database_security_preflight.grants_deny_by_default_required",
          }),
          expect.objectContaining({
            code: "audit_ledger_database_security_preflight.tests_required",
          }),
        ]),
        gate: null,
        raw_input_content: "withheld",
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("unscoped_select_allowed");
    expect(JSON.stringify(response)).not.toContain("unapproved_ddl");
  });

  it("fails closed for invalid readiness evidence without raw rejected value echo", async () => {
    const response =
      await inspectAuditLedgerPersistenceReadinessThroughMcpAdapterContract(
        {
          request_id: "req_bp0075_bad_readiness",
          actor_id: "agent.codex",
          session_id: "sess_bp0075_0001",
          approval_evidence: { mode: "valid" },
          readiness_evidence: { mode: "missing_database_security" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0075_bad_readiness",
        readiness_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "audit_ledger_persistence_readiness_gate.invalid_request",
            path: "/raw_rejected_value",
          }),
          expect.objectContaining({
            code: "audit_ledger_persistence_readiness_gate.database_security_preflight_required",
            path: "/database_security_preflight",
          }),
        ]),
        gate: null,
        raw_input_content: "withheld",
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("postgres://inline-secret");
  });

  it("fails closed for invalid delegated approval evidence without secret-like echo", async () => {
    const response =
      await inspectAuditLedgerPersistenceReadinessThroughMcpAdapterContract(
        {
          request_id: "req_bp0075_invalid_approval",
          approval_evidence: { mode: "secret:lnsat/demo/api-token" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0075_invalid_approval",
        request_errors: [
          {
            code: "audit_ledger_persistence_readiness_gateway.invalid_approval_evidence",
            path: "/approval_evidence/mode",
            severity: "error",
          },
        ],
        gate: null,
        raw_input_content: "withheld",
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("secret:lnsat/demo/api-token");
  });

  it("registers the adapter on the local read-only MCP server", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });

    expect(localServer.listTools().tools.map((tool) => tool.name)).toEqual(
      registeredToolNames,
    );
    expect(localServer.listTools().tools).toHaveLength(29);
    await expect(
      localServer.callTool({
        name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
        arguments: {
          request_id: "req_bp0076_registered_local",
          approval_evidence: { mode: "valid" },
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      tool: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAuditLedgerPersistenceReadinessToolContract.tool,
            gateway_contract_id:
              "lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0076_registered_local",
              gate: {
                contract_id:
                  "lnsat.audit.audit_ledger_persistence_implementation_readiness_gate.v0_1",
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
      side_effects: [],
    });
  });

  it("keeps registered malformed local calls fail-closed without raw rejected value echo", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });

    const response = await localServer.callTool({
      name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      arguments: {
        request_id: "req_bp0076_registered_local_bad_shape",
        command: "psql $DATABASE_URL -c 'alter role app superuser'",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      is_error: true,
      error: null,
      content: [
        {
          type: "json",
          json: {
            ok: false,
            gateway_response: {
              ok: false,
              request_id: "req_bp0076_registered_local_bad_shape",
              request_errors: [
                expect.objectContaining({
                  code: "audit_ledger_persistence_readiness_gateway.unexpected_field",
                  path: "/command",
                }),
              ],
              gate: null,
              raw_input_content: "withheld",
              live_execution_allowed: false,
              side_effects: [],
            },
            live_execution_allowed: false,
            side_effects: [],
          },
        },
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("alter role");
    expect(JSON.stringify(response)).not.toContain("superuser");
  });

  it("registers the adapter on the official SDK stdio MCP server", async () => {
    const { client } = await createConnectedSdkClient();
    const tools = await client.listTools();

    expect(tools.tools.map((tool) => tool.name)).toEqual(registeredToolNames);
    expect(tools.tools).toHaveLength(29);
    const result = await client.callTool({
      name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      arguments: {
        request_id: "req_bp0076_registered_official_stdio",
        approval_evidence: { mode: "valid" },
      },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      gateway_contract_id: "lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0076_registered_official_stdio",
        gate: {
          contract_id:
            "lnsat.audit.audit_ledger_persistence_implementation_readiness_gate.v0_1",
          live_execution_allowed: false,
          side_effects: [],
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("keeps invalid official SDK readiness evidence fail-closed without raw rejected value echo", async () => {
    const { client } = await createConnectedSdkClient();
    const result = await client.callTool({
      name: mcpAuditLedgerPersistenceReadinessToolContract.tool,
      arguments: {
        request_id: "req_bp0076_registered_official_stdio_bad_readiness",
        approval_evidence: { mode: "valid" },
        readiness_evidence: { mode: "missing_database_security" },
      },
    });

    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        ok: false,
        gateway_response: {
          ok: false,
          request_id: "req_bp0076_registered_official_stdio_bad_readiness",
          readiness_errors: expect.arrayContaining([
            expect.objectContaining({
              code: "audit_ledger_persistence_readiness_gate.database_security_preflight_required",
            }),
          ]),
          gate: null,
          raw_input_content: "withheld",
          live_execution_allowed: false,
          side_effects: [],
        },
        live_execution_allowed: false,
        side_effects: [],
      },
    });
    expect(JSON.stringify(result)).not.toContain("postgres://inline-secret");
  });
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const client = new Client({ name: "lnsat-mcp-test-client", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const sdkServer = createLnsatOfficialMcpSdkServer({ now: () => now });

  await sdkServer.connect(serverTransport);
  await client.connect(clientTransport);
  cleanup = async () => {
    await client.close();
    await sdkServer.close();
  };

  return { client };
}
