"use client";

import * as React from "react";
import {
  applyControlCenterLiveLoadResultV1,
  discardControlCenterLocalSessionRefsV1,
  issueControlCenterLocalSessionV1,
  isExactOperationIdV1,
  isCurrentControlCenterLiveLoadV1,
  loadControlCenterLiveOperationV1,
  operationIdForExplicitLoadV1,
  retainControlCenterLiveStateForInputV1,
  type ControlCenterLiveClientStateV1,
  type ControlCenterLocalSessionV1,
} from "../lib/control-center-live-readback.js";

const EMPTY_STATE: ControlCenterLiveClientStateV1 = {
  snapshot: null,
  last_failure: null,
};

export function OperationReadbackClient(): React.ReactElement {
  const sessionRef = React.useRef<ControlCenterLocalSessionV1 | null>(null);
  const sessionEpochRef = React.useRef(0);
  const activeRequestRef = React.useRef<AbortController | null>(null);
  const [sessionState, setSessionState] = React.useState<
    "unauthenticated" | "issuing" | "ready" | "failed"
  >("unauthenticated");
  const [sessionError, setSessionError] = React.useState<string | null>(null);
  const [identityRef, setIdentityRef] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [operationId, setOperationId] = React.useState("");
  const operationIdRef = React.useRef("");
  const [state, setState] = React.useState(EMPTY_STATE);
  const [loading, setLoading] = React.useState(false);
  const [inputError, setInputError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const page = globalThis as unknown as {
      addEventListener(type: "pagehide", listener: () => void): void;
      removeEventListener(type: "pagehide", listener: () => void): void;
    };
    const discardOnPageHide = (): void => {
      discardControlCenterLocalSessionRefsV1(
        sessionRef,
        sessionEpochRef,
        activeRequestRef,
      );
      setLoading(false);
      setState(EMPTY_STATE);
      setSessionError(null);
      setSessionState("unauthenticated");
    };
    page.addEventListener("pagehide", discardOnPageHide);
    return () => {
      page.removeEventListener("pagehide", discardOnPageHide);
      discardControlCenterLocalSessionRefsV1(
        sessionRef,
        sessionEpochRef,
        activeRequestRef,
      );
    };
  }, []);

  function discardLocalSession(message: string | null = null): void {
    discardControlCenterLocalSessionRefsV1(
      sessionRef,
      sessionEpochRef,
      activeRequestRef,
    );
    setLoading(false);
    setState(EMPTY_STATE);
    setInputError(null);
    setSessionError(message);
    setSessionState(message === null ? "unauthenticated" : "failed");
  }

  async function startSession(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (sessionState === "issuing") return;
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const issueEpoch = sessionEpochRef.current + 1;
    sessionEpochRef.current = issueEpoch;
    sessionRef.current = null;
    setState(EMPTY_STATE);
    setInputError(null);
    setSessionError(null);
    setSessionState("issuing");
    const requestPassword = password;
    setPassword("");
    const result = await issueControlCenterLocalSessionV1(
      identityRef,
      requestPassword,
      { signal: controller.signal },
    );
    if (sessionEpochRef.current !== issueEpoch) return;
    activeRequestRef.current = null;
    if (!result.ok) {
      sessionRef.current = null;
      setSessionState("failed");
      setSessionError(
        "Could not start local session. Check credentials and try again.",
      );
      return;
    }
    sessionRef.current = result.session;
    setSessionState("ready");
  }

  async function load(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (loading) return;
    const session = sessionRef.current;
    if (session === null || sessionState !== "ready") {
      setInputError("Start a local session before loading evidence.");
      return;
    }
    const selectedOperationId = operationIdForExplicitLoadV1(
      operationId,
      currentLocationHashV1(),
    );
    if (!isExactOperationIdV1(selectedOperationId)) {
      setInputError("Paste one exact opn_ identifier.");
      return;
    }
    operationIdRef.current = selectedOperationId;
    setOperationId(selectedOperationId);
    setInputError(null);
    setLoading(true);
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const requestEpoch = sessionEpochRef.current;
    const result = await loadControlCenterLiveOperationV1(selectedOperationId, {
      session,
      signal: controller.signal,
    });
    if (
      sessionEpochRef.current !== requestEpoch ||
      sessionRef.current !== session ||
      !isCurrentControlCenterLiveLoadV1(selectedOperationId, operationIdRef.current)
    ) {
      return;
    }
    activeRequestRef.current = null;
    if (!result.ok && result.failure.code === "control_center.live.http_403") {
      discardLocalSession("Local session expired. Sign in again.");
      return;
    }
    setState((previous) =>
      applyControlCenterLiveLoadResultV1(previous, result, selectedOperationId),
    );
    setLoading(false);
  }

  function updateOperationId(event: React.ChangeEvent<HTMLInputElement>): void {
    const nextOperationId = (event.currentTarget as unknown as { value: string }).value;
    operationIdRef.current = nextOperationId;
    setOperationId(nextOperationId);
    setInputError(null);
    setState((previous) =>
      retainControlCenterLiveStateForInputV1(previous, nextOperationId),
    );
  }

  const snapshot = state.snapshot;
  return (
    <section className="panel" aria-label="Live Gateway operation evidence">
      <div className="panel-head">
        <h2>Live Gateway evidence</h2>
        <span>local session · same origin · evidence reads</span>
      </div>
      <div className="session-panel" aria-label="Local browser session">
        {sessionState === "ready" ? (
          <>
            <p aria-live="polite">Local session active in this tab.</p>
            <button type="button" onClick={() => discardLocalSession()}>
              Forget local session
            </button>
            <p>
              Browser-held access clears here. The server session expires on schedule.
            </p>
          </>
        ) : (
          <form onSubmit={startSession}>
            <label htmlFor="local-identity-ref">Local identity</label>{" "}
            <input
              autoCapitalize="none"
              autoComplete="username"
              disabled={sessionState === "issuing"}
              id="local-identity-ref"
              onChange={(event) =>
                setIdentityRef(
                  (event.currentTarget as unknown as { value: string }).value,
                )
              }
              spellCheck={false}
              type="text"
              value={identityRef}
            />{" "}
            <label htmlFor="local-password">Password</label>{" "}
            <input
              autoComplete="current-password"
              disabled={sessionState === "issuing"}
              id="local-password"
              onChange={(event) =>
                setPassword((event.currentTarget as unknown as { value: string }).value)
              }
              type="password"
              value={password}
            />{" "}
            <button disabled={sessionState === "issuing"} type="submit">
              {sessionState === "issuing"
                ? "Starting local session…"
                : "Start local session"}
            </button>
            <p>Session secrets stay only in this tab and clear when the page closes.</p>
          </form>
        )}
        {sessionError === null ? null : <p role="alert">{sessionError}</p>}
      </div>
      <form onSubmit={load}>
        <label htmlFor="live-operation-id">Exact operation ID</label>{" "}
        <input
          aria-describedby="live-operation-help"
          autoComplete="off"
          disabled={loading || sessionState !== "ready"}
          id="live-operation-id"
          onChange={updateOperationId}
          spellCheck={false}
          type="text"
          value={operationId}
        />{" "}
        <button disabled={loading || sessionState !== "ready"} type="submit">
          {loading
            ? "Loading…"
            : snapshot?.operation === null || snapshot === null
              ? "Load"
              : "Refresh"}
        </button>
        <p id="live-operation-help">
          Manual only. Fragment form: /operations#operation=&lt;exact-id&gt;. No
          polling, history, storage, or retry action.
        </p>
      </form>
      {inputError === null ? null : <p role="alert">{inputError}</p>}
      {snapshot === null ? (
        <p>
          No live snapshot loaded. Gateway evidence unavailable until explicit load.
        </p>
      ) : (
        <LiveSnapshot snapshot={snapshot} />
      )}
    </section>
  );
}

