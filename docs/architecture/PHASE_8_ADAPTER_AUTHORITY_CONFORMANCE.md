# Phase 8 Adapter Authority Conformance

- Status: experimental adapter conformance and bounded runtime-composition implementation
- Runtime effect: marked disposable local Git commit only
- Canonical authority: Gateway
- Canonical source MCP protocol: 2026-07-28

Phase 8 proves that transport and framework adapters preserve one Gateway
decision/evidence contract. Runtime composition is limited to the eight exact
numeric-loopback routes and one marked disposable local Git commit adapter
documented below. It does not authorize network service deployment, production
identity, or any other runtime dispatch.

This transport-adapter lane is distinct from Phase 7 `P7-R1` consequential
execution adapter. ADR-0006 selects one bounded disposable local Git commit
adapter for core authority-loop proof; it forbids push, network, hooks,
unrestricted shell, ambient credentials, production repositories, and blind
retry. P7-R1 and P7-X1 are complete as source-only conformance evidence. Phase
8 now composes that source through an experimental loopback-only runtime; no
public dispatch or production-supported runtime is opened.

## Claim Rule

A support claim requires all applicable columns to pass. Documentation or a
dependency version is not implementation proof.

| Profile                          | Planned | Implemented | Tested | Experimental | Production-supported | Deprecated     |
| -------------------------------- | ------- | ----------- | ------ | ------------ | -------------------- | -------------- |
| REST read-only packet inspection | yes     | yes         | yes    | yes          | no                   | no             |
| CLI read-only packet inspection  | yes     | yes         | yes    | yes          | no                   | no             |
| legacy MCP read-only stdio       | yes     | yes         | yes    | yes          | no                   | yes, temporary |
| MCP 2026-07-28 read-only stdio   | yes     | yes         | yes    | yes          | no                   | no             |
| MCP 2026-07-28 HTTP handler      | yes     | yes         | yes    | yes          | no                   | no             |
| FastMCP 3.4.5 read-only interop  | yes     | yes         | yes    | yes          | no                   | no             |
| FastMCP 4 beta read-only interop | yes     | yes         | yes    | yes, beta    | no                   | no             |
| A2A 1.0 read-only mapping        | yes     | yes         | yes    | yes          | no                   | no             |
| Served consequential execution   | yes     | yes         | yes    | yes          | no                   | no             |

Current REST, CLI, legacy MCP, and modern MCP packet inspection share
`@lnsat/gateway`. Fixture
`fixtures/contracts/transport-neutral-packet-inspection-v0_1.json` freezes
canonical request/packet digests, policy decision, bounded failures, and empty
side effects. FastMCP harnesses and A2A mapping remain adapters/test lanes; they
contain no canonical policy or action authority.

## Canonical Fixture

Each case freezes:

- canonical request bytes and digest;
- authenticated caller/workload evidence when relevant;
- protocol/profile/version and adapter identity;
- Gateway contract/version;
- policy inputs and evaluation time;
- exact success or public-safe failure envelope;
- decision/evidence digest and `side_effects`;
- expected protocol normalization only.

Adapters may translate protocol envelopes. They may not change domain request,
Gateway decision, evidence identity, denial semantics, or side-effect posture.

## Required Equality

For same canonical fixture, direct Gateway, REST, CLI, legacy MCP, modern MCP,
FastMCP, and A2A lanes must prove:

1. same Gateway handler is invoked;
2. same closed request passes or fails;
3. same contract identity/version is returned;
4. same normalized domain response is returned;
5. same evidence/digest fields are preserved;
6. same denial code/path is preserved;
7. same `side_effects: []` read-only posture is preserved;
8. no adapter adds approval, authorization, execution, cancellation, rollback,
   receipt, identity, or trust claims.

## Negotiation Cases

- modern request selects modern entrypoint without legacy initialization;
- legacy request selects bounded compatibility entrypoint;
- unsupported version returns protocol-defined failure, including `-32022`
  where applicable;
