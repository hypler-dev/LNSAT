# Policy and Audit

LNSAT separates identity, authorization, approval, and evidence. Authentication
identifies an actor. Policy decides whether a capability is allowed. Approval
records a required human decision. Audit records what was requested and how the
system decided.

## Policy Evaluation

A policy decision must bind:

- actor, project, and session;
- requested capability and resources;
- packet identity and digest;
- risk level and policy profile;
- decision: allowed, approval required, or blocked;
- reason codes and applicable constraints.

Evaluation is deterministic for the same validated input and policy set.
Unknown capabilities and incomplete evidence fail closed. Policy code lives in
`packages/policy`.

The stable v1 decision contract is `lnsat.policy_decision.v1_0`, serialized as
`lnsat.policy_decision.schema.v1_0`. It consumes only a validated v1 packet
snapshot and binds the exact packet SHA-256 digest, idempotency key, actor,
session, project, resources, profile, capabilities, risk, evaluation instant,
and packet expiry. The decision id hashes the decision schema, packet digest,
and evaluation instant, so exact replay is stable while a different evaluation
instant cannot collide with earlier evidence.

The initial `policy:agent_sandbox` profile classifies a small exact capability
set. Forbidden, unknown, absent-capability, and unsupported-profile cases deny.
Explicit packet gates, risk at or above 5, and approval-gated capabilities
require approval. Precedence is always `deny`, then `approval_required`, then
`allow`. Evaluation outside `created_at <= evaluated_at < expires_at` fails
without producing decision evidence. Policy evaluation returns
`side_effects: []` and never creates approval or persistence authority.

Authoritative source and fixture:

- `packages/policy/src/policy-decision-v1.ts`
- `packages/policy/schemas/policy-decision-v1.schema.json`
- `fixtures/contracts/policy-decision-v1_0.json`

## Approval

Approval is explicit, scoped, and reviewable. An approval record must identify
the exact request, approver, decision, scope, and expiry or revocation rules.
Approval for one packet cannot authorize a different digest, resource, actor,
or capability.

No UI, MCP client, adapter, or substrate may synthesize approval. They can only
present or consume evidence validated by Gateway policy.

The stable request contract is `lnsat.approval_request.v1_0`, serialized as
`lnsat.approval_request.schema.v1_0`. It accepts only exact, identity-checked v1
policy evidence whose decision is `approval_required`. Its content digest binds
the policy decision and packet digest, requester, requester session, project,
resources, requested capabilities, policy reasons, request time, and inherited
expiry. Allow, deny, malformed, tampered, early, and expired inputs produce no
request evidence.

The stable human decision contract is `lnsat.approval_decision.v1_0`, serialized
as `lnsat.approval_decision.schema.v1_0`. It binds one exact request to a
distinct `identity:human:*` approver, the approver session, approved or denied
outcome, reason, decision instant, and inherited expiry. Self-approval,
non-human approver namespaces, tampered requests, outcome/reason mismatches,
and decisions outside `requested_at <= decided_at < expires_at` fail closed.
Approved evidence sets `approval_gate_satisfied: true` but always preserves
`execution_authorized: false` and `side_effects: []`.

These SHA-256 identities detect content drift and make exact replay
deterministic. They are not signatures. The source-local Gateway decision route
now authenticates an exact active owner/operator session, requires independent
same-origin CSRF proof, derives the approver/session reference, and enforces a
distinct human before persisting this evidence. No UI, MCP, adapter, or fixture
gains approval or execution authority.

The stable Gateway request route accepts only project and persisted-policy
references, authenticates one active owner/operator plus independent CSRF,
requires exact policy actor/local-session binding, supplies server-owned time,
and atomically appends or replays pending evidence. Its outer response declares
authentication-limiter, bounded activity, and durable append effects while the
nested stable approval request keeps `side_effects: []`. It cannot record a
decision, sign evidence, or authorize execution.

The stable Gateway decision route accepts only project, approved/denied
outcome, and matching reason; derives request identity from validated route
path; authenticates one distinct active owner/operator; and atomically appends
or exactly replays one immutable terminal decision. Its outer response declares
limiter, bounded activity, and conditional durable append effects while nested
stable decision evidence remains unchanged and side-effect-free. Conflicting
terminal outcomes deny generically. It cannot sign or consume approval,
authorize execution, create packets/actions/policies, or dispatch adapters.

