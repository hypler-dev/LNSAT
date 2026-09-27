<!-- intent-driven-delivery:intent:v1 -->

# Intent: HCFG-4B durable watch foundation

Status: proposed
Authority: this file
Owner: LNSAT maintainers
Accepted by: pending owner decision
Last updated: 2026-09-26

## Problem and evidence

The accepted [headless source sequence](../../../PRODUCT_BUILD_SEQUENCE.md#headless-source-packet-order)
requires server-sourced, versioned watch events with deterministic order,
bounded retention, cursor/resume, disconnect, and backpressure behavior.
[HCFG-4A](../intent.md) supplies exact approval and audit reads on draft PR #33,
alongside existing exact operation reads. Its store has independent evidence
families but no global event sequence or replay cursor. Timestamps and table row
order cannot establish a safe cross-family outcome order.

## Desired outcome

Canonical `lnsat-store` can record a bounded, durable, globally ordered index of
new monitoring evidence in the same transaction as each source-evidence append.
It can return a bounded page of references from a validated cursor after
rederiving the referenced source evidence. An ordinary restart preserves order
and the retained replay window; expired or different-generation cursors report
an explicit gap. This packet does not claim to detect a copied or restored
database that carries the same stored generation.

This is a source foundation for a later authenticated Gateway watch and
`lnsatctl` JSONL client. It grants no new served read or action authority.

## Users and systems

- Future local owner, operator, and auditor monitoring clients.
- Canonical Rust store and its source tests.
- Later canonical `lnsatd` and `lnsatctl` watch packets.

## Constraints

- The evidence tables remain authority. The journal is a derived reference
  index, never a substitute for full source rederivation or an outcome claim.
- Every indexed source append and index append commit atomically. A source
  append must fail closed if the index cannot be committed. No best-effort
  publication, timestamp sorting, or post-commit reconstruction is allowed.
- Order is local to one store epoch and covers only records committed after
  journal activation. Existing pre-migration evidence keeps exact-ID readback;
  historical order is unavailable and is never fabricated.
- Only journal entries may be pruned. Current immutable evidence, its retention
  policies, and evidence-guard triggers remain untouched.
- The journal stores fixed event-family identity, exact source identifier, and
  sequence only; no raw record, secret, bearer token, credential, payload, or
  arbitrary caller field.
- HCFG-4B indexes only the named consequential-action families. Local identity,
  session lifecycle, and session activity events are outside this journal;
  authentication of an exact read may append session activity without creating
  a monitor event or consuming the replay window.
- A cursor confers no authority. Future served replay must authenticate each
  request with the Gateway's existing local session and `ReadEvidence` gate;
  exposing an enumerating watch requires a separate owner acceptance decision.
- No direct database client, alternate API, or product fixture becomes served
  truth. Missing, corrupt, or drifted source evidence fails the entire read.
- PR #33 merge and exact-head gate remain separate. No Docker, deployment,
  production mutation, package, signing, tagging, or release is opened here.

## Non-goals

- Gateway route, streaming transport, CLI command, JSONL frame, snapshot/list,
  historical backfill, polling, or Control Center behavior.
- Change to approval, audit, operation, or execution semantics.
- New local roles, project-scoped grants, authentication, or mutation authority.
- Retention or deletion of the underlying evidence records.

## Assumptions and verified facts

- Verified: [HCFG-4A specification](../spec.md) leaves journal, cursor,
  retention, ordering, streaming, and backpressure to later HCFG-4 packets.
- Verified: the current store persists approvals, audit events, operations,
  attempts, receipts, and reconciliations in separate families.
- Assumption: a separate, count-bounded reference index is preferable to
  changing immutable evidence retention. Owner acceptance of this intent and
  [specification](spec.md) accepts that storage and replay boundary only.

## Risks

- Missing an append path would make the watch silently incomplete. The exact
  indexed family set and every commit path must be enumerated before source
  implementation; an unlisted path stops the packet.
- A journal write failure could deny an otherwise valid evidence append. This
  is intentional fail-closed behavior but needs concurrency and fault tests.
- Projection pruning, sequence exhaustion, and partial migration could produce
  false continuity. Cursor epoch and floor checks expose known gaps; sequence
  exhaustion stops the source append. A byte-copied or restored database can
  carry the same epoch and a plausible sequence. The later served-watch packet
  must define a recovery/generation boundary before claiming safe resume across
  database restore or replacement.
- References reveal an installation-wide event inventory. No served enumeration
  is authorized by this packet.

## Acceptance evidence

- Human owner accepts this intent and its linked specification before source
  implementation. Merge requires a later exact-head decision.
- Store tests prove atomic append, restart-stable total order, bounded replay,
  exact source rederivation, cursor validation, explicit gap, and no history
  invention across migration.
- Fault and concurrency tests cover index-write failure, transaction rollback,
  pruning boundary, corrupt source and journal, sequence exhaustion, and
  multiple writers. A copied-database test documents the unresolved generation
  limit rather than asserting a false gap.
- Existing source gates, migration/inventory/public checks, installed local
  audit scans, and fresh independent review pass on the eventual exact diff.

## Source-of-truth links

- Authority and acceptance for HCFG-4B: this file.
- Observable source contract: [specification](spec.md).
- Execution and evidence plan: [plan](plan.md).
- Product ordering: [Product build sequence](../../../PRODUCT_BUILD_SEQUENCE.md#headless-source-packet-order).
- Runtime-proof status authority: [Phase 11 operator packet](../../PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md).
