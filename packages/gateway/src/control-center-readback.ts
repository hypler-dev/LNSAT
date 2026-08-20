export const controlCenterPresentationStates = [
  "stale",
  "degraded",
  "unavailable",
  "unknown",
  "reconciling",
  "expired",
  "orphaned",
  "receipt_pending",
] as const;

export type ControlCenterPresentationState =
  (typeof controlCenterPresentationStates)[number];

export type ControlCenterOperationView = {
  operation_id: string;
  gateway_state:
    | "working"
    | "transport_unavailable"
    | "outcome_unknown"
    | "reconciling"
    | "expired"
    | "orphaned";
  presentation_state: ControlCenterPresentationState;
  authorization_expires_at: string;
  observed_at: string | null;
  stale: boolean;
  degraded: boolean;
  source_available: boolean;
  outcome_known: false;
  timeout_is_success: false;
  cancellation_is_success: false;
  non_execution_confirmed: false;
  receipt_pending: boolean;
  retry: {
    exact_idempotency_match: boolean;
    exact_packet_digest_match: boolean;
    exact_tool_argument_digest_match: boolean;
    authorization_current: boolean;
    reconciliation_cleared: boolean;
    eligibility_passed: boolean;
    runtime_mutation_open: false;
    button_enabled: false;
    disabled_reason:
      | "runtime_mutation_closed"
      | "exact_binding_failed"
      | "authorization_expired"
      | "reconciliation_required";
  };
  side_effects: [];
};

export type ControlCenterOperationReadback = {
  schema_version: "lnsat.control_center.operation_readback.v0_1";
  source: "deterministic_fixture_fallback";
  scope: {
    tenant_ref: "tenant:fixture";
    project_ref: "project:fixture";
  };
  generated_at: "2026-08-04T00:00:00.000Z";
  read_only: true;
  fixture_fallback: true;
  runtime_connected: false;
  ui_action_transport: "gateway_only";
  frontend_can_authorize: false;
  sandbox_can_bypass_approval: false;
  operations: ControlCenterOperationView[];
  side_effects: [];
};

export const controlCenterOperationFixture: ControlCenterOperationReadback = {
  schema_version: "lnsat.control_center.operation_readback.v0_1",
  source: "deterministic_fixture_fallback",
  scope: {
    tenant_ref: "tenant:fixture",
    project_ref: "project:fixture",
  },
  generated_at: "2026-08-04T00:00:00.000Z",
  read_only: true,
  fixture_fallback: true,
  runtime_connected: false,
  ui_action_transport: "gateway_only",
  frontend_can_authorize: false,
  sandbox_can_bypass_approval: false,
  operations: [
    operation("op_fixture_stale", "working", "stale", {
      stale: true,
      degraded: false,
      source_available: true,
      observed_at: "2026-08-03T23:00:00.000Z",
      disabled_reason: "reconciliation_required",
    }),
    operation("op_fixture_degraded", "transport_unavailable", "degraded", {
      stale: false,
      degraded: true,
      source_available: true,
      observed_at: "2026-08-03T23:59:00.000Z",
      eligibility: true,
      disabled_reason: "runtime_mutation_closed",
    }),
    operation("op_fixture_unavailable", "transport_unavailable", "unavailable", {
      stale: false,
      degraded: true,
      source_available: false,
      observed_at: null,
      disabled_reason: "exact_binding_failed",
    }),
    operation("op_fixture_unknown", "outcome_unknown", "unknown", {
      stale: false,
      degraded: false,
      source_available: true,
      observed_at: "2026-08-03T23:59:30.000Z",
      disabled_reason: "reconciliation_required",
    }),
    operation("op_fixture_reconciling", "reconciling", "reconciling", {
      stale: false,
      degraded: false,
      source_available: true,
      observed_at: "2026-08-03T23:59:40.000Z",
      disabled_reason: "reconciliation_required",
    }),
    operation("op_fixture_expired", "expired", "expired", {
      stale: false,
      degraded: false,
      source_available: true,
      observed_at: "2026-08-03T23:59:45.000Z",
      authorization_expires_at: "2026-08-03T23:59:50.000Z",
      disabled_reason: "authorization_expired",
    }),
    operation("op_fixture_orphaned", "orphaned", "orphaned", {
      stale: true,
      degraded: true,
      source_available: true,
      observed_at: "2026-08-03T22:00:00.000Z",
      disabled_reason: "reconciliation_required",
    }),
    operation("op_fixture_receipt_pending", "outcome_unknown", "receipt_pending", {
      stale: false,
      degraded: false,
      source_available: true,
      observed_at: "2026-08-03T23:59:55.000Z",
      receipt_pending: true,
      disabled_reason: "reconciliation_required",
    }),
  ],
  side_effects: [],
};

