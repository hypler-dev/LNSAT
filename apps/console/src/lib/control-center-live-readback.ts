import {
  projectControlCenterLiveGatewayEvidenceV1,
  type ControlCenterLiveAttemptEvidenceV1,
  type ControlCenterLiveAuthorizationEvidenceV1,
  type ControlCenterLiveGatewayEvidenceV1,
  type ControlCenterLiveOperationEvidenceV1,
  type ControlCenterLiveProjectionV1,
  markControlCenterLiveProjectionStaleV1,
  unavailableControlCenterLiveProjectionV1,
} from "@lnsat/gateway/control-center-readback";

export const LIVE_GATEWAY_CONTRACT_VERSION = "lnsat.contracts.v1_0";
export const LIVE_GATEWAY_SOURCE_CONTRACT = "lnsat.gateway.runtime_composition.v1_0";

const OPERATION_ID_PATTERN = /^opn_[0-9a-f]{64}$/;
const AUTHORIZATION_ID_PATTERN = /^xau_[0-9a-f]{64}$/;
const ATTEMPT_ID_PATTERN = /^opa_[0-9a-f]{64}$/;

type FetchResponseV1 = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

export type ControlCenterFetchV1 = (
  input: string,
  init: RequestInit,
) => Promise<FetchResponseV1>;

export type ControlCenterLiveLoadFailureV1 = {
  kind: "degraded" | "unavailable";
  code: string;
  observed_at: string;
};

export type ControlCenterLiveLoadResultV1 =
  | { ok: true; snapshot: ControlCenterLiveProjectionV1 }
  | { ok: false; failure: ControlCenterLiveLoadFailureV1 };

export type ControlCenterLiveClientStateV1 = {
  snapshot: ControlCenterLiveProjectionV1 | null;
  last_failure: string | null;
};

export function isExactOperationIdV1(value: string): boolean {
  return OPERATION_ID_PATTERN.test(value);
}

export function operationIdFromFragmentV1(fragment: string): string {
  const match = /^#operation=(opn_[0-9a-f]{64})$/.exec(fragment);
  return match?.[1] ?? "";
}

export function operationIdForExplicitLoadV1(
  manualInput: string,
  fragment: string,
): string {
  return manualInput === "" ? operationIdFromFragmentV1(fragment) : manualInput;
}

export function applyControlCenterLiveLoadResultV1(
  previous: ControlCenterLiveClientStateV1,
  result: ControlCenterLiveLoadResultV1,
  requestedOperationId: string,
): ControlCenterLiveClientStateV1 {
  if (result.ok) {
    if (result.snapshot.operation?.operation_id !== requestedOperationId) {
      return {
        snapshot: unavailableControlCenterLiveProjectionV1(
          result.snapshot.observed_at,
          "degraded",
          "control_center.live.operation_identity_mismatch",
        ),
        last_failure: "control_center.live.operation_identity_mismatch",
      };
    }
    return { snapshot: result.snapshot, last_failure: null };
  }
  if (
    previous.snapshot !== null &&
    previous.snapshot.operation?.operation_id === requestedOperationId
  ) {
    return {
      snapshot: markControlCenterLiveProjectionStaleV1(
        previous.snapshot,
        result.failure.observed_at,
        result.failure.code,
      ),
      last_failure: result.failure.code,
    };
  }
  return {
    snapshot: unavailableControlCenterLiveProjectionV1(
      result.failure.observed_at,
      result.failure.kind,
      result.failure.code,
    ),
    last_failure: result.failure.code,
  };
}

export function retainControlCenterLiveStateForInputV1(
  previous: ControlCenterLiveClientStateV1,
  inputOperationId: string,
): ControlCenterLiveClientStateV1 {
  return previous.snapshot?.operation?.operation_id === inputOperationId
    ? previous
    : { snapshot: null, last_failure: null };
}

export function isCurrentControlCenterLiveLoadV1(
  requestedOperationId: string,
  inputOperationId: string,
): boolean {
  return requestedOperationId === inputOperationId;
}

