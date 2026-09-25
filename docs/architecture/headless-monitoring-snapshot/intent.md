<!-- intent-driven-delivery:intent:v1 -->

# Intent: Versioned monitoring evidence-subject snapshot

Status: proposed
Authority: this file
Owner: LNSAT project owner
Accepted by: pending
Last updated: 2026-09-25

## Problem and evidence

HCFG-4 requires authenticated monitoring evidence before it can provide a
versioned watch with cursor/resume and bounded retention. A watch client needs
an explicit bootstrap path after first connection and a recovery path after a
retention gap. The proposed HCFG-4A exact-ID read packet in [PR #33](https://github.com/hypler-dev/LNSAT/pull/33)
is a prerequisite for the evidence subjects and remains proposed pending owner
acceptance.

An inventory assembled from separate reads has no single cutover point.
It can also leave a client unable to distinguish an empty inventory, an expired
page, a failed page, and a continuity gap. Historical audit completeness cannot
be inferred from an evidence-subject snapshot.

## Desired outcome

Define a proposed, owner-reviewable, read-only snapshot contract that:

- authenticates an owner, operator, or auditor using the existing evidence-read
  permission, with installation-wide versus narrower scope recorded as an
  explicit owner decision;
- materializes a bounded, deterministic evidence-subject ID inventory under one
  SQLite transaction that also records an opaque journal cutover watermark;
- paginates that inventory with opaque snapshot and page tokens, finite TTL and
  capacity, and explicit success, failure, and expiry results;
- lets a client start the later watch strictly after the cutover watermark
  without a missing event between the snapshot and watch; and
- states clearly that subject inventory, missing events, and retention gaps
  never establish an outcome or prove complete audit history.

The snapshot is a read-only evidence surface. Creating an ephemeral snapshot
handle does not approve, deny, activate, revoke, mutate, or widen authority.

## Users and systems

- local owner, operator, and auditor sessions with the selected evidence-read
  permission;
- the canonical LNSAT state store and journal writer;
- a future bounded watch consumer and other protocol clients; and
- operators investigating bootstrap, recovery, and continuity state.

## Constraints

- This is a proposed source contract only. It authorizes no schema, server,
  CLI, storage, or runtime implementation.
- PR #33 remains a prerequisite and is not treated as accepted.
- The owner must choose installation-wide `ReadEvidence` access or a narrower
  project/resource scope. This packet does not make that choice implicitly.
- The owner must accept the exact evidence-family mapping. Until then, this
  packet does not claim which subject families are inventoryable.
- The proposed transport route, method, and request/response fields remain
  owner-reviewable; this packet does not make them implementation-ready.
- Snapshot rows and metadata are produced from one consistent SQLite
  transaction. The transaction must establish the journal cutover watermark
  with the same atomicity boundary as state changes that publish journal
  entries.
- Snapshot and page tokens are opaque, bounded, non-secret, and must not reveal
  paths, identities, database keys, credentials, or event contents.
- Limits, TTL, redaction, authorization, failure, and retention-gap behavior
  must be observable and testable without real evidence or production data.
- No Docker, deployment, release, production, installer, or supported-platform
  action is part of this proposal.

## Non-goals

- implementing or accepting HCFG-4A or the later watch;
- replaying historical audit records or claiming audit-history completeness;
- promising lossless delivery across a retention boundary;
- treating a snapshot as a durable queue, command channel, approval record, or
  mutation transaction;
- selecting a database migration, transport deployment, OS, or package format;
- creating a second authorization path or embedding credentials in tokens; and
- making a missing row, missing event, empty page, timeout, or failed page imply
  success, failure, approval, denial, completion, or absence.

## Open owner decision

The owner must select one authorization scope before implementation:

1. installation-wide `ReadEvidence` for authorized owner/operator/auditor
   sessions; or
2. a narrower project/resource selector, with the selector included in the
   authorization decision and snapshot identity.

The implementation must reject an omitted selector when option 2 is chosen and
must never silently widen option 2 to installation-wide access.

## Assumptions and verified facts

- **Verified:** HCFG-4 orders authenticated reads, operations and
  approvals/audit readback, then versioned watch with bounded retention,
  cursor/resume, ordering, disconnect, and backpressure tests.
- **Verified:** current project status records monitoring and later headless V1
  gates as incomplete.
- **Verified:** PR #33's HCFG-4A intent/spec are proposed and acceptance-pending.
- **Assumption:** state changes and their monitoring journal entries can share
  one SQLite transaction; the implementation packet must prove this with a
  writer/snapshot race test.
- **Verified:** the later HCFG-4C watch uses an exclusive cursor; events with a
  journal sequence strictly greater than the snapshot cutover are eligible.
- **Assumption:** the watch and snapshot use the same accepted journal epoch
  and opaque cursor representation; the implementation packet must verify
  protocol and epoch compatibility.

## Risks

- A snapshot built from sequential reads could omit a concurrent journal event.
  One transaction and an explicit cutover watermark are mandatory.
- An unbounded inventory, page queue, or token lifetime could exhaust storage or
  memory. The contract therefore requires finite item, page, handle, and TTL
  limits and explicit capacity results.
- A retention gap may be mistaken for an outcome or complete audit history.
  The response fields and acceptance tests keep those claims closed.
- A scope error could expose installation-wide evidence. Scope is an owner
  decision, checked at open and page time, and must fail closed.

## Acceptance evidence

Acceptance requires the project owner to choose the read scope, accept this
intent and its companion specification, and authorize a separate source
implementation packet. That packet must provide deterministic tests for
transactional cutover, stable ordering, token opacity, limits, expiry,
capacity failure, authorization and redaction, page failure, retention-gap
recovery, and the absence of any outcome claim from missing data. It must also
prove that a watch started strictly after the cutover watermark cannot miss a
journal entry committed after the cutover.

The later watch contract is linked once here: [versioned monitoring watch
specification](../headless-monitoring-watch/spec.md). It owns watch delivery
semantics; this packet owns bootstrap inventory and cutover metadata.

## Source-of-truth links

The [Product Build Sequence](../../PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control)
owns the HCFG-4 requirement and [Project Status](../../PROJECT_STATUS.md#current-build-position)
owns current project status. PR #33's proposed HCFG-4A packet is a supporting
dependency. This file owns the proposed HCFG-4B snapshot intent and does not
replace those records.