export function inspectControlCenterOperationFixture():
  | { ok: true; readback: ControlCenterOperationReadback; side_effects: [] }
  | {
      ok: false;
      error_code: "gateway.control_center.invalid_fixture";
      side_effects: [];
    } {
  if (!validReadback(controlCenterOperationFixture)) {
    return {
      ok: false,
      error_code: "gateway.control_center.invalid_fixture",
      side_effects: [],
    };
  }
  return {
    ok: true,
    readback: structuredClone(controlCenterOperationFixture),
    side_effects: [],
  };
}

function operation(
  operation_id: string,
  gateway_state: ControlCenterOperationView["gateway_state"],
  presentation_state: ControlCenterPresentationState,
  options: {
    stale: boolean;
    degraded: boolean;
    source_available: boolean;
    observed_at: string | null;
    authorization_expires_at?: string;
    receipt_pending?: boolean;
    eligibility?: boolean;
    disabled_reason: ControlCenterOperationView["retry"]["disabled_reason"];
  },
): ControlCenterOperationView {
  const eligibility = options.eligibility === true;
  return {
    operation_id,
    gateway_state,
    presentation_state,
    authorization_expires_at:
      options.authorization_expires_at ?? "2026-08-04T00:30:00.000Z",
    observed_at: options.observed_at,
    stale: options.stale,
    degraded: options.degraded,
    source_available: options.source_available,
    outcome_known: false,
    timeout_is_success: false,
    cancellation_is_success: false,
    non_execution_confirmed: false,
    receipt_pending: options.receipt_pending === true,
    retry: {
      exact_idempotency_match: eligibility,
      exact_packet_digest_match: eligibility,
      exact_tool_argument_digest_match: eligibility,
      authorization_current: eligibility,
      reconciliation_cleared: eligibility,
      eligibility_passed: eligibility,
      runtime_mutation_open: false,
      button_enabled: false,
      disabled_reason: options.disabled_reason,
    },
    side_effects: [],
  };
}

function validReadback(value: ControlCenterOperationReadback): boolean {
  return (
    value.read_only === true &&
    value.fixture_fallback === true &&
    value.runtime_connected === false &&
    value.frontend_can_authorize === false &&
    value.sandbox_can_bypass_approval === false &&
    value.side_effects.length === 0 &&
    value.operations.length === controlCenterPresentationStates.length &&
    new Set(value.operations.map((item) => item.presentation_state)).size ===
      controlCenterPresentationStates.length &&
    controlCenterPresentationStates.every((state) =>
      value.operations.some((item) => item.presentation_state === state),
    ) &&
    value.operations.every(
      (item) =>
        item.outcome_known === false &&
        item.timeout_is_success === false &&
        item.cancellation_is_success === false &&
        item.non_execution_confirmed === false &&
        item.retry.runtime_mutation_open === false &&
        item.retry.button_enabled === false &&
        (!item.retry.eligibility_passed ||
          (item.retry.exact_idempotency_match &&
            item.retry.exact_packet_digest_match &&
            item.retry.exact_tool_argument_digest_match &&
            item.retry.authorization_current &&
            item.retry.reconciliation_cleared)),
    )
  );
}

export const controlCenterPhase9ObservationStatuses = [
  "fresh",
  "stale",
  "degraded",
  "unavailable",
] as const;

export type ControlCenterPhase9ObservationStatus =
  (typeof controlCenterPhase9ObservationStatuses)[number];

export const controlCenterPhase9PresentationStates = [
  "prepared",
  "expired",
  "receipt_pending",
  "unknown",
  "reconciling",
  "completed",
  "failed",
] as const;

export type ControlCenterPhase9PresentationState =
  (typeof controlCenterPhase9PresentationStates)[number];

export type ControlCenterLiveAuthorizationEvidenceV1 = {
  authorization_id: string;
  project_ref: string;
  resource_ref: string;
  state: "active" | "consumed" | "cancelled" | "revoked" | "expired";
  active: boolean;
  issued_at: string;
  expires_at: string;
  approval_decision_id: string;
  policy_decision_id: string;
  packet_id: string;
  requester_ref: string;
  requester_session_ref: string;
  approver_ref: string;
  approver_session_ref: string;
  operation_id: string;
};

export type ControlCenterLiveAttemptEvidenceV1 = {
  operation_attempt_id: string;
  operation_id: string;
  project_ref: string;
  resource_ref: string;
  state: "dispatching" | "completed" | "failed" | "outcome_unknown";
  state_effective_at: string;
  adapter_ref: string;
  protocol_version: string;
};

