import { describe, expect, it } from "vitest";
import {
  auditLedgerPersistenceScopeRequestGatewayContract,
  inspectAuditLedgerPersistenceScopeRequestGatewayRequest,
} from "../src/index.js";

const now = new Date("2026-05-06T00:00:00.000Z");

describe("@lnsat/api BP-0077 audit ledger persistence scope request Gateway contract", () => {
  it("returns Gateway-owned source-only scope request evidence from direct BP-0071 readiness evidence", async () => {
    const response = await inspectAuditLedgerPersistenceScopeRequestGatewayRequest(
      {
        request_id: "req_bp0077_scope_direct",
        actor_id: "agent.codex",
        session_id: "sess_bp0077_0001",
        approval_evidence: { mode: "valid" },
        readiness_source: { mode: "direct_gateway_evidence" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: auditLedgerPersistenceScopeRequestGatewayContract.contract_id,
      request_id: "req_bp0077_scope_direct",
      inspected_at: "2026-05-06T00:00:00.000Z",
      scope_request: {
        contract_id: "lnsat.audit.audit_ledger_persistence_scope_request.v0_1",
        request_id: "req_bp0077_scope_direct",
        scope_request: {
          status: "source_scope_request_ready_for_later_review_only",
          requested_scope: "audit_ledger_persistence_implementation",
          gateway_owned: true,
          gateway_policy_and_approval_required: true,
          live_database_scope_requested_now: false,
          live_writer_scope_requested_now: false,
          live_persistence_scope_allowed: false,
          later_scope_requires_explicit_packet: true,
          mcp_remains_adapter_only: true,
          state_changing_mcp_tools_allowed: false,
        },
        readiness_gate_ref: {
          contract_id:
            "lnsat.audit.audit_ledger_persistence_implementation_readiness_gate.v0_1",
          request_id: "req_bp0077_scope_direct",
          readiness_status: "source_ready_for_later_scope_request_only",
        },
        readiness_source: {
          kind: "direct_gateway_evidence",
          gateway_contract_id:
            "lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1",
          gateway_request_id: "req_bp0077_scope_direct",
          source_packet_refs: ["BP-0071", "BP-0073"],
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      readiness_source: {
        kind: "direct_gateway_evidence",
      },
      live_execution_allowed: false,
      side_effects: [],
    });

    if (!response.ok) {
      throw new Error("expected successful persistence scope request inspection");
    }

    expect(response.reviewed_source_chain.layer_refs).toEqual(
      expect.arrayContaining([
        {
          packet: "BP-0065",
          layer: "audit_helper",
          source_ref:
            "packages/audit/src/index.ts:createAuditLedgerDatabaseSecurityPreflightEvidence",
        },
        {
          packet: "BP-0070",
          layer: "mcp_registration",
          source_ref:
            "packages/mcp/src/index.ts:mcpAuditLedgerDatabaseSecurityPreflightToolRegistration",
        },
      ]),
    );
    expect(response.minimum_source_evidence_before_live_scope).toEqual(
      expect.arrayContaining([
        "BP-0044 audit_events.v0_1 SQL artifact and manifest refs",
        "BP-0045 repo-local migration static checker evidence",
        "BP-0058 source-only writer persistence preflight contract",
        "BP-0059 pure writer persistence preflight helper evidence",
        "BP-0065 pure database security preflight helper evidence",
        "BP-0070 read-only MCP registration evidence for database security preflight",
        "BP-0071 source-only persistence readiness gate evidence",
        "BP-0076 registered read-only MCP persistence readiness inspection evidence",
        "explicit BP-0077 Gateway-owned source-only scope request before DB or writer scope can be proposed",
      ]),
    );
    expect(response.source_refs).toEqual(
      expect.arrayContaining([
        "packet:BP-0044",
        "packet:BP-0045",
        "packet:BP-0058",
        "packet:BP-0059",
        "packet:BP-0065",
        "packet:BP-0076",
        "packet:BP-0077",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "apps/api/src/audit-ledger-persistence-scope-request.ts",
      ]),
    );
  });

  it("accepts BP-0076 registered MCP readiness inspection as source evidence while keeping MCP read-only", async () => {
    const response = await inspectAuditLedgerPersistenceScopeRequestGatewayRequest(
      {
        request_id: "req_bp0077_scope_mcp",
        actor_id: "agent.codex",
        session_id: "sess_bp0077_0001",
        approval_evidence: { mode: "valid" },
        readiness_source: { mode: "registered_mcp_inspection_evidence" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      readiness_source: {
        kind: "registered_mcp_inspection_evidence",
        tool: "lnsat.audit.ledger.persistence_readiness.inspect",
        registration_packet: "BP-0076",
        read_only_registration: true,
      },
      scope_request: {
        scope_request: {
          gateway_owned: true,
          mcp_remains_adapter_only: true,
          state_changing_mcp_tools_allowed: false,
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("fails closed when delegated BP-0071 readiness evidence is invalid", async () => {
    const response = await inspectAuditLedgerPersistenceScopeRequestGatewayRequest(
      {
        request_id: "req_bp0077_invalid_readiness",
        actor_id: "agent.codex",
        session_id: "sess_bp0077_0001",
        approval_evidence: { mode: "valid" },
        readiness_evidence: { mode: "missing_database_security" },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      readiness_request_errors: [],
      readiness_errors: [
        {
          code: "audit_ledger_persistence_readiness_gate.invalid_request",
          path: "/raw_rejected_value",
        },
        {
          code: "audit_ledger_persistence_readiness_gate.database_security_preflight_required",
          path: "/database_security_preflight",
        },
      ],
      scope_request_errors: [],
      scope_request: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("postgres://inline-secret");
  });

  it("fails closed for malformed scope requests without raw rejected value echo", async () => {
    const response = await inspectAuditLedgerPersistenceScopeRequestGatewayRequest(
      {
        request_id: 77,
        actor_id: "agent.codex",
        session_id: "sess_bp0077_0001",
        approval_evidence: { mode: "valid" },
        raw_rejected_value: "postgres://inline-secret@example.invalid/audit",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [
        {
          code: "audit_ledger_persistence_scope_request_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "audit_ledger_persistence_scope_request_gateway.invalid_request_id",
          path: "/request_id",
        },
      ],
      scope_request: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("postgres://inline-secret");
  });

  it("fails closed for invalid readiness source, incomplete source evidence, live execution, and side effects", async () => {
    const invalidSource = await inspectAuditLedgerPersistenceScopeRequestGatewayRequest(
      {
        request_id: "req_bp0077_invalid_source",
        actor_id: "agent.codex",
        session_id: "sess_bp0077_0001",
        approval_evidence: { mode: "valid" },
        readiness_source: { mode: "invalid_mcp_readiness_source" },
      },
      { now },
    );
    expect(invalidSource).toMatchObject({
      ok: false,
      scope_request_errors: [
        {
          code: "audit_ledger_persistence_scope_request.readiness_source_required",
          path: "/readiness_source/tool",
        },
        {
          code: "audit_ledger_persistence_scope_request.readiness_source_required",
          path: "/readiness_source/source_packet_refs",
        },
      ],
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(invalidSource)).not.toContain(
      "lnsat.audit.ledger.writer.append",
    );

    const incompleteEvidence =
      await inspectAuditLedgerPersistenceScopeRequestGatewayRequest(
        {
          request_id: "req_bp0077_incomplete_scope",
          actor_id: "agent.codex",
          session_id: "sess_bp0077_0001",
          approval_evidence: { mode: "valid" },
          scope_evidence: { mode: "incomplete_minimum_source_evidence" },
        },
        { now },
      );
    expect(incompleteEvidence).toMatchObject({
      ok: false,
      scope_request_errors: [
        {
          code: "audit_ledger_persistence_scope_request.minimum_source_evidence_required",
          path: "/minimum_source_evidence",
        },
      ],
      raw_input_content: "withheld",
      side_effects: [],
    });

    const liveExecution = await inspectAuditLedgerPersistenceScopeRequestGatewayRequest(
      {
        request_id: "req_bp0077_live_execution",
        actor_id: "agent.codex",
        session_id: "sess_bp0077_0001",
        approval_evidence: { mode: "valid" },
        scope_evidence: { mode: "live_execution_side_effects" },
      },
      { now },
    );
    expect(liveExecution).toMatchObject({
      ok: false,
      scope_request_errors: [
        {
          code: "audit_ledger_persistence_scope_request.live_execution_forbidden",
          path: "/live_execution_allowed",
        },
        {
          code: "audit_ledger_persistence_scope_request.side_effects_forbidden",
          path: "/side_effects",
        },
      ],
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(liveExecution)).not.toContain("database_write");
  });
});