- downgrade occurs only under explicit compatibility policy;
- malformed or timed-out negotiation never triggers implicit downgrade;
- server discovery cannot widen available Gateway capabilities;
- per-request metadata is bounded, redacted, and non-authoritative;
- JSON Schema dialect/default/coercion differences do not alter Gateway result.

## Transport Cases

### Stdio

- stdout contains protocol frames only;
- stderr diagnostics contain no secrets or raw rejected payloads;
- truncation, duplicate frame, child exit, oversized request, and malformed JSON
  fail closed;
- reconnect does not imply retry or completion.

### Stateless HTTP

Fetch-compatible stateless handler tests cover Host/Origin, content type,
request size, metadata bounds, authentication, audience/resource binding, and
independent request correlation. No production/public listener is authorized;
rate-limit and deployed edge behavior remain future listener gates.

## Framework Cases

- native TypeScript v2 split-package entrypoints speak intended era;
- FastMCP `3.4.5` stays legacy-era interop;
- FastMCP `4.0.0b1` stays experimental modern/dual-era interop;
- framework validation/coercion produces no authority difference;
- framework sessions, context, middleware, tasks, and exceptions cannot alter
  Gateway authorization semantics;
- Python lane contains no canonical Gateway, policy, or audit implementation.

## Outage and Recovery Cases

Operation recovery source now exists independently of transport/task state and
proves:

- worker restart before and after dispatch boundary;
- lost response before and after external task ID;
- duplicate delivery/retry with same and different idempotency keys;
- timeout, disconnect, cancellation request, stale status, redelivery;
- external task completes with application error;
- authorization expires during recovery;
- reconciliation yields completed, failed, outcome unknown, expired, or
  orphaned without invented evidence;
- no blind retry and no terminal success without Gateway receipt evidence.

## Identity, Observability, Registry, and Signer Cases

- OAuth issuer/resource/audience/scope/redirect/PKCE failures deny admission;
- OAuth admission never changes action authorization result;
- OTel trace/baggage is redacted correlation only;
- SPIFFE workload, human, adapter, and server identities remain distinct;
- registry metadata outage/drift cannot create trust or permission;
- dependency version, integrity, license, provenance, and support evidence are
  independently pinned;
- signer contract rejects unknown/revoked/mismatched algorithm, key reference,
  issuer, audience, purpose, digest, and expiry using test doubles only.

## Test Ownership

| Layer      | Required proof                                                       |
| ---------- | -------------------------------------------------------------------- |
| Gateway    | direct contract fixtures and fail-closed negatives                   |
| REST       | request/response normalization against direct Gateway fixture        |
| CLI        | in-process and built CLI normalization against same fixture          |
| MCP legacy | local server, SDK client, and built stdio parity                     |
| MCP modern | modern stdio/server handler parity and negotiation negatives         |
| FastMCP    | external conformance harness using committed synthetic fixtures      |
| A2A        | mapping/parser fixtures and delegation confused-deputy negatives     |
| Recovery   | deterministic state-transition/property/crash-replay tests           |
| UI         | fixture-backed read-only state rendering and unsafe-retry prevention |

## Exit Gate

Phase 8 passes only when:

- required supported rows have implementation plus automated proof;
- exact transport-neutral Gateway equality passes;
- unsupported and experimental rows are visibly labeled;
- security negatives pass;
- no adapter owns policy, approval, authorization, signer, execution, or receipt
  authority;
- full repository checks pass;
- release review explicitly approves any production-support claim.

Current source meets read-only, verification-only, or bounded experimental
implementation/test gates
for REST, CLI, dual-era native MCP, FastMCP, A2A, OAuth, recovery, OTel/SPIFFE,
Registry/supply-chain, signer-provider, Control Center readback, and exact
loopback runtime composition. All remain experimental and
production-unsupported. Public listeners, real trust, arbitrary dispatch, and
all mutation beyond the marked disposable Git fixture remain closed.

## Runtime-Composition Implementation Evidence

Status: **experimental source implementation merged through PR #103 under
granted `P8_RUNTIME_COMPOSITION_IMPLEMENTATION`; production and deployment
gates remain closed**.

