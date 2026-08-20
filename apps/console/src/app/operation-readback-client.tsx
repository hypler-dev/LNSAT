"use client";

import * as React from "react";
import {
  applyControlCenterLiveLoadResultV1,
  isExactOperationIdV1,
  isCurrentControlCenterLiveLoadV1,
  loadControlCenterLiveOperationV1,
  operationIdForExplicitLoadV1,
  retainControlCenterLiveStateForInputV1,
  type ControlCenterLiveClientStateV1,
} from "../lib/control-center-live-readback.js";

const EMPTY_STATE: ControlCenterLiveClientStateV1 = {
  snapshot: null,
  last_failure: null,
};

export function OperationReadbackClient(): React.ReactElement {
  const [operationId, setOperationId] = React.useState("");
  const operationIdRef = React.useRef("");
  const [state, setState] = React.useState(EMPTY_STATE);
  const [loading, setLoading] = React.useState(false);
  const [inputError, setInputError] = React.useState<string | null>(null);

  async function load(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (loading) return;
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
    const result = await loadControlCenterLiveOperationV1(selectedOperationId);
    if (isCurrentControlCenterLiveLoadV1(selectedOperationId, operationIdRef.current)) {
      setState((previous) =>
        applyControlCenterLiveLoadResultV1(previous, result, selectedOperationId),
      );
    }
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
        <span>authenticated · same origin · read only</span>
      </div>
      <form onSubmit={load}>
        <label htmlFor="live-operation-id">Exact operation ID</label>{" "}
        <input
          aria-describedby="live-operation-help"
          autoComplete="off"
          disabled={loading}
          id="live-operation-id"
          onChange={updateOperationId}
          spellCheck={false}
          type="text"
          value={operationId}
        />{" "}
        <button disabled={loading} type="submit">
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
