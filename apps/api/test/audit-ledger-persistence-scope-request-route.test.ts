import { afterAll, describe, expect, it } from "vitest";
import {
  auditLedgerPersistenceScopeRequestGatewayContract,
  buildApiGateway,
} from "../src/index.js";

const now = new Date("2026-05-06T00:00:00.000Z");

describe("@lnsat/api BP-0078 audit ledger persistence scope request route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects direct Gateway readiness evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: auditLedgerPersistenceScopeRequestGatewayContract.method,
      url: auditLedgerPersistenceScopeRequestGatewayContract.path,
      payload: {
        request_id: "req_bp0078_route_scope_direct",
        actor_id: "agent.codex",
        session_id: "sess_bp0078_0001",
        approval_evidence: { mode: "valid" },
        readiness_source: { mode: "direct_gateway_evidence" },
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      contract_id: auditLedgerPersistenceScopeRequestGatewayContract.contract_id,
      request_id: "req_bp0078_route_scope_direct",
      inspected_at: "2026-05-06T00:00:00.000Z",
      scope_request: {
        contract_id: "lnsat.audit.audit_ledger_persistence_scope_request.v0_1",
        request_id: "req_bp0078_route_scope_direct",
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
          request_id: "req_bp0078_route_scope_direct",
          readiness_status: "source_ready_for_later_scope_request_only",
        },
        readiness_source: {
          kind: "direct_gateway_evidence",
          gateway_contract_id:
            "lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1",
          gateway_request_id: "req_bp0078_route_scope_direct",
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
    expect(body.minimum_source_evidence_before_live_scope).toEqual(
      expect.arrayContaining([
        "BP-0044 audit_events.v0_1 SQL artifact and manifest refs",
        "BP-0045 repo-local migration static checker evidence",
        "BP-0058 source-only writer persistence preflight contract",
        "BP-0059 pure writer persistence preflight helper evidence",
        "BP-0065 pure database security preflight helper evidence",
        "BP-0071 source-only persistence readiness gate evidence",
        "BP-0076 registered read-only MCP persistence readiness inspection evidence",
        "explicit BP-0077 Gateway-owned source-only scope request before DB or writer scope can be proposed",
      ]),
    );
    expect(body.source_refs).toEqual(
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
    expect(body.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "apps/api/src/audit-ledger-persistence-scope-request.ts",
      ]),
    );
  });

  it("preserves BP-0076 registered MCP readiness inspection as source-only evidence", async () => {
    const response = await gateway.inject({
      method: auditLedgerPersistenceScopeRequestGatewayContract.method,
      url: auditLedgerPersistenceScopeRequestGatewayContract.path,
      payload: {
        request_id: "req_bp0078_route_scope_mcp",
        actor_id: "agent.codex",
        session_id: "sess_bp0078_0001",
        approval_evidence: { mode: "valid" },
        readiness_source: { mode: "registered_mcp_inspection_evidence" },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      readiness_source: {
        kind: "registered_mcp_inspection_evidence",
        tool: "lnsat.audit.ledger.persistence_readiness.inspect",
        registration_packet: "BP-0076",
        read_only_registration: true,
      },
      scope_request: {
        readiness_source: {
          kind: "registered_mcp_inspection_evidence",
          source_packet_refs: ["BP-0071", "BP-0075", "BP-0076"],
        },
        live_execution_allowed: false,
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("maps malformed route requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerPersistenceScopeRequestGatewayContract.method,
      url: auditLedgerPersistenceScopeRequestGatewayContract.path,
      payload: {
        request_id: "req_bp0078_bad_route_shape",
        approval_evidence: { mode: "valid" },
        raw_rejected_value: "postgres://inline-secret@example.invalid/audit",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      contract_id: auditLedgerPersistenceScopeRequestGatewayContract.contract_id,
      request_id: "req_bp0078_bad_route_shape",
      request_errors: [
        {
          code: "audit_ledger_persistence_scope_request_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
      ],
      scope_request: null,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("postgres://inline-secret");
  });

  it("maps invalid delegated readiness evidence to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: auditLedgerPersistenceScopeRequestGatewayContract.method,
      url: auditLedgerPersistenceScopeRequestGatewayContract.path,
      payload: {
        request_id: "req_bp0078_invalid_readiness",
        actor_id: "agent.codex",
        session_id: "sess_bp0078_0001",
        approval_evidence: { mode: "valid" },
        readiness_evidence: { mode: "missing_database_security" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0078_invalid_readiness",
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
    expect(response.body).not.toContain("postgres://inline-secret");
  });

  it("maps invalid readiness source and live execution probes to 400 without raw echo", async () => {
    const invalidSource = await gateway.inject({
      method: auditLedgerPersistenceScopeRequestGatewayContract.method,
      url: auditLedgerPersistenceScopeRequestGatewayContract.path,
      payload: {
        request_id: "req_bp0078_invalid_source",
        actor_id: "agent.codex",
        session_id: "sess_bp0078_0001",
        approval_evidence: { mode: "valid" },
        readiness_source: { mode: "invalid_mcp_readiness_source" },
      },
    });

    expect(invalidSource.statusCode).toBe(400);
    expect(invalidSource.json()).toMatchObject({
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
    expect(invalidSource.body).not.toContain("lnsat.audit.ledger.writer.append");

    const liveExecution = await gateway.inject({
      method: auditLedgerPersistenceScopeRequestGatewayContract.method,
      url: auditLedgerPersistenceScopeRequestGatewayContract.path,
      payload: {
        request_id: "req_bp0078_live_execution",
        actor_id: "agent.codex",
        session_id: "sess_bp0078_0001",
        approval_evidence: { mode: "valid" },
        scope_evidence: { mode: "live_execution_side_effects" },
      },
    });

    expect(liveExecution.statusCode).toBe(400);
    expect(liveExecution.json()).toMatchObject({
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
    expect(liveExecution.body).not.toContain("database_write");
  });
});
