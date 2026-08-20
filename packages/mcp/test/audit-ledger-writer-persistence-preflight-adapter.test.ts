import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectAuditLedgerWriterPersistencePreflightThroughMcpAdapterContract,
  mcpAuditLedgerWriterPersistencePreflightToolContract,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

let cleanup: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (cleanup !== null) {
    await cleanup();
    cleanup = null;
  }
});

describe("@lnsat/mcp BP-0063/BP-0064 audit writer persistence preflight MCP surface", () => {
  it("exposes read-only persistence preflight metadata without side effects", () => {
    expect(mcpAuditLedgerWriterPersistencePreflightToolContract).toEqual({
      tool: "lnsat.audit.ledger.writer_persistence_preflight.inspect",
      status: "contract_only",
      gateway_contract_id:
        "lnsat.gateway.audit_ledger_writer_persistence_preflight.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/audit-ledger/writer-persistence/preflight/inspect",
      authority: ["lnsat.gateway.audit_ledger_writer_persistence_preflight.v0_1"],
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
        "packages/audit/src/index.ts",
        "apps/api/src/audit-ledger-writer-interface.ts",
        "apps/api/src/audit-ledger-writer-persistence-preflight.ts",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/mcp/src/index.ts",
      ],
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("delegates valid persistence preflight inspection to the Gateway contract", async () => {
    const response =
      await inspectAuditLedgerWriterPersistencePreflightThroughMcpAdapterContract(
        {
          request_id: "req_bp0063_mcp_persistence_preflight",
          actor_id: "agent.codex",
          session_id: "sess_bp0063_0001",
          approval_evidence: { mode: "valid" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      gateway_contract_id:
        "lnsat.gateway.audit_ledger_writer_persistence_preflight.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0063_mcp_persistence_preflight",
        inspected_at: "2026-05-05T00:00:00.000Z",
        preflight: {
          contract_id: "lnsat.audit.audit_ledger_writer_persistence_preflight.v0_1",
          storage_target: "audit_events.v0_1",
          writer_interface_ref: {
            contract_id: "lnsat.audit.audit_ledger_writer_interface.v0_1",
            operation: "ledger.record.append",
          },
          policy_gate_ref: {
            contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
            decision: "approval_required",
            requires_approval: true,
          },
          approval_request_ref: {
            contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
            approval_kind: "ledger_state_change",
          },
          idempotency: {
            duplicate_behavior: "exact_replay_returns_existing_ref",
            collision_behavior: "fail_closed",
          },
          append_only: {
            mode: "insert_only",
            forbidden_mutations: ["update", "delete", "truncate", "in_place_redaction"],
          },
          redaction: {
            raw_rejected_command: "not_present",
            raw_rejected_value: "not_present",
            raw_invalid_payload_content: "not_present",
            secret_like_values: "not_present",
          },
          migration_artifact_refs: {
            sql_artifact:
              "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
            manifest_artifact:
              "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
            static_checker: "scripts/check-audit-ledger-migrations.mjs",
            source_packet_refs: ["BP-0039", "BP-0040", "BP-0044", "BP-0045", "BP-0052"],
          },
          live_execution_allowed: false,
          side_effects: [],
        },
        writer_interface_ref: {
          contract_id: "lnsat.audit.audit_ledger_writer_interface.v0_1",
        },
        policy_gate_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
          decision: "approval_required",
        },
        approval_request_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
          approval_kind: "ledger_state_change",
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });

    expect(
      response.gateway_response.ok && response.gateway_response.canonical_record_digest,
    ).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(
      response.gateway_response.ok && response.gateway_response.idempotency,
    ).toMatchObject({
      canonical_record_digest:
        response.gateway_response.ok &&
        response.gateway_response.canonical_record_digest,
      duplicate_behavior: "exact_replay_returns_existing_ref",
      collision_behavior: "fail_closed",
    });
    expect(
      response.gateway_response.ok && response.gateway_response.source_refs,
    ).toEqual(
      expect.arrayContaining([
        "contract:lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      ]),
    );
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response =
      await inspectAuditLedgerWriterPersistencePreflightThroughMcpAdapterContract(
        {
          request_id: "req_bp0063_bad_shape",
          command: "psql $DATABASE_URL -c 'delete from audit_events'",
          approval_evidence: { mode: "valid" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: "req_bp0063_bad_shape",
        request_errors: [
          expect.objectContaining({
            code: "audit_ledger_writer_persistence_preflight.unexpected_field",
            path: "/command",
          }),
        ],
        preflight: null,
        live_execution_allowed: false,
        raw_input_content: "withheld",
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("psql");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("delete from audit_events");
  });

  it("fails closed for invalid preflight evidence without raw rejected value echo", async () => {
    const response =
      await inspectAuditLedgerWriterPersistencePreflightThroughMcpAdapterContract(
        {
          request_id: "req_bp0063_bad_digest",
          actor_id: "agent.codex",
          session_id: "sess_bp0063_0001",
          approval_evidence: { mode: "valid" },
          preflight_evidence: { mode: "bad_digest_idempotency" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0063_bad_digest",
        request_errors: [],
        writer_errors: [],
        preflight_errors: [
          {
            code: "audit_ledger_persistence_preflight.canonical_digest_required",
            path: "/writer_interface_contract/record_ref/canonical_record_digest",
          },
          {
            code: "audit_ledger_persistence_preflight.idempotency_required",
            path: "/writer_interface_contract/idempotency",
          },
        ],
        preflight: null,
        raw_input_content: "withheld",
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("overwrite");
    expect(JSON.stringify(response)).not.toContain("sha256:bad");
  });

  it("fails closed for invalid approval evidence without secret-like echo", async () => {
    const response =
      await inspectAuditLedgerWriterPersistencePreflightThroughMcpAdapterContract(
        {
          request_id: "req_bp0063_invalid_approval",
          approval_evidence: { mode: "secret:lnsat/demo/api-token" },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0063_invalid_approval",
        request_errors: [
          {
            code: "audit_ledger_writer_persistence_preflight.invalid_approval_evidence",
            path: "/approval_evidence/mode",
            severity: "error",
          },
        ],
        preflight: null,
        raw_input_content: "withheld",
        live_execution_allowed: false,
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("secret:lnsat/demo/api-token");
  });

  it("registers the adapter on local and official stdio MCP surfaces as read-only", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    expect(localServer.listTools().tools.map((tool) => tool.name)).toContain(
      mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
    );
    await expect(
      localServer.callTool({
        name: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
        arguments: {
          request_id: "req_bp0064_registered_local",
          approval_evidence: { mode: "valid" },
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      tool: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
            gateway_response: {
              ok: true,
              preflight: {
                contract_id:
                  "lnsat.audit.audit_ledger_writer_persistence_preflight.v0_1",
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

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const sdkServer = createLnsatOfficialMcpSdkServer({ now: () => now });
    const client = new Client({
      name: "lnsat-bp0063-test-client",
      version: "0.1.0",
    });

    await Promise.all([
      sdkServer.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    cleanup = async () => {
      await client.close();
      await sdkServer.close();
    };

    const officialTools = await client.listTools();
    expect(officialTools.tools.map((tool) => tool.name)).toContain(
      mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
    );
    const officialTool = officialTools.tools.find(
      (tool) => tool.name === mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
    );
    expect(officialTool).toMatchObject({
      name: mcpAuditLedgerWriterPersistencePreflightToolContract.tool,
      title: "Inspect audit writer persistence preflight",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
  });
});
