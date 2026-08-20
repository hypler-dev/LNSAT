# Local Server Session Evidence

Status: implementation note for source-local Phase 5 behavior. This checkpoint
persists role-bound local-human sessions and requires them for operator/owner
approval writes. It serves bounded password session issue, authenticated
session read, current-session secret rotation, and same-identity session-family
sign-out. It also serves self-service password rotation with forced
reauthentication plus identity-event and session-event evidence reads, but
grants no action capability or execution authority.

## Implemented Boundary

`crates/lnsat-auth` creates three independent operating-system-random values:

- a 128-bit public session identifier;
- a 256-bit bearer secret;
- a 256-bit browser anti-CSRF secret.

The bearer token and anti-CSRF token are returned exactly once. Their
domain-separated SHA-256 digests are the only secret-derived session values
passed to SQLite. Constant-time digest comparison is used after strict token
and stored-digest validation.

Schema version 10 adds immutable local-session rows and append-only session
revocations. Schema version 11 adds append-only activity events and immutable
session-rotation links. Schema version 14 adds append-only session security
events. Session evidence binds:

- exact active local-human identity and immutable owner/operator/auditor role;
- token and anti-CSRF digest profiles;
- both secret digests;
- canonical issue and absolute-expiry times;
- a content digest over every persisted session field.

Revocation evidence binds session, canonical revocation time, reason, and its
own content digest. Activity evidence binds session, a contiguous sequence from
1 through 61, canonical observation time, and a domain-separated digest.
Rotation evidence binds the prior and replacement sessions, identity, canonical
rotation time, and its own digest. Security events bind a contiguous
per-session post-v14 sequence, exact `issued`/`revoked`/`rotated` kind,
authenticated actor, replacement, revocation reason, immutable source digest,
canonical event time, and content digest. All five session families are preserve-only
pending a separately designed removable-session retention contract.

`SqliteStore::issue_local_session_v1` verifies the exact Argon2id credential
before issuing a role-bound session. The owner-only compatibility entry point
cannot widen operator or auditor sessions. Session windows are 60 through 3,600
seconds. Verification checks bearer, identity, credential, role, time,
revocation, and evidence integrity. Browser mutation verification also
requires the independent anti-CSRF token. Expiry rejects at the exact boundary.

Authenticated control-plane checks enforce a default 900-second idle timeout.
Activity touches append no more often than once per 60 seconds, so a one-hour
absolute session can retain at most 61 rows. Exact idle-boundary checks reject.
Existing v10 sessions migrate without invented observations: their immutable
issue time is the fallback anchor until the first qualifying verified touch.
Malformed, noncontiguous, substituted, out-of-window, or over-bound activity
evidence fails closed.

The daemon owns production session time. `SystemTime` is converted to canonical
UTC millisecond evidence, and the same sampled instant derives both issue and
expiry values. Public browser-request verification no longer accepts a
caller-supplied timestamp. Session issue first passes a process-local monotonic
fixed-window limiter: five attempts per identity and 30 process-wide per
60-second window, with a bounded identity-key set. Unknown, invalid, and
inactive identities verify against one validated fixed-profile Argon2id dummy
verifier. All of these failures remain indistinguishable at the public source
boundary.

Served `POST /v1/session` requires an operating-system loopback peer, exact
numeric bound Host and Origin, `Sec-Fetch-Site: same-origin`, exact
`application/json`, and
`X-LNSAT-Session-Intent: lnsat.session.issue.v1`. That custom header makes
browser login non-simple; `OPTIONS` remains denied with no CORS permission.
Request bodies are capped at 4 KiB and use a closed three-field schema:
`identity_ref`, `password`, and `lifetime_seconds`. Duplicate/unknown fields,
body framing drift, invalid lifetimes, credentials, rate limits, clock,
evidence, and persistence failures collapse to the stable
`gateway.session_issue.denied` response. Failure discloses only that bounded
process-local limiter state may advance. Success returns `201`, the
`lnsat.gateway.session_issue.v1_0` secret-free session representation, declares
limiter/session/event/cookie side effects and fresh-session-per-success replay,
and sets fresh host-only bearer/CSRF cookies. Request, password, and composed
secret-bearing response buffers plus raw issue/rotation tokens are zeroized
after use.

