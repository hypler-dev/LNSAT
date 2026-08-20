# `lnsatd` Loopback Foundation

Status: implementation note for local source behavior. This contract does not
authorize production operation, remote exposure, service installation,
automatic start, packet/action writers, runtime mutation, release, or deployment.

## Implemented Boundary

`crates/lnsatd` is the first bounded Rust process wrapper around
`crates/lnsat-store`.

Startup order is fail-closed:

1. require an explicit file-backed database path;
2. validate a numeric loopback listen address;
3. reject wildcard, non-loopback, and operator port-zero configuration;
4. acquire an owner-only exclusive database-sidecar lease;
5. open, migrate, and verify SQLite schema and integrity;
6. create the TCP listener;
7. verify the operating-system-reported bound address remains loopback;
8. serve at most eight bounded readiness or session requests concurrently.

Storage failure occurs before listener creation. The default source address is
`127.0.0.1:7447`. Phase 10 may version and stabilize final command,
configuration, and path contracts; this pre-release source default is not a
published compatibility promise.

## Readiness Surface

Readiness uses only exact `GET /healthz` over HTTP/1.1. Success contains:

- contract `lnsat.daemon.readiness.v1_0`;
- `status: ready`;
- verified SQLite schema and migration counts;
- `bind_scope: loopback`;
- `mutation_authority: false`.

Request heads are capped at 8 KiB and 64 headers. Connections have bounded read
and write timeouts, serve one request, and close. A ninth in-flight connection
fails fast with bounded public-safe `503` capacity evidence. Exactly one numeric `Host`
matching the bound loopback IP and, when supplied, port is required. This
rejects hostname/DNS-rebinding aliases. Unknown paths, non-GET methods,
malformed requests, oversized heads, and non-loopback peers fail without
reflecting input.
Peer read, timeout, and response failures close only that connection; listener
accept or worker failure stops the process fail-closed.

An in-process cloneable shutdown handle records one idempotent stop request and
wakes a blocked accept through the already-bound loopback socket. The server
then accepts no new work, joins every in-flight bounded worker, and releases
SQLite, the listener, and the offline-recovery exclusion lease before
returning. Tests prove recovery authority is denied while the daemon lives and
reopen the same database in a fresh server after shutdown. This is cooperative
library composition, not service-manager or recovery-activation authority.

The binary installs one fail-closed non-overwriting process handler before
serving. SIGINT, SIGTERM, and SIGHUP on Unix and Ctrl-C/Break events on Windows
delegate to the same idempotent shutdown handle. Registration failure stops
startup; signals do not add mutation, restart, or service authority.

Readiness proves only that this process opened current local storage and bound a
loopback socket. It is not authentication, authorization, recovery activation,
support, health of a future adapter, or permission to execute.

## Browser Transport, Session, and Credential Surface

Source provides strict browser composition and serves pre-release session and
self-service credential resources:

- exact `POST /v1/session` for password-authenticated issue;
- exact `GET|HEAD /v1/session`;
- exact `PATCH /v1/session` for current-session secret rotation;
- exact `DELETE /v1/session` for same-identity session-family sign-out;
- exact `PATCH /v1/identity/password` for self-service credential rotation;
- exact `POST /v1/identities` for owner-only operator/auditor creation;
- exact `DELETE /v1/identities/{identity_ref}` for owner-only permanent
  non-owner disablement;
- exact `GET|HEAD /v1/identities/{identity_ref}/events` for authenticated
  identity-event evidence read;
- exact `GET|HEAD /v1/sessions/{session_id}/events` for authenticated
  session-event evidence read;
- exact `POST /v1/approval-requests` for an authenticated, policy-bound pending
  request;
- exact `POST /v1/approval-requests/{approval_request_id}/decision` for an
  authenticated distinct-human decision;
- contracts `lnsat.gateway.session_issue.v1_0`,
  `lnsat.gateway.session_read.v1_0`,
  `lnsat.gateway.session_rotation.v1_0`, and
  `lnsat.gateway.session_family_sign_out.v1_0`;