function currentLocationHashV1(): string {
  const hash = (globalThis as { location?: { hash?: unknown } }).location?.hash;
  return typeof hash === "string" ? hash : "";
}

function LiveSnapshot({
  snapshot,
}: {
  snapshot: NonNullable<ControlCenterLiveClientStateV1["snapshot"]>;
}): React.ReactElement {
  return (
    <div aria-live="polite">
      <p>
        <strong>{snapshot.presentation_state}</strong> · {snapshot.observation_status}
      </p>
      <dl>
        <dt>Provenance</dt>
        <dd>{snapshot.provenance}</dd>
        <dt>Source contract</dt>
        <dd>
          {snapshot.source_contract} · {snapshot.source_contract_version}
        </dd>
        <dt>Observed locally</dt>
        <dd>{snapshot.observed_at}</dd>
        <dt>Session evidence</dt>
        <dd>{snapshot.session_activity_evidence}</dd>
        <dt>Project / resource</dt>
        <dd>
          {snapshot.scope === null
            ? "hidden: unavailable or contract/scope mismatch"
            : `${snapshot.scope.project_ref} / ${snapshot.scope.resource_ref}`}
        </dd>
        <dt>Authorization</dt>
        <dd>
          {snapshot.authorization === null
            ? "unavailable"
            : `${snapshot.authorization.authorization_id} · ${snapshot.authorization.state}`}
        </dd>
        <dt>Operation</dt>
        <dd>
          {snapshot.operation === null
            ? "unavailable"
            : `${snapshot.operation.operation_id} · ${snapshot.operation.state}`}
        </dd>
        <dt>Attempt</dt>
        <dd>
          {snapshot.attempt === null
            ? "none"
            : `${snapshot.attempt.operation_attempt_id} · ${snapshot.attempt.state}`}
        </dd>
        <dt>Receipt</dt>
        <dd>{snapshot.receipt?.receipt_id ?? "none"}</dd>
        <dt>Reconciliation</dt>
        <dd>{snapshot.reconciliation?.status ?? "none"}</dd>
      </dl>
      {snapshot.refresh_failure === null ? null : (
        <p role="alert">Refresh failure: {snapshot.refresh_failure}</p>
      )}
      <p>
        Read only: {String(snapshot.read_only)}. Runtime/action authority: false. Retry:
        unavailable. Failure never confirms non-execution.
      </p>
    </div>
  );
}
