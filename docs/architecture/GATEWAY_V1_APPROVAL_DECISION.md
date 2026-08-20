# Gateway v1 Approval Decision

Status: accepted stable source contract. Implementation is pre-release and
unpublished; no supported product artifact exists.

## Contract

Authenticated terminal-decision surface:

```text
POST /v1/approval-requests/{approval_request_id}/decision
LNSAT-Contract-Version: lnsat.contracts.v1_0
Origin: http://<exact-bound-loopback>
Sec-Fetch-Site: same-origin
Content-Type: application/json
Content-Length: <exact body length>
Cookie: lnsat_session_v1=<bearer>; lnsat_csrf_v1=<csrf>
X-LNSAT-CSRF: <same csrf>

{
  "project_ref": "project:<opaque>",
  "decision": "approved",
  "reason": "approval.operator_approved"
}
```

Response contract is `lnsat.gateway.approval_decision.v1_0`. Stable domain
evidence remains `lnsat.approval_decision.v1_0`, serialized as
`lnsat.approval_decision.schema.v1_0`.

This response replaces experimental
`lnsat.gateway.local_approval_decision.v1_0`. Shapes and side-effect semantics
are intentionally incompatible. Pre-release consumers must migrate atomically;
no compatibility alias, implicit downgrade, or dual response exists.

Route inherits API-wide exact-version gate after numeric loopback peer and
exact bound-Host validation but before route dispatch, authentication, request
lookup, or SQLite work. Every routed response repeats accepted
`LNSAT-Contract-Version`. Version failures remain shared version-family errors
and do not emit accepted-version header.

Request body is one nonempty JSON object, at most 4 KiB, closed to exactly:

- `project_ref`;
- `decision`;
- `reason`.

`decision` accepts only `approved` or `denied`. Approved requires
`approval.operator_approved`. Denied accepts only:

- `approval.operator_denied`;
- `approval.scope_rejected`;
- `approval.evidence_insufficient`;
- `approval.request_superseded`.

`approval_request_id` comes only from validated route path. Caller cannot
supply decision identity, request reference, approver identity, approver
session, decision time, expiry, approval-gate result, side effects, signature,
idempotency key, execution authority, or mutation authority.

Transfer encoding, missing/zero/ambiguous content length, trailing bytes,
non-JSON media type, cross-site or missing Fetch Metadata, Origin drift,
missing/duplicate cookies, invalid route id, or missing/mismatched
double-submit CSRF fail closed. Unsupported methods retain `405` with
`Allow: POST`. No response emits CORS permission headers,
`WWW-Authenticate`, or `Set-Cookie`.

## Authorization And Evidence Binding

Only active human owner or operator sessions with fixed `DecideApproval`
permission may decide. Auditor, agent identities, unauthenticated callers,
revoked sessions, and expired sessions receive same denial as invalid scope,
schema, request, or persistence state.

Approver must differ from original requester. Self-approval is forbidden for
both approved and denied outcomes.

One immediate SQLite transaction:

1. verifies bearer, independent CSRF proof, role, activity, and session
   evidence at one server-owned canonical time;
2. reads pending request under exact project scope;
3. rederives complete request, policy, packet, and evidence chain;
4. requires request inside inherited validity window;
5. derives stable domain decision from authenticated approver identity,
   canonical local-session reference, outcome, reason, and same trusted time;
6. appends one immutable terminal decision or returns exact replay.

Any later authorization, request-chain, self-approval, time, drift, conflict,
or persistence failure rolls back durable session-activity and decision
evidence. No database migration or persistence-model change belongs to this
promotion.

Decision identity binds request, policy, approver, approver session, outcome,
reason, decision time, and inherited expiry. Identity is drift-detection
evidence, not authentication or signature.

## Success And Replay

New evidence returns HTTP `201` with `status: "recorded"`. Exact replay returns
HTTP `200` with `status: "replayed"`. Both are secret-free and include:

- contract and accepted wire version;
- `ok: true` and `scope: "terminal_approval_decision"`;
- unchanged nested stable domain decision;
- local-session authorization, CSRF, request binding, and distinct-human proof;
- `replay_semantics:
"immutable_terminal_content_bound_server_owned_time"`;
- `approval_recorded: true`;
- `server_signed: false`;
- `session_authority_state_changed: false`;
- `execution_authorized: false`;
- `mutation_authority: false`.

Recorded response declares:

1. `authentication_limiter_advanced`;
2. `session_activity_evidence_may_append`;
3. `approval_decision_evidence_appended`.

Replay declares only:

1. `authentication_limiter_advanced`;
2. `session_activity_evidence_may_append`.

Recorded sets `approval_decision_state_changed: true`; replay sets it `false`.
Nested `decision.side_effects` remains empty because domain derivation performs
no write. Outer effects describe authenticated Gateway composition.

One request receives exactly one immutable terminal outcome:

- identical derived decision identity at identical server-owned time returns
  exact replay and appends no second decision;
- different time, outcome, reason, approver, or session after terminal
  decision conflicts and receives generic denial;
- caller-controlled idempotency keys remain forbidden.

Approved evidence may set `approval_gate_satisfied: true`. Denied evidence sets
it `false`. Both preserve `server_signed: false`,
`execution_authorized: false`, `session_authority_state_changed: false`, and
`mutation_authority: false`.

Approval-gate satisfaction is evidence state only. It grants no execution,
packet, action, adapter, or runtime capability.

Phase 7a's optional signed-evidence contract foundation
[signed approval-evidence design](ADR-0004_PHASE_7_SIGNED_APPROVAL_EVIDENCE.md)
adds a parallel immutable wrapper over the fully rederived v1 chain. It does
not change this route, response, nested decision, database record, or
`server_signed: false` field. No implicit unsigned-to-signed upgrade exists.

## Failure

Every in-contract transport, authentication, role, human-identity, CSRF,
schema, route-id, project, request-chain, self-approval, time,
terminal-conflict, drift, or persistence failure returns same HTTP `403`:

- contract `lnsat.gateway.approval_decision.v1_0`;
- `ok: false` and `decision: null`;
- one `gateway.approval_decision.denied` error at `/approval-decisions`;
- `side_effects: ["authentication_limiter_may_advance"]`;
- `approval_decision_state_changed: false`;
- `approval_recorded: false`;
- `server_signed: false`;
- `session_authority_state_changed: false`;
- `execution_authorized: false`;
- `mutation_authority: false`.

Possible limiter advancement is explicit because sufficiently valid requests
consume bounded process-local limiter state before later checks finish.
Response reveals neither limiter outcome nor existence/state of request,
policy, session, or decision evidence.

Malformed pre-route framing, numeric Host failure, exact-version failure,
unknown route, and unsupported method retain shared transport, version, route,
or `405` behavior.

## Boundary

Route records only immutable approved/denied evidence. It cannot:

- sign approval evidence;
- consume approval or issue nonce/receipt binding;
- authorize execution;
- create packets, actions, policies, or audit events;
- dispatch adapters or mutate runtime;
- change session authority;
- widen policy engine or local roles.

Optional user-key signed approval evidence, local one-time execution
authorization, atomic consumption, and receipt binding remain separate Phase 7
lanes under ADR-0006.