- credential contract `lnsat.gateway.identity_password_rotation.v1_0`;
- creation contract `lnsat.gateway.identity_creation.v1_0`;
- disablement contract `lnsat.gateway.identity_disablement.v1_0`;
- identity-event contract `lnsat.gateway.identity_event_read.v1_0`;
- session-event contract `lnsat.gateway.session_event_read.v1_0`;
- request contract `lnsat.gateway.approval_request.v1_0`;
- decision contract `lnsat.gateway.approval_decision.v1_0`;
- active secret-free session id, identity, role, issue time, and expiry;
- `bind_scope: loopback`, `same_origin_required: true`,
  `cors_enabled: false`, and `mutation_authority: false`.

`mutation_authority: false` is scoped to packet, action, adapter, and runtime
authority. It does not hide protective authentication-state operations such as
session rotation, self-service password rotation, or same-identity sign-out.

The served route reuses the same parser and SQLite verification boundary:

- request heads remain capped at 8 KiB/64 headers and JSON bodies at 4 KiB;
- every duplicate header or JSON field, transfer encoding, malformed/ambiguous
  content length, trailing body byte, and malformed HTTP/1.1 frame fails closed;
- numeric loopback peer, exact bound `Host`, same-origin Fetch Metadata, exact
  mutation `Origin`, and exact JSON media type are required;
- pre-session `POST` additionally requires
  `X-LNSAT-Session-Intent: lnsat.session.issue.v1`; because it is a non-simple
  request header, a cross-origin browser must preflight, while this server
  denies `OPTIONS` and emits no CORS permission;
- one host-only bearer cookie plus independent anti-CSRF cookie/header
  double-submit are parsed without logging or returning secrets;
- raw evidence is verified against active SQLite session, revocation, and
  bounded append-only activity state;
- successful composition returns only target, read/mutation class, and
  secret-free role-bound session evidence;
- stable Gateway routes map every in-contract transport/auth failure to their
  route-specific generic denial.

`OPTIONS` and unsupported mutation methods receive `405` with
`Allow: GET, HEAD, POST, PATCH, DELETE`.
Responses emit no `Access-Control-Allow-*` or `Access-Control-Expose-*`
headers. They remain `no-store`, same-origin resource protected, non-sniffable,
non-referring, and permissions-disabled. `HEAD` returns the exact GET
representation length with no body. Missing, malformed, cross-site, expired,
revoked, or drifted authentication collapses to the same `403` body without a
`WWW-Authenticate` oracle.

Successful `POST` returns `201`, stable secret-free session evidence, declared
limiter/session/event/cookie side effects, fresh-session replay semantics, and
exactly two new host-only `Set-Cookie` fields. Body schema is closed to
`identity_ref`, `password`, and `lifetime_seconds`; 60 through 3,600 seconds are
accepted. Wrong, missing, disabled, rate-limited, malformed, drifted, or failed
credential paths all return `gateway.session_issue.denied` without identity or
limiter detail and without cookies; the body discloses only that process-local
limiter state may advance. Transient request, password, and composed
cookie buffers plus raw issue/rotation tokens are zeroized after use.

Authenticated `PATCH` requires exact `Content-Length: 0`, JSON media type,
Origin, same-origin Fetch Metadata, active bearer proof, and matching CSRF
cookie/header. It atomically revokes the prior bearer/CSRF pair, preserves the
original absolute expiry, appends immutable replacement linkage and security
events, and returns the stable `lnsat.gateway.session_rotation.v1_0` contract
with fresh cookies exactly once. Failure returns one zero-side-effect
`gateway.session_rotation.denied` oracle.
`200` with secret-free old/new session identity evidence plus exactly two fresh
host-only cookies. Prior-token use, replay, evidence drift, clock failure, and
persistence failure collapse to generic denial without cookies. A response
write failure after durable rotation remains fail-closed and may require a new
login; it never restores the prior secrets.