export type ControlCenterLiveOperationEvidenceV1 = {
  operation_id: string;
  authorization_id: string;
  project_ref: string;
  resource_ref: string;
  state: "prepared" | "dispatching" | "completed" | "failed" | "outcome_unknown";
  state_effective_at: string;
  attempt: ControlCenterLiveAttemptEvidenceV1 | null;
  receipt: {
    receipt_id: string;
    received_at: string;
  } | null;
  reconciliation: {
    reconciliation_id: string;
    status: "in_progress" | "matched";
    recorded_at: string;
  } | null;
};

export type ControlCenterLiveGatewayEvidenceV1 = {
  source_contract: "lnsat.gateway.runtime_composition.v1_0";
  source_contract_version: "lnsat.contracts.v1_0";
  observed_at: string;
  authorization: ControlCenterLiveAuthorizationEvidenceV1;
  operation: ControlCenterLiveOperationEvidenceV1;
  attempt: ControlCenterLiveAttemptEvidenceV1 | null;
};

export type ControlCenterLiveProjectionV1 = {
  schema_version: "lnsat.control_center.operation_readback.v1_0";
  source_kind: "live_gateway";
  source_contract: "lnsat.gateway.runtime_composition.v1_0";
  source_contract_version: "lnsat.contracts.v1_0";
  provenance: "authenticated_gateway_evidence";
  observation_status: ControlCenterPhase9ObservationStatus;
  presentation_state: ControlCenterPhase9PresentationState;
  observed_at: string;
  scope: {
    project_ref: string;
    resource_ref: string;
  } | null;
  authorization: ControlCenterLiveAuthorizationEvidenceV1 | null;
  operation: ControlCenterLiveOperationEvidenceV1 | null;
  attempt: ControlCenterLiveAttemptEvidenceV1 | null;
  receipt: ControlCenterLiveOperationEvidenceV1["receipt"];
  reconciliation: ControlCenterLiveOperationEvidenceV1["reconciliation"];
  refresh_failure: string | null;
  session_activity_evidence: "may_append";
  read_only: true;
  runtime_authority: false;
  action_authority: false;
  retry_available: false;
  success_confirmed: boolean;
  non_execution_confirmed: false;
};

export type ControlCenterSyntheticFixtureProjectionV1 = {
  schema_version: "lnsat.control_center.operation_readback.v1_0";
  source_kind: "synthetic_fixture";
  source_contract: "lnsat.control_center.operation_readback.v0_1";
  source_contract_version: "v0_1";
  provenance: "synthetic_fixture";
  observation_status: "fresh";
  fixture: ControlCenterOperationReadback;
  read_only: true;
  runtime_authority: false;
  action_authority: false;
  retry_available: false;
};

export type ControlCenterPhase9ProjectionV1 =
  ControlCenterLiveProjectionV1 | ControlCenterSyntheticFixtureProjectionV1;

export const controlCenterPhase9ContractFixture = {
  schema_id: "lnsat.control_center.operation_readback.v1_0",
  source_kinds: ["live_gateway", "synthetic_fixture"],
  observation_statuses: controlCenterPhase9ObservationStatuses,
  presentation_states: controlCenterPhase9PresentationStates,
  source_contract: "lnsat.gateway.runtime_composition.v1_0",
  source_contract_version: "lnsat.contracts.v1_0",
  mappings: {
    prepared_active: "prepared",
    prepared_expired: "expired",
    dispatching_without_receipt: "receipt_pending",
    outcome_unknown: "unknown",
    reconciliation_in_progress: "reconciling",
    completed_with_receipt: "completed",
    completed_without_receipt: "degraded_unknown",
    failed_with_gateway_evidence: "failed",
  },
  read_only: true,
  runtime_authority: false,
  action_authority: false,
  retry_available: false,
} as const;

export function projectControlCenterSyntheticFixtureV1(
  fixture: ControlCenterOperationReadback = controlCenterOperationFixture,
): ControlCenterSyntheticFixtureProjectionV1 {
  return {
    schema_version: "lnsat.control_center.operation_readback.v1_0",
    source_kind: "synthetic_fixture",
    source_contract: "lnsat.control_center.operation_readback.v0_1",
    source_contract_version: "v0_1",
    provenance: "synthetic_fixture",
    observation_status: "fresh",
    fixture: structuredClone(fixture),
    read_only: true,
    runtime_authority: false,
    action_authority: false,
    retry_available: false,
  };
}