`SqliteStore::revoke_all_local_sessions_v1` authenticates one active bearer and
independent anti-CSRF secret inside the same immediate transaction that revokes
the session family. It revalidates every durable same-identity session, appends
one immutable revocation for each active unrevoked member, skips expired,
future, and already-revoked members, and grants no cross-identity authority.
Daemon composition supplies canonical server time and requires mutation
preflight before calling it. Wrong CSRF, read requests, replay, drift, and
partial persistence fail closed behind one generic denial.

`SqliteStore::rotate_local_session_v1` authenticates an active bearer and
anti-CSRF pair, applies the idle check, creates fresh independent secrets,
preserves the original absolute expiry, revokes the prior session with reason
`rotation`, and persists the immutable prior-to-replacement link in one
immediate transaction. At least 60 seconds must remain. Wrong CSRF, idle or
expired input, replay, evidence drift, or partial persistence yields no
replacement. The daemon requires strict mutation preflight and server-owned
time, then returns replacement secrets only in new host-only cookie fields.

Issue, revocation, and rotation source writes append their matching schema-v14
security events inside the same immediate transaction. A failed event write
rolls back the session/activity, revocation, or rotation source write. Exact
actor time validity permits an actor revoked at the same trusted instant but
rejects an actor revoked earlier. Upgraded v13 sessions receive no invented
issue history; their first later revocation starts at sequence one.
`SqliteStore::read_local_session_events_v1` revalidates every source binding.
Daemon composition permits this evidence read only through authenticated
read-only transport and the fixed `ReadEvidence` permission. Stable
`GET|HEAD /v1/sessions/{session_id}/events` now owns the exact route.

Schema v15 permits actorless revocation events only for exact owner-session
`recovery` and actorless `owner_recovered` identity events only for an
append-only owner credential generation. The
[offline recovery core](LOCAL_OWNER_RECOVERY.md) requires the daemon-shared
exclusive database lease. It opens no session or recovery route.

The owner role alone may create immutable operator or auditor identities.
Creation requires the exact active owner session, independent anti-CSRF proof,
and equality between trusted check time and identity creation time. The closed
local control-permission map gives owners identity management, operators
request/approval operation, and auditors read-only evidence access. These
permissions do not replace packet capabilities or policy decisions.

Public approval persistence now accepts only an exact active owner/operator
browser session. Approver identity, canonical local-session reference, role,
anti-CSRF proof, and trusted check time must bind the content-derived decision.
Auditors, wrong or revoked sessions, wrong anti-CSRF proof, session
substitution, and time substitution fail closed. A successful approval still
sets `execution_authorized: false`.

The auth and daemon crates also compose a route-neutral authenticated-browser
transport contract. It constructs an exact numeric IPv4 or IPv6 loopback
origin and:

- caps request heads at 8 KiB/64 headers and session-issue bodies at 4 KiB;
- refuses transfer encoding, duplicate headers/JSON fields, ambiguous length,
  body smuggling, and malformed HTTP/1.1 frames;
- requires an operating-system loopback peer and exact bound Host;
- requires `Sec-Fetch-Site: same-origin` for authenticated API traffic;
- permits only GET/HEAD as read-only requests;
- permits POST/PUT/PATCH/DELETE only with the exact Origin,
  `application/json`, and verified independent anti-CSRF proof;
- carries bearer only in a host-only `HttpOnly`/`SameSite=Strict` session
  cookie;
- uses a second host-only strict same-site cookie plus exact
  `X-LNSAT-CSRF` header with constant-time double-submit equality;
- verifies extracted secrets against active SQLite session/revocation evidence
  and bounded activity evidence before returning secret-free role-bound request
  evidence;
- rejects OPTIONS and every unknown method, preventing implicit CORS widening.

