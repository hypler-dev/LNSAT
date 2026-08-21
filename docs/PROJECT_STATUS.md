# Project Status

LNSAT `0.1.0` is pre-release, source-only software. Repository is suitable for
contract evaluation and contributor development, not production operation.

Repository source is public through the independently audited fresh-history
cutover recorded in [public source readiness](PUBLIC_READINESS.md). Public
visibility does not change this maturity, publish an artifact, or establish
support.

Initial public history uses `lnsat.public_source_snapshot.v1`. Archived Phase 7
records remain immutable, but their private Git topology and reviewer identity
are not independently replayable from public history. Validators report those
skipped checks, forbid tags and `v1.0.0`, and grant no supported-release
evidence. Public-history-native review provenance remains required before a
supported release.

Accepted product position: **Execution authorization and evidence for
consequential agent actions.** LNSAT is an authority lifecycle above MCP, A2A,
REST, CLI, and browser transports; it integrates with identity, OPA-compatible
policy decisions, hardware/runtime facts, and evidence export. Current source
does not yet implement that end-to-end lifecycle.
Canonical readiness states: Phase 7a signed-evidence design = complete; Phase 7b wrapper verification = implemented_verification_only; Phase 7c Ed25519 primitive = implemented_not_wired; Phase 7d schema candidate = proposed_test_only; P7-ADR0 local-v1 trust-model revision = complete; P7-M1 core persistence = complete; P7-N1 nonce/expiry lifecycle = complete; P7-B1 preauthorization hardening = complete; P7-C1 atomic consumption = complete (implemented_not_wired); P7-A1 local authorization = complete (source-only, implemented_not_wired); P7-R1 Git reference adapter = complete (source-only, implemented_not_wired); P7-X1 local-v1 conformance freeze = complete (source-only evidence, no runtime/publication authority); runtime is schema 17/17 with migrations 0016 and 0017 registered; optional signed-evidence packets remain blocked.
In inherited packet labels, `publication authority` means release-artifact or
runtime publication authority; it does not govern repository-source visibility.
Current completed packet is `P7-X1`. Optional signed-evidence packets
`P7-K1/S1/V1/I1` remain blocked/ungranted. `P7-P1` is superseded by `P7-K1`;
no public/private key input is requested.
[Phase 7 readiness plan](architecture/PHASE_7_READINESS_EXECUTION_PLAN.md) and
[ledger](reference/phase7-readiness.json) confirm no execution authority opened.

## Current Build Position

Phase 8 bounded loopback runtime composition is merged. Phase 9 authenticated,
exact-ID Control Center readback and manifest-only source-local console hosting
are implemented as experimental source. Phase 10 P10-A1 target-neutral
product-surface spine and P10-A2 explicit-only daemon configuration/path
contract are implemented; Phase 10 stabilization remains in progress. Required
path stays Phase 8 -> Phase 9 -> Phase 10 -> Phase 11 ->
Phase 13 -> Phase 14. Phase 12 and optional signed-evidence
packets remain nonblocking unless separately selected. No binary/package work
starts until required product/runtime phases and Phase 13 release-candidate
source freeze pass. See [product build sequence](PRODUCT_BUILD_SEQUENCE.md).

ADR-0007 accepts Docker/OCI as first v1 runtime integration profile while
preserving runtime-neutral Gateway authority and later secure-VM, native-host,
and remote profile lanes. This is direction only: no Docker adapter, image,
package, runtime dispatch, emergency-stop route, or supported deployment exists.

## Maturity Summary

| Area                 | Status                 | Evidence                                                                              |
| -------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| TypeScript contracts | Experimental           | Versioned packet, policy, approval, audit, knowledge, and substrate source with tests |
| Policy evaluation    | Experimental           | Deterministic allow, deny, and approval-required decisions in `packages/policy`       |
| Audit persistence    | Local foundation       | Stable SQLite events, PostgreSQL artifacts, idempotency, disposable tests             |
| SQLite durability    | Local foundation       | Ordered authority-chain and audit evidence persistence with rollback                  |
| Rust daemon          | Local experimental     | Exact loopback routes plus explicit closed config and manifest-only console hosting   |
| Gateway              | Local experimental     | Shared inspection, bounded runtime evidence, identity, telemetry, and Registry source |
| MCP                  | Read-only experimental | Official v2 modern stdio/HTTP handlers plus bounded temporary legacy compatibility    |
| CLI                  | Local experimental     | `lnsat` packet/manifest plus `lnsatctl` config/recovery read-only inspection          |
| Control Center       | Local experimental     | Exact-ID live Gateway readback plus separate unchanged synthetic fixture panel        |
| Agent configuration  | Proposal               | Versioned profile, skill, instruction, context, and shared-library architecture only  |
| Commercial modules   | Repository boundary    | Private repositories and public-core dependency rules; no implementation              |
| Rust                 | Local foundation       | Deterministic contracts plus embedded SQLite bootstrap and integrity core             |
| Distribution         | Not available          | No package, binary, image, installer, release, or update channel                      |
| Docker integration   | Accepted plan          | First v1 runtime profile; no adapter, image, package, or support exists               |
| Hosted runtime       | Not available          | No production service, customer-data path, or runtime dispatch                        |

“Experimental” means checked-in implementation has automated coverage but no
stable compatibility or support commitment.

## MCP, Framework, and Recovery Direction

Canonical source protocol is MCP 2026-07-28. Official TypeScript v2 split
packages back modern read-only stdio and stateless HTTP-handler behavior;
explicit negotiation retains 2025-11-25 as temporary legacy compatibility.
REST, CLI, both MCP eras, and framework lanes route through transport-neutral
Gateway contracts. Modern-only discovery, JSON Schema 2020-12, bounded
transport handling, and downgrade denial have automated proof.

FastMCP 3.4.5 passes legacy-profile interop and FastMCP 4.0.0b1 passes an
experimental modern profile from temporary isolated Python environments. A2A
1.0 mapping, OAuth access admission, OTel correlation, SPIFFE
workload-identity interfaces, Registry quarantine/supply-chain verification,
signer-provider interfaces, operation recovery, and Control Center
reconciliation readback are source-implemented and tested. Optional task-ID
fields remain correlation metadata only; MCP Tasks itself is watch-only and
unimplemented. No Roots or Sampling dependency was added.