Optional signed-evidence contract and Phase 7b source foundation in
[ADR-0004](ADR-0004_PHASE_7_SIGNED_APPROVAL_EVIDENCE.md) keeps that decision
unchanged and places it inside a new immutable wrapper with the complete
rederived packet-policy-request-decision chain. The signed payload binds actual
v1 packet fields, the canonical packet hash, exact policy capability decisions,
requester/approver sessions, project/resources/profile/intent/source
references/constraints, inherited expiry, nonce, and pinned public key
lineage/version/material. Approval still grants no execution capability.
Phase 7b implements closed schemas, TypeScript/Rust structural validation,
exact canonical payload/preimage/digest derivation, public-material binding,
and shared vectors. Runtime signature verification, signing/key custody, and
short-lived one-time execution authorization remain separate approval gates.
[ADR-0006](ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
freezes local `local_session` approval as initial default, user-owned external
keys for optional signed proof, and server-side authorization plus
digest-stored one-time capability. Signed proof never becomes execution
authority or local-v1 prerequisite.
See [authority layer and reference workflow](AUTHORITY_LAYER_AND_REFERENCE_WORKFLOW.md)
and [threat model](THREAT_MODEL.md).

Authoritative approval source and fixture:

- `packages/policy/src/approval-evidence-v1.ts`
- `packages/policy/schemas/approval-request-v1.schema.json`
- `packages/policy/schemas/approval-decision-v1.schema.json`
- `fixtures/contracts/approval-evidence-v1_0.json`
- `packages/policy/src/signed-approval-evidence-v1.ts`
- `packages/policy/schemas/signed-approval-evidence-v1.schema.json`
- `packages/policy/schemas/approval-verification-material-v1.schema.json`
- `packages/policy/schemas/signed-approval-verification-v1.schema.json`
- `fixtures/contracts/signed-approval-evidence-v1_0.jsonl`
- `crates/lnsat-contracts/src/signed_approval.rs`

## Audit Records

Audit records are append-only evidence. They capture identifiers and bounded
decision data without copying secrets or unrestricted request bodies. Relevant
contracts and validators live in `packages/audit`.

Required properties:

- stable record and idempotency identifiers;
- canonical digest of validated content;
- packet, actor, project, policy, and approval references;
- decision and reason codes;
- schema version and timestamp;
- no credential values or avoidable sensitive payloads.

Exact replay of an idempotency key and digest returns the existing record.
Reuse of an idempotency key with a different digest fails closed.

Stable audit-event idempotency now has shared TypeScript/Rust conformance.
Unseen terminal-source keys propose append; same-key/same-event identity returns
the existing ref; same-key/different-event identity, duplicate prior keys,
malformed refs, and oversized prior state fail closed. Evaluation performs no
write and returns no side effects.

The parallel stable event contract is `lnsat.audit_event.v1_0`, serialized as
`lnsat.audit_event.schema.v1_0`. It records policy decisions, approval requests,
and approval decisions only after rebuilding the complete v1 source chain from
the packet. This rejects version drift, field tampering, mismatched digests,
and unrelated approval evidence before an event exists.

Each event binds bounded packet, policy, approval, identity, session, project,
resource, result, reason, redaction, and timestamp evidence. A source hash
covers the complete supplied chain; the event id covers the complete bounded
event body. The deterministic idempotency key binds event type to the terminal
policy or approval evidence id. Exact replay is stable. A different observation
instant changes the event id under the same idempotency key, so an append store
must treat that as a collision rather than a second event.

The stable event contract remains side-effect-free. `authenticated_provenance`,
`persistence_requested`, and `execution_authorized` are all `false`;
`side_effects` is empty. Hashes detect drift but are not signatures. The Rust
SQLite store can now append exact-rederived local events with source-chain
foreign keys, ordered reasons, terminal idempotency, immutable rows, and scoped
reads. No authenticated Gateway writer, UI, MCP adapter, or runtime path
consumes this persistence API.

Authoritative stable audit source and fixture:

- `packages/audit/src/audit-event-v1.ts`
- `packages/audit/schemas/audit-event-v1.schema.json`
- `fixtures/contracts/audit-event-v1_0.json`

## Persistence Boundary

PostgreSQL migration artifacts under `packages/audit/migrations/postgresql`
define the local `audit_events.v0_1` storage contract. Executing migrations,
creating roles, granting writer access, or connecting production storage remains
an operator-controlled action outside repository validation.

See [Audit ledger persistence preflight](AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md)
and [migration artifacts](AUDIT_LEDGER_MIGRATION_ARTIFACTS.md).

## Security Invariants

- No approval bypass.
- Managed instructions, skills, profiles, context, graphs, and model overlays
  remain untrusted until exact digest, origin, assignment, compatibility, and
  resolution evidence validates.
- Gatekeeper-model recommendations cannot raise role or capability ceilings,
  satisfy human approval, or issue execution authorization.
- Commercial entitlement and support state never become policy allow.
- No mutable or destructive audit API.
- No raw rejected value echo in error evidence.
- No secret material in packet, policy, approval, or audit records.
- No adapter invocation without a matching authorization bundle.
- No database writer authority implied by schema or migration source.
- No MCP/A2A task, FastMCP context, OAuth token/scope, SPIFFE ID, OTel span, or
  Registry record substitutes for policy, approval, authorization, or receipt.
- Transport timeout, disconnect, or cancellation request cannot be recorded as
  execution success, failure, or confirmed non-execution without reconciliation
  evidence.
