# ADR-0006: Phase 7 Local-v1 Trust and Optional Signed Evidence

- Status: accepted; P7-M1/N1/B1/C1/A1/R1 and source-only P7-X1 completed under
  separate packet approvals; runtime/publication authority remains closed
- Date: 2026-08-09
- Decision owners: LNSAT maintainers
- Scope: local-v1 trust model, approval-proof variants, execution
  authorization, signer boundary, schema sequence, reference adapter, and
  supported-release critical path
- Supersedes: ADR-0002 where it requires server-signed approval or a portable
  server-signed execution token for local v1; ADR-0004 where signed approval is
  treated as mandatory or as LNSAT-held signing authority; ADR-0005 where one
  enterprise-coupled migration and all G1-G9 gates block the local authority
  loop; Phase 14 breadth where every planned package row blocks first support
- Retains: ADR-0004 canonical-byte, domain-separation, parsing, verification,
  and fail-closed key-lifecycle requirements for the optional signed lane;
  ADR-0005 relational, transaction, idempotency, concurrency, audit, and
  rollback requirements where they apply to revised schemas
- Runtime effect: none from this ADR; separately approved P7-M1 through P7-X1
  add source/store conformance only, while served/public composition remains
  closed

## Context

Current source records authenticated local approval evidence; approval remains
unsigned and never grants execution authority by itself. Signed-wrapper parsing
and public-only Ed25519 primitives remain experimental and unwired. Runtime
SQLite is schema 17 with seventeen registered migrations. Separately approved
P7-M1 through P7-X1 provide source/store proof for nonce lifecycle,
preauthorization, atomic one-time consumption, exact-bound local authorization,
bounded disposable Git dispatch, receipts, ambiguity, reconciliation, and
conformance. Signer activation, provider calls, served/public Gateway/API
composition, production targets, deployment, and publication remain closed.

Earlier Phase 7 planning made signed approval evidence and enterprise
persistence gates prerequisites for nearly every later authority step. That
coupled three different security artifacts:

1. human approval proof: evidence that an authenticated human approved exact
   content;
2. execution authorization: permission for one bounded consequence;
3. execution receipt: evidence reporting what occurred.

These artifacts may use different authentication mechanisms and keys. Local v1
does not need portable signatures to prove its core online authority loop.

## Decision

### Local-v1 trust model

Initial supported mode trusts the local LNSAT daemon, host operating system,
and owner-controlled local storage boundary. It does not claim resistance to a
compromised kernel, root account, firmware, hypervisor, or malicious host
owner.

Human approval is authenticated through a revocable local LNSAT session and
recorded durably with exact requester, approver, policy, packet, action, target,
configuration, issue, and expiry bindings. This evidence is locally
verifiable. It is not independently portable and does not claim
nonrepudiation under host compromise.

P7-B1 makes that promise mechanical before C1/A1. Exact approved packet bytes
carry a strict versioned execution proposal. Store code reloads the persisted
decision -> request -> policy -> packet chain, rehashes packet bytes, and
derives canonical `ExecutionRequestV1` bytes plus action, target,
configuration, versioned-adapter, executable, audience, and expiry evidence.
Production callers supply only project and approval-decision selectors; they
cannot supply action evidence, timestamps, IDs, or idempotency identity.
Legacy packets without the exact proposal remain readable but cannot prepare a
new execution request.

Policy selects one closed approval-proof requirement:

```text
local_session
external_signature
local_session_and_external_signature
```

Unknown values fail closed. `local_session` is default for initial local v1.
An external signature never weakens or replaces required authenticated-session
checks unless an explicitly versioned policy profile says so.

`local_session` means an authenticated LNSAT application session. It is not an
OS login, root session, daemon auto-start rule, or package-install privilege.
Owner explicitly starts service. Non-root runtime and no-auto-start remain
release requirements. Backup, restore, and offline recovery use separately
defined owner-controlled file/daemon-exclusion procedures; they do not require
an ambient privileged application session.

### Hybrid user-owned signer lane

LNSAT open core owns canonical signing-request construction and signature
verification. It supports three provider-neutral workflows without changing
the signed-evidence contract:

1. invoke a configured external signer through an isolated signer broker;
2. expose a request for signer pull;
3. export exact canonical bytes for manual or offline signing, then import a
   bounded signature package.