This section records the smallest implemented loopback composition over
completed Phase 7 source. Only exact routes and marked disposable Git target
below are implemented. Route presence does not authorize public service,
deployment, production use, or broader target mutation.

Authority ownership remains deliberately separated:

- `lnsatd` authenticates loopback browser requests, registers only the exact
  route set, enforces daemon-wide zero-queue admission, and composes
  authorization issue, execution, readback, and reconciliation;
- `lnsat-store` owns persisted source revalidation, a 60-second maximum
  authorization lifetime, digest-only capability storage, one-time redemption,
  operation/attempt evidence, the bounded Git adapter, receipts, and exact Git
  reconciliation;
- Gateway remains the only authority boundary; HTTP is a transport adapter and
  the Git adapter is a consequence adapter;
- generic Gateway operation-recovery source remains supporting design evidence
  and does not replace the stricter Phase 7 Git state machine.

### Exact Loopback Routes

Only these routes are registered by the experimental implementation:

| Method | Exact path                                                      | Implemented effect                                                        |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `POST` | `/v1/execution-authorizations`                                  | Compose attempt, nonce, and first short-lived authorization issue         |
| `GET`  | `/v1/execution-authorizations/{authorization_id}`               | Read secret-free authorization and prepared-operation metadata            |
| `POST` | `/v1/execution-authorizations/{authorization_id}/cancel`        | Exact requester cancels an unconsumed active authorization                |
| `POST` | `/v1/execution-authorizations/{authorization_id}/revoke`        | Exact approver or local owner revokes an unconsumed active authorization  |
| `POST` | `/v1/execution-authorizations/{authorization_id}/execute`       | Exact requester redeems once, then invokes only the frozen local Git flow |
| `GET`  | `/v1/operations/{operation_id}`                                 | Read secret-free operation, latest attempt, receipt, and reconciliation   |
| `GET`  | `/v1/operations/{operation_id}/attempts/{operation_attempt_id}` | Read one secret-free attempt and its state/audit bindings                 |
| `POST` | `/v1/operations/{operation_id}/reconcile`                       | Inspect exact disposable Git evidence for an ambiguous claimed attempt    |

There is no direct route for attempt preparation, nonce issue/read/cancel,
capability metadata/readback, capability-only redemption, arbitrary adapter
selection, adapter dispatch, receipt submission, retry, or raw audit access.
Attempt and nonce records remain server-owned internals. The execute handler
may compose existing route-neutral functions, but it must not expose them as
independently callable authority steps. The Git adapter returns and persists
its receipt through the in-process authenticated boundary; a browser, MCP
client, or external adapter cannot submit a receipt.

Every route is numeric-loopback only. No wildcard bind, non-loopback peer,
hostname alias, forwarded-host trust, CORS, public listener, MCP tool, CLI
command, Unix-socket proxy, or remote adapter path belongs to this packet.

### Transport, Authentication, and Permissions

Request processing order is fixed:

1. accept only a numeric loopback peer and exact numeric bound `Host`;
2. require exact `LNSAT-Contract-Version: lnsat.contracts.v1_0` before route
   selection;
3. reject unsupported method, path, transfer coding, content type, or body size;
4. reject cross-site Fetch Metadata; mutation routes additionally require
   exact `Origin` equal to the bound loopback origin;
5. authenticate the active, unexpired, non-revoked local session;
6. on mutations, require the host-only `SameSite=Strict` CSRF cookie and exact
   independent `X-LNSAT-CSRF` double-submit value;
7. authorize project/resource scope and role before any persisted read or
   write;
8. collapse in-contract auth, scope, capability, state, and persistence failure
   to one non-oracular denial with no raw rejected-value echo.

`POST /v1/execution-authorizations`, `cancel`, and `execute` require
`request_action` and the exact requester identity plus requester session bound
to the approved persisted chain. `revoke` requires `decide_approval` and either
the exact persisted approver or a current local owner. Evidence reads require
`read_evidence` and exact project/resource scope. Reconciliation requires
`request_action`, the exact operation requester or local owner, and mutation
CSRF; it never grants another attempt.