export async function loadControlCenterLiveOperationV1(
  operation_id: string,
  options: {
    fetch?: ControlCenterFetchV1;
    now?: () => Date;
    signal?: AbortSignal;
  } = {},
): Promise<ControlCenterLiveLoadResultV1> {
  const observed_at = (options.now ?? (() => new Date()))().toISOString();
  if (!isExactOperationIdV1(operation_id)) {
    return degraded("control_center.live.operation_id_invalid", observed_at);
  }
  const fetchImpl = options.fetch ?? (fetch as ControlCenterFetchV1);
  try {
    const operationResult = await fetchGatewayJsonV1(
      fetchImpl,
      `/v1/operations/${operation_id}`,
      options.signal,
    );
    if (!operationResult.ok) return failureFromFetch(operationResult, observed_at);
    const operation = parseOperationEnvelopeV1(operationResult.value, operation_id);
    if (operation === null) {
      return degraded("control_center.live.operation_contract_invalid", observed_at);
    }

    const authorizationResult = await fetchGatewayJsonV1(
      fetchImpl,
      `/v1/execution-authorizations/${operation.authorization_id}`,
      options.signal,
    );
    if (!authorizationResult.ok) {
      return failureFromFetch(authorizationResult, observed_at);
    }
    const authorization = parseAuthorizationEnvelopeV1(
      authorizationResult.value,
      operation.authorization_id,
      operation_id,
    );
    if (authorization === null) {
      return degraded(
        "control_center.live.authorization_contract_invalid",
        observed_at,
      );
    }

    let attempt: ControlCenterLiveAttemptEvidenceV1 | null = null;
    if (operation.attempt !== null) {
      const attemptResult = await fetchGatewayJsonV1(
        fetchImpl,
        `/v1/operations/${operation_id}/attempts/${operation.attempt.operation_attempt_id}`,
        options.signal,
      );
      if (!attemptResult.ok) return failureFromFetch(attemptResult, observed_at);
      attempt = parseAttemptEnvelopeV1(
        attemptResult.value,
        operation_id,
        operation.attempt.operation_attempt_id,
      );
      if (attempt === null) {
        return degraded("control_center.live.attempt_contract_invalid", observed_at);
      }
    }

    const snapshot = projectControlCenterLiveGatewayEvidenceV1({
      source_contract: LIVE_GATEWAY_SOURCE_CONTRACT,
      source_contract_version: LIVE_GATEWAY_CONTRACT_VERSION,
      observed_at,
      authorization,
      operation,
      attempt,
    });
    if (snapshot.observation_status === "degraded") {
      return degraded(
        snapshot.refresh_failure ?? "control_center.live.scope_mismatch",
        observed_at,
      );
    }
    return { ok: true, snapshot };
  } catch {
    return unavailable("control_center.live.transport_unavailable", observed_at);
  }
}

type GatewayFetchResultV1 =
  | { ok: true; value: unknown }
  | { ok: false; kind: "http"; status: number }
  | { ok: false; kind: "invalid_json" }
  | { ok: false; kind: "missing_response" };

async function fetchGatewayJsonV1(
  fetchImpl: ControlCenterFetchV1,
  path: string,
  signal: AbortSignal | undefined,
): Promise<GatewayFetchResultV1> {
  const response = await fetchImpl(path, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
    headers: {
      Accept: "application/json",
      "LNSAT-Contract-Version": LIVE_GATEWAY_CONTRACT_VERSION,
    },
    ...(signal === undefined ? {} : { signal }),
  });
  if (!isPlainObject(response) || typeof response.ok !== "boolean") {
    return { ok: false, kind: "missing_response" };
  }
  if (!response.ok) {
    return {
      ok: false,
      kind: "http",
      status: typeof response.status === "number" ? response.status : 0,
    };
  }
  if (typeof response.json !== "function") {
    return { ok: false, kind: "missing_response" };
  }
  try {
    return { ok: true, value: await response.json() };
  } catch {
    return { ok: false, kind: "invalid_json" };
  }
}

function failureFromFetch(
  failure: Exclude<GatewayFetchResultV1, { ok: true }>,
  observed_at: string,
): ControlCenterLiveLoadResultV1 {
  if (failure.kind === "invalid_json") {
    return degraded("control_center.live.invalid_json", observed_at);
  }
  if (failure.kind === "http") {
    return unavailable(`control_center.live.http_${failure.status}`, observed_at);
  }
  return unavailable("control_center.live.response_missing", observed_at);
}

function degraded(code: string, observed_at: string): ControlCenterLiveLoadResultV1 {
  return { ok: false, failure: { kind: "degraded", code, observed_at } };
}

function unavailable(code: string, observed_at: string): ControlCenterLiveLoadResultV1 {
  return { ok: false, failure: { kind: "unavailable", code, observed_at } };
}

