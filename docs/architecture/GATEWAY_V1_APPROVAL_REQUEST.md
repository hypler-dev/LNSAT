# Gateway v1 Approval Request

Status: accepted stable source contract. The implementation is pre-release and
unpublished; no supported product artifact exists.

## Contract

The authenticated pending-request surface is:

```text
POST /v1/approval-requests
LNSAT-Contract-Version: lnsat.contracts.v1_0
Origin: http://<exact-bound-loopback>
Sec-Fetch-Site: same-origin
Content-Type: application/json
Content-Length: <exact body length>
Cookie: lnsat_session_v1=<bearer>; lnsat_csrf_v1=<csrf>
X-LNSAT-CSRF: <same csrf>

{
  "project_ref": "project:<opaque>",
  "policy_decision_id": "pol_<lowercase-sha256>"
}
```

Its response contract is `lnsat.gateway.approval_request.v1_0`. The route
inherits the API-wide exact-version gate after numeric loopback peer and exact
bound-Host validation and before route dispatch, authentication, limiter,
policy lookup, or SQLite work. Every routed response repeats the accepted
`LNSAT-Contract-Version`.

This stable response replaces experimental
`lnsat.gateway.local_approval_request.v1_0`. Its fields and side-effect
semantics are intentionally not shape-compatible. Pre-release source consumers
must migrate atomically; no alias or implicit downgrade remains.

The request is one nonempty JSON body, at most 4 KiB, closed to exactly
`project_ref` and `policy_decision_id`. Callers cannot provide a request
identity, requester identity, session reference, status, resources,
capabilities, policy reasons, timestamps, expiry, approval outcome, signature,
side effects, idempotency key, or execution authority.

Transfer encoding, missing/zero/ambiguous content length, trailing bytes,
non-JSON media type, cross-site or missing Fetch Metadata, Origin drift,
missing/duplicate cookies, or missing/mismatched double-submit CSRF fail
closed. Unsupported methods retain `405` with `Allow: POST`. No response adds
CORS permission headers, `WWW-Authenticate`, or `Set-Cookie`.

## Authorization And Evidence Binding

Only an active local owner or operator session with the fixed
`request_action` permission may create pending request evidence. Auditor and
unauthenticated callers receive the same denial as invalid scope, schema,
policy, or persistence state.

One immediate SQLite transaction:

1. verifies the bearer, independent CSRF proof, role, activity, and session
   evidence at one server-owned canonical time;
2. reads the exact persisted policy under the supplied project scope;
3. rederives the complete policy decision from its persisted packet evidence;
4. requires `approval_required`, a current validity window, and exact equality
   between policy actor/session and authenticated requester/local session;
5. derives the stable `lnsat.approval_request.v1_0` evidence using that same
   server-owned time;
6. appends the immutable pending request or returns exact replay.

Any later scope, policy, actor/session, time, drift, identity-conflict, or
persistence failure rolls back both bounded session-activity evidence and the
approval-request append. No database migration or persistence-model change is
part of this promotion.

Approval-request identity content-binds the policy reference, packet digest,
requester, local session, project, resources, capabilities, policy reasons,
request time, and inherited expiry. The identity is a drift-detection digest,
not authentication or a signature.

## Success And Replay

Created evidence returns HTTP `201`; exact replay returns HTTP `200`. Both
responses are secret-free and include:

- exact Gateway contract and accepted wire version;
- `ok: true`, `status: "created"|"replayed"`, and
  `scope: "pending_approval_request"`;
- the unchanged nested stable domain approval request, including
  `side_effects: []`;
- local-session `request_action`, requester/session binding, and CSRF evidence;
- `replay_semantics: "content_bound_server_owned_time"`;
- `approval_recorded: false`;
- `server_signed: false`;
- `session_authority_state_changed: false`;
- `execution_authorized: false`;
- `mutation_authority: false`.

Created success declares these outer Gateway effects:

1. `authentication_limiter_advanced`;
2. `session_activity_evidence_may_append`;
3. `approval_request_evidence_appended`.

Exact replay declares only:

1. `authentication_limiter_advanced`;
2. `session_activity_evidence_may_append`.

Its `approval_request_state_changed` is `false`, and no second request row
appends. Nested `approval_request.side_effects` remains empty because domain
evidence derivation itself performs no write; outer Gateway effects describe
transport authentication and durable composition.

Replay identity follows server-owned time:

- identical derived request identity at an identical server time returns exact
  replay;
- a different server time creates a distinct content-bound pending request;
- any conflicting durable identity fails closed through the generic denial.

Caller-controlled idempotency keys remain forbidden.

## Failure

Every in-contract transport, authentication, role, CSRF, schema, project,
policy, actor/session, time, replay-conflict, drift, or persistence failure
returns the same HTTP `403` response:

- contract `lnsat.gateway.approval_request.v1_0`;
- `ok: false` and `approval_request: null`;
- one `gateway.approval_request.denied` error at `/approval-requests`;
- `side_effects: ["authentication_limiter_may_advance"]`;
- `approval_request_state_changed: false`;
- `approval_recorded: false`;
- `server_signed: false`;
- `session_authority_state_changed: false`;
- `execution_authorized: false`;
- `mutation_authority: false`.

Possible limiter advancement is explicit because a sufficiently valid request
consumes bounded process-local limiter state before later schema, policy, and
durable checks finish. The response does not reveal whether limiter state
advanced, whether policy or request evidence exists, or why authorization
failed.

Malformed pre-route HTTP framing, numeric Host failure, exact-version failure,
unknown route, and unsupported method retain their shared transport,
version-family, route, or `405` behavior. Version errors occur before
route-specific denial composition and do not emit an accepted-version header.

## Boundary

This promotion applies only to `POST /v1/approval-requests`. It creates pending
request evidence. It cannot approve, deny, sign, authorize execution, create a
packet/action/policy, consume approval evidence, dispatch an adapter, or mutate
a runtime.

Decision recording is a separate stable contract at
`POST /v1/approval-requests/{approval_request_id}/decision` under
`lnsat.gateway.approval_decision.v1_0`. It does not widen this pending-request
contract. See [Gateway v1 approval decision](GATEWAY_V1_APPROVAL_DECISION.md).
Optional user-key signed approval evidence and local one-time execution
authorization remain separate Phase 7 lanes.