The persisted approval must already prove an active authenticated approver with
`decide_approval`, exact project/resource scope, and a different immutable human
identity from the requester. Session identifiers alone do not satisfy the
distinct-human rule. Owner role, OS login, process UID, adapter identity,
workload identity, and service attestation cannot stand in for a second human.

### Server Ownership, Capability, and Redaction

Clients provide only documented selectors, one operation idempotency key, and,
on execute, the exact one-time capability. Server/store rederive all IDs,
digests, bindings, audience, adapter/executable identity, issue time, expiry,
state, and audit evidence from persisted approved bytes. Client-supplied time,
nonce, digest, actor, approver, target, adapter, executable, receipt, or state is
rejected.

Attempt and nonce creation are internal to authorization issue. Raw nonce bytes
never leave composition and are dropped before issue completes. Authorization
issue returns the 32-byte capability once as 64 lowercase hexadecimal bytes
only when the first transaction commits. Exact issue replay returns metadata
without the capability. A lost capability is unrecoverable: cancel if still
possible, obtain a new approval decision, and issue a new authorization. No
secret recovery or re-exposure exists.

Capability response and execute request use JSON bodies with request/response
logging disabled and `Cache-Control: no-store`. Capability bytes never enter a
URL, cookie, header, command argument, environment variable, trace, metric,
error, debug value, audit record, receipt, database, backup, or read response.
Handlers use redacted secret owners and zeroize response/request buffers after
one extraction or parse attempt. Durable state contains only the
domain-separated capability digest.

### Idempotency, Replay, Expiry, and Concurrency

- At most one execution authorization exists per approval decision.
- Authorization expiry is the earliest bound source/session expiry and the
  source-enforced 60-second cap; the interval is half-open at expiry.
- Issue replay with the exact operation idempotency key is metadata-only.
  Conflicting key, scope, approval, nonce, or binding reuse fails closed.
- Cancel and revoke are idempotent only for the exact already-recorded terminal
  transition. Neither may change `consumed`, `expired`, or another terminal
  state.
- Execute accepts only an active exact-bound authorization, exact requester
  session, canonical capability, operation identity, and idempotency identity.
  Redemption atomically records digest-only consumption before consequence.
- Exact redemption replay may return existing consumption/operation metadata;
  it never starts or repeats dispatch. Any mismatched replay is a generic deny.
- SQLite immediate transactions and uniqueness constraints serialize issue,
  cancel, revoke, expiry, and redemption. Exactly one concurrent request may
  win. Store lock exhaustion or ambiguous commit outcome fails closed.
- One operation has at most one claimed attempt. A served implementation must
  also admit at most one in-flight consequential Git operation per daemon with
  no waiting queue and must reject capacity before capability redemption.
- Served execute composition must atomically commit capability consumption and
  the unique `dispatching` attempt claim in one immediate transaction. Calling
  today's separate redemption and dispatch functions sequentially is not an
  acceptable implementation because a crash between commits would consume
  authority without a claim.

After the atomic consumption/claim commit, every crash, timeout, lost response,
or uncertain Git error becomes `outcome_unknown` until exact reconciliation.
Before that commit, no capability is consumed and no adapter process may start.

### Disposable Git Target and Sandbox

Only adapter `adapter:local:git-commit` version `v1` is selectable. Target must
be an owner-created temporary directory carrying the exact
`.lnsat-disposable-git-fixture-v1` marker and must never resolve to this source
repository, a user repository, a production repository, or a path outside the
configured disposable root.

Before redemption and again before dispatch, composition verifies canonical
repository and Git-directory paths, object format, exact symbolic head, exact
base commit, clean index/worktree, fixture-marker digest, allowed relative
paths, patch digest, expected tree, commit metadata, adapter configuration
digest, and absolute Git executable digest. Any path alias, symlink escape,
submodule, alternate object store, replacement object, worktree indirection,
unexpected ref, or evidence drift rejects the target.

Git runs with a cleared environment, fixed plumbing-only argument vectors,
temporary index, disabled hooks, signing, editors, filters, pagers, credentials,
and prompts, closed standard input, bounded output, and no shell. Network
subcommands, remotes, fetch, push, arbitrary config, external diff/merge/filter
drivers, and credential helpers are forbidden. Ref update uses exact
compare-and-swap from the approved base. Process timeout never implies safe
termination or non-execution.