function parseOperationEnvelopeV1(
  value: unknown,
  expectedOperationId: string,
): ControlCenterLiveOperationEvidenceV1 | null {
  if (
    !hasExactKeys(value, ["contract", "status", "operation"]) ||
    value.contract !== LIVE_GATEWAY_SOURCE_CONTRACT ||
    value.status !== "ok"
  ) {
    return null;
  }
  const operation = value.operation;
  if (
    !hasExactKeys(operation, [
      "operation_id",
      "operation_audit_binding_id",
      "authorization_id",
      "consumption_id",
      "project_ref",
      "resource_ref",
      "state_event_id",
      "state_audit_binding_id",
      "state_sequence",
      "state",
      "state_effective_at",
      "attempt",
      "receipt",
      "reconciliation",
    ]) ||
    operation.operation_id !== expectedOperationId ||
    !AUTHORIZATION_ID_PATTERN.test(asString(operation.authorization_id)) ||
    !isString(operation.operation_audit_binding_id) ||
    !(operation.consumption_id === null || isString(operation.consumption_id)) ||
    !isString(operation.project_ref) ||
    !isString(operation.resource_ref) ||
    !isString(operation.state_event_id) ||
    !isString(operation.state_audit_binding_id) ||
    !isNonNegativeInteger(operation.state_sequence) ||
    !isOneOf(operation.state, [
      "prepared",
      "dispatching",
      "completed",
      "failed",
      "outcome_unknown",
    ]) ||
    !isTimestamp(operation.state_effective_at)
  ) {
    return null;
  }
  const attempt =
    operation.attempt === null
      ? null
      : parseAttemptValueV1(operation.attempt, expectedOperationId);
  if (operation.attempt !== null && attempt === null) return null;
  const receipt = parseReceiptV1(operation.receipt);
  if (operation.receipt !== null && receipt === null) return null;
  const reconciliation = parseReconciliationV1(operation.reconciliation);
  if (operation.reconciliation !== null && reconciliation === null) return null;
  return {
    operation_id: operation.operation_id,
    authorization_id: asString(operation.authorization_id),
    project_ref: operation.project_ref,
    resource_ref: operation.resource_ref,
    state: operation.state,
    state_effective_at: operation.state_effective_at,
    attempt,
    receipt,
    reconciliation,
  };
}

function parseAuthorizationEnvelopeV1(
  value: unknown,
  expectedAuthorizationId: string,
  expectedOperationId: string,
): ControlCenterLiveAuthorizationEvidenceV1 | null {
  if (
    !hasExactKeys(value, ["contract", "status", "authorization"]) ||
    value.contract !== LIVE_GATEWAY_SOURCE_CONTRACT ||
    value.status !== "ok"
  ) {
    return null;
  }
  const authorization = value.authorization;
  const stringKeys = [
    "audit_binding_id",
    "project_ref",
    "resource_ref",
    "authorization_attempt_id",
    "nonce_id",
    "binding_digest",
    "approval_decision_id",
    "policy_decision_id",
    "packet_id",
    "packet_sha256",
    "requester_ref",
    "requester_session_ref",
    "approver_ref",
    "approver_session_ref",
    "action_digest",
    "target_digest",
    "configuration_digest",
    "adapter_ref",
    "executable_digest",
    "audience",
    "authorization_profile",
    "issued_at",
    "expires_at",
    "state_event_id",
    "state_audit_binding_id",
    "state_effective_at",
    "operation_audit_binding_id",
    "operation_idempotency_key",
    "operation_request_digest",
  ] as const;
  if (
    !hasExactKeys(authorization, [
      "authorization_id",
      ...stringKeys,
      "state_sequence",
      "state",
      "active",
      "operation_id",
    ]) ||
    authorization.authorization_id !== expectedAuthorizationId ||
    authorization.operation_id !== expectedOperationId ||
    !stringKeys.every((key) => isString(authorization[key])) ||
    !isTimestamp(authorization.issued_at) ||
    !isTimestamp(authorization.expires_at) ||
    !isTimestamp(authorization.state_effective_at) ||
    !isNonNegativeInteger(authorization.state_sequence) ||
    !isOneOf(authorization.state, [
      "active",
      "consumed",
      "cancelled",
      "revoked",
      "expired",
    ]) ||
    typeof authorization.active !== "boolean" ||
    (authorization.state === "active") !== authorization.active
  ) {
    return null;
  }
  return {
    authorization_id: authorization.authorization_id,
    project_ref: asString(authorization.project_ref),
    resource_ref: asString(authorization.resource_ref),
    state: authorization.state,
    active: authorization.active,
    issued_at: asString(authorization.issued_at),
    expires_at: asString(authorization.expires_at),
    approval_decision_id: asString(authorization.approval_decision_id),
    policy_decision_id: asString(authorization.policy_decision_id),
    packet_id: asString(authorization.packet_id),
    requester_ref: asString(authorization.requester_ref),
    requester_session_ref: asString(authorization.requester_session_ref),
    approver_ref: asString(authorization.approver_ref),
    approver_session_ref: asString(authorization.approver_session_ref),
    operation_id: authorization.operation_id,
  };
}