Canonical signing material binds at least contract version, signing profile and
domain, approval-request identity, packet digest, policy-decision digest,
approver identity, project/resource scope, action/target/configuration or
artifact digests, issue time, expiry, server-owned signing-request nonce, and
signer/key identity. Signers sign exact canonical bytes, never
provider-specific JSON.

Private keys remain user/operator owned and controlled outside LNSAT. LNSAT,
Codex, repository source, fixtures, databases, audit records, backups, and
support tooling must never generate, receive, store, export, recover, or log
private-key material. LNSAT stores only governed public verification material,
key lifecycle evidence, request metadata, and returned signatures.

Proof of possession does not import private material. LNSAT creates an exact
domain-separated enrollment challenge; external user-controlled signer signs
it; LNSAT receives public material plus bounded signature package and verifies
both. Signing key never crosses signer boundary.

Signer broker remains outside authority core. Provider credentials and
provider-specific key-use code never enter Gateway core. Broker must not become
a blind signing oracle: signer policy or independent user presence must bind
the displayed action to exact canonical bytes.

A KMS/HSM/OS-store signature without trusted user presence or a separate
authenticated approval ceremony proves service attestation, organizational
authorization, or automation approval. It must not be labeled distinct-human
approval.

Signed approval evidence is optional for initial local v1. Policy may require
it for portable, offline, independently verifiable, or higher-assurance use.

### Local execution authorization

Initial execution authorization is an online Gateway record, not a portable
self-contained signed token.

Gateway creates:

- one server-side authorization record bound to exact actor, approval proof,
  policy decision, project, resource, action, target, adapter, executable,
  artifact/configuration digests, constraints, audience, issue time, expiry,
  revocation state, and operation identity;
- one cryptographically random, short-lived, one-time capability;
- only a domain-separated digest of that capability in durable storage.

Adapter receives bounded inputs, authorization reference, and one-time secret.
It redeems through Gateway. Gateway atomically verifies exact bindings, expiry,
revocation, capability digest, and prior-consumption state, then consumes the
authorization before allowing consequence. Reuse, conflicting replay, widened
scope, expired state, cancelled state, missing audit persistence, or partial
transaction fails closed.

Raw capability bytes never enter logs, audit evidence, receipts, command-line
arguments, environment variables, backups, or read APIs. Portable signed
authorization may be designed later for disconnected adapters; it is not a
local-v1 dependency.

### Receipt authentication stays separate

Local receipt authentication may use an authenticated, isolated adapter
channel plus exact authorization, operation, attempt, adapter, requested,
approved, executed, result, and reconciliation bindings. Portable receipt
signatures are optional unless policy or a future remote-adapter profile
requires them.

Timeout, disconnect, missing response, or cancellation request proves neither
success nor non-execution. Gateway records `outcome_unknown`, reconciles using
adapter-specific observation, and never blindly repeats a consequential action.

### Schema sequence

Migration 0016, separately authorized and registered by P7-M1, contains only
local authority-loop state:

- authorization attempts;
- server-owned nonce and expiry lifecycle;
- execution-authorization records;
- one-time capability-digest redemption and consumption idempotency;
- operation, attempt, receipt, and reconciliation state;
- exact audit bindings and fail-closed persistence health.

Migration 0017, separately authorized and registered by corrective P7-B1:

- enforces at most one execution authorization per approval decision;
- enforces that an authorization's claimed approval and bound evidence equal
  its authoritative attempt and nonce chain;
- makes canonical operation receipts accepted-only and digest-matched;
- refuses automatic upgrade when any pre-existing v16 Phase 7 record exists,
  preserving legacy inert evidence rather than reinterpreting or discarding it;
- classifies a valid populated v16 database as non-migration-eligible
  `legacy_phase7_evidence`, while semantic drift remains quarantine-recommended
  migration drift;
- adds no consumption, authorization-issuance, receipt-write, adapter, or API
  path.

Current operator disposition is preservation, not conversion: stop writers,
keep the original database plus a verified backup, inspect it read-only or with
v16-compatible tooling, and use a separate fresh v17 database if clean-schema
work must continue. Never force `user_version`, delete legacy evidence, or
rewrite it into v17. In-place conversion needs separate future approval.

Migration 0018, only after separate optional signed-evidence approval, owns:

- public verification-material enrollment and proof of possession;
- key version, rotation, retirement, revocation, and compromise history;
- canonical signing requests and signer-transport state;
- signature-verification attempts;
- immutable signed approval evidence and issuance idempotency.

The existing test-only candidate schema is v18 design evidence only. It must
not be promoted wholesale as Migration 0018.

