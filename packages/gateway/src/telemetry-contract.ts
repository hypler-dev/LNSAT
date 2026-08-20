export const gatewaySpanStages = [
  "gateway.validation",
  "gateway.policy",
  "gateway.approval",
  "gateway.authorization",
  "gateway.dispatch",
  "gateway.reconciliation",
  "gateway.receipt",
] as const;

export type GatewaySpanStage = (typeof gatewaySpanStages)[number];

export type W3cTraceContext = {
  traceparent: string;
  tracestate: string | null;
  trace_id: string;
  parent_span_id: string;
  sampled: boolean;
  correlation_only: true;
  authority: false;
};

export function parseW3cTraceContext(input: {
  traceparent: string | null;
  tracestate: string | null;
}):
  | { ok: true; context: W3cTraceContext; side_effects: [] }
  | {
      ok: false;
      error_code: "gateway.telemetry.invalid_trace_context";
      side_effects: [];
    } {
  if (input.traceparent === null) return traceFailure();
  const match = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/.exec(
    input.traceparent,
  );
  if (
    match === null ||
    match[1] === "ff" ||
    match[2] === "0".repeat(32) ||
    match[3] === "0".repeat(16) ||
    !["00", "01"].includes(match[4]!) ||
    !validTracestate(input.tracestate)
  ) {
    return traceFailure();
  }
  return {
    ok: true,
    context: {
      traceparent: input.traceparent,
      tracestate: input.tracestate,
      trace_id: match[2]!,
      parent_span_id: match[3]!,
      sampled: match[4] === "01",
      correlation_only: true,
      authority: false,
    },
    side_effects: [],
  };
}

export function sanitizeW3cBaggage(value: string | null): {
  accepted: Record<string, string>;
  dropped_entries: number;
  carries_authority: false;
  carries_secrets: false;
  side_effects: [];
} {
  if (value === null || value.length === 0) {
    return {
      accepted: {},
      dropped_entries: 0,
      carries_authority: false,
      carries_secrets: false,
      side_effects: [],
    };
  }
  if (value.length > 8192 || /[\r\n\u0000]/.test(value)) {
    return {
      accepted: {},
      dropped_entries: value.split(",").length,
      carries_authority: false,
      carries_secrets: false,
      side_effects: [],
    };
  }
  const accepted: Record<string, string> = {};
  let dropped = 0;
  for (const entry of value.split(",")) {
    const [rawKey, ...rawValue] = entry.trim().split("=");
    const key = rawKey?.trim();
    const decoded = rawValue.join("=").trim();
    if (key !== "lnsat.correlation_id" || !/^[A-Za-z0-9_.:@/-]{1,128}$/.test(decoded)) {
      dropped += 1;
      continue;
    }
    accepted[key] = decoded;
  }
  return {
    accepted,
    dropped_entries: dropped,
    carries_authority: false,
    carries_secrets: false,
    side_effects: [],
  };
}

const allowedAttributeKeys = new Set([
  "operation.id",
  "tenant.id",
  "project.id",
  "protocol.name",
  "protocol.version",
  "adapter.id",
  "remote.id",
  "result.status",
  "error.code",
]);

export type GatewayTelemetrySpan = {
  name: GatewaySpanStage;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  trace_id: string | null;
  sampled: boolean;
  trace_is_correlation_only: true;
  attributes: Record<string, string>;
  raw_packet_included: false;
  secret_included: false;
  token_included: false;
  approval_reason_included: false;
  customer_data_included: false;
  durable_audit_required: true;
  action_authorized_by_trace: false;
};