function parseAttemptEnvelopeV1(
  value: unknown,
  expectedOperationId: string,
  expectedAttemptId: string,
): ControlCenterLiveAttemptEvidenceV1 | null {
  if (
    !hasExactKeys(value, ["contract", "status", "attempt"]) ||
    value.contract !== LIVE_GATEWAY_SOURCE_CONTRACT ||
    value.status !== "ok"
  ) {
    return null;
  }
  return parseAttemptValueV1(value.attempt, expectedOperationId, expectedAttemptId);
}

function parseAttemptValueV1(
  value: unknown,
  expectedOperationId: string,
  expectedAttemptId?: string,
): ControlCenterLiveAttemptEvidenceV1 | null {
  if (
    !hasExactKeys(value, [
      "operation_attempt_id",
      "audit_binding_id",
      "operation_id",
      "project_ref",
      "resource_ref",
      "attempt_sequence",
      "adapter_ref",
      "protocol_version",
      "tool_arguments_digest",
      "created_at",
      "state_event_id",
      "state_audit_binding_id",
      "state_sequence",
      "state",
      "state_effective_at",
    ]) ||
    !ATTEMPT_ID_PATTERN.test(asString(value.operation_attempt_id)) ||
    (expectedAttemptId !== undefined &&
      value.operation_attempt_id !== expectedAttemptId) ||
    value.operation_id !== expectedOperationId ||
    !isString(value.audit_binding_id) ||
    !isString(value.project_ref) ||
    !isString(value.resource_ref) ||
    !isNonNegativeInteger(value.attempt_sequence) ||
    !isString(value.adapter_ref) ||
    !isString(value.protocol_version) ||
    !isString(value.tool_arguments_digest) ||
    !isTimestamp(value.created_at) ||
    !isString(value.state_event_id) ||
    !isString(value.state_audit_binding_id) ||
    !isNonNegativeInteger(value.state_sequence) ||
    !isOneOf(value.state, ["dispatching", "completed", "failed", "outcome_unknown"]) ||
    !isTimestamp(value.state_effective_at)
  ) {
    return null;
  }
  return {
    operation_attempt_id: asString(value.operation_attempt_id),
    operation_id: value.operation_id,
    project_ref: value.project_ref,
    resource_ref: value.resource_ref,
    state: value.state,
    state_effective_at: value.state_effective_at,
    adapter_ref: value.adapter_ref,
    protocol_version: value.protocol_version,
  };
}

function parseReceiptV1(
  value: unknown,
): ControlCenterLiveOperationEvidenceV1["receipt"] {
  if (value === null) return null;
  if (
    !hasExactKeys(value, ["receipt_id", "received_at"]) ||
    !isString(value.receipt_id) ||
    !isTimestamp(value.received_at)
  ) {
    return null;
  }
  return { receipt_id: value.receipt_id, received_at: value.received_at };
}

function parseReconciliationV1(
  value: unknown,
): ControlCenterLiveOperationEvidenceV1["reconciliation"] {
  if (value === null) return null;
  if (
    !hasExactKeys(value, ["reconciliation_id", "status", "recorded_at"]) ||
    !isString(value.reconciliation_id) ||
    value.status !== "matched" ||
    !isTimestamp(value.recorded_at)
  ) {
    return null;
  }
  return {
    reconciliation_id: value.reconciliation_id,
    status: "matched",
    recorded_at: value.recorded_at,
  };
}

function hasExactKeys(
  value: unknown,
  expected: readonly string[],
): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value).sort();
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === [...expected].sort()[index])
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 512;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 64 &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isOneOf<const Values extends readonly string[]>(
  value: unknown,
  values: Values,
): value is Values[number] {
  return typeof value === "string" && values.includes(value);
}
