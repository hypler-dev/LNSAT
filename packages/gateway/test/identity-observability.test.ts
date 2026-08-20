import { describe, expect, it, vi } from "vitest";
import {
  authenticateSpiffeWorkload,
  createGatewayTelemetrySpan,
  emitGatewayTelemetrySpan,
  gatewaySpanStages,
  parseW3cTraceContext,
  sanitizeW3cBaggage,
  type GatewayTelemetrySpan,
  type SpiffeSvidEvidence,
} from "../src/index.js";

const now = new Date("2026-08-04T00:00:00.000Z");
const traceparent = "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01";

describe("Gateway identity and observability contracts", () => {
  it("parses W3C trace context as correlation only", () => {
    expect(parseW3cTraceContext({ traceparent, tracestate: "vendor=value" })).toEqual({
      ok: true,
      context: {
        traceparent,
        tracestate: "vendor=value",
        trace_id: "a".repeat(32),
        parent_span_id: "b".repeat(16),
        sampled: true,
        correlation_only: true,
        authority: false,
      },
      side_effects: [],
    });
  });

  it.each([
    "00-00000000000000000000000000000000-bbbbbbbbbbbbbbbb-01",
    "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-0000000000000000-01",
    "ff-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
    "00-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA-bbbbbbbbbbbbbbbb-01",
    "malformed",
  ])("rejects invalid traceparent %s", (candidate) => {
    expect(parseW3cTraceContext({ traceparent: candidate, tracestate: null })).toEqual({
      ok: false,
      error_code: "gateway.telemetry.invalid_trace_context",
      side_effects: [],
    });
  });

  it("rejects duplicate or injected tracestate", () => {
    expect(
      parseW3cTraceContext({ traceparent, tracestate: "tenant@vendor=value" }).ok,
    ).toBe(true);
    expect(
      parseW3cTraceContext({ traceparent, tracestate: "vendor=one,vendor=two" }).ok,
    ).toBe(false);
    expect(
      parseW3cTraceContext({ traceparent, tracestate: "vendor=x\r\ny=z" }).ok,
    ).toBe(false);
  });

  it("keeps baggage free of authority and secrets", () => {
    expect(
      sanitizeW3cBaggage(
        "lnsat.correlation_id=correlation-0001,authorization=approved,token=secret",
      ),
    ).toEqual({
      accepted: { "lnsat.correlation_id": "correlation-0001" },
      dropped_entries: 2,
      carries_authority: false,
      carries_secrets: false,
      side_effects: [],
    });
  });

  it.each(gatewaySpanStages)("builds allowlisted redacted span for %s", (stage) => {
    const trace = parseW3cTraceContext({ traceparent, tracestate: null });
    if (!trace.ok) throw new Error(trace.error_code);
    const result = createGatewayTelemetrySpan({
      stage,
      started_at: now,
      ended_at: new Date(now.getTime() + 5),
      trace: trace.context,
      attributes: {
        "operation.id": "op_observe_0001",
        "protocol.name": "mcp",
        raw_packet: "must-not-appear",
        token: "must-not-appear",
        approval_reason: "must-not-appear",
        customer_email: "must-not-appear@example.test",
      },
    });

    expect(result).toMatchObject({
      ok: true,
      dropped_attributes: 4,
      span: {
        name: stage,
        trace_id: "a".repeat(32),
        sampled: true,
        trace_is_correlation_only: true,
        attributes: {
          "operation.id": "op_observe_0001",
          "protocol.name": "mcp",
        },
        raw_packet_included: false,
        secret_included: false,
        token_included: false,
        approval_reason_included: false,
        customer_data_included: false,
        durable_audit_required: true,
        action_authorized_by_trace: false,
      },
    });
    expect(JSON.stringify(result)).not.toContain("must-not-appear");
  });

  it("does not block authorization or mutate operation when telemetry fails", async () => {
    const span = validSpan();
    const unavailable = await emitGatewayTelemetrySpan({
      sink: { emit: async () => Promise.reject(new Error("collector offline")) },
      span,
    });
    expect(unavailable).toEqual({
      delivered: false,
      authorization_blocked: false,
      operation_state_changed: false,
      durable_audit_required: true,
      side_effects: [],
    });

    const emit = vi.fn(async () => undefined);
    expect(await emitGatewayTelemetrySpan({ sink: { emit }, span })).toMatchObject({
      delivered: true,
      authorization_blocked: false,
      durable_audit_required: true,
    });
    expect(emit).toHaveBeenCalledWith(span);
  });

  it.each(["x509-svid", "jwt-svid"] as const)(
    "maps verified %s into workload authentication only",
    async (svidType) => {
      const credentialRef = `spiffe-credential-ref:test/${svidType}`;
      const result = await authenticateSpiffeWorkload({
        credential_ref: credentialRef,
        expected_trust_domain: "example.test",
        now,
        verifier: verifier(
          evidence({ credential_ref: credentialRef, svid_type: svidType }),
        ),
      });
      expect(result).toEqual({
        ok: true,
        principal: {
          kind: "workload",
          principal_ref: "spiffe://example.test/workload/agent",
          trust_domain: "example.test",
          svid_type: svidType,
        },
        access_authenticated: true,
        action_authorized: false,
        human_approval_satisfied: false,
        credential_value_exposed: false,
        spire_dependency_required: false,
        side_effects: [],
      });
      expect(JSON.stringify(result)).not.toContain("credential-value");
    },
  );

  it.each([
    [
      { spiffe_id: "spiffe://other.test/workload/agent" },
      "gateway.spiffe.identity_mismatch",
    ],
    [{ status: "revoked" }, "gateway.spiffe.credential_inactive"],
    [{ expires_at: "2026-08-04T00:00:00.000Z" }, "gateway.spiffe.credential_inactive"],
  ])("fails closed for SPIFFE evidence mismatch", async (overrides, errorCode) => {
    const result = await authenticateSpiffeWorkload({
      credential_ref: "spiffe-credential-ref:test/x509",
      expected_trust_domain: "example.test",
      now,
      verifier: verifier(evidence(overrides as Partial<SpiffeSvidEvidence>)),
    });
    expect(result).toMatchObject({
      ok: false,
      error_code: errorCode,
      action_authorized: false,
      side_effects: [],
    });
  });

  it("contains SPIFFE verifier outage and rejects raw credential input shape", async () => {
    const unavailable = await authenticateSpiffeWorkload({
      credential_ref: "spiffe-credential-ref:test/x509",
      expected_trust_domain: "example.test",
      now,
      verifier: {
        verifyCredentialReference: async () => {
          throw new Error("SPIRE unavailable");
        },
      },
    });
    expect(unavailable).toMatchObject({
      ok: false,
      error_code: "gateway.spiffe.verification_failed",
      action_authorized: false,
    });
    expect(
      await authenticateSpiffeWorkload({
        credential_ref: "spiffe-credential-ref:test/x509",
        expected_trust_domain: "example.test",
        now,
        verifier: {
          verifyCredentialReference: async () =>
            ({ ok: true, evidence: null }) as never,
        },
      }),
    ).toMatchObject({
      ok: false,
      error_code: "gateway.spiffe.verification_failed",
    });

    expect(
      await authenticateSpiffeWorkload({
        credential_ref: "raw-jwt-value",
        expected_trust_domain: "example.test",
        now,
        verifier: verifier(evidence()),
      }),
    ).toMatchObject({ ok: false, error_code: "gateway.spiffe.invalid_config" });
  });
});

function validSpan(): GatewayTelemetrySpan {
  const result = createGatewayTelemetrySpan({
    stage: "gateway.authorization",
    started_at: now,
    ended_at: now,
    trace: null,
    attributes: { "operation.id": "op_observe_0001" },
  });
  if (!result.ok) throw new Error(result.error_code);
  return result.span;
}

function verifier(value: SpiffeSvidEvidence) {
  return {
    verifyCredentialReference: async () => ({ ok: true as const, evidence: value }),
  };
}

function evidence(overrides: Partial<SpiffeSvidEvidence> = {}): SpiffeSvidEvidence {
  return {
    credential_ref: "spiffe-credential-ref:test/x509",
    svid_type: "x509-svid",
    spiffe_id: "spiffe://example.test/workload/agent",
    trust_domain: "example.test",
    expires_at: "2026-08-04T00:30:00.000Z",
    status: "active",
    ...overrides,
  };
}