Authenticated `DELETE` requires exact `Content-Length: 0`, JSON media type,
Origin, same-origin Fetch Metadata, active bearer proof, and matching CSRF
cookie/header. It atomically revokes every active session for the authenticated
identity, returns secret-free family counts and trusted time, and clears both
host-only cookies with `Max-Age=0` under stable
`lnsat.gateway.session_family_sign_out.v1_0`. Replay and every in-contract
transport, authentication, CSRF, clock, evidence, or persistence failure
returns one zero-side-effect `gateway.session_family_sign_out.denied` oracle
without clearing cookies or revealing identity/session detail. Malformed
pre-route framing remains a public-safe request error. This self-revocation
grants no packet, action, approval, adapter, or execution authority.

Authenticated `PATCH /v1/identity/password` requires the same exact
Origin/Fetch Metadata/JSON/active bearer/CSRF proof plus a closed body containing
only `current_password` and `new_password`. A monotonic limiter permits at most
five attempts per session and 30 authentication attempts process-wide per
minute. Success reverifies the latest Argon2id credential inside the immediate
transaction, appends one immutable generation, atomically revokes every active
same-identity session with `credential_revoke`, clears both cookies, and returns
only identity, credential version, trusted time, revoked count, and
`reauthentication_required: true` under stable
`lnsat.gateway.identity_password_rotation.v1_0`. Success declares exact
limiter/activity/credential/identity-event/revocation/session-event/cookie
effects. Wrong/current-equal/invalid credentials, malformed schema, exhausted
limits, clock failure, drift, and persistence failure share one
`gateway.identity_password_rotation.denied` oracle without cookies or identity
detail. The denial discloses only that process-local limiter state may advance;
atomic rollback preserves durable credential/session state. Raw
request/password buffers are zeroized after response classification. No
replacement session is issued.

Owner-only `POST /v1/identities` requires the same exact
Origin/Fetch Metadata/JSON/active bearer/CSRF proof plus a closed body containing
`identity_ref`, `display_name`, `role`, and `password`. Only operator or auditor
roles are accepted. The authentication limiter admits at most five attempts per
session and 30 process-wide per minute. Success atomically appends one immutable
identity, initial Argon2id credential, and actor-session-bound
`identity_created` event under stable
`lnsat.gateway.identity_creation.v1_0`. It returns only secret-free
identity/credential/owner-authorization evidence and declares exact
limiter/activity/identity/credential/event effects. Identity references are
create-once; duplicate, non-owner, role, schema, credential, clock, drift, and
persistence failures share one `gateway.identity_creation.denied` oracle. The
denial discloses only possible process-local limiter advancement; atomic
rollback preserves durable session, identity, credential, and event state.
Success sets no cookies and grants no packet, action, adapter, or execution
authority.

Authenticated `GET|HEAD /v1/identities/{identity_ref}/events` requires an
active local session and the existing fixed `ReadEvidence` permission shared by
owner, operator, and auditor roles. One literal validated path selects the
target. Query strings, bodies, encoded or ambiguous paths, mutation methods,
and `OPTIONS` fail closed. Success returns only the revalidated append-only
identity-event stream in ascending sequence order, preserving nullable
bootstrap/recovery actors. `HEAD` retains the exact status and representation
length with no body. One generic denial hides authentication, identity
existence, and evidence failure; success and denial declare possible bounded
session activity. No identity, session-authority, packet/action, approval,
execution, or adapter mutation authority is added.

Authenticated `GET|HEAD /v1/sessions/{session_id}/events` uses the same
read-only transport and fixed `ReadEvidence` permission for owner, operator,
and auditor roles. The exact route accepts only `ses_` plus 32 lowercase
hexadecimal characters. Success returns the revalidated append-only
`issued`/`revoked`/`rotated` stream in ascending sequence order with existing
nullable actor/replacement/reason semantics. `HEAD` performs the same work with
no body. Missing authentication and unknown, malformed, tampered, or unreadable
evidence share `gateway.session_event_read.denied`; success and denial declare
possible bounded session activity. No identity, session-authority,
packet/action, signing, nonce, consumption, execution, or adapter mutation
authority is added.

