# Roadmap

This is staged path to first supported release. Core-required phases are
ordered; explicitly post-local-v1 lanes do not block first local support.
[Project status](PROJECT_STATUS.md) states what exists today.
[ADR-0002](architecture/ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md)
controls positioning, authority boundaries, and expanded v1 distribution.
[ADR-0003](architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md)
controls open-core/downstream boundaries, governed agent content, advisory
models, extension isolation, management views, and OS CLI direction.
[ADR-0006](architecture/ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
controls local-v1 trust, optional signed approval, online one-time
authorization, revised Phase 7 lanes, and staged release breadth.
[ADR-0001](architecture/ADR-0001_V1_SCOPE.md) remains historical and controls
only retained decisions not superseded by ADR-0002.
Canonical readiness states: Phase 7a signed-evidence design = complete; Phase 7b wrapper verification = implemented_verification_only; Phase 7c Ed25519 primitive = implemented_not_wired; Phase 7d schema candidate = proposed_test_only; P7-ADR0 local-v1 trust-model revision = complete; P7-M1 core persistence = complete; P7-N1 nonce/expiry lifecycle = complete; P7-B1 preauthorization hardening = complete; P7-C1 atomic consumption = complete (implemented_not_wired); P7-A1 local authorization = complete (source-only, implemented_not_wired); P7-R1 Git reference adapter = complete (source-only, implemented_not_wired); P7-X1 local-v1 conformance freeze = complete (source-only evidence, no runtime/publication authority); runtime is schema 17/17 with migrations 0016 and 0017 registered; optional signed-evidence packets remain blocked.
In inherited packet labels, `publication authority` means release-artifact or
runtime publication authority; it does not govern repository-source visibility.
Current completed packet is `P7-X1`. Optional signed-evidence packets
`P7-K1/S1/V1/I1` stay blocked and ungranted. `P7-P1` is superseded by
`P7-K1`; no public or private key input is requested. [Phase 7 readiness
plan](architecture/PHASE_7_READINESS_EXECUTION_PLAN.md) and
[ledger](reference/phase7-readiness.json) show no execution authority opened.

[Product build sequence](PRODUCT_BUILD_SEQUENCE.md) owns current cross-phase
order. Required path is Phase 8 -> Phase 9 -> Phase 10 -> Phase 11 -> Phase 13
-> Phase 14. Phase 12 remains optional unless a separately approved support
profile requires it. Supported binaries/packages begin only after required
product/runtime phases and Phase 13 release-candidate source freeze pass.

[ADR-0007](architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)
selects one local Docker/OCI profile as first v1 runtime integration while
keeping authority contracts runtime-neutral. P11-D1 implements a closed
source-only profile/parser and exact digest-binding foundation. It creates no current
Docker adapter, image, package, runtime dispatch, or support claim.
P11-D2 adds explicit profile-file selection and public-safe configuration
readback only; it creates no Docker endpoint, process, mount, adapter, route,
dispatch, receipt, or support claim. P11-D3 adds one closed canonical
adapter-process protocol with exact request/result framing, complete identity
binding, bounded I/O observations and deadlines, and fail-closed ambiguity. It
launches no process and creates no Docker or repository consequence. P11-I1
adds authenticated atomic packet and server-time policy intake only; no
approval, authorization, dispatch, Docker action, consequence, or receipt.
P11-D4A adds one bounded canonical executable-payload wrapper around the D3
control frame. It carries the approved execution request and binds target plus
shared Git tool-argument digests without launching Docker or creating a receipt.
P11-D4B1 adds a dormant, source-only schema-2 Docker supervisor. It binds and
revalidates the exact Docker CLI, host Git verifier, local Unix endpoint,
D4A/D3/profile identities, and marked disposable Git target. Exact isolation and
resource arguments, bounded I/O, a monotonic deadline, fail-closed unknown
outcomes, cleanup bound to a private Docker-written container ID, host
consequence inspection, and semantic result binding are covered by hermetic
fake-runtime tests. At the P11-D4B1 checkpoint, no served route called the
supervisor, and no real Docker proof, package, deploy, production, or support
claim opened.
P11-D4B2A adds source-only atomic capability-consumption plus Docker-attempt
claim, one host-evidence-bound receipt, metadata-only replay, startup
materialization of interrupted attempts to `outcome_unknown`, and inspection-only
reconciliation without Docker retry. At that checkpoint, no served route or
Docker configuration used these APIs. P11-D4B2B now exercises the D2 schema-2
profile -> D4B2A atomic claim -> D3/D4A payload -> D4B1 supervisor -> D4B2A
receipt or `outcome_unknown` chain over the unchanged existing eight Phase 8
routes. Its internal crate-test-only selector uses a fake Docker executable,
disposable Unix socket, marked temporary Git target, and host Git verifier.
Exact replay is metadata-only with no redispatch; ambiguity survives restart;
reconciliation performs host Git inspection only, never runtime launch or
consequence retry. P11-D4C1 adds the source-only `lnsat-git-reference`
executable, D4A-bound profile target-mount argument, host/container path-remap
validation, self-executable digest check, lazy-fetch- and Trace2-disabled
bounded Git consequence, and exact D3 result framing under hermetic host-process tests. It uses no Docker binary,
daemon, socket, or image operation. Phase 11 remains incomplete. Only the
separately authorized real disposable Docker image/runtime proof remains
required in this runtime lane.
The source-only real-Docker proof-readiness contract now freezes exact profile,
authority-configuration, adapter, executable, image, and launch-contract
bindings plus eight future proof-case identities. Its parser, fixture, hermetic
negative tests, and repository check perform no runtime I/O and do not authorize
execution. This checkpoint does not complete Phase 11; real disposable Docker
image/runtime evidence remains separately required.

Successful source validation never implies shipped support. Unknown or untested
compatibility rows remain unsupported.

## Current Foundation

- Versioned TypeScript packet, policy, approval, audit, identity, and evidence
  contracts.
- Read-only Gateway inspection; dual-era MCP/HTTP-handler interoperability;
  operation recovery; A2A, identity, telemetry, Registry, and signer-provider
  contracts; and fixture-backed Control Center reconciliation.
- Rust packet, policy, approval, audit, idempotency, and error-envelope
  deterministic-core parity.
- Embedded SQLite secure-open, ordered authority-chain/audit-event persistence,
  integrity, idempotency, transaction rollback, and verified backup/inert
  restore foundation, plus passive recovery classification and deterministic
  interrupted-migration/`SQLITE_FULL` rollback proof. Preserve-only retention
  policy and bounded no-action planning protect all current evidence. Immutable
  recovery-inspection events persist classification with exact replay and zero
  action/activation authority.
- Source-only `lnsatd` opens and verifies one explicit SQLite file before a
  loopback-only listener exposes bounded concurrent read-only readiness,
  fail-closed process-signal shutdown/restart evidence, and zero mutation
  authority. Stable `POST|GET|HEAD|PATCH|DELETE /v1/session` now issues one
  bounded password-authenticated session, reads active SQLite session evidence,
  rotates the current session secrets, or revokes the authenticated identity's
  active session family through strict same-origin browser transport. Stable
  `PATCH /v1/identity/password` performs bounded self-service credential
  rotation and closes the session family. It emits no CORS allow headers and
  returns only secret-free identity/session/credential evidence in JSON. The
  daemon holds an owner-only exclusive sidecar lease that blocks source-local
  offline owner recovery while the server is live.
- Source-local Phase 5 now includes an exact-one immutable human-owner
  bootstrap, versioned Argon2id credential evidence, and hash-only
  absolute-expiry sessions with independent anti-CSRF proof and append-only
  revocation. Schema v12 adds append-only credential rotation and permanent
  owner-authorized non-owner disablement with atomic session-family closure.
  Schema v13 adds atomic identity lifecycle audit events, now served through
  stable authenticated `GET|HEAD /v1/identities/{identity_ref}/events`.
  Schema v14 adds atomic issue/revocation/rotation security events, now served
  through stable authenticated `GET|HEAD /v1/sessions/{session_id}/events`.
  Schema v15 adds
  recovery-only actorless identity and session events. Credential-taking
  session issue, current-session
  rotation, same-identity session-family sign-out, self-service password
  rotation, owner-only identity disablement, identity-event read, and
  session-event read are now served; packet/action mutation, identity
  re-enable, recovery routes, and runtime authority remain closed.
- [Phase 4 source exit evidence](architecture/PHASE_4_EXIT_EVIDENCE.md) maps
  bootstrap, restart, migration, backup, restore, corruption, disk-full, and
  interruption negatives to checked-in tests.
- Source-only `0.1.0`; no supported runtime or published artifact.

## Fourteen Ordered Phases

### 1. Public Source and Positioning Reset

Align public subtitle, plain-language category, source docs, status, metadata,
scanner rules, compatibility debt, and changelog.

Exit: public source gates pass; LNSAT is described as execution authorization
and evidence, never as a transport replacement or shipped product.

### 2. Superseding v1 ADR and Contract Freeze

Accept ADR-0002; freeze transport-neutral packet, identity, policy, approval,
execution-authorization, receipt, audit, error, idempotency, version,
attestation, and distribution planning contracts.

Exit: boundaries are authoritative, shared fixtures cover positive and
fail-closed behavior, and unknown states deny.

### 3. Rust Deterministic Security Core

Complete parser validation, canonical serialization, hashing, permission
envelopes, policy, approval, audit/evidence, idempotency, and error mapping.

Exit: TypeScript/Rust parity, replay determinism, property tests, and
parser-risk fuzzing pass.

### 4. Durable SQLite Single-Node Product

Implement SQLite schema/migrations, transactions, idempotency, retention,
integrity, backup/restore/recovery, and loopback-default `lnsatd`.

Status: source checkpoint complete. Fresh source-local bootstrap and invocation,
restart, migration, backup, restore, corruption, disk-full, and
interrupted-operation cases fail safely with no silent data loss. Packaged
clean-install, upgrade, rollback, uninstall, and service-mode evidence belongs
to mandatory Phase 14 and is not implied by this checkpoint.

### 5. Local Identity, Sessions, Roles, CSRF, and Approval Authentication

Implement owner bootstrap, Argon2id credentials, secure revocable server
sessions, owner/operator/auditor roles, origin controls, CSRF, rate limits, and
authenticated distinct-human approval.

Status: source-local exit complete. Exact-one local human-owner bootstrap and versioned
Argon2id credential verification plus hash-only absolute-expiry sessions,
independent anti-CSRF proof, and append-only revocation are implemented in
Rust/SQLite. A pure Rust browser-API preflight now denies non-loopback peers,
Host drift, non-same-origin Fetch Metadata, unsafe read methods, and mutations
without exact Origin, JSON, and CSRF proof. Owner-authorized immutable
operator/auditor creation, fixed local control permissions, role-bound
sessions, and authenticated owner/operator approval persistence are also
implemented. Approval binds exact identity, local-session reference, CSRF, and
trusted decision time while retaining `execution_authorized: false`.
Daemon composition now strictly parses duplicate-refused browser request heads
and exact bounded bodies, emits host-only strict same-site cookie values, verifies
anti-CSRF double-submit plus active SQLite session evidence, and returns
secret-free request evidence. Server-owned UTC supplies issue/verification
time, a monotonic fixed-window limiter caps authentication attempts, and
unknown identities consume the same validated Argon2id profile. Active
bearer/CSRF mutation proof can atomically revoke every active
same-identity session through immutable revocation rows. Schema v11 adds
append-only activity evidence with 60-second touch granularity, a 900-second
default idle timeout, exact-boundary rejection, and a 61-row bound across the
maximum one-hour absolute lifetime. Existing v10 sessions anchor initially to
immutable issue time. Atomic session rotation creates fresh bearer/CSRF
material, retains the original absolute expiry, revokes the prior session, and
persists immutable replacement linkage. Schema v12 permits at most 64
strictly ordered immutable credential generations, verifies only the latest,
and atomically revokes every active same-identity session after authenticated
self-service rotation. Owner-authorized permanent non-owner disablement appends
actor-session-bound status evidence and atomically revokes the target family.
Daemon wrappers own time and generic denial. Password rotation is served through
a closed two-field JSON body, one per-session/process limiter, strict
same-origin CSRF proof, full session-family revocation, cleared cookies, and
explicit reauthentication. Owner-only
`DELETE /v1/identities/{identity_ref}` permanently disables one non-owner,
atomically revokes the target session family, and returns secret-free evidence
without adding re-enable authority.
Schema v13 atomically audits owner bootstrap, non-owner creation, password
rotation, and disablement with contiguous identity-local sequence, exact actor
session, source digest, credential generation, and trusted time. Upgraded v12
identities start forward-only without invented history. Authenticated
route-neutral reads require evidence-read permission and reject mutation
transport. Schema v14 atomically audits session issue, revocation, and rotation
with contiguous session-local sequence, exact actor/replacement/reason/source
binding, and trusted time. Upgraded v13 sessions start forward-only without
invented history. Authenticated route-neutral reads use the same evidence-read
permission and deny mutation transport. Source-local `POST /v1/session`
requires numeric loopback peer/Host, exact Origin, same-origin Fetch Metadata,
exact JSON, a non-simple `X-LNSAT-Session-Intent` header, a closed 4 KiB body,
and one process-wide limiter. Success sets fresh host-only bearer/CSRF cookies
and returns the same secret-free session contract used by authenticated
`GET|HEAD`; every issue failure is generic. `HEAD` remains bodyless, `OPTIONS`
is denied, and no CORS allow header is emitted. Authenticated
`DELETE /v1/session` requires exact zero-length JSON mutation framing plus
Origin/Fetch Metadata/CSRF proof, atomically revokes the active same-identity
session family, clears both host-only cookies, and denies replay generically.
Authenticated `PATCH /v1/session` uses the same exact empty mutation framing,
atomically replaces only the current session's bearer/CSRF material, preserves
its absolute expiry, sets fresh host-only cookies once, and generically denies
prior-token use and replay. Authenticated
`PATCH /v1/identity/password` reverifies the latest password, appends one
credential generation, atomically revokes all same-identity sessions, clears
both cookies, and requires reauthentication. Owner-only `POST /v1/identities`
accepts only a closed operator/auditor creation schema, uses server-owned time,
persists immutable credential/audit evidence, and returns no secret. Owner-only
identity disablement uses exact empty mutation framing and closes the target
family. Invalid transport, schema, credentials, limits, or persistence share
one denial. Authenticated `POST /v1/approval-requests` now binds an active
owner/operator and CSRF proof to the exact persisted policy actor and local
session, supplies server-owned time, and appends only pending evidence with no
approval or execution authority. Authenticated
`POST /v1/approval-requests/{approval_request_id}/decision` derives the
approver from an active owner/operator session, requires exact same-origin CSRF
proof and project scope, enforces a distinct human, supplies server-owned time,
and persists immutable approved/denied evidence with
`execution_authorized: false`. Optional external signing remains in the Phase 7
signed lane; packet/action mutation and identity re-enable remain closed. Source-local
offline owner recovery now requires the daemon-shared exclusive database lease,
exact database/owner confirmation, an append-only credential generation,
atomic active-owner-session revocation, and actorless recovery-only audit
evidence. A stable operator recovery command remains Phase 10. No re-enable
authority exists.

Exit: auth, scope, expiry, revocation, delegation, CSRF, self-approval, and
session negative tests pass.

Stable Gateway composition remains Phase 6, optional user-key signed approval
evidence remains Phase 7 signed lane, and stable recovery commands remain Phase 10.

### 6. Stable Gateway `/v1` APIs

Expose stable authenticated local APIs. Every packet/action mutation binds
identity, project, resource, policy, approval rule, audit, idempotency, and
recovery. Protective authentication-lifecycle mutations instead bind exact
local identity/session/role, CSRF, durable security evidence, replay, and
recovery semantics while granting no packet/action authority.

Status: source exit complete. Static loopback `GET|HEAD /v1` now establishes
exact
`LNSAT-Contract-Version: lnsat.contracts.v1_0` negotiation, repeats the
accepted version, refuses deprecated-version downgrade, and maps version
failures through the shared zero-side-effect envelope before any policy or
mutation work. Every `/v1/` subroute now inherits the same exact gate after
loopback/Host validation and before route, authentication, policy, persistence,
or mutation, then repeats the accepted version on every routed response.
Authenticated `GET|HEAD /v1/session` is now the first promoted stable subroute:
it is current-session-only, uses one generic oracle-free denial, never reflects
secrets, preserves exact bodyless `HEAD`, and explicitly declares that
successful authentication may append bounded activity evidence. It grants no
packet/action or execution mutation authority. The authority-free root
discovery exception requires no session and reveals no stored state.
Local-password `POST /v1/session` is also promoted with a closed secret-input
schema, exact same-origin/non-simple intent controls, one generic denial,
bounded limiter disclosure, fresh-session-per-success replay semantics, and
explicit session evidence/event/cookie side effects. It creates only local
authentication state and grants no packet/action or execution authority.

Authenticated `PATCH /v1/session` is promoted with exact empty JSON framing,
same-origin and double-submit CSRF proof, one generic zero-side-effect denial,
one-time current-session replay semantics, exact prior-to-replacement binding,
preserved absolute expiry, and explicit
activity/revocation/replacement/rotation/event/cookie side effects. It mutates
only the authenticated session state and grants no packet/action or execution
authority.

Authenticated `DELETE /v1/session` is promoted with exact empty JSON framing,
same-origin and double-submit CSRF proof, one generic zero-side-effect denial,
one-time active-family replay semantics, atomic same-identity session-family
revocation, forced reauthentication, and explicit
activity/revocation/event/cookie effects. It cannot select or affect another
identity and grants no packet/action or execution authority.

Authenticated `PATCH /v1/identity/password` is promoted with a closed
two-secret schema, same-origin and double-submit CSRF proof, latest-credential
reverification, bounded per-session/process limiting, one-time active-family
replay, append-only credential and identity-event evidence, atomic
same-identity session-family revocation, cookie clearing, and forced
reauthentication. One generic denial exposes only possible process-limiter
advancement; durable credential and session state remain unchanged on failure.
It cannot select another identity and grants no packet/action or execution
authority.

Owner-only `POST /v1/identities` is promoted with a closed
identity/name/role/password schema, same-origin and double-submit CSRF proof,
bounded per-session/process limiting, operator/auditor-only target roles,
create-once identity-reference replay semantics, and atomic
identity/credential/actor-session-bound event evidence. Success is secret-free
and sets no cookies. One generic denial exposes only possible process-limiter
advancement; failed SQLite transitions roll back durable
session/identity/credential/event state. It cannot create another owner and
grants no packet/action or execution authority.

Owner-only `DELETE /v1/identities/{identity_ref}` is promoted with exact empty
JSON framing, same-origin and double-submit CSRF proof, validated route-only
target selection, operator/auditor-only target roles, one-time active-target
replay semantics, and atomic identity-status/actor-session/event evidence plus
target-session-family closure. Success is secret-free and sets no cookies.
One generic zero-side-effect denial covers owner, missing, malformed,
already-disabled, transport, authorization, CSRF, clock, drift, and persistence
failures; failed SQLite transitions roll back activity, identity, event,
revocation, and session-event state. It grants no identity re-enable, owner
deletion, role mutation, packet/action, approval, or execution authority.

Authenticated `GET|HEAD /v1/identities/{identity_ref}/events` is promoted with
one exact route-only target, the existing fixed `ReadEvidence` permission for
owner/operator/auditor roles, stable sequence order, closed secret-free event
objects, preserved nullable bootstrap/recovery actors, and exact bodyless
`HEAD`. Query strings, bodies, malformed or encoded paths, mutation methods,
and `OPTIONS` fail closed. Missing authentication and unknown, tampered, or
unreadable target evidence share one identity-existence-oracle-free denial.
Both success and denial honestly declare possible bounded session-activity
evidence. It changes no identity/session authority and grants no packet/action,
approval, signing, nonce, consumption, or execution authority.

Authenticated `GET|HEAD /v1/sessions/{session_id}/events` is promoted with
exact `ses_` plus 32 lowercase-hex route grammar, the same fixed
`ReadEvidence` permission for owner/operator/auditor roles, stable sequence
order, closed secret-free event objects, preserved nullable
actor/replacement/revocation semantics, and exact bodyless `HEAD`. Query
strings, bodies, malformed or encoded paths, mutation methods, and `OPTIONS`
fail closed. Missing authentication and unknown, tampered, or unreadable
target evidence share one session-existence-oracle-free denial. Both success
and denial declare possible bounded session activity. Identity,
session-authority, packet/action, signing, nonce, consumption, execution, and
mutation authority remain false. Current-session `/v1/session` semantics are
unchanged and distinct.

Authenticated `POST /v1/approval-requests` is promoted with a closed
project/policy-reference schema, same-origin and double-submit CSRF proof,
owner/operator-only `request_action` scope, exact persisted approval-required
policy actor/local-session binding, and server-owned request time. Identical
derived identity at an identical instant replays exactly; different instants
create distinct content-bound pending requests. Success distinguishes created
from replayed and declares limiter/activity/append effects outside unchanged
domain evidence. One generic denial exposes only possible limiter advancement;
failed SQLite transitions roll back durable activity and request state. It
cannot decide, sign, authorize execution, create packets/actions/policies,
consume approval, or dispatch adapters.

Authenticated
`POST /v1/approval-requests/{approval_request_id}/decision` is promoted with a
closed project/outcome/reason schema, path-only request selection,
same-origin/double-submit CSRF proof, owner/operator-only
`decide_approval` scope, exact request/policy/packet rederivation,
distinct-human enforcement, and server-owned decision time. One immutable
terminal decision may be recorded or exactly replayed; different time,
outcome, reason, approver, or session after terminal state denies generically.
Success declares conditional outer limiter/activity/append effects outside
unchanged side-effect-free domain evidence. It cannot sign or consume
approval, authorize execution, create packets/actions/policies, or dispatch
adapters.

Exit: exact version/error/scope semantics are conformance-tested and all
transport paths delegate to Gateway. Source exit remains complete only while
every promoted `/v1` route above is proven by conformance tests; it remains
source-only and opens no supported runtime claim.

### 7. Execution Authorization and Receipt Binding

Phase 7 trust and sequencing are frozen in
[ADR-0006](architecture/ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md).
Human approval proof, execution authorization, and receipt authentication are
separate. Initial local v1 trusts local daemon/OS, accepts authenticated
`local_session` approval proof, and uses a server-side exact-bound
authorization record plus a random one-time capability stored only as a digest.
Gateway atomically redeems it before consequence. Portable signed approval is
optional and may become policy-required without blocking this core path.

Current ADR-0004 wrapper and Ed25519 work remains useful verification-only
foundation. Current ADR-0005 candidate SQL remains test-only v18 relational
and concurrency evidence. It is not runtime authority. Core schema is now v17
with seventeen registered migrations: migration 0016 adds inert persistence;
migration 0017 corrects preauthorization semantics without opening authority.

Core local-v1 build order:

1. `P7-M1` (complete): minimal v16 authorization/nonce/consume/operation/
   receipt/reconciliation/audit persistence;
2. `P7-N1` (complete): server-owned OS-CSPRNG nonce, digest-only persistence,
   trusted UTC expiry, and terminal cancellation/expiry lifecycle;
3. `P7-B1` (complete): canonical approved-action rederivation, server-owned
   attempt identity/time/idempotency, one-approval authorization cardinality,
   accepted-only canonical receipts, real-Git packet provenance, extracted
   candidate tests, durable independent review evidence, and explicit
   non-migration-eligible `legacy_phase7_evidence` classification for valid
   populated v16 databases;
4. `P7-C1` (complete): store-only constant-time capability redemption, atomic
   consumption plus terminal authorization state/audit, exact replay,
   rollback/restart/ambiguity/tamper proof, and 32-writer convergence without
   authorization issuance or dispatch;
5. `P7-A1` (complete): source-only route-neutral Gateway/store issue, metadata
   read, exact-session cancel/revoke, 60-second session-capped capability, and
   authenticated one-time C1 redemption without a served route or consequence;
6. `P7-R1` (complete): bounded disposable local Git commit adapter, receipt,
   ambiguity, and reconciliation;
7. `P7-X1` (complete): source-only core security plus bounded local
   operability conformance freeze, selected macOS arm64/APFS source profile,
   and explicit exclusions without runtime or artifact-publication authority.

P7-B1 does not convert populated v16 Phase 7 evidence. Operators preserve the
original database and a verified backup, inspect with read-only or
v16-compatible tooling, and use a separate fresh v17 database if needed.
Forced `user_version`, row deletion, or evidence rewriting is forbidden until
a separately approved migration packet exists.

Parallel optional signed-evidence order after M1:

1. `P7-K1`: v18 public-key enrollment, proof of possession, rotation,
   revocation, and compromise lifecycle;
2. `P7-S1`: isolated invoke/pull/manual hybrid signer transport;
3. `P7-V1`: operational core signature verification;
4. `P7-I1`: `external_signature` and
   `local_session_and_external_signature` proof variants.

Private keys always remain outside LNSAT. KMS/HSM signatures without trusted
user presence or separate approval ceremony are service/automation evidence,
not distinct-human approval. `P7-X1` does not depend on signed-evidence packets.
PostgreSQL/HA, fleet, multi-tenancy, contractual RPO/RTO, centralized SIEM,
legal hold, cross-region failover, and enterprise HSM governance are later
nonblocking lanes. Local backup/restore, retention, diagnostics, bounded
resources, minimal runbook, update/rollback, data-loss semantics, audit health,
and supported platform/filesystem statement remain required.

Exit: full proposal -> policy -> authenticated local approval -> expiring exact
one-time authorization -> atomic consume -> bounded Git commit -> receipt or
ambiguity -> reconciliation/audit proof passes replay, expiry, revocation,
concurrency, crash, substitution, duplicate-consequence, sandbox, and receipt
tamper negatives. Signed lane has separate proof and support gates.

### 8. MCP 2026-07-28, REST/CLI, Framework, and OPA Adapter Boundaries

Map MCP, REST, and CLI into the same canonical Gateway contract. Add optional
OPA-compatible policy input/output without delegating approval or execution
authority. Freeze public extension identity, capability, receipt, and
namespaced-client conventions needed for future modules and connectors without
opening their implementation.

Current source implements official MCP 2026-07-28 as canonical experimental
read-only protocol plus temporary bounded 2025-11-25 compatibility. FastMCP
`3.4.5` passes optional legacy-era interoperability and FastMCP `4.0.0b1`
passes experimental modern interoperability. Neither is core dependency,
session store, or authority layer. FastMCP 2.x stays outside target scope.

Status: read-only experimental conformance exists. State-changing Gateway
composition, served mutation routes, and adapter dispatch remain incomplete.
Next gate is a design/review-only runtime-composition readiness packet; it
grants no implementation or consequence authority.

Read-path parity across MCP versions, FastMCP, CLI, and REST is required before
any adapter mutation path is considered.

Implemented source sequence for this phase:

1. TypeScript MCP v2 split-package adapter and dual-era negotiation
2. read-only native/FastMCP/A2A conformance fixtures
3. outage state machine with in-memory and atomic JSON-file stores
4. OAuth, OTel, SPIFFE, Registry, supply-chain, and signer-provider boundaries
5. security ledger and fixture-backed Control Center readback

State-changing tools remain a separate future design and authorization gate.

Exit: transport-neutral fixtures prove equal decisions/evidence for v1 and v2,
no adapter bypasses Gateway validation, and stable conformance artifacts map:

- v1/v2 negotiation and downgrade behavior
- TS v2 migration behavior
- FastMCP 3 stable and FastMCP 4 beta wire/schema alignment
- worker restart
- duplicate retry
- cancellation ambiguity
- task completion with application error

Portable extension contracts remain independent of commercial implementation.

### 9. API-Backed Control Center and Ambiguity Recovery

Current source keeps the deterministic fixture contract unchanged and adds a
separate authenticated live projection on `/operations`. One explicit manual
load or refresh reads an exact operation ID, then its Gateway-supplied
authorization and optional attempt through relative same-origin requests using
the active local session and `read_evidence` permission. No list, search,
polling, persistence, reconnect, retry, reconciliation, cancellation, execute,
or receipt-submission action exists.

The live projection validates closed response shapes and exact
operation/authorization/attempt project-resource identity before rendering.
An exact attempt response may contain a newer mutable state than the inline
operation snapshot, but its immutable attempt, adapter, and protocol identity
must match. It preserves a prior valid snapshot only in memory as stale after a
failed refresh for the same exact operation; input divergence clears evidence
and late cross-input results are ignored. Otherwise failure is unavailable or
degraded with untrusted fields hidden. Completion requires a canonical Gateway receipt. Timeout, abort,
transport failure, missing response, missing receipt, or cancellation never
means success or confirmed non-execution. Synthetic fixtures remain in a
separate labeled panel and are never substituted for live failure.

Optional source-local daemon hosting loads only explicit manifest-listed
prebuilt console assets at bind and serves them on the exact numeric-loopback
origin with GET/HEAD. It adds no stable Phase 10 CLI/config contract.

Status: authenticated exact-ID Gateway evidence readback and bounded
same-origin static delivery are implemented as experimental read-only source;
production support and Phase 10 product contracts remain incomplete.

Management plane work includes:

- surfacing operation state transitions (`prepared`, `authorized`, `dispatching`,
  `accepted`, `working`, `input_required`, `completed`, `failed`,
  `transport_unavailable`, `outcome_unknown`, `reconciling`,
  `cancel_requested`, `expired`, `orphaned`)
- tracking operation identifiers, authorization references, attempt counts,
  timeout/cancel outcomes, last-observed time, and stale/degraded status
- treating `request_state` as continuation context only, not durable evidence
- separating MCP transport/session identifiers from LNSAT browser and local
  sessions
- preventing UI-driven blind retries by requiring idempotency/authorization checks

Exit: browser security and cross-surface conformance pass; management state
remains consistent under disconnect/reconnect; no route claims execution
success without Gateway-sourced completion evidence.

### 10. `lnsatd`, `lnsatctl`, and `lnsat` Product Split

Stabilize daemon, operator CLI, and convenience dispatcher contracts. Bundle
Control Center assets with server product. Make OS CLI a first-class interface
for headless, local, recovery, CI, and wrapper use. Freeze safe command
taxonomy, Gateway-only mutation flow, local socket/loopback transport,
machine-readable output, stable exit-code families, shell completion, man
pages, configuration precedence, and service-manager boundaries.

Operational configuration must expose redacted resolved precedence and permit
only monotonic narrowing across compiled, managed, deployment, runtime,
operator, and request layers. An authority-managed emergency stop dominates
lower-precedence configuration and survives reload/restart; served stop/resume
mutation remains unopened.

Status: P10-A1 target-neutral source contract spine, P10-A2 explicit-only
`lnsat.daemon.config.v1` loading/path evidence, and P10-A3 authenticated local
health/status over a server-authenticated macOS/Linux Unix socket plus
deterministic text/JSON/JSONL/YAML are implemented. Numeric-loopback HTTP
remains browser/API transport and is not a CLI bearer lane.
P10-A4 non-root offline backup, fresh inert restore, and protected-stdin owner
recovery are implemented with exclusive-lease preflight, credential/audit
append, all-owner-session revocation, and exact API/MCP/UI unavailability
parity. No served recovery or activation opens. System/user paths remain
unselected. P10-X1 source conformance passes with 13 evidence rows, 13 required
negatives, and eight compatibility guarantees. Phase 10 is complete at
source-conformance level. P11-R1 proves one experimental full served chain over
the existing Phase 8 loopback routes and a marked disposable Git fixture. It
discards the execute response, restarts the daemon, and resolves the client-side
unknown outcome only through authenticated readback and reconciliation. No new
route, production target, or support claim opens. P11-D1 adds one closed
source-only profile/parser plus exact digest binding; no Docker endpoint,
invocation, adapter/image, dispatch, receipt, or execution authority opens.
P11-D2 extends only explicit daemon configuration and config-inspection
readback with closed Docker-local profile selection plus profile/configuration
digest evidence. It opens no runtime endpoint or consequence path.
P11-D3 freezes canonical single-frame adapter-process request/result bytes,
operation and runtime identity binding, bounded stdin/stdout/stderr
observations, profile-selected deadlines, stable secret-free errors, and
unknown-outcome rejection. It launches no adapter process and opens no Docker,
repository, or receipt path. P11-I1 adds authenticated same-origin
`POST /v1/packets` for active owner/operator sessions with CSRF, exact
actor/session binding, atomic packet/policy evidence, and stable exact replay.
It grants no approval or execution authority. Phase 11 remains incomplete and
separately gated. P11-D4A closes the digest-only D3 payload gap by wrapping the
control request with the exact canonical approved execution request, target
digest, and existing Git tool-argument digest. All execution, action, target,
configuration, adapter, executable, and audience identities are recomputed and
cross-bound in one bounded frame. The wrapper opens no process, Docker endpoint,
image, mount, route, consequence, or receipt. P11-D4B1 now adds the dormant
source-only supervisor boundary with exact prelaunch identity revalidation,
restricted Docker argument construction, bounded process observation,
fail-closed ambiguity, host consequence reinspection, and semantic result
binding. Fake-runtime tests do not establish real Docker isolation. P11-D4B2A
establishes durable attempt/receipt and restart-reconciliation semantics. At
that checkpoint, no served route called the seam. P11-D4B2B now completes
served fake-runtime integration over the unchanged existing eight Phase 8
routes under an internal crate-test-only selector. The D2 -> D4B2A -> D3/D4A ->
D4B1 -> D4B2A chain uses only a fake Docker executable, disposable Unix socket,
marked temporary Git target, and host Git verifier. Exact replay never
redispatches; interrupted `outcome_unknown` survives restart; reconciliation
performs host Git inspection only without runtime launch or consequence retry.
P11-D4C1 now supplies the source-only reference-adapter executable and exact
profile mount-path handoff. Hermetic host-process tests cover mapped execution,
self-digest and direct-path rejection, canonical result binding, silent
pre-output failure, fail-closed partial output, and private-index cleanup
without Docker access. Phase 11 remains incomplete;
only a separately authorized real disposable Docker image/runtime proof remains
next in this runtime lane.
The source-only real-Docker proof-readiness contract may prepare that gate by
canonicalizing identity bindings and required proof cases, but it does not
complete Phase 11, access Docker, or establish runtime evidence.

Exit: target-neutral source contracts for commands, configuration, paths,
version/build manifests, diagnostics, and non-root runtime behavior pass.
CLI/API/MCP/UI fixtures prove equal decisions and evidence; no command accepts
ambient authority or secret-bearing process arguments. Phase 14 owns lifecycle
proof on each later-selected canonical target.

### 11. Consequential-Action Reference Workflow

Implement full local reference flow through a bounded Git commit adapter in a
disposable repository. No push, network, hook execution, unrestricted shell,
provider, infrastructure, production-repository, or public runtime authority.

Per ADR-0007, first served integration should place that bounded disposable
consequence behind one isolated local Docker/OCI profile. Agent access to
Docker socket, ambient credentials, or unrestricted upstream tools remains
forbidden.

Status: source-only disposable Git conformance exists through `P7-R1/X1`, and
P11-R1 proves one experimental served chain over existing Phase 8 routes.
P11-D1 adds the closed `lnsat.runtime_profile.docker_local.v1` contract,
strict explicit-file/parser boundary, deterministic profile and authority-
configuration digests, and side-effect-free binding to a verified derived
execution request. Docker endpoint selection, invocation, adapter/image
delivery, routes, dispatch, receipts, and support remain unopened; served
reference workflow remains incomplete. P11-D2 selects that exact profile
through one explicit daemon configuration, requires paired disposable Phase 8
runtime paths, validates the profile at configuration load, retains its
evidence for later packets, and exposes only profile identity plus profile and
authority-configuration digests through `lnsatctl config inspect`. Docker
endpoint/socket/process/image/mount access, adapter invocation, served routes,
dispatch, receipts, and support remain unopened. P11-D3 defines exact canonical
stdin request and stdout result frames for a future Docker-local adapter
process. The request binds operation, execution-request/action, authorization,
idempotency, attempt, profile, configuration, adapter/version, executable,
image, and audience identities. Protocol validation caps request/result and
retained-stderr bytes, applies the profile-selected deadline up to 30 seconds,
requires empty stderr, rejects duplicate/truncated/multiple/noncanonical frames
and every identity substitution, and never treats timeout or explicit
`outcome_unknown` as success. It starts no process, performs no Docker or Git
action, and creates no receipt. P11-I1 closes validated fixture-only packet and
policy seeding for new served requests through authenticated atomic intake.
Responses expose bounded identity, digest, policy, scope, and time evidence but
withhold canonical packet bytes, intent, constraints, and action arguments.
P11-D4A supplies those approved action and target bytes only to a future bounded
adapter stdin frame. Its 8 MiB ceiling safely contains the existing one-MiB
UTF-8 patch contract after canonical JSON escaping. Exact replay is stable;
payload, target, configuration, executable, adapter, audience, or tool-argument
substitution rejects before launch. P11-D4B1 adds a source-only schema-2
supervisor which revalidates those identities, one exact local Unix endpoint,
and the marked disposable target immediately before process creation. It builds
one restricted, environment-cleared, pull-disabled and networkless Docker run,
bounds I/O and time, treats every post-spawn anomaly as `outcome_unknown`, and
requires host Git consequence reinspection plus exact semantic result binding.
P11-D4B2A adds atomic attempt persistence, one bound receipt, interrupted-dispatch
materialization, and inspection-only reconciliation using hermetic store tests.
P11-D4B2B now passes experimental served fake-runtime integration over existing
Phase 8 loopback routes with hermetic fake executable, disposable Unix socket,
marked temporary Git target, and host Git verifier. Three adversarial served
tests confirm: success/replay/idempotency drift rejection; post-consequence
unknown survives restart and reconciles through host Git inspection only;
unchanged-target unknown persists without receipt. Exact replay is metadata-only
with no redispatch. The chain is D2 schema2 loaded profile -> D4B2A atomic claim
-> D3/D4A payload -> D4B1 supervisor -> D4B2A receipt/unknown. No served route
configures or invokes Docker. P11-D4C1 adds one source-only
`lnsat-git-reference` binary: exact D4A stdin, self-executable digest binding,
one D4A-retained profile repository-mount argument, strict host/container
identity remap, fixed bounded Git plumbing with lazy fetch and Trace2 disabled,
and exact D3 result output. Its hermetic tests use a host child process and
marked temporary Git target only. No real
Docker binary/daemon/socket, image pull/build/run, production repository,
deployment, release, package, or support exists. A separate real image/runtime
proof gate remains required.
The checked-in proof-readiness plan binds only source metadata and future case
requirements. It grants no Docker access, target consequence, receipt,
production authority, or support status.

Required operation identity before dispatch:

- operation id
- packet/action digest
- exact tool-argument digest
- authorization id
- idempotency key
- adapter identity and MCP server identity
- protocol version
- attempt counter
- optional MCP task id
- dispatch and observation timestamps
- optional receipt id

Authorization also binds repository object/worktree identity, exact base
commit, allowed paths, patch digest, commit metadata, and expected tree digest.
Receipt adds resulting commit/tree SHA, changed paths, patch digest, execution
time, and reconciliation result.

Timeout, disconnect, and cancel-ack paths must reconcile through task/result/receipt
state before deciding retry or completion.

Exit: requested action digest equals approved action digest equals authorized
action digest equals executed action digest, and the receipt binds that same
operation and action digest. Unknown outcomes remain unresolved rather than
becoming success or failure. Rollback and adapter-compromise negatives pass.

### 12. Hardware and Environment Attestation Proof

Post-local-v1 optional lane. Implement signed, expiring hardware/runtime fact
profiles only when an approved support profile requires hardware-aware policy.
Do not add discovery, placement, reservation, driver management, or scheduling.

This phase does not block initial supported local v1. If opened, exit requires
allow/deny, stale/replay/downgrade/mismatch rejection, and no scheduler behavior.

### 13. Reliability, Security, RC, Recovery, Update, and Revocation

Test resource limits, clock skew, concurrency, crash recovery, security
boundaries, dependencies, secrets, fuzzing, migration, signed updates,
downgrade denial, revocation, emergency disablement, and offline verification.

Status: incomplete. This phase must freeze one exact release-candidate source
identity, version, changelog, build recipe, support profile, and known
limitations before any Phase 14 candidate build.

Reliability for this phase explicitly includes MCP transport ambiguity and
outage recovery:

- timeout/disconnect/cancel does not prove non-execution
- duplicate retry with same idempotency key while authorization is valid
- missing task id and lost response before task-id emission
- stale status, redelivery, and authorization expiry during recovery
- reconciling outcomes and orphaned operations

Exit: release-candidate report freezes contracts, storage, security evidence,
transport state machines, recovery, support, and known limitations with no
unresolved critical/high blocker.

### 14. Canonical Artifacts, Thin Distribution, and Compatibility Evidence

After required Phases 8, 9, 10, 11, and 13 pass, one explicit candidate-build
packet selects one or two exact OS/architecture/package support rows. No row is
selected yet. Canonical CI builds immutable candidate components once for each
selected target. Unselected rows stay unsupported and do not block initial
local v1. Candidate-build authority grants no artifact publication or production
signing authority.

Each bundle includes `lnsatd`, `lnsatctl`, `lnsat`, Control Center assets,
configuration templates, licenses/notices, and version/build manifest.

Candidate wrappers, opened separately per selected profile:

- dedicated Homebrew tap: `brew install hypler-dev/tap/lnsat`;
- direct macOS/Linux `.tar.gz`;
- verified install script;
- `.deb` for Ubuntu 24.04 and Debian 13;
- `.rpm` for Rocky Linux 9;
- multi-architecture OCI image;
- `cargo install lnsat` bootstrap/verifier followed by explicit canonical
  bundle setup.

Every claimed wrapper consumes exact canonical components. Each selected row
requires
SHA-256, signature verification bundle, SPDX JSON SBOM, SLSA v1 provenance,
source revision, build recipe, component digest map, license/notices,
reproducibility, install, upgrade, rollback, uninstall, explicit service start,
non-root runtime, and no-auto-start proof.

Phase 14 signature evidence uses non-production rehearsal material. Production
signing happens only under final publication authorization against unchanged
proven digests. Any artifact-byte change repeats affected Phase 14 proof.

If selected, Homebrew requires claimed macOS bottles and Linuxbrew proof,
SHA-256 pins, `brew services` metadata, explicit start, paths, and lifecycle
tests. If selected, Linux packages require non-root `lnsat`, `/etc/lnsat`,
`/var/lib/lnsat`, journald or documented log path, disabled systemd unit, no
post-install start, config preservation, and explicit purge.

If selected, OCI requires claimed architecture manifest, canonical `lnsatd` and Control Center
digests, non-root UID/GID, read-only-root compatibility, explicit persistent
data volume, and no credentials/customer state.

Exit: every selected/claimed compatibility row and applicable cross-installer
digest equality test passes. Phase 14 selected-profile proof is mandatory
before `v1.0.0`; unselected Homebrew, tarball, install-script, deb, rpm, OCI,
or Cargo breadth remains later work.

## Publication Gate

Release publication follows Phase 14. Final tag, signing with production keys,
GitHub Release, artifact/package/container publication, stable/latest
promotion, deployment, and live infrastructure mutation
remain separately gated by explicit go/no-go authorization.

Repository source visibility is a separate pre-release decision governed by
[public source readiness](PUBLIC_READINESS.md). Audited fresh-history source is
public before Phase 14 so development can continue under public scrutiny.
Public source does not imply a release artifact, supported runtime, package,
production deployment, or stable compatibility.

## Later Platform Lanes

Winget, Scoop, MSI, Chocolatey, and signed/notarized macOS `.pkg` are later
lanes, not v1 blockers.

## Downstream Product Sequence

Separate commercial repositories do not expand the fourteen-phase v1 core
release gate. After relevant public contracts stabilize, downstream work may
proceed in this order:

1. public portable manifests and conformance for modules, connectors, agent
   profiles, skills, instructions, context objects, and model overlays;
2. private visual and CLI management of immutable content, assignments,
   history, sharing, graphs, and request-context grouping;
3. isolated certified connector packs with exact authorization/receipt binding;
4. advisory delegator-model profiles with provenance, compatibility, evaluation,
   uncertainty, and deterministic deny/escalate fallback;
5. official commercial edition manifests that compose exact public core and
   module digests without private authority forks;
6. hosted, hybrid, fleet, or multi-tenant work only after separate identity,
   isolation, data, reliability, security, and publication decisions.

See [open core and product repositories](architecture/OPEN_CORE_AND_PRODUCT_REPOSITORIES.md),
[agent configuration management](architecture/AGENT_CONFIGURATION_SKILL_AND_CONTEXT_MANAGEMENT.md),
and [CLI and OS operator interface](architecture/CLI_AND_OS_OPERATOR_INTERFACE.md).

## Hard Product Boundaries

- no MCP/A2A replacement or generic agent framework;
- no proprietary general policy language;
- no Kubernetes/Nomad replacement or generic scheduler;
- no hosted, HA, fleet, or multi-tenant v1 topology;
- no unrestricted shell, SSH, provider, database, network, DNS, or
  infrastructure authority;
- no production action in reference workflow.