### State, Receipt, and Reconciliation

Authorization state is exactly:

```text
active -> consumed | cancelled | revoked | expired
```

All four terminal states are final. Operation state is exactly:

```text
prepared -> dispatching -> completed | failed | outcome_unknown
outcome_unknown -> completed
```

`prepared` is created with authorization issue. `dispatching` requires the
atomic consumption plus unique-attempt claim and must commit before Git process
launch. `completed` requires a canonical accepted receipt. `failed` requires
durable proof of an application-level failure with no claimed success.
Transport error, timeout, cancellation request, daemon crash, process exit
ambiguity, missing response, receipt persistence failure, or target drift never
proves failure or success and therefore yields `outcome_unknown`.

There is no in-flight cancellation or retry route. Cancelling authorization is
valid only before consumption. Once dispatch is claimed, caller may request
reconciliation but cannot assert cancellation, kill success, retry eligibility,
or a terminal result.

Canonical Git receipt binds receipt, operation, attempt, authorization,
consumption, adapter/version, approved requested/executed digests, canonical
repository identity, base commit, resulting commit and tree, changed paths,
patch digest, commit metadata, result digest, and server receipt time. It is
accepted only from the in-process adapter boundary and only when every stored
binding matches. No receipt means no completed claim.

Reconciliation is read/inspection plus evidence persistence, never a second Git
attempt. It reloads exact stored request, executable/configuration digests,
repository identity, attempt, Git objects, expected tree, ref state, and any
receipt. Existing exact receipt returns idempotently. Exact committed object and
ref evidence may synthesize and persist the same canonical receipt. Unchanged
base or any mismatch remains `outcome_unknown`; it does not authorize retry.

### Rollback, Recovery, Audit, and Limits

Every pre-consequence write is transactional. Failure before redemption leaves
authorization active unless an exact terminal transition committed. Failure
after redemption never restores capability or active authority. Failure after
attempt claim preserves ambiguity. Daemon restart performs evidence validation
before accepting new mutation and enumerates every nonterminal operation for
operator-visible reconciliation; it performs no automatic dispatch or retry.

Audit writes share each authority-state transaction and bind actor/session,
project/resource, approval/policy/packet, authorization/nonce/consumption,
operation/attempt, adapter/executable/configuration, state transition, receipt,
and reconciliation digests. Audit failure blocks transition. Logs and metrics
contain only bounded opaque IDs, state, duration bucket, denial class, queue
capacity, and health; no raw packet, patch, path, capability, cookie, CSRF,
credential, personal data, or rejected value.

Served-profile limits are one in-flight consequential dispatch per
daemon, zero queued dispatches, one attempt per operation, one authorization per
approval decision, a 60-second authorization cap, a 16 KiB maximum JSON body, a
1 MiB maximum approved patch, 64 allowed paths, a 1 MiB maximum bounded Git
stdout capture, no stderr capture, and a 30-second Git process deadline. Current
source enforces and tests these bounds. A separately reviewed change may lower
limits but may not raise them or add a queue without updating this contract and
negative tests first. Exhaustion rejects before redemption when possible;
otherwise exact consumed/ambiguous evidence remains and no retry occurs.

### Implemented Runtime Deltas

The granted implementation adds all five required deltas without changing
schema:

- one store transaction that combines exact capability redemption with the
  unique operation-attempt claim and `prepared -> dispatching` transition;
- one daemon-wide single-dispatch admission guard with zero queueing;
- one exact 30-second supervised Git process deadline that kills, waits, and
  preserves `outcome_unknown` on any termination ambiguity;
- route-specific 16 KiB request framing and response redaction;
- served operation/attempt readback and operator-triggered reconciliation over
  current evidence without adding retry or receipt-submission authority.

Focused source tests and fixture
`fixtures/contracts/phase8-runtime-composition-v1.json` bind positive,
negative, race, crash-boundary, restart, limit, and hard-stop evidence. Phase 7
tests remain unchanged prerequisites.