Authenticated `POST /v1/approval-requests` requires the same exact
Origin/Fetch Metadata/JSON/active bearer/CSRF proof plus a closed body containing
only `project_ref` and `policy_decision_id`. Owner/operator role,
`request_action` permission, persisted approval-required policy, exact policy
actor/local-session binding, and one server-owned time are verified inside the
same immediate transaction that appends or replays pending evidence. Stable
`lnsat.gateway.approval_request.v1_0` success distinguishes created from exact
replay and declares limiter/activity/append effects outside the unchanged
domain request. One `gateway.approval_request.denied` response covers every
in-contract failure and exposes only possible process-limiter advancement.
Approval, signing, execution authorization, packet/action creation, and adapter
dispatch remain false.

Authenticated
`POST /v1/approval-requests/{approval_request_id}/decision` uses same strict
transport with a closed project/outcome/reason body and path-only request id.
Owner/operator `decide_approval` permission, exact project/request/policy/
packet chain, distinct-human review, inherited expiry, and server-owned time
are verified inside same immediate transaction that appends or exactly replays
one terminal decision. Stable `lnsat.gateway.approval_decision.v1_0` success
distinguishes recorded from replayed and declares conditional outer
limiter/activity/append effects outside unchanged side-effect-free domain
evidence. One `gateway.approval_decision.denied` response covers every
in-contract failure and terminal conflict. Signing, approval consumption,
execution authorization, packet/action creation, and adapter dispatch remain
false.

Bounded workers share one verified SQLite connection through a fail-closed
mutex. Lock failure rejects authentication; it never bypasses verification or
widens routes.

Cookie response values use no `Domain`, exact `Path=/`, `SameSite=Strict`,
bounded `Max-Age`, and `HttpOnly` for bearer material. `Secure` is intentionally
absent because v1 binds plain HTTP to numeric loopback; adding it would make
this source contract unusable on that listener. Remote/TLS design remains
closed.

Session issue and verification use server-owned canonical UTC rather than
caller-supplied request time. A process-local monotonic fixed-window limiter
allows at most five attempts per identity and 30 attempts globally per minute,
retains no more than 128 identity keys, and fails closed if its lock is
unavailable. Unknown identities consume one validated fixed-profile Argon2id
verification. Credential, clock, limiter, evidence, and persistence failures
all map to `gateway.session_issue.denied` at the served stable HTTP boundary.

Every successful route-neutral authorization enforces the store's 900-second
default idle timeout and appends activity no more often than once per 60
seconds. Exact idle-boundary checks reject. An authenticated mutation
composition can atomically replace both browser secrets while preserving the
original absolute expiry, revoking the prior session with reason `rotation`,
and persisting immutable linkage evidence. It requires at least 60 seconds of
remaining lifetime and returns replacement material only as new host-only
cookie fields through authenticated `PATCH /v1/session`.

One authenticated mutation may atomically revoke every active session for its
own identity. Composition requires exact Origin/JSON/CSRF preflight, supplies
server-owned revocation time, and returns only secret-free family counts.
Expired, future, already-revoked, and other-identity sessions gain no new row
or authority. Read methods and replay collapse to generic rejection.

## Explicitly Absent

- stable packet/action Gateway writers;
- served identity re-enable, permissive CORS, or signed approval evidence;
- packet, policy, action, audit, or recovery mutation routes;
- TLS, reverse-proxy trust, remote bind, hostname resolution, or Unix sockets;
- Control Center assets;
- `lnsatctl` or `lnsat`;
- service-manager integration, automatic restart policy, or automatic recovery;
- production adapters, providers, signing keys, packages, releases, or
  deployment.

Session-event evidence is now served through the stable
`GET|HEAD /v1/sessions/{session_id}/events` route with contract
`lnsat.gateway.session_event_read.v1_0` and covered by the route-positive and
route-negative test evidence below.

Those boundaries remain in later roadmap phases. Non-loopback operation stays
closed until a separately reviewed authenticated remote-access design and its
evidence exist.

## Test Evidence

Rust tests prove:

- fixed IPv4 loopback default;
- rejection of empty DB paths, wildcard/non-loopback addresses, hostnames, and
  port zero;
- strict duplicate/unknown/missing CLI argument refusal;
- storage bootstrap and verification before successful bind;
- invalid storage refusal;
- operating-system-confirmed loopback bind;
- exact readiness schema evidence with zero mutation authority;
- method, route, host, and oversized-request negatives;
- peer I/O error isolation from listener-fatal errors;
- slow-peer isolation under bounded concurrency;
- fast public-safe refusal above eight in-flight connections;
- idempotent cooperative shutdown, worker drain, and clean database restart;
- subprocess SIGINT, SIGTERM, and SIGHUP shutdown with clean exit and restart;
- bounded public-safe responses without request or path reflection.
- route-neutral strict browser head parsing and generic denial mapping;
- host-only cookie attributes, duplicate auth-cookie rejection, and
  constant-time anti-CSRF double-submit;
- active/expired SQLite session composition without exposing raw secrets.
- served same-origin `GET|HEAD /v1/session` response composition with active
  SQLite authentication and secret-free output;
- served same-origin `POST /v1/session` with exact custom intent, closed bounded
  JSON, process-wide limiting, generic credential denial, host-only cookie
  issue, secret zeroization, and immediate authenticated readback;
- served same-origin `DELETE /v1/session` with exact zero-length JSON framing,
  CSRF proof, atomic session-family revocation, cookie clearing, and generic
  replay/auth denial plus malformed-framing negatives;
- served same-origin `PATCH /v1/session` with exact zero-length JSON framing,
  CSRF proof, fresh host-only cookies, unchanged absolute expiry, immediate
  prior-session rejection, replacement readback, generic replay/auth denial,
  and malformed-framing negatives;
- served same-origin `PATCH /v1/identity/password` with closed schema,
  latest-password reverification, per-session/process limiting, append-only
  credential generation, atomic family revocation, cookie clearing, forced
  reauthentication, old/new credential proof, and generic transport/schema/
  credential/replay denial;
- served owner-only `POST /v1/identities` with a closed operator/auditor
  schema, server-owned time, immutable credential/audit evidence, secret-free
  readback, and generic role/schema/actor/transport denial;
- served owner-only `DELETE /v1/identities/{identity_ref}` with exact empty
  framing, permanent non-owner disablement, atomic target-family revocation,
  secret-free evidence, and generic scope/auth/CSRF/replay denial;
- served authenticated `GET|HEAD /v1/identities/{identity_ref}/events` with
  all fixed evidence-read roles, exact route-only target, stable event order,
  nullable actor semantics, secret-free output, bodyless `HEAD`, generic
  identity-existence denial, and route/body/method negatives;
- served authenticated `GET|HEAD /v1/sessions/{session_id}/events` with exact
  route-only target, stable event stream order, secret-free output, `ses_` plus
  32-hex lowercase grammar, bodyless `HEAD`, generic session-existence denial,
  and route/body/method negatives;
- served authenticated `POST /v1/approval-requests` with exact persisted
  policy actor/session binding, owner/operator permission, server-owned time,
  distinct-time creation, exact replay composition, conditional outer effects,
  generic denial, secret-free readback, and zero approval/signing/execution
  authority;
- served authenticated
  `POST /v1/approval-requests/{approval_request_id}/decision` with exact
  project scope, closed outcome/reason schema, active owner/operator evidence,
  distinct-human enforcement, server-owned time, generic denial, unsigned
  readback, and zero execution authority;
- `OPTIONS`, cross-site, missing-auth, unknown-route, and no-CORS-header
  negatives plus exact bodyless `HEAD` behavior;
- bounded activity touch, exact idle rejection, and atomic replacement-cookie
  rotation with prior-session replay rejection;
- server-owned epoch/leap-day UTC conversion and session-window derivation;
- bounded monotonic authentication attempts plus unknown-identity Argon2id
  equalization.
- atomic same-identity family revocation with mutation/CSRF and replay
  negatives.