export function unavailableControlCenterLiveProjectionV1(
  observed_at: string,
  observation_status: "degraded" | "unavailable",
  failure_code: string,
): ControlCenterLiveProjectionV1 {
  return {
    schema_version: "lnsat.control_center.operation_readback.v1_0",
    source_kind: "live_gateway",
    source_contract: "lnsat.gateway.runtime_composition.v1_0",
    source_contract_version: "lnsat.contracts.v1_0",
    provenance: "authenticated_gateway_evidence",
    observation_status,
    presentation_state: "unknown",
    observed_at,
    scope: null,
    authorization: null,
    operation: null,
    attempt: null,
    receipt: null,
    reconciliation: null,
    refresh_failure: failure_code,
    session_activity_evidence: "may_append",
    read_only: true,
    runtime_authority: false,
    action_authority: false,
    retry_available: false,
    success_confirmed: false,
    non_execution_confirmed: false,
  };
}

export function markControlCenterLiveProjectionStaleV1(
  snapshot: ControlCenterLiveProjectionV1,
  observed_at: string,
  failure_code: string,
): ControlCenterLiveProjectionV1 {
  if (snapshot.operation === null || snapshot.authorization === null) {
    return unavailableControlCenterLiveProjectionV1(
      observed_at,
      "unavailable",
      failure_code,
    );
  }
  return {
    ...structuredClone(snapshot),
    observation_status: "stale",
    refresh_failure: failure_code,
  };
}

export function projectControlCenterLiveGatewayEvidenceV1(
  evidence: ControlCenterLiveGatewayEvidenceV1,
): ControlCenterLiveProjectionV1 {
  const { authorization, operation, attempt } = evidence;
  if (!hasExactLiveScopeV1(authorization, operation, attempt)) {
    return unavailableControlCenterLiveProjectionV1(
      evidence.observed_at,
      "degraded",
      "control_center.live.scope_mismatch",
    );
  }

  let observation_status: ControlCenterPhase9ObservationStatus = "fresh";
  let presentation_state: ControlCenterPhase9PresentationState = "unknown";
  if (operation.reconciliation?.status === "in_progress") {
    presentation_state = "reconciling";
  } else if (operation.state === "prepared") {
    if (authorization.state === "active" && authorization.active) {
      presentation_state = "prepared";
    } else if (authorization.state === "expired") {
      presentation_state = "expired";
    } else {
      observation_status = "degraded";
    }
  } else if (operation.state === "dispatching") {
    if (attempt !== null && operation.receipt === null) {
      presentation_state = "receipt_pending";
    } else {
      observation_status = "degraded";
    }
  } else if (operation.state === "outcome_unknown") {
    presentation_state = "unknown";
  } else if (operation.state === "completed") {
    if (operation.receipt !== null) {
      presentation_state = "completed";
    } else {
      observation_status = "degraded";
    }
  } else if (operation.state === "failed") {
    presentation_state = "failed";
  }

  return {
    schema_version: "lnsat.control_center.operation_readback.v1_0",
    source_kind: "live_gateway",
    source_contract: evidence.source_contract,
    source_contract_version: evidence.source_contract_version,
    provenance: "authenticated_gateway_evidence",
    observation_status,
    presentation_state,
    observed_at: evidence.observed_at,
    scope: {
      project_ref: operation.project_ref,
      resource_ref: operation.resource_ref,
    },
    authorization: structuredClone(authorization),
    operation: structuredClone(operation),
    attempt: structuredClone(attempt),
    receipt: structuredClone(operation.receipt),
    reconciliation: structuredClone(operation.reconciliation),
    refresh_failure: null,
    session_activity_evidence: "may_append",
    read_only: true,
    runtime_authority: false,
    action_authority: false,
    retry_available: false,
    success_confirmed: presentation_state === "completed",
    non_execution_confirmed: false,
  };
}

function hasExactLiveScopeV1(
  authorization: ControlCenterLiveAuthorizationEvidenceV1,
  operation: ControlCenterLiveOperationEvidenceV1,
  attempt: ControlCenterLiveAttemptEvidenceV1 | null,
): boolean {
  if (
    authorization.operation_id !== operation.operation_id ||
    authorization.authorization_id !== operation.authorization_id ||
    authorization.project_ref !== operation.project_ref ||
    authorization.resource_ref !== operation.resource_ref ||
    (authorization.state === "active") !== authorization.active ||
    (operation.attempt === null) !== (attempt === null)
  ) {
    return false;
  }
  if (attempt === null || operation.attempt === null) return true;
  return (
    attempt.operation_attempt_id === operation.attempt.operation_attempt_id &&
    attempt.operation_id === operation.operation_id &&
    attempt.project_ref === operation.project_ref &&
    attempt.resource_ref === operation.resource_ref &&
    attempt.adapter_ref === operation.attempt.adapter_ref &&
    attempt.protocol_version === operation.attempt.protocol_version
  );
}
