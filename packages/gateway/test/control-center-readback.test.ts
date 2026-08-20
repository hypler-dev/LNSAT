import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  controlCenterPhase9ContractFixture,
  controlCenterOperationFixture,
  controlCenterPresentationStates,
  inspectControlCenterOperationFixture,
  markControlCenterLiveProjectionStaleV1,
  projectControlCenterLiveGatewayEvidenceV1,
  projectControlCenterSyntheticFixtureV1,
  unavailableControlCenterLiveProjectionV1,
  type ControlCenterLiveGatewayEvidenceV1,
} from "../src/index.js";

const fixturePath = join(
  process.cwd(),
  "../../fixtures/console/operation-reconciliation-v0_1.json",
);

describe("Control Center operation readback", () => {
  it("keeps source model byte-equivalent to deterministic JSON fixture", async () => {
    const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
    expect(controlCenterOperationFixture).toEqual(fixture);
  });

  it("shows every required degraded or ambiguous state", () => {
    const result = inspectControlCenterOperationFixture();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error_code);
    expect(result.readback.operations.map((item) => item.presentation_state)).toEqual(
      controlCenterPresentationStates,
    );
  });

  it("never maps timeout, cancellation, or missing receipt to success or non-execution", () => {
    for (const operation of controlCenterOperationFixture.operations) {
      expect(operation).toMatchObject({
        outcome_known: false,
        timeout_is_success: false,
        cancellation_is_success: false,
        non_execution_confirmed: false,
        side_effects: [],
      });
    }
  });

  it("requires exact retry bindings and still keeps UI mutation closed", () => {
    const eligible = controlCenterOperationFixture.operations.filter(
      (item) => item.retry.eligibility_passed,
    );
    expect(eligible).toHaveLength(1);
    expect(eligible[0]?.retry).toEqual({
      exact_idempotency_match: true,
      exact_packet_digest_match: true,
      exact_tool_argument_digest_match: true,
      authorization_current: true,
      reconciliation_cleared: true,
      eligibility_passed: true,
      runtime_mutation_open: false,
      button_enabled: false,
      disabled_reason: "runtime_mutation_closed",
    });
    expect(
      controlCenterOperationFixture.operations.every(
        (item) => item.retry.button_enabled === false,
      ),
    ).toBe(true);
  });

  it("keeps fixture fallback read-only and Gateway-bound", () => {
    expect(controlCenterOperationFixture).toMatchObject({
      source: "deterministic_fixture_fallback",
      read_only: true,
      fixture_fallback: true,
      runtime_connected: false,
      ui_action_transport: "gateway_only",
      frontend_can_authorize: false,
      sandbox_can_bypass_approval: false,
      side_effects: [],
    });
  });

  it("binds the Phase 9 live projection contract to its public fixture", async () => {
    const phase9Fixture = JSON.parse(
      await readFile(
        join(
          process.cwd(),
          "../../fixtures/contracts/phase9-control-center-readback-v1.json",
        ),
        "utf8",
      ),
    );
    expect(controlCenterPhase9ContractFixture).toEqual(phase9Fixture);
  });

  it.each([
    ["prepared", "active", true, false, null, "fresh", "prepared"],
    ["prepared", "expired", false, false, null, "fresh", "expired"],
    ["dispatching", "consumed", false, true, null, "fresh", "receipt_pending"],
    ["outcome_unknown", "consumed", false, true, null, "fresh", "unknown"],
    ["completed", "consumed", false, true, "receipt", "fresh", "completed"],
    ["completed", "consumed", false, true, null, "degraded", "unknown"],
    ["failed", "consumed", false, true, null, "fresh", "failed"],
  ] as const)(
    "maps %s Gateway evidence without inventing success or non-execution",
    (
      operationState,
      authorizationState,
      active,
      withAttempt,
      receipt,
      status,
      presentation,
    ) => {
      const projected = projectControlCenterLiveGatewayEvidenceV1(
        liveEvidence(operationState, authorizationState, active, withAttempt, receipt),
      );
      expect(projected).toMatchObject({
        source_kind: "live_gateway",
        observation_status: status,
        presentation_state: presentation,
        read_only: true,
        runtime_authority: false,
        action_authority: false,
        retry_available: false,
        non_execution_confirmed: false,
      });
      expect(projected.success_confirmed).toBe(presentation === "completed");
    },
  );

  it("maps only explicit in-progress reconciliation to reconciling", () => {
    const evidence = liveEvidence("outcome_unknown", "consumed", false, true, null);
    evidence.operation.reconciliation = {
      reconciliation_id: "rec_fixture",
      status: "in_progress",
      recorded_at: "2026-08-14T12:00:01.000Z",
    };
    expect(projectControlCenterLiveGatewayEvidenceV1(evidence).presentation_state).toBe(
      "reconciling",
    );
    evidence.operation.reconciliation.status = "matched";
    expect(projectControlCenterLiveGatewayEvidenceV1(evidence).presentation_state).toBe(
      "unknown",
    );
  });

  it("degrades and hides every live field on scope mismatch", () => {
    const evidence = liveEvidence("completed", "consumed", false, true, "receipt");
    if (evidence.attempt === null) throw new Error("attempt fixture missing");
    evidence.attempt.resource_ref = "resource:other";
    const projected = projectControlCenterLiveGatewayEvidenceV1(evidence);
    expect(projected).toMatchObject({
      observation_status: "degraded",
      presentation_state: "unknown",
      scope: null,
      authorization: null,
      operation: null,
      attempt: null,
      receipt: null,
      reconciliation: null,
      success_confirmed: false,
      non_execution_confirmed: false,
    });
  });

  it("accepts a newer state for the same immutable attempt identity", () => {
    const evidence = liveEvidence("dispatching", "consumed", false, true, null);
    if (evidence.attempt === null || evidence.operation.attempt === null) {
      throw new Error("attempt fixture missing");
    }
    evidence.attempt.state = "completed";
    evidence.attempt.state_effective_at = "2026-08-14T12:00:01.000Z";

    expect(projectControlCenterLiveGatewayEvidenceV1(evidence)).toMatchObject({
      observation_status: "fresh",
      presentation_state: "receipt_pending",
      attempt: { state: "completed" },
    });
  });

  it("keeps prior live evidence only as an in-memory stale overlay", () => {
    const fresh = projectControlCenterLiveGatewayEvidenceV1(
      liveEvidence("completed", "consumed", false, true, "receipt"),
    );
    const stale = markControlCenterLiveProjectionStaleV1(
      fresh,
      "2026-08-14T12:05:00.000Z",
      "control_center.live.transport_unavailable",
    );
    expect(stale.observation_status).toBe("stale");
    expect(stale.operation).toEqual(fresh.operation);
    expect(stale.refresh_failure).toBe("control_center.live.transport_unavailable");
    expect(
      unavailableControlCenterLiveProjectionV1(
        "2026-08-14T12:05:00.000Z",
        "unavailable",
        "control_center.live.transport_unavailable",
      ),
    ).toMatchObject({ operation: null, presentation_state: "unknown" });
  });

  it("keeps synthetic fixture and live evidence discriminated and separate", () => {
    const synthetic = projectControlCenterSyntheticFixtureV1();
    const live = projectControlCenterLiveGatewayEvidenceV1(
      liveEvidence("prepared", "active", true, false, null),
    );
    expect(synthetic.source_kind).toBe("synthetic_fixture");
    expect(synthetic.fixture).toEqual(controlCenterOperationFixture);
    expect(live.source_kind).toBe("live_gateway");
    expect("fixture" in live).toBe(false);
  });
});

