import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OperationReadbackClient } from "./operation-readback-client.js";
import {
  applyControlCenterLiveLoadResultV1,
  isCurrentControlCenterLiveLoadV1,
  loadControlCenterLiveOperationV1,
  operationIdForExplicitLoadV1,
  operationIdFromFragmentV1,
  retainControlCenterLiveStateForInputV1,
  type ControlCenterFetchV1,
} from "../lib/control-center-live-readback.js";

const operationId = `opn_${"a".repeat(64)}`;
const authorizationId = `xau_${"b".repeat(64)}`;
const attemptId = `opa_${"c".repeat(64)}`;
const now = () => new Date("2026-08-14T12:00:02.000Z");

describe("Phase 9 operation readback client", () => {
  it("accepts only exact client-side operation fragments", () => {
    expect(operationIdFromFragmentV1(`#operation=${operationId}`)).toBe(operationId);
    expect(operationIdForExplicitLoadV1("", `#operation=${operationId}`)).toBe(
      operationId,
    );
    expect(operationIdForExplicitLoadV1(operationId, "#operation=opn_short")).toBe(
      operationId,
    );
    for (const fragment of [
      "",
      `#operation=opn%5F${"a".repeat(64)}`,
      `#operation=${operationId}&other=1`,
      `#other=${operationId}`,
      "#operation=opn_short",
      `#operation=${operationId.toUpperCase()}`,
    ]) {
      expect(operationIdFromFragmentV1(fragment)).toBe("");
    }
  });

  it("loads exact operation then authorization using relative same-origin GETs", async () => {
    const fetch = responseSequence([
      okJson(operationEnvelope("prepared", null, null)),
      okJson(authorizationEnvelope("active", true)),
    ]);
    const result = await loadControlCenterLiveOperationV1(operationId, { fetch, now });
    expect(result).toMatchObject({
      ok: true,
      snapshot: {
        observation_status: "fresh",
        presentation_state: "prepared",
        session_activity_evidence: "may_append",
        read_only: true,
        runtime_authority: false,
        action_authority: false,
      },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      `/v1/operations/${operationId}`,
      `/v1/execution-authorizations/${authorizationId}`,
    ]);
    for (const [path, init] of fetch.mock.calls) {
      expect(path.startsWith("/")).toBe(true);
      expect(path).not.toContain("://");
      expect(init).toMatchObject({
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        headers: {
          Accept: "application/json",
          "LNSAT-Contract-Version": "lnsat.contracts.v1_0",
        },
      });
    }
  });

  it("fetches an attempt only when operation evidence supplies its exact ID", async () => {
    const attempt = attemptValue("dispatching");
    const fetch = responseSequence([
      okJson(operationEnvelope("dispatching", attempt, null)),
      okJson(authorizationEnvelope("consumed", false)),
      okJson({
        contract: "lnsat.gateway.runtime_composition.v1_0",
        status: "ok",
        attempt,
      }),
    ]);
    const result = await loadControlCenterLiveOperationV1(operationId, { fetch, now });
    expect(result).toMatchObject({
      ok: true,
      snapshot: {
        presentation_state: "receipt_pending",
        attempt: { operation_attempt_id: attemptId },
      },
    });
    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      `/v1/operations/${operationId}`,
      `/v1/execution-authorizations/${authorizationId}`,
      `/v1/operations/${operationId}/attempts/${attemptId}`,
    ]);
  });

  it("accepts a newer exact attempt snapshot returned after the operation snapshot", async () => {
    const operationAttempt = attemptValue("dispatching");
    const currentAttempt = {
      ...attemptValue("completed"),
      state_event_id: "state:attempt-completed",
      state_audit_binding_id: "audit:attempt-completed",
      state_sequence: 2,
      state_effective_at: "2026-08-14T12:00:01.000Z",
    };
    const fetch = responseSequence([
      okJson(operationEnvelope("dispatching", operationAttempt, null)),
      okJson(authorizationEnvelope("consumed", false)),
      okJson({
        contract: "lnsat.gateway.runtime_composition.v1_0",
        status: "ok",
        attempt: currentAttempt,
      }),
    ]);

    const result = await loadControlCenterLiveOperationV1(operationId, { fetch, now });

    expect(result).toMatchObject({
      ok: true,
      snapshot: {
        observation_status: "fresh",
        presentation_state: "receipt_pending",
        attempt: { operation_attempt_id: attemptId, state: "completed" },
      },
    });
  });

  it("degrades malformed, extra-field, contract, and exact-scope mismatches", async () => {
    const malformedCases = [
      { ...operationEnvelope("prepared", null, null), extra: true },
      { ...operationEnvelope("prepared", null, null), contract: "unknown" },
      { contract: "lnsat.gateway.runtime_composition.v1_0", status: "ok" },
    ];
    for (const value of malformedCases) {
      const result = await loadControlCenterLiveOperationV1(operationId, {
        fetch: responseSequence([okJson(value)]),
        now,
      });
      expect(result).toMatchObject({ ok: false, failure: { kind: "degraded" } });
    }

    const wrongScope = authorizationEnvelope("active", true);
    wrongScope.authorization.resource_ref = "resource:other";
    const scopeResult = await loadControlCenterLiveOperationV1(operationId, {
      fetch: responseSequence([
        okJson(operationEnvelope("prepared", null, null)),
        okJson(wrongScope),
      ]),
      now,
    });
    expect(scopeResult).toMatchObject({
      ok: false,
      failure: { kind: "degraded", code: "control_center.live.scope_mismatch" },
    });
  });

  it("keeps timeout, abort, missing response, invalid JSON, 403, and 503 non-successful", async () => {
    const failures: ControlCenterFetchV1[] = [
      vi.fn(async () => {
        throw new Error("timeout");
      }),
      vi.fn(async () => {
        throw new DOMException("aborted", "AbortError");
      }),
      vi.fn(async () => undefined as never),
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("invalid JSON");
        },
      })),
      vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) })),
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    ];
    for (const fetch of failures) {
      const result = await loadControlCenterLiveOperationV1(operationId, {
        fetch,
        now,
      });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("failure fixture unexpectedly succeeded");
      expect(result.failure.kind).toMatch(/degraded|unavailable/);
    }
  });

  it("bounds a non-settling read, aborts its owned signal, and leaves stale evidence refreshable", async () => {
    vi.useFakeTimers();
    try {
      let requestSignal: AbortSignal | undefined;
      const fetch = vi.fn<ControlCenterFetchV1>((_input, init) => {
        requestSignal = init.signal ?? undefined;
        return new Promise(() => {});
      });
      const pending = loadControlCenterLiveOperationV1(operationId, { fetch, now });
      await vi.advanceTimersByTimeAsync(10_000);
      const result = await pending;

      expect(result).toMatchObject({
        ok: false,
        failure: {
          kind: "unavailable",
          code: "control_center.live.transport_unavailable",
        },
      });
      expect(requestSignal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(fetch).toHaveBeenCalledTimes(1);

      const loaded = await loadControlCenterLiveOperationV1(operationId, {
        fetch: responseSequence([
          okJson(operationEnvelope("prepared", null, null)),
          okJson(authorizationEnvelope("active", true)),
        ]),
        now,
      });
      if (!loaded.ok) throw new Error("live fixture should load");
      const stale = applyControlCenterLiveLoadResultV1(
        { snapshot: loaded.snapshot, last_failure: null },
        result,
        operationId,
      );
      expect(stale).toMatchObject({
        snapshot: { observation_status: "stale" },
        last_failure: "control_center.live.transport_unavailable",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("bounds a non-settling response body and preserves caller cancellation", async () => {
    vi.useFakeTimers();
    try {
      let bodySignal: AbortSignal | undefined;
      const bodyPending = loadControlCenterLiveOperationV1(operationId, {
        fetch: vi.fn<ControlCenterFetchV1>((_input, init) => {
          bodySignal = init.signal ?? undefined;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => new Promise(() => {}),
          });
        }),
        now,
      });
      await vi.advanceTimersByTimeAsync(10_000);
      await expect(bodyPending).resolves.toMatchObject({
        ok: false,
        failure: {
          kind: "unavailable",
          code: "control_center.live.transport_unavailable",
        },
      });
      expect(bodySignal?.aborted).toBe(true);

      const caller = new AbortController();
      const removeAbortListener = vi.spyOn(caller.signal, "removeEventListener");
      let callerSignal: AbortSignal | undefined;
      const callerPending = loadControlCenterLiveOperationV1(operationId, {
        fetch: vi.fn<ControlCenterFetchV1>((_input, init) => {
          callerSignal = init.signal ?? undefined;
          return new Promise(() => {});
        }),
        now,
        signal: caller.signal,
      });
      caller.abort();
      await expect(callerPending).resolves.toMatchObject({
        ok: false,
        failure: {
          kind: "unavailable",
          code: "control_center.live.transport_unavailable",
        },
      });
      expect(callerSignal?.aborted).toBe(true);
      expect(removeAbortListener).toHaveBeenCalledWith("abort", expect.any(Function));

      const preAborted = new AbortController();
      preAborted.abort();
      const preAbortedFetch = vi.fn<ControlCenterFetchV1>();
      await expect(
        loadControlCenterLiveOperationV1(operationId, {
          fetch: preAbortedFetch,
          now,
          signal: preAborted.signal,
        }),
      ).resolves.toMatchObject({
        ok: false,
        failure: {
          kind: "unavailable",
          code: "control_center.live.transport_unavailable",
        },
      });
      expect(preAbortedFetch).not.toHaveBeenCalled();

      const successfulCaller = new AbortController();
      const removeSuccessListener = vi.spyOn(
        successfulCaller.signal,
        "removeEventListener",
      );
      const success = await loadControlCenterLiveOperationV1(operationId, {
        fetch: responseSequence([
          okJson(operationEnvelope("prepared", null, null)),
          okJson(authorizationEnvelope("active", true)),
        ]),
        now,
        signal: successfulCaller.signal,
      });
      expect(success.ok).toBe(true);
      expect(removeSuccessListener).toHaveBeenCalledWith("abort", expect.any(Function));
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retains a prior live snapshot as stale and never substitutes fixtures", async () => {
    const loaded = await loadControlCenterLiveOperationV1(operationId, {
      fetch: responseSequence([
        okJson(operationEnvelope("prepared", null, null)),
        okJson(authorizationEnvelope("active", true)),
      ]),
      now,
    });
    if (!loaded.ok) throw new Error("live fixture should load");
    const failed = {
      ok: false,
      failure: {
        kind: "unavailable" as const,
        code: "control_center.live.http_503",
        observed_at: "2026-08-14T12:05:00.000Z",
      },
    } as const;
    const stale = applyControlCenterLiveLoadResultV1(
      { snapshot: loaded.snapshot, last_failure: null },
      failed,
      operationId,
    );
    expect(stale.snapshot).toMatchObject({
      source_kind: "live_gateway",
      observation_status: "stale",
      operation: { operation_id: operationId },
    });
    expect(stale.snapshot).not.toHaveProperty("fixture");

    const unavailable = applyControlCenterLiveLoadResultV1(
      { snapshot: null, last_failure: null },
      failed,
      operationId,
    );
    expect(unavailable.snapshot).toMatchObject({
      source_kind: "live_gateway",
      observation_status: "unavailable",
      operation: null,
      authorization: null,
      scope: null,
    });

    const otherOperationId = `opn_${"d".repeat(64)}`;
    const crossOperationFailure = applyControlCenterLiveLoadResultV1(
      { snapshot: loaded.snapshot, last_failure: null },
      failed,
      otherOperationId,
    );
    expect(crossOperationFailure.snapshot).toMatchObject({
      observation_status: "unavailable",
      operation: null,
      authorization: null,
      scope: null,
    });
  });

  it("clears evidence on input divergence and rejects late cross-input loads", async () => {
    const loaded = await loadControlCenterLiveOperationV1(operationId, {
      fetch: responseSequence([
        okJson(operationEnvelope("prepared", null, null)),
        okJson(authorizationEnvelope("active", true)),
      ]),
      now,
    });
    if (!loaded.ok) throw new Error("live fixture should load");
    const previous = { snapshot: loaded.snapshot, last_failure: null };
    const otherOperationId = `opn_${"d".repeat(64)}`;

    expect(retainControlCenterLiveStateForInputV1(previous, operationId)).toBe(
      previous,
    );
    expect(retainControlCenterLiveStateForInputV1(previous, otherOperationId)).toEqual({
      snapshot: null,
      last_failure: null,
    });
    expect(isCurrentControlCenterLiveLoadV1(operationId, operationId)).toBe(true);
    expect(isCurrentControlCenterLiveLoadV1(operationId, otherOperationId)).toBe(false);
  });

  it("mounts idle without fetching or automatic refresh behavior", () => {
    const html = renderToStaticMarkup(React.createElement(OperationReadbackClient));
    expect(html).toContain("Live Gateway evidence");
    expect(html).toContain("No live snapshot loaded");
    expect(html).toContain("Manual only");

    const source = [OperationReadbackClient, loadControlCenterLiveOperationV1]
      .map((value) => value.toString())
      .join("\n");
    for (const forbidden of [
      "useEffect(",
      "setInterval(",
      "addEventListener(",
      "visibilitychange",
      "localStorage",
      "sessionStorage",
      "retryExact",
      "/retry",
      "/reconcile",
      "/cancel",
      "/execute",
      "/receipt",
      "/search",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});

function responseSequence(values: Array<ReturnType<typeof okJson>>) {
  return vi.fn<ControlCenterFetchV1>(async () => {
    const next = values.shift();
    if (next === undefined) throw new Error("unexpected fetch");
    return next;
  });
}

function okJson(value: unknown) {
  return { ok: true, status: 200, json: async () => structuredClone(value) };
}

function operationEnvelope(
  state: "prepared" | "dispatching" | "completed" | "failed" | "outcome_unknown",
  attempt: ReturnType<typeof attemptValue> | null,
  receipt: { receipt_id: string; received_at: string } | null,
) {
  return {
    contract: "lnsat.gateway.runtime_composition.v1_0",
    status: "ok",
    operation: {
      operation_id: operationId,
      operation_audit_binding_id: "audit:operation",
      authorization_id: authorizationId,
      consumption_id: state === "prepared" ? null : "cap_fixture",
      project_ref: "project:fixture",
      resource_ref: "resource:fixture",
      state_event_id: "state:operation",
      state_audit_binding_id: "audit:operation-state",
      state_sequence: state === "prepared" ? 0 : 1,
      state,
      state_effective_at: "2026-08-14T12:00:00.000Z",
      attempt,
      receipt,
      reconciliation: null,
    },
  };
}

function authorizationEnvelope(
  state: "active" | "consumed" | "cancelled" | "revoked" | "expired",
  active: boolean,
) {
  return {
    contract: "lnsat.gateway.runtime_composition.v1_0",
    status: "ok",
    authorization: {
      authorization_id: authorizationId,
      audit_binding_id: "audit:authorization",
      project_ref: "project:fixture",
      resource_ref: "resource:fixture",
      authorization_attempt_id: "aat_fixture",
      nonce_id: "nonce_fixture",
      binding_digest: `sha256:${"1".repeat(64)}`,
      approval_decision_id: "apd_fixture",
      policy_decision_id: "pol_fixture",
      packet_id: "pkt_fixture",
      packet_sha256: `sha256:${"2".repeat(64)}`,
      requester_ref: "identity:human:operator",
      requester_session_ref: "session:local:requester",
      approver_ref: "identity:human:owner",
      approver_session_ref: "session:local:owner",
      action_digest: `sha256:${"3".repeat(64)}`,
      target_digest: `sha256:${"4".repeat(64)}`,
      configuration_digest: `sha256:${"5".repeat(64)}`,
      adapter_ref: "adapter:local:git-commit",
      executable_digest: `sha256:${"6".repeat(64)}`,
      audience: "lnsatd:local",
      authorization_profile: "local-v1",
      issued_at: "2026-08-14T11:59:00.000Z",
      expires_at: "2026-08-14T12:01:00.000Z",
      state_event_id: "state:authorization",
      state_audit_binding_id: "audit:authorization-state",
      state_sequence: state === "active" ? 0 : 1,
      state,
      state_effective_at: "2026-08-14T12:00:00.000Z",
      active,
      operation_id: operationId,
      operation_audit_binding_id: "audit:operation",
      operation_idempotency_key: "idempotency:fixture",
      operation_request_digest: `sha256:${"7".repeat(64)}`,
    },
  };
}

function attemptValue(
  state: "dispatching" | "completed" | "failed" | "outcome_unknown",
) {
  return {
    operation_attempt_id: attemptId,
    audit_binding_id: "audit:attempt",
    operation_id: operationId,
    project_ref: "project:fixture",
    resource_ref: "resource:fixture",
    attempt_sequence: 1,
    adapter_ref: "adapter:local:git-commit",
    protocol_version: "v1",
    tool_arguments_digest: `sha256:${"8".repeat(64)}`,
    created_at: "2026-08-14T12:00:00.000Z",
    state_event_id: "state:attempt",
    state_audit_binding_id: "audit:attempt-state",
    state_sequence: 1,
    state,
    state_effective_at: "2026-08-14T12:00:00.000Z",
  };
}
