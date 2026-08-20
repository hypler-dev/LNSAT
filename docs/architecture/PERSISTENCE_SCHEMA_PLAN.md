# Persistence Schema Plan

This document describes durable storage targets beyond the implemented local
audit-ledger migration and embedded SQLite packet foundation. The Rust store
now proves secure file creation, required pragmas, seventeen ordered digest-bound
migrations, exact v1-through-v17 upgrade/reopen, immutable stable packet append,
exact replay, project/resource-scoped reads, collision refusal, integrity
checks, and transaction rollback. Stable policy decisions require
exact persisted packet/digest/scope binding. Pending approval requests require
exact approval-required policy evidence. Approval decisions bind one immutable
terminal outcome to one exact request. Audit events rebuild their complete
packet/policy/approval source chains and reject a second observation under one
terminal idempotency key. Online backup and inert restore now verify current
schema, migrations, integrity, size, and SHA-256 without overwriting or
activating a database. None grants execution authority. This is not evidence of
a deployed database or complete product schema.
Recovery inspection events persist read-only classification evidence under
deployment/target scope with no raw path, automatic action, or activation
authority. One immutable local human owner and versioned Argon2id credential
can now be bootstrapped atomically. Immutable hash-only absolute-expiry sessions
plus append-only revocation/activity and immutable rotation evidence are
implemented. Credential generations and permanent non-owner disablement are
append-only, with atomic session-family revocation. Identity lifecycle events
atomically bind those sources to actor sessions and trusted time. Offline owner
recovery adds daemon exclusion, one append-only credential generation, full
active-owner-session revocation, and recovery-only actorless events.
Authenticated approval persistence remains evidence-only; no recovery HTTP
route or execution authority exists.

Schemas v16 and v17 add and correct source-only Phase 7 attempt, nonce,
authorization, capability-consumption, operation, receipt, reconciliation,
audit, and retention evidence. P7-X1 proves bounded disposable Git consequence
and reconciliation through direct source conformance only. No served/public
Phase 7 execution-authorization, capability-redemption, or adapter mutation
route, supported runtime, production target, or publication exists.

## Principles

- Gateway policy and approval precede mutation.
- Tenant and project isolation precede multi-user deployment.
- Audit data is append-only.
- Source lineage and citations remain explicit.
- Secrets are references, never stored packet values.
- Writer, reader, migration, and administrative roles are separate.
- Retention classes are declared and testable.

## Proposed Domains

| Domain        | Proposed records                                                |
| ------------- | --------------------------------------------------------------- |
| Knowledge     | sources, snapshots, chunks, records, source refs, citation refs |
| Search        | context bundles, bundle membership, evaluation runs and results |
| Control plane | packets, policy decisions, approval requests, sessions          |
| Audit         | immutable events, digests, idempotency, retention metadata      |
| Substrates    | inventory, capability claims, freshness, adapter evidence       |

PostgreSQL audit migration artifacts plus SQLite metadata, migration ledger,
stable packet envelope, and ordered packet-resource-reference tables are
implemented. Stable policy-decision rows are also implemented with immutable
packet foreign-key binding and no execution authority. Pending approval-request
rows are implemented with immutable policy binding but no outcome or
authentication authority. Approval-decision rows are implemented with one
terminal outcome per request, exact request/policy/project binding, and
`execution_authorized: false`; they remain unsigned and unauthenticated.
Audit-event and ordered reason-code rows cover all three stable event families
with exact source-chain foreign keys and false authority flags. One
owner-singleton identity row, up to 64 contiguous versioned password
credentials per identity, hash-only sessions, append-only revocations and
activity events, immutable prior-to-replacement rotation links, and one
immutable non-owner disablement event are implemented as preserve-only
evidence. A separate append-only identity event stream begins at schema v13;
upgraded identities receive no fabricated historical event. A separate
append-only session event stream begins at schema v14 and binds issue,
revocation, and rotation to exact actor/replacement/reason/source/time
evidence; upgraded sessions likewise receive no fabricated history. Schema v15
permits actorless session revocation only for exact owner recovery and adds the
actorless `owner_recovered` identity event.
Activity sequences are capped at 61 and touched no more often than every 60
seconds; the default idle timeout is 900 seconds with exact-boundary rejection.
Rotation retains absolute expiry and binds fresh secret evidence without
storing raw values. Password rotation verifies only the latest generation and
atomically revokes the same-identity session family. Disablement binds the
active owner actor session and atomically revokes the target family. Neither
identity nor session audit evidence opens a recovery route, re-enable, or
execution authority. Knowledge, search,
and substrate product tables remain unimplemented and do not reserve a
production schema. Session lifecycle outcomes intentionally use their own
session-local stream rather than widening the identity event contract.

Retention-policy rows now classify all current SQLite authority/audit families
as immutable `control_plane` evidence with disposition `preserve`, no deletion
deadline, and no cleanup eligibility. Bounded read-only planning verifies those
rows and counts protected evidence without mutation. Removable-family cleanup
still requires a future versioned contract.

Recovery-inspection event rows bind one read-only structural classification,
OS-local path fingerprint, observation time, deployment/target scope,
idempotency, quarantine recommendation, and explicit zero activation authority.
They are unsigned and do not authenticate the caller or make quarantine changes.

## Relationship Model

All durable records bind tenant and project before production use. Packets
reference actors and sessions. Policy decisions reference packet digests.
Approvals reference exact decisions. Audit events reference all applicable
evidence. Knowledge records reference source snapshots and citations rather than
duplicating provenance.

## Roles

- migration: schema changes only through reviewed artifacts;
- writer: narrow insert rights for validated domain records;
- reader: scoped selects for Gateway query handlers;
- administrator: environment-owned operational authority, never an app role.

Default grants are empty. Table and row policies are added explicitly. A writer
for one domain receives no implicit access to another.

## Retention

Each domain declares purpose, retention class, deletion or supersession rules,
and legal/security constraints. Derived knowledge and transient session data
must be removable without corrupting append-only audit references. Audit
records should reference deleted objects through stable identifiers and bounded
metadata.

Current SQLite authority and audit families are preserve-only. No generic
delete or cleanup worker exists. Candidate limits in the implemented planner
reserve a future bound; they grant no cleanup authority.

## Migration Path

1. define versioned TypeScript contract and fixtures;
2. review privacy, tenancy, retention, and authorization model;
3. create SQL plus machine-readable manifest;
4. verify in a disposable database;
5. prove grants and failure behavior;
6. add Gateway reader or writer behind policy;
7. authorize environment rollout separately.

Vector search, embedding generation, queues, background workers, and production
storage remain outside current source-release claims.