function liveEvidence(
  operationState: ControlCenterLiveGatewayEvidenceV1["operation"]["state"],
  authorizationState: ControlCenterLiveGatewayEvidenceV1["authorization"]["state"],
  active: boolean,
  withAttempt: boolean,
  receipt: "receipt" | null,
): ControlCenterLiveGatewayEvidenceV1 {
  const attempt = withAttempt
    ? {
        operation_attempt_id: "opa_fixture",
        operation_id: "opn_fixture",
        project_ref: "project:fixture",
        resource_ref: "resource:fixture",
        state:
          operationState === "prepared" ? ("dispatching" as const) : operationState,
        state_effective_at: "2026-08-14T12:00:00.000Z",
        adapter_ref: "adapter:local:git-commit",
        protocol_version: "v1",
      }
    : null;
  return {
    source_contract: "lnsat.gateway.runtime_composition.v1_0",
    source_contract_version: "lnsat.contracts.v1_0",
    observed_at: "2026-08-14T12:00:02.000Z",
    authorization: {
      authorization_id: "xau_fixture",
      project_ref: "project:fixture",
      resource_ref: "resource:fixture",
      state: authorizationState,
      active,
      issued_at: "2026-08-14T11:59:00.000Z",
      expires_at: "2026-08-14T12:01:00.000Z",
      approval_decision_id: "apd_fixture",
      policy_decision_id: "pol_fixture",
      packet_id: "pkt_fixture",
      requester_ref: "identity:human:operator",
      requester_session_ref: "session:local:requester",
      approver_ref: "identity:human:owner",
      approver_session_ref: "session:local:owner",
      operation_id: "opn_fixture",
    },
    operation: {
      operation_id: "opn_fixture",
      authorization_id: "xau_fixture",
      project_ref: "project:fixture",
      resource_ref: "resource:fixture",
      state: operationState,
      state_effective_at: "2026-08-14T12:00:00.000Z",
      attempt: attempt === null ? null : { ...attempt },
      receipt:
        receipt === null
          ? null
          : {
              receipt_id: "rcp_fixture",
              received_at: "2026-08-14T12:00:01.000Z",
            },
      reconciliation: null,
    },
    attempt,
  };
}
