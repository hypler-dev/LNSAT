# Data Model

LNSAT models intent, decisions, evidence, and controlled substrate access as
versioned records. TypeScript contracts remain authoritative for product
records. PostgreSQL artifacts cover the experimental audit-ledger boundary;
the embedded SQLite crate currently owns bootstrap metadata, migration evidence,
secure connection posture, integrity checks, and immutable stable v1 packet,
policy-decision, approval-request, approval-decision, audit-event, and retention
policy records, plus immutable recovery-inspection events.

## Primary Entities

| Entity            | Purpose                                     | Owner                               |
| ----------------- | ------------------------------------------- | ----------------------------------- |
| Packet            | Bounded request or evidence envelope        | `packages/packets`                  |
| Actor and session | Identity and execution context references   | `packages/core`, `packages/packets` |
| Policy decision   | Allow, approval-required, or block result   | `packages/policy`                   |
| Approval record   | Scoped human authorization evidence         | `packages/policy`                   |
| Audit record      | Immutable decision and action evidence      | `packages/audit`                    |
| Knowledge record  | Source-derived content with citations       | `packages/packets`                  |
| Substrate record  | Inventory, capability, and adapter evidence | `packages/packets`                  |

Future managed-agent-content families include immutable instruction, skill,
profile, context, graph, model-overlay, assignment, work-context, compatibility,
evaluation, quarantine, revocation, and rollback records. ADR-0003 fixes their
identity/evidence boundary but no durable schema exists.

These future records require content digest, origin, dependencies, resolution
trace, scope, owner, classification, compatibility, review/approval,
activation, expiry, revocation, and rollback references. Entitlement state is
separate and cannot encode action permission.

## Identity and References

Records use stable opaque identifiers. Relationships are explicit references,
not inferred from display labels. Source and citation references preserve
lineage without copying an entire source into every record.

Minimum isolation dimensions are project and actor. Durable multi-tenant
storage must add tenant isolation before production use.

## Immutability

Packets, decisions, approvals, and audit records are evidence. Corrections
append superseding records; they do not silently rewrite history. Canonical
digests bind validated data to persistence and conformance fixtures.

## Sensitive Data

The model stores secret references, not secret values. Implementations must
minimize personal data, rejected raw input, environment details, and source
bodies. Retention and deletion policy applies to derived knowledge and session
state; audit evidence follows its declared retention class.

## Persistence Status

The repository includes versioned PostgreSQL audit-ledger artifacts and 17
registered embedded SQLite migrations through schema v17. SQLite packet rows bind
canonical bytes and SHA-256 identity to packet id, project, ordered resource references, and a
project-scoped idempotency key. Policy rows bind deterministic decision id,
packet digest, project, evaluation time, expiry, and outcome to that immutable
packet through a composite foreign key. Reads rederive full policy truth from
the persisted packet and stable core. Exact replay is read-only; conflicting
reuse fails atomically; reads require exact project and optional resource
scope. These methods do not perform user authorization.

Pending approval-request rows bind content identity, exact approval-required
policy decision, packet digest, requester/session references, project, request
time, and expiry through a composite foreign key. Reads rederive complete
request content.

Approval-decision rows bind one terminal approved or denied outcome to an exact
request, policy, project, distinct human reference/session, decision time,
reason, and inherited expiry. Reads rederive complete decision content.
Approved rows set the approval gate only; `execution_authorized` remains false.
These records are unsigned and do not authenticate the human reference.

Audit-event rows cover policy, approval-request, and approval-decision event
families. They bind the exact packet digest, policy, optional approval chain,
project, identity/session, source hash, terminal idempotency key, event and
observation times, redaction state, and ordered reasons. Reads rebuild the full
source chain. Authentication, persistence-request, and execution-authority
flags remain false.

Online backup produces a current-schema standalone SQLite snapshot with
verified migration, integrity, size, and SHA-256 evidence. Restore publishes an
exact inert copy only to a fresh path. It does not overwrite or activate a
database. Read-only recovery inspection classifies structural readiness,
migration eligibility, unsupported/unknown state, drift, integrity failure,
and unreadable data without taking automatic action. Interrupted migrations and
capacity-exhausted writes have deterministic rollback and forward-recovery
proof. Retention rows classify every current authority/audit family as
preserve-only control-plane evidence with no deadline or cleanup eligibility.
Read-only bounded planning reports zero candidates and takes no action.
Recovery-inspection rows preserve deployment/target-scoped structural evidence,
OS-local path fingerprints, deterministic identity/idempotency, quarantine
recommendations, and false action/activation fields. Raw paths are absent.
Future removable-family cleanup, other product-domain tables, quarantine
mutation, recovery activation, and authenticated runtime composition remain
design targets, not claims about a deployed database.

