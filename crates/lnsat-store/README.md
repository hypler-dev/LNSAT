# `lnsat-store`

Embedded SQLite durability foundation for the local single-node LNSAT product.

The current slice owns secure database creation, required connection pragmas,
seventeen ordered digest-bound migrations, schema-version refusal, integrity
checks, and transaction rollback evidence. Immutable stable v1 packet
envelopes persist canonical bytes and SHA-256 identity atomically with
project/resource scope and a project-scoped idempotency key. Stable v1 policy
decisions persist only after exact rederivation from that packet evidence.
Pending stable v1 approval requests persist only after exact rederivation from
approval-required policy evidence. The authenticated append path additionally
requires an active owner/operator session, independent CSRF proof, server-owned
time, and exact policy actor/session binding in the same transaction. Stable v1
approval decisions persist one terminal outcome per exact request after full
rederivation. Approved records satisfy only the approval gate and always retain
`execution_authorized: false`.
Stable v1 audit events persist all three policy/approval event families with
ordered reason codes only after rebuilding their complete source chains.
Project-scoped terminal idempotency permits exact replay and rejects a second
observation. Scoped reads rederive and revalidate every stored binding.
Online-consistent backup writes a verified standalone snapshot to a fresh
owner-only path. Restore verifies schema, migration, integrity, byte-size, and
SHA-256 evidence before publishing an exact inert copy to another fresh path.
Neither operation overwrites or activates a database. Read-only recovery
inspection classifies ready, bootstrap, migration-pending, unsupported,
unrecognized, migration-drift, integrity-failure, and unreadable states without
repair, migration, quarantine mutation, or activation. Immutable recovery
inspection events persist that exact classification under deployment/target
scope with a path fingerprint, deterministic identity, exact replay, quarantine
recommendation, and `activation_authorized: false`. Raw paths are not stored.
Deterministic fault tests prove interrupted migration and capacity-exhausted
writes roll back atomically and can recover forward after the fault is removed.
Immutable schema-bound retention policies preserve every current authority and
audit family. Bounded read-only planning reports protected rows and zero cleanup
candidates; no current evidence can be deleted by retention logic.

Schema v9 atomically bootstraps exactly one immutable local human owner and one
versioned Argon2id credential. Concurrent bootstrap attempts serialize to one
success. Password verification exposes only verified/rejected status; public
records never contain the password or verifier. Identity and credential rows
are preserve-only and cannot be updated or deleted.

Schema v10 password-authenticates that owner before atomically persisting one
immutable absolute-expiry session. Only profile-bound bearer/anti-CSRF digests
and content evidence are stored; raw secrets return once. Verification checks
identity, credential, time, revocation, content binding, and optional anti-CSRF
proof. Revocations are append-only preserve-only evidence.

Schema v11 adds preserve-only append-only activity events and immutable
session-rotation links. Authenticated control-plane operations enforce a
900-second default idle timeout, reject at the exact boundary, and append a
touch no more often than every 60 seconds. Sequence and schema bounds cap a
one-hour session at 61 events. Migrated v10 sessions use immutable issue time
until their first qualifying touch. Atomic rotation creates fresh bearer and
anti-CSRF secrets, preserves the original absolute expiry, revokes the prior
session with reason `rotation`, and persists domain-separated linkage evidence
in the same immediate transaction.

Schema v12 adds append-only credential generations and permanent non-owner
disablement. Schema v13 and v14 add immutable identity/session security events.
Schema v15 adds source-local offline owner recovery: one daemon-shared
owner-only exclusive lease, exact database/owner confirmation, an append-only
Argon2id credential generation, full active-owner-session revocation, and
actorless recovery-only identity/session events in one transaction.

Schema v16 adds local authority-loop tables for exact-bound attempts, nonces,
authorization, capability consumption, operation attempts, receipts,
reconciliation, audit, and retention. Schema v17 corrects preauthorization and
accepted-receipt semantics, enforces one authorization per approval, and
preserves populated legacy-v16 evidence rather than silently converting it.
Phase 7 store source now proves server-owned nonce lifecycle, atomic
constant-time capability consumption, route-neutral exact-bound authorization,
bounded disposable Git commit dispatch, receipt binding, ambiguity, and
reconciliation. This remains source-only and `implemented_not_wired`; no
served/public Phase 7 execution-authorization, capability-redemption, or adapter
mutation route, supported runtime, production target, or publication authority
exists.

Phase 7d-A1/A2/A3/A4/A5/A6/A7 adds only one unregistered test fixture for
candidate schema v18. It proposes collision-free authority order, immutable
Ed25519 public material, append-only key-status history, immutable nonce
identity/lifecycle, immutable signed-approval evidence bound to an approved
project decision, project-scoped issuance idempotency, bounded
verification-attempt evidence, single-use nonce consumption, and scoped
nonce-consume-request idempotency with canonical request digest bindings.

Exact nonce identities are `nonce_` + 64 lowercase hex, consumption IDs are
`nsc_` + 64 lowercase hex, and authorization refs use a bounded safe lowercase
external-reference grammar. Evidence stores bounded canonical payload bytes,
exact frozen preimage digests, a 64-byte structural signature,
material/nonce/time bindings, and fixed non-authorizing fields. Issuance
idempotency binds one composite project/key to a 32-byte domain-separated
request digest and one unique evidence result.
Verification attempts store only `vat_` identity, domain-separated
project-scope and input digests, a closed result/reason pair, trusted time, and
authority position. Consumption binds `consumed_at`, material/status checks,
authorization digest, and authority sequence to one immutable row with an
adjacent terminal consumed nonce event. Raw authorization bytes are not stored.
An optional child stores safely resolved evidence/material references; raw
hostile input and unbounded errors are absent. A `#[cfg(test)]` verifier reuses
the closed wrapper parser and independently checks content, chain, request,
scope, attempt, consumption, and nonce-consume-request digests. Test-only
attempt, consumption, and consume-request-idempotency appends return only after
commit, so required failure rolls all staged rows back. A total of 30 focused
tests cover the complete 34-code rejection taxonomy, direct relational negatives,
10,000 identical-clock commits, 32-connection active-key, nonce-terminal,
evidence, idempotency, attempt, consume-request-idempotency, and consumption
races, exact read-only replay, conflict/isolation, rollback, tamper/drift/future
refusal, and required index plans. Runtime remains schema v17 with seventeen
registered migrations; normal open rejects a manually candidate-v18-upgraded
database. No signer, private material, operational signed-evidence verification,
served/public route, production adapter target, or deployment authority was
added.

The owner role does not grant runtime capability. Low-level evidence append
methods do not authenticate callers; dedicated approval-request and
approval-decision paths bind local session evidence atomically but do not sign
evidence. The crate does not expose a Gateway route, HTTP cookie/origin
enforcement, backup/restore or stable recovery command, cleanup worker,
automatic recovery activation, or supported live mutation authority.
`crates/lnsatd` separately owns loopback process composition and holds the
exclusion lease while live.

The database path must be explicit and file-backed; the final file entry cannot
be a symbolic link and its directory must already exist. On Unix, a newly
created database file is mode `0600`. SQLite WAL, foreign keys, full synchronous
writes, a bounded busy timeout, and untrusted schema mode are required and
verified.

## Verify

From the repository root:

```sh
npm run rust:check
```