### Required Evidence Matrix

| Class           | Positive proof                                                      | Required negative proof                                                                  |
| --------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Transport       | numeric loopback, exact Host/version, same-origin request           | non-loopback, Host alias, forwarded host, CORS, cross-site, wrong version/method/media   |
| Authentication  | active requester/approver/owner role and exact project scope        | missing/expired/revoked session, wrong role/scope, self-approval, session substitution   |
| Issue           | one approved chain creates one short-lived authorization/capability | stale/denied/drifted approval, entropy/clock/audit failure, conflicting issue replay     |
| Secret handling | one response, digest-only persistence, buffer zeroization           | readback, replay re-exposure, log/trace/error/URL/header/CLI/env/receipt leakage         |
| Transitions     | exact cancel, revoke, lazy expiry, and one winning redemption       | terminal rewrite, capability mismatch, expiry boundary, concurrent double consumption    |
| Target          | marked disposable clean repo with exact base/path/patch/tree        | user/prod repo, symlink/alternate/submodule, dirty tree, path escape, base/tree drift    |
| Sandbox         | fixed cleared-environment Git plumbing invocation                   | shell, hook, signer, filter, helper, prompt, remote, network, push, arbitrary config     |
| Dispatch        | consumption then one durable claim then one process invocation      | dispatch before consumption/claim, second attempt, capacity race, crash at each boundary |
| Receipt         | exact in-process digest-bound receipt completes once                | browser/external receipt, missing/mismatched/duplicate/tampered/future-time receipt      |
| Ambiguity       | exact object/ref inspection reconciles known commit                 | timeout/cancel/lost response treated terminal, unchanged/drifted target, blind retry     |
| Recovery/audit  | restart validates chain and exposes nonterminal state               | auto-dispatch/retry, audit failure, corrupt chain, disk-full, lock exhaustion            |
| Limits          | boundary-size request/patch/path/output/time succeeds               | every limit plus one rejects safely without widening authority                           |

`fixtures/contracts/security-conformance-ledger-v0_1.json` remains the common
security-negative index. Focused runtime proof is indexed by
`fixtures/contracts/phase8-runtime-composition-v1.json`; existing Phase 7
source tests remain prerequisites, not served-route proof.

### Exact Implementation Gate State

Gate ID is `P8_RUNTIME_COMPOSITION_IMPLEMENTATION`. User granted exact packet
scope over the frozen base. Reviewed head
`7e1d6d97cc8c61c828ac4959f593f919b4b9f247` passed DCO, independent review,
repository validation, and CI, then merged through PR #103 as
`8cbcfecff0d7937cd4fb73458a71659d30cf33a0`.

That merge opened no deployment, production support, public listener, or target
beyond the marked disposable fixture. Each still requires later independent
authorization.

## Hard Stops

This implementation packet does not authorize:

- any route beyond the exact eight listed above, any non-loopback listener, or
  any consequence beyond one marked disposable local Git commit;
- any direct attempt, nonce, capability-readback, adapter-selection,
  receipt-submission, retry, or raw-audit route;
- any production or user-repository target, push, network action, unrestricted
  command, provider, cloud, identity-provider, SPIRE, HSM, or KMS integration;
- Migration `0018`, any new migration, or edits to Migrations `0016` or `0017`;
- keys, public/private material, signer credentials, signed-evidence packets,
  or optional `P7-K1/S1/V1/I1` work;
- binaries, packages, containers, installers, service registration, host
  installation, signing, tags, GitHub Releases, publication, deployment, or
  production writes;
- Phase 9 or later implementation, automatic implementation after review, or
  any production-support claim.

Stable conformance 0.1.16 covers the supported 2025-11-25 HTTP initialize
scenario; official v2 SDK tests cover modern/stdin behavior because upstream
stable conformance has no 2026-07-28 or stdio server runner. Neither evidence
opens this runtime-composition gate.

Related design:
[MCP 2026-07-28, framework interoperability, and outage recovery](MCP_V2_FASTMCP_INTEROPERABILITY_AND_OUTAGE_RECOVERY.md).