Schema v16 adds local authority-loop persistence: exact-bound authorization
attempts, nonce state, execution-authorization records, digest-only capability
consumption, operation/attempt/receipt/reconciliation state, immutable audit
bindings, and preserve-only retention metadata. Schema v17 corrects
preauthorization and receipt semantics, enforces one authorization per approval,
and fails closed rather than reinterpreting populated legacy-v16 authority
evidence.

Current Phase 7 store source implements attempt preparation, server-owned nonce
issue/read/cancel, atomic capability consumption, exact-bound local
authorization issue/read/cancel/revoke/authenticated redemption, bounded
disposable Git dispatch, digest-bound receipts, ambiguity, and reconciliation.
Nonce/capability secrets return once, persist only as SHA-256 digests, bind the
complete approval/session/action/target chain, and expire under trusted UTC.
These methods and tests are source-only and `implemented_not_wired`: no
served/public Phase 7 execution-authorization, capability-redemption, or adapter
mutation route, runtime dispatch composition, production target, deployment,
or publication authority exists.

The Phase 7d
[enterprise local-persistence proposal](ADR-0005_PHASE_7D_ENTERPRISE_LOCAL_PERSISTENCE.md)
defines a future normalized, append-only model for public verification
material, status history, signed evidence, nonce lifecycle, verification
attempts, single-use consumption, and nonce-consume-request idempotency.
[ADR-0006](ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
supersedes its migration sequence: v16 plus corrective v17 contain core local
authorization/nonce/consume/operation/receipt/reconciliation/audit state;
public-key and signed-evidence state moves to optional v18. Candidate below is
test evidence only and must not be promoted wholesale.
Phase 7d-A1/A2/A3/A4/A5/A6/A7 now adds one inert,
unregistered candidate-v18 SQL fixture and test-only verifier for global
authority order, public Ed25519 material, append-only key-status history,
approved-decision-bound nonce identity/lifecycle, immutable signed-approval
evidence, project-scoped issuance idempotency, verification attempt evidence,
single-use nonce-consumption evidence, and scoped consume-request idempotency.
Evidence stores bounded canonical payload bytes, exact frozen preimage digest
identity, 64-byte structural signature bytes, relational decision/material/nonce/
time bindings, and fixed non-authorizing fields. Idempotency stores one
composite project/key, one 32-byte request digest, one unique evidence result,
and canonical creation time for issuance. Consumption idempotency separately
binds exact project, nonce, evidence, authorization reference, and authorization
digest to one unique consumption result; generated consumption/time/order values
remain outside request identity.
Attempts store one canonical `vat_` identity, domain-separated project-scope and
input digests, closed result/reason codes, trusted observation time, and
optional normalized evidence/material subject rows. A6 also adds one canonical
`nsc_` consumption identity, safe external authorization-reference/digest
binding, and adjacent terminal consumed-event checks. A7 adds immutable,
preserve-only scoped replay evidence and one atomic consumption/event/idempotency
test path. Raw hostile input and raw authorization bytes are never stored. The
test-only verifier reuses the closed wrapper parser and independently rederives
request, scope, attempt, authorization, consumption, and chain digests; it
performs no cryptographic verification or operational authorization validation.
Runtime schema and registered migrations are v17/17. Public Phase 7 store
source includes source-only consumption, authorization, disposable Git adapter,
receipt, ambiguity, and reconciliation behavior. No signer, private material,
operational signed-evidence verification, served/public Gateway/API activation,
production adapter target, or deployment authority was added. Broader proposal
keeps SQLite only inside a measured same-host envelope and defines
service-engine gates.

## Schema Evolution

- Additive compatible fields may extend a supported version.
- Required-field or semantic changes require a new version.
- Migrations must be reviewable, deterministic, and paired with rollback or
  forward-recovery guidance.
- Shared TypeScript/Rust fixtures prove cross-language agreement.
- Source validators, migration manifests, fixtures, and docs change together.