`@modelcontextprotocol/conformance` 0.1.16 passes its supported loopback HTTP
2025-11-25 `server-initialize` scenario. That upstream stable framework does not
yet expose MCP 2026-07-28 or stdio server scenarios, so modern/stdin claims rely
on official v2 SDK tests and are not mislabeled as framework coverage. No
production listener, state-changing tool, real IdP/SPIRE/HSM/KMS integration,
signer activation, real key/trust material, execution path, or production
support exists.

Dependency audit removes all currently fixable high and moderate findings.
One upstream MCP Node/Hono Node moderate advisory remains: it affects the
Windows `serveStatic` path, while LNSAT imports only `toNodeHandler`. The audit
gate accepts only that exact pinned advisory and rejects package, path,
severity, range, source, lock-version, or additional-advisory drift.

See [MCP interoperability and outage recovery](architecture/MCP_V2_FASTMCP_INTEROPERABILITY_AND_OUTAGE_RECOVERY.md)
and [Phase 8 adapter authority conformance](architecture/PHASE_8_ADAPTER_AUTHORITY_CONFORMANCE.md).

## Expanded Product Direction

ADR-0003 and ADR-0007 now fix repository, product, and first-integration
boundaries:

- `LNSAT` remains canonical open authority core;
- `LNSAT-Commercial`, `LNSAT-Connectors`, `LNSAT-Models`, and `LNSAT-Release`
  exist as private documentation bootstraps;
- managed instructions, skills, profiles, context, graphs, and model overlays
  are planned governed inputs;
- gatekeeper models remain advisory;
- rich registry, graph editing, collaboration, certified adapters, model packs,
  and commercial composition remain downstream;
- portable formats, Gateway authority, essential security, OS CLI conventions,
  and conformance remain public-core concerns;
- Docker/OCI is first planned v1 runtime profile, but Docker remains a
  replaceable executor/MCP layer rather than LNSAT authority;
- configuration inheritance can only narrow authority, and persisted
  authority-managed emergency stop dominates lower-precedence configuration.

This direction adds no live module runtime, model deployment, connector,
registry install/enable authority, entitlement, hosted service, or commercial
artifact. See
[ADR-0003](architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md),
[ADR-0007](architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md),
and [product direction alignment](reference/PRODUCT_DIRECTION_ALIGNMENT.md).

## Compatibility

Current workspace packages are private and unpublished. Source exports may
change before first supported release. Contract changes should still use
explicit schema versions, migration notes, fixtures, conformance tests, and
changelog entries so downstream evaluation remains reviewable.

Exact-match contract-version validation now identifies
`lnsat.contracts.v1_0` as the stable v1 target and retains `v0_1` as deprecated
compatibility. TypeScript and Rust consume the same stable, deprecated,
malformed, and unsupported vectors. Unknown versions fail closed; no range or
implicit downgrade negotiation exists.

The parallel stable v1 packet-envelope family now has exact contract/schema
identities, closed-field validation, bounded reference-only identity and scope,
integer budgets, absolute expiry, explicit idempotency, canonical UTF-8 JSON,
and deterministic SHA-256 evidence. Its shared golden vector fixes the digest.
The earlier `version: "0.1"` parser remains separate with no implicit
conversion.

Rust now parses stable packet JSON into a typed envelope, validates the closed
structural schema with twenty shared TypeScript/Rust positive and negative
cases, and emits the exact committed canonical JSON bytes. Recursive object
ordering follows UTF-16 code units, array order is preserved, Unicode is not
normalized, and fractional, unsafe, or negative-zero numbers fail closed. A
deterministic risk-boundary property test and no-panic byte fuzz entry cover
parser risk. Rust SHA-256 now hashes those exact canonical UTF-8 bytes and
matches both shared packet digests. Rust permission allow/block sets now require
ascending unique identifiers and reject overlap. Real UTC instants and positive
packet validity windows now match TypeScript validation.

The stable v1 policy-decision family now snapshots and hashes the validated
packet, applies explicit deny-first capability/risk rules, binds identity,
scope, idempotency, evaluation time, and expiry, and emits deterministic
side-effect-free evidence. Unknown capabilities/profiles deny; stale packets
produce no decision. Rust now mirrors this evaluation across thirteen shared
allow, deny, approval-required, invalid-time, and stale-packet cases, including
exact golden decision/hash identities, deterministic replay, and risk-boundary
property coverage.

The stable v1 approval family now converts only exact approval-required policy
evidence into a content-bound request, then records a distinct human
identity/session decision inside the inherited expiry window. Tampering,
self-approval, non-human approver namespaces, and stale evidence fail closed.
Approval evidence never authorizes execution and has no side effects; its
digests are content identities, not authentication or signatures. Rust now
matches the exact golden request/decision ids plus fourteen shared request and
decision validation cases, deterministic replay, and request-window property
coverage.

The stable v1 audit family now rebuilds exact packet-policy-approval chains
before emitting bounded policy, approval-request, or approval-decision events.
Source and event digests, terminal-source idempotency, observation ordering,
redaction state, and zero-authority fields are explicit. The contract does not
authenticate, persist, dispatch, or mutate.

Shared TypeScript/Rust evidence now freezes the exact UTF-8 preimages and
SHA-256 identities across the stable packet, policy, approval request, approval
decision, and terminal audit event chain. Rust now proves packet parsing,
canonical-byte, packet-hash, policy-evaluation, and approval-evidence parity
plus committed-preimage digest parity. Rust also rebuilds the complete audit
source chain, matches all three golden event/source identities, rejects source
drift and early observation across nine shared cases, and preserves
deterministic replay with no persistence or execution authority.

The stable v1 error envelope now unifies version, packet, policy, approval, and
audit failures under one exported type/helper contract, closed JSON Schema, and
six-family golden fixture. Code/path pairs are compatibility identity, messages
remain public-safe and non-authoritative, family results are null, and side
effects stay empty. Rust now maps every deterministic-core failure variant to a
public-safe item and matches all six shared family vectors without widening the
distinct audit-idempotency result contract.

The stable v1 compatibility matrix now covers contract version, packet, policy,
approval request, approval decision, audit, and error-envelope families in one
authoritative fixture. Exact negotiation, closed shapes, evidence identities,
replay/idempotency, stale-evidence behavior, and explicit audited migration are
frozen without opening runtime authority.

## Known Source Cleanup

Earlier development encoded milestone identifiers in exported status constants,
tests, and synthetic fixture names. Some project-state inspection contracts also
retain legacy naming. These values are implementation metadata, not stable API.

Cleanup requires a dedicated compatibility change because API, MCP, fixtures,
and tests share those identifiers. Safe sequence:

1. inventory exported versus test-only labels;
2. define neutral lifecycle status contract;
3. add compatibility aliases or versioned replacements where needed;
4. rename synthetic project-state fixtures;
5. update TypeScript/Rust conformance and SDK reference docs;
6. remove aliases only with documented breaking-change policy.

Phase 1 inventory is recorded in the
[legacy identifier inventory](reference/LEGACY_IDENTIFIER_INVENTORY.md). It
classifies every current occurrence, names source owners and compatibility
consumers, and fixes migration order without changing identifiers.

The core package now exposes neutral product lifecycle status metadata. Its
legacy build-phase exports had no repository source consumers, so they were
replaced without compatibility aliases. Serialized schemas and runtime
responses are unchanged.

The packets package now uses neutral source-status values for all 85 exported
status constants. Exact consumer evidence found only package barrel re-exports,
so no compatibility aliases were needed. Versioned contract identifiers and
serialized evidence references remain unchanged and separately gated.

The policy package now uses neutral metadata for its six exported status
constants. The four pre-release values remain `source_only`; the parallel stable
v1 decision and approval families use `contract_only`. Earlier values had no
repository consumers.

The audit package now uses neutral metadata for its eleven exported status
constants. Ten pre-release values remain `source_only`; the parallel stable v1
audit-event family uses `contract_only`. Earlier values had no repository
consumers; ledger contract IDs, records, digests, migrations, and persistence
behavior are unchanged.

Gateway/API exports now use neutral status metadata across 33 surfaces. Four
local-beta routes retain exact legacy wire-status values under internal
compatibility constants, with response assertions. The canonical
`lnsat.gateway.project_state.v0_1` contract and
`POST /v1/project-state/inspect` route use neutral item vocabulary and
fixture paths. The legacy project-state route remains unchanged for
compatibility.

MCP exports now use neutral `read_only` status metadata across 57 surfaces.
Protocol-visible `status` and `lnsat_status` fields retain exact legacy values
under private compatibility constants with existing response assertions.
Tool names, request/response shapes, and Gateway authority remain unchanged.

The CLI now exports neutral `source_only` status metadata. Exact consumer
evidence found documentation references only, so no compatibility alias was
needed. Command names, output shapes, packet validation, and hashing behavior
are unchanged. Packet inspection now runs as `lnsat packet inspect` and uses
the same Gateway contract semantics as API and MCP transports.

Project-state MCP inspection now has the canonical versioned tool
`lnsat.project.state.inspect.v0_1` on local, official SDK, and built stdio
surfaces. The legacy tool remains registered as a read-only deprecated alias
with its exact response/error behavior and a removal floor of `2.0.0` after at
least one supported-release deprecation window. The canonical MCP tool accepts
neutral `item_id`, delegates to the canonical Gateway contract, and returns
neutral project-state fields from `fixtures/project-state/summary.json`,
`items.md`, `activity-log.md`, and `items/*.json`.

Architecture directory also contains future design proposals. Its
[catalog](architecture/README.md) separates current source notes from proposals
so roadmap documents are not mistaken for shipped capability.

## v1 Scope Decisions

[ADR-0002](architecture/ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md)
supersedes ADR-0001 platform/package restrictions and defines the authority
layer, approval direction, one-time execution authorization, exact receipt
binding, reference flow, and Phase 14 distribution.

