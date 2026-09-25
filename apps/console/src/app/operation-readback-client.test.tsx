import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OperationReadbackClient } from "./operation-readback-client.js";
import {
  applyControlCenterLiveLoadResultV1,
  discardControlCenterLocalSessionRefsV1,
  issueControlCenterLocalSessionV1,
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
const session = {
  token: `ses_${"d".repeat(32)}.${"e".repeat(64)}`,
  proof: "f".repeat(64),
} as const;

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

  it("issues one volatile header-pair session without ambient credentials", async () => {
    const fetch = responseSequence([
      okJson(
        sessionIssueEnvelope("identity:human:owner"),
        {
          "X-LNSAT-Local-Session-Token": session.token,
          "X-LNSAT-Local-Session-Proof": session.proof,
        },
        201,
      ),
    ]);
    const result = await issueControlCenterLocalSessionV1(
      "identity:human:owner",
      "correct horse battery staple",
      { fetch },
    );

    expect(result).toEqual({ ok: true, session });
    expect(fetch).toHaveBeenCalledOnce();
    const [path, init] = fetch.mock.calls[0] ?? [];
    expect(path).toBe("/v1/session");
    expect(init).toMatchObject({
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "LNSAT-Contract-Version": "lnsat.contracts.v1_0",
        "X-LNSAT-Session-Intent": "lnsat.session.issue.v1",
      },
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      identity_ref: "identity:human:owner",
      password: "correct horse battery staple",
      lifetime_seconds: 300,
    });
  });

  it("rejects absent, malformed, duplicate-shaped, or body-reflected session secrets", async () => {
    const cases: Array<{ headers: Record<string, string>; reflected?: boolean }> = [
      { headers: {} },
      {
        headers: {
          "X-LNSAT-Local-Session-Token": "bad-token",
          "X-LNSAT-Local-Session-Proof": session.proof,
        },
      },
      {
        headers: {
          "X-LNSAT-Local-Session-Token": `${session.token}, ${session.token}`,
          "X-LNSAT-Local-Session-Proof": session.proof,
        },
      },
      {
        headers: {
          "X-LNSAT-Local-Session-Token": session.token,
          "X-LNSAT-Local-Session-Proof": session.proof,
        },
        reflected: true,
      },
    ];
    for (const { headers, reflected = false } of cases) {
      const body = sessionIssueEnvelope("identity:human:owner") as Record<
        string,
        unknown
      >;
      if (reflected) body.raw_secret = session.token;
      const result = await issueControlCenterLocalSessionV1(
        "identity:human:owner",
        "correct horse battery staple",
        { fetch: responseSequence([okJson(body, headers, 201)]) },
      );
      expect(result).toEqual({
        ok: false,
        code: "control_center.session_issue.denied",
      });
    }
  });

  it("loads exact operation then authorization using relative same-origin GETs", async () => {
    const fetch = responseSequence([
      okJson(operationEnvelope("prepared", null, null)),
      okJson(authorizationEnvelope("active", true)),
    ]);
    const result = await loadControlCenterLiveOperationV1(operationId, {
      fetch,
      now,
      session,
    });
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
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        headers: {
          Accept: "application/json",
          "LNSAT-Contract-Version": "lnsat.contracts.v1_0",
          "X-LNSAT-Local-Session-Token": session.token,
          "X-LNSAT-Local-Session-Proof": session.proof,
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
    const result = await loadControlCenterLiveOperationV1(operationId, {
      fetch,
      now,
      session,
    });
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

    const result = await loadControlCenterLiveOperationV1(operationId, {
      fetch,
      now,
      session,
    });

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
        session,
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
      session,
    });
    expect(scopeResult).toMatchObject({
      ok: false,
      failure: { kind: "degraded", code: "control_center.live.scope_mismatch" },
    });

    const attempt = attemptValue("dispatching");
    const wrongAdapter = authorizationEnvelope("consumed", false);
    wrongAdapter.authorization.adapter_ref = "adapter:local:wrong";
    const adapterFetch = responseSequence([
      okJson(operationEnvelope("dispatching", attempt, null)),
      okJson(wrongAdapter),
    ]);
    const adapterResult = await loadControlCenterLiveOperationV1(operationId, {
      fetch: adapterFetch,
      now,
      session,
    });
    expect(adapterResult).toMatchObject({
      ok: false,
      failure: { kind: "degraded", code: "control_center.live.scope_mismatch" },
    });
    expect(adapterFetch).toHaveBeenCalledTimes(2);
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
        session,
      });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("failure fixture unexpectedly succeeded");
      expect(result.failure.kind).toMatch(/degraded|unavailable/);
    }
  });

  it("separates malformed JSON from response-body transport failure", async () => {
    for (const error of [
      new TypeError("body stream failed"),
      new DOMException("body aborted", "AbortError"),
    ]) {
      const result = await loadControlCenterLiveOperationV1(operationId, {
        fetch: vi.fn(async () => ({
          ok: true,
          status: 200,
          json: async () => {
            throw error;
          },
        })),
        now,
        session,
      });
      expect(result).toMatchObject({
        ok: false,
        failure: {
          kind: "unavailable",
          code: "control_center.live.transport_unavailable",
        },
      });
    }
    const invalidJson = await loadControlCenterLiveOperationV1(operationId, {
      fetch: vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("invalid JSON");
        },
      })),
      now,
      session,
    });
    expect(invalidJson).toMatchObject({
      ok: false,
      failure: {
        kind: "degraded",
        code: "control_center.live.invalid_json",
      },
    });
  });

  it("bounds a stalled evidence read and keeps prior evidence refreshable", async () => {
    vi.useFakeTimers();
    try {
      let requestSignal: AbortSignal | undefined;
      const fetch = vi.fn<ControlCenterFetchV1>((_input, init) => {
        requestSignal = init.signal ?? undefined;
        return new Promise(() => {});
      });
      const pending = loadControlCenterLiveOperationV1(operationId, {
        fetch,
        now,
        session,
      });
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
        session,
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

  it("uses one deadline across sequential evidence responses", async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn<ControlCenterFetchV1>((_input, _init) => {
        if (fetch.mock.calls.length === 1) {
          return new Promise((resolve) => {
            setTimeout(
              () => resolve(okJson(operationEnvelope("prepared", null, null))),
              6_000,
            );
          });
        }
        return new Promise(() => {});
      });
      const pending = loadControlCenterLiveOperationV1(operationId, {
        fetch,
        now,
        session,
      });
      await vi.advanceTimersByTimeAsync(10_000);
      await expect(pending).resolves.toMatchObject({
        ok: false,
        failure: {
          kind: "unavailable",
          code: "control_center.live.transport_unavailable",
        },
      });
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("bounds a stalled response body and relays caller cancellation", async () => {
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
        session,
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
        session,
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
          session,
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
        session,
        signal: successfulCaller.signal,
      });
      expect(success.ok).toBe(true);
      expect(removeSuccessListener).toHaveBeenCalledWith("abort", expect.any(Function));
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects malformed local session material before any evidence read", async () => {
    const fetch = vi.fn<ControlCenterFetchV1>();
    const result = await loadControlCenterLiveOperationV1(operationId, {
      fetch,
      now,
      session: { token: "bad", proof: session.proof },
    });
    expect(result).toMatchObject({
      ok: false,
      failure: {
        kind: "unavailable",
        code: "control_center.live.session_invalid",
      },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retains a prior live snapshot as stale and never substitutes fixtures", async () => {
    const loaded = await loadControlCenterLiveOperationV1(operationId, {
      fetch: responseSequence([
        okJson(operationEnvelope("prepared", null, null)),
        okJson(authorizationEnvelope("active", true)),
      ]),
      now,
      session,
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
      session,
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

  it("discards session refs and active work for every wired session-loss path", () => {
    const abort = vi.fn();
    const sessionRef = { current: session as typeof session | null };
    const epochRef = { current: 4 };
    const requestRef = { current: { abort } as { abort(): void } | null };

    discardControlCenterLocalSessionRefsV1(sessionRef, epochRef, requestRef);

    expect(abort).toHaveBeenCalledOnce();
    expect(sessionRef.current).toBeNull();
    expect(requestRef.current).toBeNull();
    expect(epochRef.current).toBe(5);

    const source = OperationReadbackClient.toString();
    expect(
      source.match(/discardControlCenterLocalSessionRefsV1/g)?.length,
    ).toBeGreaterThanOrEqual(3);
    expect(source).toContain('addEventListener("pagehide"');
    expect(source).toContain('failure.code === "control_center.live.http_403"');
  });

  it("mounts idle without fetching or automatic refresh behavior", () => {
    const html = renderToStaticMarkup(React.createElement(OperationReadbackClient));
    expect(html).toContain("Live Gateway evidence");
    expect(html).toContain("Start local session");
    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain("No live snapshot loaded");
    expect(html).toContain("Manual only");

    const source = [OperationReadbackClient, loadControlCenterLiveOperationV1]
      .map((value) => value.toString())
      .join("\n");
    for (const forbidden of [
      "setInterval(",
      "setTimeout(",
      "visibilitychange",
      "beforeunload",
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
    expect(source).toContain('addEventListener("pagehide"');
  });
});

function responseSequence(values: Array<ReturnType<typeof okJson>>) {
  return vi.fn<ControlCenterFetchV1>(async () => {
    const next = values.shift();
    if (next === undefined) throw new Error("unexpected fetch");
    return next;
  });
}

function okJson(
  value: unknown,
  responseHeaders: Record<string, string> = {},
  status = 200,
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name: string) {
        const match = Object.entries(responseHeaders).find(
          ([header]) => header.toLowerCase() === name.toLowerCase(),
        );
        return match?.[1] ?? null;
      },
    },
    json: async () => structuredClone(value),
  };
}

function sessionIssueEnvelope(identity_ref: string) {
  return {
    contract: "lnsat.gateway.session_issue.v1_0",
    contract_version: "lnsat.contracts.v1_0",
    ok: true,
    status: "authenticated",
    session: {
      session_id: `ses_${"d".repeat(32)}`,
      identity_ref,
      role: "owner",
      issued_at: "2026-08-14T12:00:00.000Z",
      expires_at: "2026-08-14T12:05:00.000Z",
    },
    transport: {
      bind_scope: "loopback",
      same_origin_required: true,
      cors_enabled: false,
      session_secret_headers: "returned_once_then_required",
    },
    replay_semantics: "fresh_session_per_success",
    side_effects: [
      "authentication_limiter_advanced",
      "session_evidence_appended",
      "session_security_event_appended",
      "session_secret_headers_returned",
    ],
    session_state_changed: true,
    execution_authority: false,
    mutation_authority: false,
  };
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
