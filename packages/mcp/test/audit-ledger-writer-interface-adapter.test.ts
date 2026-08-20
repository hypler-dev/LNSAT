import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectAuditLedgerWriterInterfaceThroughMcpAdapterContract,
  mcpAuditLedgerWriterInterfaceToolContract,
} from "../src/index.js";

const now = new Date("2026-05-05T00:00:00.000Z");

let cleanup: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (cleanup !== null) {
    await cleanup();
    cleanup = null;
  }
});

describe("@lnsat/mcp BP-0056 audit ledger writer interface adapter contract", () => {
  it("exposes read-only writer interface metadata without side effects", () => {
    expect(mcpAuditLedgerWriterInterfaceToolContract).toEqual({
      tool: "lnsat.audit.ledger.writer_interface.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.audit_ledger_writer_interface.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/audit-ledger/writer-interface/inspect",
      authority: ["lnsat.gateway.audit_ledger_writer_interface.v0_1"],
      source_docs: [
        "docs/architecture/POLICY_AND_AUDIT.md",
        "docs/architecture/DATA_MODEL.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/audit/src/index.ts",
        "packages/policy/src/index.ts",
        "apps/api/src/audit-ledger-writer-interface.ts",
      ],
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("delegates valid writer interface inspection to the Gateway contract", async () => {
    const response = await inspectAuditLedgerWriterInterfaceThroughMcpAdapterContract(
      {
        request_id: "req_bp0056_mcp_writer_append",
        actor_id: "agent.codex",
        session_id: "sess_bp0056_0001",
        approval_evidence: { mode: "valid" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpAuditLedgerWriterInterfaceToolContract.tool,
      gateway_contract_id: "lnsat.gateway.audit_ledger_writer_interface.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0056_mcp_writer_append",
        inspected_at: "2026-05-05T00:00:00.000Z",
        writer_interface: {
          contract_id: "lnsat.audit.audit_ledger_writer_interface.v0_1",
          operation: "ledger.record.append",
          policy_gate_ref: {
            contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
            decision_id: "pol_req_bp0056_mcp_writer_append",
            decision: "approval_required",
            requires_approval: true,
            reason_codes: ["policy.audit_ledger_state_change_requires_approval"],
          },
          approval_ref: {
            contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
            approval_request_id: "apr_bp0056_mcp_writer_append",
            approval_status: "requested",
            approval_kind: "ledger_state_change",
            policy_gate_decision_id: "pol_req_bp0056_mcp_writer_append",
          },
          append_only: {
            mode: "insert_only",
            correction_model: "append_new_record_referencing_prior_record",
            forbidden_mutations: ["update", "delete", "truncate", "in_place_redaction"],
          },
          idempotency: {
            duplicate_behavior: "exact_replay_returns_existing_ref",
            collision_behavior: "fail_closed",
          },
          redaction: {
            raw_rejected_command: "not_present",
            raw_rejected_value: "not_present",
            raw_invalid_payload_content: "not_present",
            secret_like_values: "not_present",
          },
          live_execution_allowed: false,
          side_effects: [],
        },
        policy_gate_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_gate.v0_1",
          decision: "approval_required",
        },
        approval_request_ref: {
          contract_id: "lnsat.policy.audit_ledger_writer_approval_request.v0_1",
          approval_kind: "ledger_state_change",
        },
        source_refs: expect.arrayContaining([
          "contract:lnsat.gateway.onboarding_context_packet_inspection.v0_1",
        ]),
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
  });

  it("fails closed for malformed adapter input without raw rejected value echo", async () => {
    const response = await inspectAuditLedgerWriterInterfaceThroughMcpAdapterContract(
      {
        request_id: "req_bp0056_bad_shape",
        command: "psql $DATABASE_URL -c 'delete from audit_events'",
        approval_evidence: { mode: "valid" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAuditLedgerWriterInterfaceToolContract.tool,
      gateway_response: {
        ok: false,
        request_id: "req_bp0056_bad_shape",
        request_errors: [
          expect.objectContaining({
            code: "audit_ledger_writer_interface.unexpected_field",
            path: "/command",
          }),
        ],
        writer_interface: null,
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

  it("fails closed when approval evidence is missing or mismatched", async () => {
    const missing = await inspectAuditLedgerWriterInterfaceThroughMcpAdapterContract(
      {
        request_id: "req_bp0056_missing_approval",
        actor_id: "agent.codex",
        session_id: "sess_bp0056_0001",
      },
      { now },
    );
    const mismatched = await inspectAuditLedgerWriterInterfaceThroughMcpAdapterContract(
      {
        request_id: "req_bp0056_mismatched_approval",
        actor_id: "agent.codex",
        session_id: "sess_bp0056_0001",
        approval_evidence: { mode: "mismatched_policy_gate" },
      },
      { now },
    );

    expect(missing).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0056_missing_approval",
        request_errors: [],
        writer_errors: [
          {
            code: "audit_ledger_writer.approval_request_required",
            path: "/approval_request",
          },
        ],
        writer_interface: null,
        raw_input_content: "withheld",
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(mismatched).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0056_mismatched_approval",
        request_errors: [],
        writer_errors: [
          {
            code: "audit_ledger_writer.approval_policy_mismatch",
            path: "/approval_request/policy_gate_ref/decision_id",
          },
        ],
        writer_interface: null,
        raw_input_content: "withheld",
        side_effects: [],
      },
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(mismatched)).not.toContain("pol_bp0054_mismatched_approval");
  });

  it("fails closed for invalid approval evidence without secret-like echo", async () => {
    const response = await inspectAuditLedgerWriterInterfaceThroughMcpAdapterContract(
      {
        request_id: "req_bp0056_invalid_approval",
        approval_evidence: { mode: "secret:lnsat/demo/api-token" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      gateway_response: {
        ok: false,
        request_id: "req_bp0056_invalid_approval",
        request_errors: [
          {
            code: "audit_ledger_writer_interface.invalid_approval_evidence",
            path: "/approval_evidence/mode",
            severity: "error",
          },
        ],
        writer_interface: null,
        live_execution_allowed: false,
        raw_input_content: "withheld",
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
      mcpAuditLedgerWriterInterfaceToolContract.tool,
    );
    await expect(
      localServer.callTool({
        name: mcpAuditLedgerWriterInterfaceToolContract.tool,
        arguments: {
          request_id: "req_bp0057_registered_local",
          approval_evidence: { mode: "valid" },
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      tool: mcpAuditLedgerWriterInterfaceToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAuditLedgerWriterInterfaceToolContract.tool,
            live_execution_allowed: false,
            side_effects: [],
          },
        },
      ],
      side_effects: [],
    });

    const { client } = await createConnectedSdkClient();
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain(
      mcpAuditLedgerWriterInterfaceToolContract.tool,
    );
  });
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLnsatOfficialMcpSdkServer({ now: () => now });
  const client = new Client({
    name: "lnsat-bp0056-test-client",
    version: "0.1.0",
  });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}