[ADR-0006](architecture/ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
supersedes ADR-0002/0004/0005 where they made portable signed approval,
LNSAT-held signing authority, enterprise persistence gates, hardware
attestation, or every package row block initial local v1. It freezes local
session approval, digest-stored one-time capabilities, user-owned keys,
optional hybrid signing, v16 core/v17 correction/v18 optional signed-evidence split,
bounded Git commit reference adapter, and selected-target release proof.

[ADR-0001](architecture/ADR-0001_V1_SCOPE.md) remains historical authority for
retained local/self-hosted single-node, embedded SQLite, local auth, stable
`/v1`, non-root, fail-closed, and no-live boundaries.

The roadmap retains fourteen numbered phases. Core local-v1 phases remain
ordered; explicitly optional post-local-v1 lanes do not block first local
support. Phase 3 Rust deterministic
security core includes packet, policy, approval, audit, audit-event
idempotency, and six-family error-envelope parity. The
[Phase 4 source checkpoint](architecture/PHASE_4_EXIT_EVIDENCE.md) is complete:
the embedded SQLite crate enforces explicit file-backed paths, owner-only Unix
creation, WAL, foreign keys, full synchronous writes, untrusted/defensive
schema posture, ten atomic digest-bound migrations, exact v1-through-v9
upgrade and reopen verification, integrity checks, future/unknown schema rejection, and
rollback proof. Immutable stable packet records persist canonical bytes,
SHA-256 identity, project/resource scope, and project-scoped idempotency.
Immutable stable policy records require that exact packet, digest, project, and
evaluation-time binding, then rederive full decision truth on every read.
Immutable pending approval requests require exact approval-required policy,
packet digest, project, and request-time binding, then rederive full request
truth on every read. Immutable approval decisions bind one terminal outcome to
that exact request, policy, project, distinct human reference/session, reason,
time, and expiry, then rederive full decision truth on every read. Approved
records satisfy only the approval gate and retain `execution_authorized:
false`. Persistence does not authenticate the human or sign the evidence.
Immutable audit events cover policy, request, and decision event families,
bind exact source-chain and terminal-idempotency evidence, persist ordered
reason codes, and rederive the full chain on read. Their authenticated
provenance, persistence-request, and execution-authority flags remain false.
Restart and competing-writer replay, conflicting identity refusal, scoped
reads, mutation refusal, and stored-evidence drift detection are covered.
Online-consistent backup captures committed WAL state into a standalone,
owner-only, current-schema snapshot with migration, integrity, size, and
SHA-256 evidence. Restore verifies and publishes an exact inert copy only at a
fresh path; no existing or active database is replaced. Corruption, symlink,
same-path, interrupted-temp, and publish-race negatives are covered.
Read-only recovery inspection classifies ready, bootstrap, migration-pending,
legacy Phase 7 evidence, unsupported, unknown, migration-drift,
integrity-failure, and unreadable states without taking action. Injected
precommit migration interruption and
`SQLITE_FULL` raw/public writes prove atomic rollback, prior-evidence
preservation, and forward recovery after the fault clears.
Immutable retention policies classify every current authority and audit family
as preserve-only control-plane evidence with no deadline or cleanup
eligibility. Bounded read-only planning verifies exact policy/trigger evidence,
counts protected rows, returns zero candidates, and takes no action.
Immutable recovery-inspection events now persist exact read-only classification,
deployment/target scope, OS-local path fingerprint, caller-supplied canonical
time, deterministic identity/idempotency, and quarantine recommendation. Raw
paths are absent; action and activation remain false. Restart, competing-writer,
backup/restore, migration-interruption, scope, mutation, and drift negatives
pass. Caller authentication, trusted time, quarantine mutation, and activation
remain closed.
The source-only Rust `lnsatd` now requires one explicit database path, rejects
wildcard/non-loopback/port-zero configuration, opens and verifies SQLite before
binding, confirms the operating-system address is loopback, and serves at most
eight bounded concurrent requests. `GET /healthz` remains readiness-only.
Source-local `POST|GET|HEAD|PATCH|DELETE /v1/session` now issues one bounded
password-authenticated session, reads active SQLite session proof, rotates the
current session secrets, or revokes the authenticated identity's active
session family through strict same-origin browser transport. Stable
`PATCH /v1/identity/password` performs bounded self-service credential
rotation, revokes the session family, and forces reauthentication. Source-local
owner-only `DELETE /v1/identities/{identity_ref}` permanently disables one
non-owner and atomically revokes its active sessions. Stable owner-only
`POST /v1/identities` creates one immutable operator or auditor through a
closed credential schema. Responses return only public
identity/session/credential evidence, emit no CORS allow
headers, and deny `OPTIONS`. Excess work
receives public-safe `503` evidence. An idempotent in-process shutdown handle wakes
accept, stops new work, drains bounded workers, and supports clean database
restart. The binary installs a non-overwriting fail-closed handler for Unix
SIGINT/SIGTERM/SIGHUP and Windows Ctrl-C/Break events; subprocess signal tests
exit cleanly and reopen the same database. Readiness reports exact schema state
and `mutation_authority: false`; the session response separately reports
`cors_enabled: false` and `mutation_authority: false`. Served authenticated
writers are current-session secret rotation, self-service password rotation,
same-identity session-family sign-out, owner-only non-owner creation, and
owner-only non-owner disablement; no packet/action writer, identity re-enable,
recovery
activation, service installation, remote access, or production API support is
exposed. `mutation_authority: false` refers to packet, action, adapter, and
runtime authority rather than protective authentication-state operations.
Phase 5 local identity and approval authentication has passed its source-local
exit. Stable Gateway composition now owns Phase 6 lane; optional user-key
signed approval remains Phase 7 signed lane, local one-time authorization
remains Phase 7 core lane, and stable recovery commands remain Phase 10. Rust
defines an exact versioned Argon2id credential profile. SQLite schema v9
atomically bootstraps exactly one immutable human owner plus preserve-only
credential evidence. Concurrency, invalid-input rollback, reopen,
verification, tamper, migration, and interruption negatives pass. Public
records expose no password or PHC verifier. This owner record grants no runtime
authority. Schema v10 adds password-authenticated, hash-only absolute-expiry
role-bound sessions with independent anti-CSRF proof, content binding, and
append-only revocation. Raw secrets return once and are absent from persisted
and public evidence. The immutable role map now limits identity management to
the owner, approval decisions to owner/operator, and evidence reads to all
three roles. Owner-authenticated creation provisions operator/auditor
credentials. Approval persistence requires an active matching approver
session, independent anti-CSRF proof, canonical session reference, and exact
trusted decision time; approval still grants no execution authority. Role,
CSRF, substitution, expiry, reopen, migration, interruption, and tamper
negatives pass. Route-neutral daemon composition now adds bounded
duplicate-refusing HTTP/1.1 head parsing, host-only strict same-site cookies,
constant-time anti-CSRF double-submit, SQLite session/revocation verification,
secret-free authorized request evidence, and one generic denial. Server-owned
UTC now supplies issue/verification time; served session issue is bounded to
five attempts per identity and 30 process-wide per monotonic minute, while
unknown identities consume a validated fixed-profile Argon2id verification.
Authenticated mutation composition can atomically append revocations
for every active same-identity session without duplicate or cross-identity
authority. Schema v11 adds preserve-only append-only activity evidence with a
60-second touch granularity, a 900-second default idle timeout, exact-boundary
rejection, and a 61-row absolute bound. Migrated v10 sessions use immutable
issue time until their first verified touch. Atomic rotation creates fresh
bearer/CSRF material, retains the original absolute expiry, revokes the prior
session with reason `rotation`, and binds immutable replacement evidence.
Daemon authorization consumes the same idle/activity contract. Schema v12 now
adds at most 64 contiguous append-only
credential generations. Authenticated self-service password rotation
reverifies the latest password, appends the next Argon2id verifier, and
atomically revokes every active same-identity session with
`credential_revoke`; it issues no replacement session. Owner-authorized
permanent non-owner disablement appends immutable actor-session-bound status
evidence and atomically closes the target family with `owner_revoke`. Disabled
identities use the dummy Argon2id denial path. Daemon composition owns time and
generic denial for both operations. Password rotation is served through a
closed two-field JSON body, per-session/process limiting, strict same-origin
CSRF proof, full session-family revocation, cleared cookies, and explicit
reauthentication. Owner-only identity disablement is served with exact empty
framing, permanent status evidence, atomic target-family closure, and no
re-enable authority.
Schema v13 now appends identity-local security events atomically with owner
bootstrap, non-owner creation, password rotation, and disablement. Events bind
contiguous sequence, exact actor session, source digest, credential generation,
and trusted time. V12 upgrades begin a forward-only sequence without fabricated
history. Stable `GET|HEAD /v1/identities/{identity_ref}/events` now serves that
revalidated stream through exact route-only target selection, existing
evidence-read permissions, one generic identity-existence denial, stable order,
and no mutation authority. Schema v14 now appends
session-local `issued`, `revoked`, and `rotated` security events in the same
transaction as their immutable source rows. Events bind contiguous post-v14
sequence, authenticated actor session, replacement session, revocation reason,
source digest, and trusted time. V13 upgrades retain existing session evidence
without fabricated history; the first later mutation begins sequence one.
Stable `GET|HEAD /v1/sessions/{session_id}/events` now serves that revalidated
stream through exact lowercase session-id grammar, existing evidence-read
permissions, one generic session-existence denial, stable order, and no
mutation authority. The daemon holds an owner-only
exclusive database-sidecar lease for its lifetime. Schema
v15 permits actorless session revocation only for exact owner recovery and
actorless `owner_recovered` identity events only for a new append-only owner
credential generation. The source-local offline recovery core requires that
daemon-shared lease, exact canonical database and expected-owner binding,
server-external trusted time, and one atomic credential/revocation/audit
transaction. It invalidates every active owner session and opens no HTTP route.
The live loopback server now
serves `POST|GET|HEAD|PATCH|DELETE /v1/session` through strict source parsing. `POST`
requires exact Origin, same-origin Fetch Metadata, JSON, a custom
session-intent header, a closed body at most 4 KiB, and the process-wide
limiter; success sets fresh host-only bearer/CSRF cookies. All issue failures
share one stable denial. `POST /v1/session` now publishes the stable
`lnsat.gateway.session_issue.v1_0` contract with closed secret input,
fresh-session-per-success replay, possible failure-side limiter advancement,
and exact success-side limiter/session/event/cookie effects.
`GET|HEAD` now emits the stable `lnsat.gateway.session_read.v1_0` secret-free
contract with exact bodyless `HEAD`, one generic denial, and explicit bounded
activity-evidence side-effect disclosure. No route emits CORS allow headers.
Authenticated `PATCH` now emits stable
`lnsat.gateway.session_rotation.v1_0` success/failure contracts. It requires
exact zero-length JSON framing plus Origin/Fetch Metadata/CSRF proof, atomically
replaces only the current session secrets, preserves absolute expiry, binds
prior and replacement ids in immutable evidence, returns fresh host-only
cookies once, declares exact activity/revocation/replacement/rotation/event/cookie
effects, and uses one zero-side-effect denial for transport, authentication,
expiry, replay, clock, evidence, and persistence failure. Authenticated
`DELETE` uses the same transport proof, atomically revokes every active
same-identity session, clears both host-only cookies, and emits stable
`lnsat.gateway.session_family_sign_out.v1_0` success/failure contracts.
Success declares exact activity/revocation/event/cookie effects, forces
reauthentication, and is one-time per active family. Transport,
authentication, expiry, replay, clock, evidence, and persistence failures
collapse into one zero-side-effect denial without cookies or identity/session
detail. Authenticated `PATCH /v1/identity/password` accepts only
`current_password` and `new_password`, applies the shared per-session/process
limiter, reverifies the latest credential, appends one immutable generation,
atomically revokes all same-identity sessions, clears both cookies, and requires
reauthentication under stable
`lnsat.gateway.identity_password_rotation.v1_0`. Success declares exact
limiter/activity/credential/identity-event/revocation/session-event/cookie
effects. Transport, schema, credential, limit, clock, evidence, and persistence
failures share one denial that exposes only possible process-limiter
advancement and no durable credential/session change. Packet/action mutation
and identity re-enable remain unserved. Owner-only `POST /v1/identities`
accepts only identity reference, display name, operator/auditor role, and
password, binds creation to an active owner bearer/CSRF pair, and atomically
appends identity, initial credential, and actor-session-bound event evidence
under stable `lnsat.gateway.identity_creation.v1_0`. Duplicate and all
in-contract failures share one denial exposing only possible limiter
advancement and no durable state change. Authenticated
`POST /v1/approval-requests` now
requires an active owner/operator session and exact CSRF, project, persisted
policy actor, and local-session binding; server-owned time derives immutable
pending evidence with zero approval or execution authority. Authenticated
`POST /v1/approval-requests/{approval_request_id}/decision` now derives one
owner/operator approver from active local-session evidence, enforces
distinct-human review and exact project scope, and persists approved/denied
evidence with server-owned time and zero execution authority. The response is
explicitly unsigned; server signing remains closed. A stable operator recovery
command remains Phase 10; no recovery route or re-enable authority exists. A
transport-neutral Rust browser-API preflight already requires numeric
loopback peer/Host, same-origin Fetch Metadata, exact mutation Origin, JSON, and
independent CSRF proof while rejecting unknown methods and OPTIONS.
Authenticated packet/action Gateway writer and recovery composition,
operator-controlled recovery/quarantine activation, stable product commands,
service lifecycle, packaged install/upgrade/rollback/uninstall, and stable API
composition remain in their later owning phases.
No approval signer, one-time execution issuer, sandbox adapter, hardware
attester, package, binary, image, installer, release, or update channel exists.
No stable OS operator CLI, module runtime, connector, model gatekeeper,
configuration registry, shared skill library, graph editor, entitlement
service, commercial artifact, or hosted management system exists.

Provider-neutral signer readiness source now models software-vault,
PKCS#11 3.2, and cloud KMS/HSM boundaries using key references and public
readback only. It validates bounded future requests/results and lifecycle audit
metadata without calling providers. P1 remains exactly `unset`; runtime
signing, provider calls, key generation, signer activation, and production
verification all remain false.

Phase 6 source exit is complete. Stable Gateway source composition includes
authenticated approval-decision recording plus authenticated identity-event and
session-event read evidence. This exit remains source-only with no supported
runtime or deployment claim. Phase 7a signed-evidence contract foundation is
accepted in
[ADR-0004](architecture/ADR-0004_PHASE_7_SIGNED_APPROVAL_EVIDENCE.md): one new
immutable wrapper over the complete verified v1 packet-policy-request-decision
chain, pure Ed25519 over an exact domain-separated canonical preimage, pinned
public verification material, fail-closed rotation/revocation, and one
evidence/nonce identity per decision. Phase 7b now checks in pre-release,
unpublished wrapper, public-material, and closed-result schemas; TypeScript/Rust
structural parsers and full-chain rederivation; dependency-free canonical
payload/preimage/SHA-256 helpers; and 26 shared JSONL conformance cases.
Structural fixtures include public RFC key/signature bytes only and never claim
cryptographic success. Phase 7c adds one public-only pure Ed25519 primitive:
TypeScript stays runtime-neutral behind an explicit verification-provider
boundary, Node 22 conformance uses `crypto.verify(null, ...)`, and Rust pins
`ed25519-dalek` `3.0.0` with default features disabled. Exact RFC 8410 SPKI and
canonical base64url checks precede cryptographic work. The selected shared
fixture contains 28 cases (4 accepted, 24 rejected) from public RFC 8032 data,
pinned C2SP Wycheproof commit
`b61843a9a5115bb758134b6a1f5d5e502d445342`, and bounded substitution
negatives. Node 22/OpenSSL 3.5.4 and Rust also matched all 150 cases in that
pinned upstream Ed25519 corpus during dependency acceptance review.

This primitive is not wired into signed-approval evidence. No signing,
production signature verification, private material, key custody, nonce
issuance/persistence, status source, endpoint, store migration, execution
authorization, or runtime authority change exists. Structural wrapper success
still ends in `signed_approval.verification_unavailable`, and all authority
fields remain false.

[ADR-0006](architecture/ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
now controls Phase 7 sequencing. Signed approval is optional for local v1 and
uses user-owned keys only. Local approval, execution authorization, and receipt
authentication are separate. Core path uses authenticated local-session
approval plus an exact server-side authorization record and digest-stored
one-time capability redeemed atomically through Gateway. Optional v18 work
adds public-key lifecycle, hybrid invoke/pull/manual signer transport,
verification, and signed-proof variants. A KMS signature without independent
user presence is service/automation evidence, not distinct-human approval.

Phase 7d now has a proposed
[enterprise local-persistence design](architecture/ADR-0005_PHASE_7D_ENTERPRISE_LOCAL_PERSISTENCE.md).
It retains SQLite only for a measured single-host envelope and freezes
normalized append-only key-status, signed-evidence, nonce-lifecycle,
verification-attempt, single-use-consumption, and nonce-consume-request
idempotency invariants. It also defines PostgreSQL/HA gates, transaction and
migration controls, RPO/RTO, retention, telemetry, and fault/concurrency
acceptance tests. Phase 7d-A1/A2/A3/A4/A5/A6/A7 adds one inert candidate-v18
SQL fixture and test-only verifier for authority order, public Ed25519 material,
append-only key status, nonce identity/lifecycle, immutable signed-approval
evidence, project-scoped issuance idempotency, bounded verification-attempt
persistence, single-use nonce-consumption, and nonce-consume-request
idempotency. Evidence stores bounded canonical bytes, exact preimage digest
identity, structural signature bytes, material/nonce/time bindings, and fixed
false authority.
Consumption records use `nsc_` IDs, lowercase safe authorization refs, exact
`consumed_at` ordering, active material status and expiry checks, and immutable
consumption with adjacent terminal consumed nonce events. Raw authorization
bytes are not stored. Nonce-consume-request idempotency now stores one scoped
project/key request digest to one unique consumption result with canonical
`created_at`. Its domain-separated digest binds exact project, nonce, evidence,
authorization reference, and authorization digest; result/server values remain
outside request identity.
Idempotency binds one project/key to an independently rederived request digest
and unique evidence result. Verification attempts store one canonical identity,
domain-separated project-scope and hostile-input digests, a closed
verified/rejected result and reason, trusted time, and optional safely resolved
evidence/material subject. Raw input is absent. Thirty focused tests cover
the complete 34-code rejection taxonomy, relational and canonical binding,
ordering, exact read-only replay, digest conflict and scope isolation,
active-key, terminal-event, evidence, issuance-idempotency, attempt,
consumption, and consume-request-idempotency races, required-audit rollback,
capacity, tamper, future-version, and query-plan evidence. Candidate public and
signed-evidence storage remains test-only. No active signer, private material,
cryptographic verification wiring, Gateway/runtime issuance or verification
API, attempt cleanup, operational consumption, execution authority, adapter,
API activation, or deployment is implemented.

P7-M1 registers atomic SQLite migration 0016 and schema 16. It adds exact
core-loop tables, digest-only capability fields, immutable audit bindings,
retention metadata, and one inert authorization-attempt append/read path.
Fresh/upgrade/reopen, rollback, competing writer, capacity, backup/restore,
scope, idempotency, and drift tests grant no runtime authority.

P7-N1 adds store-only server-owned 32-byte OS-CSPRNG nonce issuance. Raw bytes
return only on first successful issue, zeroize on drop, and never persist;
SQLite stores SHA-256 digest evidence only. Trusted server UTC caps expiry at
`min(issued + 5 minutes, approval expiry)`. Active state becomes terminal by
cancellation or expiry, with immutable v16 audit/state evidence, exact replay,
restart/backup, rollback, clock-boundary, tamper, and competing-writer proof.
No served/public capability issuance, redemption, or execution consequence is
opened.

P7-B1 registers atomic SQLite migration 0017 and schema 17. Exact
packet-embedded execution proposals now derive inert `ExecutionRequestV1`
bytes and action, target, configuration, versioned-adapter, executable,
audience, and approval-chain evidence. Production attempt preparation accepts
only project and approval-decision selectors; store code reloads exact approved
bytes and owns trusted time, attempt/audit IDs, and idempotency identity. Legacy
packets fail closed for new preparation. One approval decision can back at most
one execution authorization, and each authorization's claimed approval and
binding evidence must equal its authoritative attempt and nonce chain.
Canonical receipt storage accepts only
authenticated digest-matched receipts; rejected payload handling stays closed
for a future append-only verification-attempt family. Migration refuses to
reinterpret or discard any pre-existing v16 Phase 7 record. A valid populated
v16 database stays at v16 with non-migration-eligible
`legacy_phase7_evidence`; semantic tamper becomes quarantine-recommended
migration drift. Operators preserve the original database and a verified
backup, inspect it read-only or with v16-compatible tooling, and use a separate
fresh v17 database if clean-schema work must continue. Forced `user_version`,
row deletion, or evidence rewriting remains forbidden pending separate future
approval. Readiness ledger v3 binds completed packets to real Git commits and
raw-blob SHA-256 manifests, candidate tests are
extracted from store root, and independent review evidence is machine-checked.
No keys, provider calls, adapter dispatch, receipt API, served/public
Gateway/API activation, execution consequence, deployment, or artifact
publication is opened.

P7-C1 adds store-only atomic one-time capability consumption without creating
authorization or capability issuance. Caller-supplied 32-byte secrets are
zeroized immediately after domain-separated digest derivation; only digests
persist and comparison uses a vetted constant-time primitive. One
`BEGIN IMMEDIATE` transaction rederives the full authorization, nonce,
approval, policy, packet, and exact pre-dispatch operation chain before it
persists consumption, terminal `consumed` authorization state, entity, and
required audit evidence. Exact replay returns original evidence without new
writes; wrong/missing/expired/revoked inputs remain non-oracular; conflicting
writers choose one winner. Rollback, post-commit ambiguity, restart/backup,
tamper, secret-disclosure, `INSERT OR REPLACE`, fixed-vector, and two 32-writer
races are covered. Independent review is Git-bound at
`docs/reference/security-reviews/P7-C1/implementation-review.json`. This is
`implemented_not_wired`: no served/public Gateway/API redemption, consequence,
operation attempt, adapter dispatch, receipt, reconciliation, provider call,
deployment, or artifact publication is opened.

P7-A1 adds source-only, route-neutral Gateway/store composition for exact-bound
local authorization issue, metadata read, cancel, revoke, and authenticated C1
redemption. One `BEGIN IMMEDIATE` issuance transaction reauthenticates the
requester bearer and CSRF token, reloads the full attempt/nonce/approval/policy/
packet/session chain, caps a digest-only 32-byte OS-CSPRNG capability to a
60-second half-open window and all source/session expiries, then atomically
persists authorization, prepared operation, state, entity, and audit evidence.
Exact replay returns metadata only. Capability wire ownership is redacted,
non-cloneable, non-serializable, zeroized on use/drop, and never stored raw.
Cancel requires the exact requester session; revoke requires the exact
approver session or owner authority; terminal races cannot reactivate a record.
Authenticated redemption rechecks the exact requester session and CSRF token
inside the consumption transaction. Rollback, post-commit ambiguity,
restart/backup, tamper, expiry boundary, wrong binding/audience/session,
concurrent issuance, and cancel/revoke-versus-redeem races are covered.
Independent review is Git-bound at
`docs/reference/security-reviews/P7-A1/implementation-review.json`. This remains
source-only and `implemented_not_wired`: no served/public mutation route,
adapter dispatch, Git consequence, operation attempt, receipt API, signing,
provider call, deployment, or artifact publication is opened.

ADR-0005 candidate SQL remains test-only design evidence and must not become
v16 wholesale. Core v16 tables remain limited to local authorization, nonce,
consumption, operation, receipt, reconciliation, and audit state; corrective
v17 hardens their semantics; optional public-key and signed-approval
persistence stays in v18. Completed local core
packets `P7-R1/X1` did not depend on optional signed packets
`P7-K1/S1/V1/I1`. PostgreSQL/HA, fleet, multi-tenancy, formal compliance,
hardware attestation, and unselected distribution rows do not block local v1.

Phase 6 source includes stable negotiation, local session
issue, authenticated current-session read, current-session rotation, and
same-identity session-family sign-out plus self-service identity-password
rotation, owner-only non-owner identity-creation, and owner-only permanent
non-owner identity-disablement, authenticated identity-event and session-event
reads, plus authenticated pending approval-request and terminal
approval-decision contracts.
Phase 6 source exit remains complete only while that stable set remains proven in
route-negative and route-positive conformance suites, with no supported runtime
or deployment claim. It remains source-only.
Loopback `GET|HEAD /v1` requires the exact
`LNSAT-Contract-Version: lnsat.contracts.v1_0` header, repeats that accepted
version on success, rejects deprecated `v0_1` rather than downgrading, and uses
the shared version-family error envelope with `side_effects: []`. The endpoint
is static, reads no store, and grants no mutation authority. It is deliberately
unauthenticated because it reveals no deployment or authority state. Every
`/v1/` subroute also requires exact stable version after loopback/Host
validation but before route, authentication, policy, store, or mutation work.
Every routed response after acceptance repeats the version header.
Approval-request creation and approval-decision recording are stable.
Local-password
`POST /v1/session` is closed-schema and non-idempotent: every success creates
fresh authentication state and cookies, while failure discloses only possible
limiter advancement. Authenticated
`GET|HEAD /v1/session` is current-session-only, returns one generic oracle-free
denial for every authentication failure, reflects no secret, and declares that
successful verification may append bounded activity evidence while granting no
packet/action or execution mutation authority.
Authenticated `PATCH /v1/session` is current-session-only and one-time:
success atomically appends replacement, prior revocation, rotation, and
security-event evidence while preserving absolute expiry and returning fresh
strict cookies; every in-contract denial is generic and zero-side-effect.
Authenticated `DELETE /v1/session` is same-identity-family-only and one-time:
success atomically revokes every active family session, appends security-event
evidence, clears both strict cookies, and forces reauthentication; every
in-contract denial is generic and zero-side-effect.
Authenticated `PATCH /v1/identity/password` is authenticated-identity-only and
one-time per active family: success reverifies the latest password, appends one
credential generation and identity event, atomically revokes the family,
clears both strict cookies, and forces login with the new password. Its generic
denial discloses possible process-limiter advancement while durable
credential/session state remains unchanged.
Owner-only `POST /v1/identities` is create-once per immutable identity
reference: success appends one operator/auditor identity, initial Argon2id
credential, and actor-session-bound identity event atomically. Its secret-free
response declares exact limiter/activity/identity/credential/event effects and
sets no cookies. Duplicate, non-owner, schema, credential, CSRF, clock, drift,
and persistence failures share one generic denial exposing only possible
process-limiter advancement; durable state rolls back.
Owner-only `DELETE /v1/identities/{identity_ref}` is one-time per active
operator or auditor target: success appends permanent identity-status and
actor-session-bound identity-event evidence, atomically closes the target
session family, and returns only the target reference, trusted time, and
revoked-session count. Its stable
`lnsat.gateway.identity_disablement.v1_0` response declares exact activity,
status, identity-event, possible target-revocation, and possible target-session
event effects. Owner, missing, malformed, already-disabled, transport, CSRF,
clock, drift, and persistence failures share one zero-side-effect generic
denial; failed SQLite transitions roll back durable activity, identity, event,
and session evidence together. No re-enable, role mutation, owner deletion,
packet/action, approval, or execution authority is added.
Authenticated `GET|HEAD /v1/identities/{identity_ref}/events` validates one
literal route-only human identity reference, requires an active owner,
operator, or auditor session with existing `ReadEvidence` permission, and
returns only closed revalidated identity-event evidence in ascending sequence
order. `HEAD` preserves status and representation headers with zero body.
Missing auth and malformed, unknown, tampered, or unreadable target evidence
share `gateway.identity_event_read.denied` without reflecting target input or
identity existence. Success and denial declare possible bounded session
activity; identity state, session authority, execution authority, and mutation
authority remain unchanged. Query, body, encoded/ambiguous path, mutation, and
`OPTIONS` requests fail closed.
Authenticated `GET|HEAD /v1/sessions/{session_id}/events` validates exact
`ses_` plus 32 lowercase-hex route grammar, requires an active owner,
operator, or auditor session with the same `ReadEvidence` permission, and
returns only closed revalidated `issued`/`revoked`/`rotated` evidence in
ascending sequence order. Existing nullable actor, replacement-session, and
revocation-reason semantics remain exact. `HEAD` preserves status and
representation headers with zero body. Missing auth and malformed, unknown,
tampered, or unreadable target evidence share
`gateway.session_event_read.denied` without reflecting target input or session
existence. Success and denial declare possible bounded session activity;
identity, session-authority, packet/action, signing, nonce, consumption,
execution, and mutation authority remain false. Query, body,
encoded/ambiguous path, mutation, and `OPTIONS` requests fail closed. The
current-session `/v1/session` route remains distinct and unchanged.
Authenticated `POST /v1/approval-requests` is content-bound by server-owned
time: exact derived identity at an identical instant replays, while a different
instant creates a distinct pending request. Stable
`lnsat.gateway.approval_request.v1_0` success declares exact
limiter/activity/append effects outside unchanged
`lnsat.approval_request.v1_0` domain evidence. Its one generic denial exposes
only possible limiter advancement and rolls back durable activity/request
state. Approval recording, signing, execution authorization, session-authority
change, packet/action mutation, and adapter dispatch remain false.
Authenticated
`POST /v1/approval-requests/{approval_request_id}/decision` derives one
distinct active owner/operator approver and canonical local session, supplies
server-owned time, rederives exact project/request/policy/packet evidence, and
records or exactly replays one immutable terminal decision. Stable
`lnsat.gateway.approval_decision.v1_0` declares conditional outer
limiter/activity/append effects outside unchanged
`lnsat.approval_decision.v1_0` domain evidence. Terminal conflicts and every
in-contract failure share one generic denial exposing only possible limiter
advancement. Signing, approval consumption, execution authorization,
session-authority change, packet/action mutation, and adapter dispatch remain
false.

## Phase 8 and Phase 9 Runtime Readback

Phase 8 merged the exact eight numeric-loopback runtime routes, daemon-wide
zero-queue dispatch admission, atomic capability-consumption plus attempt claim,
bounded disposable Git consequence, canonical receipt, and fail-closed
reconciliation evidence. It remains experimental and production-unsupported;
no public listener, user/production repository, blind retry, external receipt
submission, package, deployment, or artifact publication exists.

Phase 9 adds a read-only Control Center client for one exact operation ID. One
explicit Load/Refresh action performs only relative same-origin GETs with the
stable contract-version header and active host-only session cookie. It reads
the operation, Gateway-supplied authorization, and an attempt only when the
operation supplies its exact attempt ID. Closed-shape validation and exact
project/resource equality precede rendering. `completed` requires canonical
Gateway receipt evidence; `outcome_unknown`, failure, timeout, abort, missing
response, missing receipt, and cancellation remain non-successful and never
confirm non-execution. Prior valid live evidence survives failed refresh only
as an in-memory stale snapshot for the same exact operation. Input divergence
clears evidence, late cross-input results are ignored, and a newer mutable
attempt state is accepted only when immutable attempt/scope/adapter/protocol
identity matches. Live evidence and unchanged
`lnsat.control_center.operation_readback.v0_1` fixtures remain discriminated and
visually separate.

`DaemonConfigV1` also has an optional source-local console-root seam. P10-A2
may select it only through one explicit closed configuration file. At bind, it
rejects unsafe manifests and loads only exact regular,
non-symlinked, size-bounded assets into memory. The daemon serves only those
manifest request paths over GET/HEAD on its exact numeric-loopback origin with
self-only CSP/connect policy. There is no directory fallback, traversal,
hostname alias, forwarded-host trust, CORS, public listener, package, installer,
or target-path claim.

See
[Phase 9 API-backed Control Center](architecture/PHASE_9_API_BACKED_CONTROL_CENTER.md).

## Phase 10 Product-Surface Contract Spine

P10-A1 adds target-neutral source contract
`lnsat.product_surface.v1`. `lnsatd`, new Rust `lnsatctl` source, and TypeScript
`lnsat` expose equal source manifest identity without selecting target paths,
source revision, artifacts, package rows, or support. Stable exit-code families,
JSON machine schema, configuration precedence, secret-input rules, recovery and
service boundaries, completion/man source, non-root requirements, and build
posture are explicit.

P10-A2 adds closed contract `lnsat.daemon.config.v1` and
`lnsatd --config <absolute-path>`. One explicit file must be regular,
non-symlinked, UTF-8, at most 64 KiB, duplicate-key-free, and schema-closed. It
may select only the existing database path, numeric-loopback listen address,
paired disposable Phase 8 Git paths, and exact console-root asset manifest.
Mixed direct/config input, unsafe paths/manifests, secret fields, and
environment discovery fail closed. Existing direct daemon arguments remain
compatible.

Current `lnsatctl` implements only source-local `doctor`, public-safe `config
inspect`, exact read-only `recovery inspect`, manifest, completion, man, help,
and version. Config inspection returns exact-byte SHA-256 and applied-layer
evidence without path, address, or source-byte reflection. Recovery
inspection reflects no raw path and performs no migration, repair, quarantine,
credential change, or activation. Service install/start, offline recovery
mutation, backup/restore, update, provider, and consequence commands remain
unavailable. Existing packet inspection retains CLI/API/MCP equality; one
read-only Control Center projection now preserves exact Gateway policy and audit
evidence with empty effects.

System/user config paths, target/package paths, P10-A3 transport/output,
P10-A4 recovery/non-root/full parity, and P10-X1 exit freeze remain. Phase 10
remains in progress. See
[Phase 10 product-surface contract spine](architecture/PHASE_10_PRODUCT_SURFACE_CONTRACT_SPINE.md).

## Release Readiness Still Required

Before any supported public artifact:

- complete every local-v1-required roadmap phase; hardware attestation and
  other explicitly post-local-v1 phases remain optional;
- select one or two exact Phase 14 OS/architecture/package support rows and
  prove every selected row; unselected rows remain unsupported, not blockers;
- prove canonical component digest equality across every claimed thin wrapper;
- produce reproducible artifacts, checksums, signature bundles, SPDX JSON SBOM,
  SLSA v1 provenance, and lifecycle evidence;
- document installation, upgrade, rollback, and revocation;
- complete full-history secret and dependency scans;
- verify public CI, branch protection, issue intake, and security reporting;
- complete public-source history/privacy/metadata review and obtain explicit
  repository-visibility authorization;
- obtain separate later artifact-publication authorization after Phase 14.

See [roadmap](ROADMAP.md), [release process](RELEASING.md), and
[public-readiness report](PUBLIC_READINESS.md).