### Revised Phase 7 lanes

Core local-v1 lane:

```text
P7-RP0 -> P7-ADR0 -> P7-M1 -> P7-N1 -> P7-B1 -> P7-C1 -> P7-A1 -> P7-R1 -> P7-X1
```

Optional signed-evidence lane begins after core schema foundation:

```text
P7-M1 -> P7-K1 -> P7-S1
                 -> P7-V1
P7-S1 + P7-V1 -> P7-I1
```

`P7-X1` does not depend on `P7-K1`, `P7-S1`, `P7-V1`, or `P7-I1`.
`P7-P1` is superseded, non-authorizing, and replaced by governed `P7-K1`
public-key enrollment and lifecycle work. No public material is requested now.

Every implementation packet required its own explicit approval. This ADR itself
approved architecture and plan text only; P7-M1 through P7-X1 were authorized
and completed later under their exact gates. Optional P7-K1/S1/V1/I1 remain
blocked and ungranted.

### First reference adapter

First consequential reference action is a bounded local Git commit in a
disposable repository. Authorization binds:

- canonical repository object identity and worktree path identity;
- exact base commit;
- exact allowed paths;
- exact patch digest;
- exact commit metadata;
- expected resulting tree digest;
- no push, network, hook execution, arbitrary command, or unrestricted shell.

Receipt records resulting commit SHA, tree SHA, changed paths, patch digest,
execution time, adapter identity, operation/authorization/consumption identity,
and reconciliation result. If commit succeeds before response is lost,
reconciliation inspects Git objects and expected tree state; it never creates a
second commit by blind retry.

### Release requirement tiers

Tier 1, local-v1 security blockers:

- exact packet/action/target/configuration binding;
- deterministic policy and authenticated approval binding;
- server-owned nonce/expiry, replay rejection, revocation/cancellation;
- atomic one-time consumption and duplicate-consequence prevention;
- no ambient adapter authority;
- receipt correlation, idempotency, ambiguity reconciliation, durable audit;
- fail-closed persistence, crash, restart, and concurrency proof.

Tier 2, bounded local operability blockers:

- SQLite backup/restore and restore test;
- retention defaults and audit-health indication;
- owner-readable diagnostics;
- bounded queues/resources;
- minimal runbook;
- update, rollback, uninstall, and explicit data-loss semantics;
- supported platform/filesystem statement.

Tier 3, nonblocking enterprise follow-up:

- PostgreSQL/HA, multi-host writers, fleet management, and multi-tenancy;
- contractual RPO/RTO, centralized SIEM/alert routing, and legal hold;
- organization-wide HSM governance and provider certification;
- cross-region failover and customer-specific compliance packages.

Hardware/environment attestation is post-local-v1 unless an approved launch
profile explicitly makes hardware-aware policy part of the product promise.

Phase 14 remains required for a supported artifact after required Phases 8, 9,
10, 11, and 13 pass, but only explicitly selected target/package rows block
first local support. Target selection is a later explicit input. Each selected
row still requires canonical artifacts,
checksums, signature verification bundle, SPDX JSON SBOM, SLSA provenance,
install/upgrade/rollback/uninstall proof, non-root behavior, and no automatic
service start. Unselected package families remain unsupported expansion lanes,
not release blockers.

## Consequences

- Source conformance proves proposal -> policy -> authenticated approval ->
  expiring exact one-time authorization -> one bounded adapter -> receipt or
  ambiguity -> reconciliation/audit without claiming supported runtime or
  private-key custody.
- Signed approval adds portable proof without controlling core execution
  sequencing.
- Human approval, service/automation attestation, execution authorization, and
  receipt authentication remain distinguishable claims.
- Enterprise reliability remains planned without blocking bounded single-node
  product proof.
- Distribution breadth can expand after one or two exact support profiles are
  selected and proven.

## Explicit exclusions from initial local-v1 claim

- portable signed human approval unless signed lane completes;
- offline/disconnected execution-authorization verification;
- production infrastructure actions, push, unrestricted shell, or general
  provider control;
- HA, fleet, multi-tenancy, PostgreSQL production topology, or cross-region
  operation;
- hardware attestation, broad connector marketplace, or every package format.

## Authorization boundary

This ADR grants no source implementation, key enrollment, key generation,
private/public material intake, migration creation or registration, runtime
write path, signer/provider call, execution capability, adapter dispatch,
artifact build, publication, deployment, commit, or push authority.