export function createGatewayTelemetrySpan(input: {
  stage: GatewaySpanStage;
  started_at: Date;
  ended_at: Date;
  trace: W3cTraceContext | null;
  attributes: Record<string, unknown>;
}):
  | {
      ok: true;
      span: GatewayTelemetrySpan;
      dropped_attributes: number;
      side_effects: [];
    }
  | { ok: false; error_code: "gateway.telemetry.invalid_span"; side_effects: [] } {
  if (
    !gatewaySpanStages.includes(input.stage) ||
    !Number.isFinite(input.started_at.getTime()) ||
    !Number.isFinite(input.ended_at.getTime()) ||
    input.ended_at.getTime() < input.started_at.getTime() ||
    !isPlainObject(input.attributes)
  ) {
    return {
      ok: false,
      error_code: "gateway.telemetry.invalid_span",
      side_effects: [],
    };
  }
  const attributes: Record<string, string> = {};
  let dropped = 0;
  for (const [key, value] of Object.entries(input.attributes)) {
    if (
      !allowedAttributeKeys.has(key) ||
      typeof value !== "string" ||
      value.length < 1 ||
      value.length > 256 ||
      /[\u0000-\u001f\u007f]/.test(value)
    ) {
      dropped += 1;
      continue;
    }
    attributes[key] = value;
  }
  return {
    ok: true,
    span: {
      name: input.stage,
      started_at: input.started_at.toISOString(),
      ended_at: input.ended_at.toISOString(),
      duration_ms: input.ended_at.getTime() - input.started_at.getTime(),
      trace_id: input.trace?.trace_id ?? null,
      sampled: input.trace?.sampled ?? false,
      trace_is_correlation_only: true,
      attributes,
      raw_packet_included: false,
      secret_included: false,
      token_included: false,
      approval_reason_included: false,
      customer_data_included: false,
      durable_audit_required: true,
      action_authorized_by_trace: false,
    },
    dropped_attributes: dropped,
    side_effects: [],
  };
}

export interface GatewayTelemetrySink {
  emit(span: GatewayTelemetrySpan): Promise<void>;
}

export async function emitGatewayTelemetrySpan(input: {
  sink: GatewayTelemetrySink | null;
  span: GatewayTelemetrySpan;
}): Promise<{
  delivered: boolean;
  authorization_blocked: false;
  operation_state_changed: false;
  durable_audit_required: true;
  side_effects: [];
}> {
  if (input.sink === null) {
    return telemetryDelivery(false);
  }
  try {
    await input.sink.emit(input.span);
    return telemetryDelivery(true);
  } catch {
    return telemetryDelivery(false);
  }
}

function telemetryDelivery(delivered: boolean) {
  return {
    delivered,
    authorization_blocked: false as const,
    operation_state_changed: false as const,
    durable_audit_required: true as const,
    side_effects: [] as [],
  };
}

function validTracestate(value: string | null): boolean {
  if (value === null) return true;
  if (value.length < 1 || value.length > 512 || /[\r\n\u0000]/.test(value))
    return false;
  const members = value.split(",");
  if (members.length > 32) return false;
  const keys = new Set<string>();
  return members.every((member) => {
    const separator = member.indexOf("=");
    if (separator < 1) return false;
    const key = member.slice(0, separator).trim();
    const memberValue = member.slice(separator + 1).trim();
    if (
      !validTracestateKey(key) ||
      !/^[\x20-\x2b\x2d-\x3c\x3e-\x7e]{1,256}$/.test(memberValue) ||
      keys.has(key)
    ) {
      return false;
    }
    keys.add(key);
    return true;
  });
}

function validTracestateKey(value: string): boolean {
  if (/^[a-z][_a-z0-9*\-/]{0,255}$/.test(value)) return true;
  const parts = value.split("@");
  return (
    parts.length === 2 &&
    /^[a-z0-9][_a-z0-9*\-/]{0,240}$/.test(parts[0]!) &&
    /^[a-z][_a-z0-9*\-/]{0,13}$/.test(parts[1]!)
  );
}

function traceFailure() {
  return {
    ok: false as const,
    error_code: "gateway.telemetry.invalid_trace_context" as const,
    side_effects: [] as [],
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
