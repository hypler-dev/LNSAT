# Gateway v1 Contract Negotiation

Status: current source contract. This is a pre-release source implementation,
not a published or supported product API.

## Purpose

Phase 6 begins with one authority-free bootstrap endpoint that freezes exact
Gateway wire-version negotiation before existing source-local routes are
promoted individually:

```text
GET|HEAD /v1
LNSAT-Contract-Version: lnsat.contracts.v1_0
```

The endpoint is loopback-only and static. It does not require a session because
it reveals no deployment, identity, policy, packet, approval, or stored state.
It performs no policy or persistence work and grants no mutation or execution
authority.

Stable contracts now separately own `POST|GET|HEAD|PATCH|DELETE /v1/session`
plus `PATCH /v1/identity/password`, owner-only `POST /v1/identities`, and
stable owner-only `DELETE /v1/identities/{identity_ref}` disablement at
`lnsat.gateway.identity_disablement.v1_0`, authenticated
`GET|HEAD /v1/identities/{identity_ref}/events` at
`lnsat.gateway.identity_event_read.v1_0`, authenticated
`GET|HEAD /v1/sessions/{session_id}/events` at
`lnsat.gateway.session_event_read.v1_0`, plus authenticated
`POST /v1/approval-requests` at `lnsat.gateway.approval_request.v1_0` and
authenticated `POST /v1/approval-requests/{approval_request_id}/decision` at
`lnsat.gateway.approval_decision.v1_0`. This root negotiation contract does not
widen any subroute.

## API-Wide Version Gate

Every request whose path begins `/v1/` must pass the same exact stable-version
check before route dispatch, authentication, policy, persistence, or mutation.
The fixed fail-closed order is:

1. operating-system loopback peer;
2. strict HTTP framing and size limits;
3. exact numeric bound `Host`;
4. exact Gateway contract version;
5. route and method;
6. authentication and authorization;
7. policy and any bounded mutation.

Missing, malformed, unknown, and deprecated versions therefore cannot reach a
route handler or session store. After a version is accepted, every routed
response repeats the accepted version header, including not-found,
method-denied, and generic authentication denials. This header proves only
wire-contract acceptance; it grants no route, retry, mutation, approval, or
execution authority.

Transport failures before version acceptance and version-error responses do
not emit an accepted-version header. `/healthz` remains a separate unversioned
readiness endpoint. API-wide version gating does not promote the experimental
Phase 5 routes to stable product APIs.

## Exact Request Contract

- only `GET` and `HEAD` are accepted;
- `Host` must be the exact bound numeric loopback address, with either the
  exact bound port or no port;
- request bodies are forbidden;
- `LNSAT-Contract-Version` is required exactly once, with case-insensitive HTTP
  header-name matching;
- its value must be the exact stable `lnsat.contracts.v1_0` wire version;
- HTTP optional whitespace around the field value is removed before validation;
  embedded whitespace, alternate syntax, unknown versions, and deprecated
  `lnsat.contracts.v0_1` fail closed;
- no wildcard, range, fallback, or implicit downgrade exists.

The general contract library retains deprecated `v0_1` compatibility for
explicitly documented compatibility surfaces. The stable `/v1` Gateway root is
not such a surface.

## Success Contract

Success returns `200`, repeats
`LNSAT-Contract-Version: lnsat.contracts.v1_0`, and emits
`lnsat.gateway.negotiation.v1_0` JSON containing:

- the exact accepted wire version and `stable` state;
- `negotiation: "exact_match"`;
- `bind_scope: "loopback"`;
- `side_effects: []`;
- `mutation_authority: false`.

`HEAD` returns the same status and representation length without a body.

## Failure Contract

Missing, malformed, unsupported, and deprecated values return `400` through the
shared `lnsat.error_envelope.v1_0` version-family shape:

- `ok: false`;
- `version: null`;
- one stable code at `/version`;
- `severity: "error"`;
- `side_effects: []`.

Rejected raw values are never reflected. A rejected response does not emit an
accepted-version header. Duplicate headers fail in the strict HTTP parser
before version negotiation. Method, body, Host, framing, and size failures
remain transport errors and grant no retry, fallback, or authority.

## Change Gate

Changing the route, header name, accepted version, HTTP status, success fields,
or version-error identity requires:

1. a parallel or superseding documented contract;
2. Rust and TypeScript contract-policy review;
3. positive, `HEAD`, missing, malformed, unsupported, downgrade, duplicate,
   method, body, and Host-drift tests;
4. compatibility, changelog, project-status, and release-impact updates;
5. the full source gate.

Executable policy truth lives in
`packages/packets/src/contract-version.ts`; the served Rust composition lives
in `crates/lnsatd/src/lib.rs`. Both reject deprecated Gateway negotiation while
the generic version validator retains explicit compatibility support. The
TypeScript `lnsat.gateway.version_gate.v1_0` policy freezes the `/v1/`
validation order and accepted-response header behavior.