This follows the defense-in-depth controls in the
[OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
and exact serialized-origin model in
[RFC 6454](https://www.rfc-editor.org/rfc/rfc6454.html). All transport/auth
denials collapse to one public-safe code. Source-local Gateway serves
`POST|GET|HEAD|PATCH|DELETE /v1/session`. `POST` uses the separate pre-session
controls above. `GET|HEAD` is the stable
`lnsat.gateway.session_read.v1_0` current-session-only contract: it returns
active secret-free session/identity evidence, preserves exact bodyless `HEAD`,
uses one generic oracle-free denial, and declares that successful
authentication may append bounded activity evidence. `PATCH` requires exact
zero-length JSON framing,
Origin/Fetch Metadata, active bearer proof, and matching CSRF cookie/header. It
atomically revokes the prior bearer/CSRF pair, preserves absolute expiry,
returns secret-free rotation evidence, and sets fresh host-only cookies once.
Prior-token use and replay share the generic browser-transport denial. `DELETE`
uses the same strict mutation proof, atomically revokes every active
same-identity session, returns only secret-free family counts/time, and clears
both host-only cookies. No response emits permissive CORS headers and `OPTIONS`
is denied. No packet/action mutation, identity re-enable, event mutation, or
execution route is opened. Static page
navigation remains
separate from authenticated API requests.

Stable `PATCH /v1/identity/password` uses the same strict mutation transport
with a closed `current_password`/`new_password` JSON body and
per-session/process attempt limits. The transaction reverifies the latest
Argon2id credential, appends one immutable generation, revokes every active
same-identity session with `credential_revoke`, and clears both host-only
cookies. Success returns only secret-free credential version/time/count
evidence plus `reauthentication_required: true`; no replacement session is
issued. Transport, schema, credential, limit, clock, drift, and persistence
failures share stable `gateway.identity_password_rotation.denied` without
cookies or identity detail. Failure discloses only possible process-limiter
advancement; durable credential and session state remain unchanged.

Stable owner-only `POST /v1/identities` uses the same strict mutation
transport and a closed `identity_ref`/`display_name`/`role`/`password` JSON
body. Only the exact `operator` and `auditor` roles are accepted. Server-owned
time binds immutable identity, initial Argon2id credential, and audit evidence
inside one transaction under `lnsat.gateway.identity_creation.v1_0`. Success
returns public identity, credential-profile, owner-authorization, replay, and
side-effect evidence without the password or verifier. Invalid schema, role,
actor, CSRF, clock, duplicate identity, drift, and persistence share
`gateway.identity_creation.denied`, exposing only possible limiter advancement
while durable state rolls back.

Stable owner-only `DELETE /v1/identities/{identity_ref}` uses the same
strict mutation transport and requires exact zero-length JSON framing. The
target is one literal non-owner identity reference; owner, missing, malformed,
already-disabled, and unauthorized targets share one generic denial. Success
permanently appends disabled status and audit evidence, atomically revokes every
active target session with `owner_revoke`, and returns only the identity,
trusted time, and revoked-session count. The acting owner's session remains
active. No served recovery, re-enable, delegation, approval, packet/action, or
execution authority is added.

Stable authenticated `GET|HEAD /v1/identities/{identity_ref}/events` uses the
read-only branch of that transport and the fixed `ReadEvidence` role
permission. The exact validated path selects one identity. Query strings,
bodies, malformed or encoded paths, mutation methods, and `OPTIONS` fail
closed. Success returns only revalidated append-only identity-event evidence in
ascending sequence order, preserving nullable bootstrap/recovery actors. One
generic denial hides authentication, identity existence, and evidence-failure
detail. Both success and denial disclose that authentication may append bounded
session activity. The route grants no identity, session-authority,
packet/action, approval, or execution mutation authority.

Stable authenticated `GET|HEAD /v1/sessions/{session_id}/events` uses the same
read-only branch and fixed `ReadEvidence` permission for owner, operator, and
auditor roles. The path accepts only `ses_` plus 32 lowercase hexadecimal
characters. Success returns closed revalidated `issued`, `revoked`, and
`rotated` events in ascending sequence order while retaining exact nullable
actor, replacement-session, and revocation-reason semantics. `HEAD` performs
the same validation with zero body bytes. Missing authentication and unknown,
malformed, tampered, or unreadable evidence share one
`gateway.session_event_read.denied` response without a session-existence
oracle. Both success and denial disclose possible bounded session activity.
Identity, session-authority, packet/action, signing, nonce, consumption,
execution, and mutation authority remain false.

Stable authenticated `POST /v1/approval-requests` uses the same strict
mutation transport and a closed `project_ref`/`policy_decision_id` body. It
requires an active owner/operator session and independent CSRF proof, then
atomically revalidates the persisted approval-required policy, requires its
actor and session to equal the authenticated local requester, supplies
server-owned time, and appends the content-bound pending request. Wrong scope,
missing policy, stale time, identity/session substitution, auditor role, CSRF,
drift, and persistence failures share one generic denial. The response is
secret-free under `lnsat.gateway.approval_request.v1_0`. It distinguishes
created from exact replay, declares limiter/activity/append effects outside the
unchanged domain evidence, and explicitly retains `approval_recorded: false`,
`server_signed: false`, `session_authority_state_changed: false`,
`execution_authorized: false`, and `mutation_authority: false`.

Stable authenticated
`POST /v1/approval-requests/{approval_request_id}/decision` uses the same
strict mutation transport and a closed `project_ref`/`decision`/`reason` JSON
body. It revalidates one persisted request by exact project scope, derives the
approver and canonical local-session reference from an active owner/operator
session, supplies server-owned time, and rejects self-approval. Approved and
denied outcomes persist immutable decision evidence with
`execution_authorized: false` and no side effects. Auditor, wrong-project,
missing-request, outcome/reason mismatch, session substitution, CSRF, expiry,
replay-conflict, drift, and persistence failures share one generic denial.
Recorded and exact-replayed responses declare conditional outer effects under
`lnsat.gateway.approval_decision.v1_0`; nested stable evidence remains
side-effect-free. Response evidence is explicitly unsigned; server signing is
not opened.

## Source Evidence

Tests prove:

- independent random bearer and anti-CSRF material;
- no raw token or anti-CSRF value in persisted or public session evidence;
- password-authenticated issue, reopen, and exact verification;
- owner-authorized operator/auditor creation and duplicate/owner-role rejection;
- exact fixed local control-permission mapping and role-bound sessions;
- operator approval plus auditor, wrong-CSRF, session-substitution, and
  unauthenticated persistence negatives;
- wrong identity/password, malformed token, wrong anti-CSRF token, pre-issue
  use, and exact-boundary expiry rejection;
- month and leap-day duration arithmetic;
- exact IPv4/IPv6 loopback origin construction plus remote-peer, Host
  rebinding, cross-site/missing Fetch Metadata, Origin, media-type, method, and
  anti-CSRF negatives;
- exact host-only issue/clear cookie attributes, bounded lifetime, duplicate
  cookie/header, transfer-encoding, length, oversized-head, and trailing-body
  negatives;
- route-neutral active/expired SQLite session composition with generic public
  denial and no secret-bearing output;
- served same-origin `GET|HEAD /v1/session` with active SQLite verification,
  secret-free response, exact bodyless `HEAD`, denied preflight, no CORS allow
  headers, and generic cross-site/missing-auth negatives;
- served same-origin `POST /v1/session` with exact Origin/Fetch Metadata/custom
  intent, closed 4 KiB JSON, process-wide rate limits, equal wrong/unknown
  credential denial, host-only cookies, secret-free readback, secret-buffer
  zeroization, and framing/schema/CORS negatives;
- served same-origin `DELETE /v1/session` with exact empty framing, active
  bearer/CSRF proof, atomic same-identity family revocation, host-only cookie
  clearing, generic replay/auth denial, malformed-framing rejection, and
  no-CORS negatives;
- served same-origin `PATCH /v1/session` with exact empty framing, active
  bearer/CSRF proof, fresh host-only cookies, unchanged absolute expiry,
  immediate prior-session rejection, replacement readback, generic
  replay/auth denial, malformed-framing rejection, and no-CORS negatives;
- served same-origin `PATCH /v1/identity/password` with a closed secret body,
  latest-password reverification, per-session/process limiting, append-only
  credential generation, atomic session-family revocation, host-only cookie
  clearing, required reauthentication, old/new login proof, and generic
  transport/schema/credential/replay denial;
- served owner-only `POST /v1/identities` with closed operator/auditor schema,
  server-owned time, immutable identity/credential/audit evidence, immediate
  login proof, secret-free readback, and generic role/schema/actor/transport
  denial;
- served authenticated approval requests with exact project/policy
  actor/session binding, owner/operator permission, server-owned time,
  scope/schema/session/CSRF negatives, exact replay versus distinct-time
  creation, conditional outer effects, secret-free evidence, and zero
  approval/signing/execution authority;
- served authenticated approval decisions with exact request/project/session
  binding, distinct-human enforcement, owner/operator role proof, server-owned
  time, terminal replay closure, auditor/self-approval negatives, unsigned
  evidence, and zero execution authority;
- exact epoch/leap-day UTC formatting, server-derived 60-second session
  windows, monotonic per-identity/global rate-limit and reset boundaries;
- fixed dummy-verifier consumption for unknown identities without per-open or
  per-request Argon2id hashing;
- append-only sign-out revocation and replay rejection;
- atomic same-identity revoke-all with wrong-CSRF, read-method, replay,
  pre-revoked-member, and post-revocation verification negatives;
- append-only 60-second activity granularity, exact idle-boundary rejection,
  bounded sequence, v10 issue-time fallback, and immutable-row negatives;
- atomic one-time session rotation with fresh bearer/CSRF material, unchanged
  absolute expiry, prior-session rejection, immutable link evidence, wrong-CSRF
  rejection, and replay closure;
- authenticated self-service credential rotation with latest-password
  reverification, append-only generation evidence, atomic
  `credential_revoke` session-family closure, and no replacement session;
- owner-authorized permanent non-owner disablement with immutable actor-session
  evidence and atomic target-family `owner_revoke`;
- served owner-only `DELETE /v1/identities/{identity_ref}` with server-owned
  time, permanent non-owner disablement, atomic target-family closure, and
  generic scope/auth/CSRF/replay denial;
- schema-v13 identity security events binding owner bootstrap, identity create,
  password rotation, and disablement to exact actor sessions, source digests,
  credential generations, and canonical times;
- served authenticated `GET|HEAD /v1/identities/{identity_ref}/events` with
  route-only target selection, all fixed `ReadEvidence` roles, stable order,
  nullable recovery-actor semantics, exact bodyless `HEAD`, generic
  existence-oracle denial, and no mutation authority;
- schema-v14 session security events binding issue, revocation, and rotation to
  exact actor, replacement, reason, source digest, and canonical time;
- schema-v15 recovery-only actorless owner identity/session events, exact
  database/owner binding, daemon exclusion, and atomic session-family closure;
- served authenticated `GET|HEAD /v1/sessions/{session_id}/events` with exact
  lowercase session-id grammar, all fixed `ReadEvidence` roles, stable order,
  nullable event semantics, exact bodyless `HEAD`, generic existence-oracle
  denial, and no mutation authority;
- atomic rollback when issue or revocation event persistence is injected to
  fail, immutable-row enforcement, source substitution detection, and reopen
  equality;
- recomputed cross-identity actor substitution rejection against exact
  revocation-reason semantics;
- immutable-row enforcement and content-substitution detection;
- exact schema-v9 through schema-v15 migration, including v10/v13/v14
  compatibility and no fabricated identity/session history;
- interrupted schema-v10 through schema-v15 rollback to the exact prior schema
  and forward recovery.

## Later Owning Phases

The completed source-local Phase 5 slice leaves these controls to their named
phases. Phase 6 now owns stable Gateway composition and has promoted only root
negotiation, the API-wide exact-version gate, and
`POST|GET|HEAD|PATCH|DELETE /v1/session` plus
`PATCH /v1/identity/password`, owner-only `POST /v1/identities`, and stable
owner-only disablement `DELETE /v1/identities/{identity_ref}`
(`lnsat.gateway.identity_disablement.v1_0`), authenticated identity-event read
`GET|HEAD /v1/identities/{identity_ref}/events`
(`lnsat.gateway.identity_event_read.v1_0`), authenticated session-event read
`GET|HEAD /v1/sessions/{session_id}/events`
(`lnsat.gateway.session_event_read.v1_0`), plus authenticated
`POST /v1/approval-requests` (`lnsat.gateway.approval_request.v1_0`) and
authenticated `POST /v1/approval-requests/{approval_request_id}/decision`
(`lnsat.gateway.approval_decision.v1_0`).

- optional user-key signed approval evidence remains Phase 7 signed lane;
- stable offline recovery command ownership remains Phase 10, no recovery route
  exists yet, and any future re-enable path remains separately closed.

Until those later gates pass, session evidence grants no packet/action writer,
recovery route, execution, adapter, deployment, or publication authority. The
source-local offline recovery core requires a daemon-exclusive lease and no
browser session. The served approval decision is evidence-only and opens no
execution route.
