<!-- intent-driven-delivery:intent:v1 -->

# Intent: HCFG-4C versioned monitoring evidence watch

Status: proposed
Authority: [Product Build Sequence](../../PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control) and [Project Status](../../PROJECT_STATUS.md#current-build-position)
Owner: LNSAT project owner
Accepted by: pending
Last updated: 2026-09-25

## Problem and evidence

HCFG-4 requires LNSAT to complete authenticated operations and approvals/audit
readback, then provide a versioned watch with bounded retention, cursor/resume,
ordering, disconnect, and backpressure tests. The build sequence records that
requirement, while the current status records monitoring and the remaining
headless V1 work as incomplete. The proposed HCFG-4A exact-ID read packet in
[PR #33](https://github.com/hypler-dev/LNSAT/pull/33) is a prerequisite for the
watch's event subjects; its intent and spec remain proposed and require owner
acceptance.

Without a server-sourced journal contract, a client cannot tell whether an
event was absent because no event exists, because its cursor expired, or because
the connection lost data. Polling an in-memory list also cannot prove a durable
order or a bounded replay window.

## Desired outcome

Define a reviewable read-only watch contract for server-sourced monitoring
evidence. A separately accepted HCFG-4B snapshot must establish an atomic
current-state inventory and cutover cursor before the first watch request or
after a retention gap. The watch then gives an authenticated reader an opaque
resume cursor, a durable total order, explicit gaps, and bounded page behavior.
Neither the snapshot nor the watch may infer an outcome from a missing event.

The contract remains compatible with a later `lnsatctl` JSONL consumer. It does
not itself add a mutation authority, runtime integration, installer behavior,
or a supported-platform claim.

## Users and systems

- local owner, operator, and auditor sessions that already have the selected
  evidence-read permission;
- the canonical LNSAT server journal and authenticated read transport;
- a future `lnsatctl` watch consumer and other protocol clients;
- operators reviewing evidence continuity, retention gaps, and reconnects.

## Constraints

- This is a proposed source contract only. No schema, server, CLI, storage,
  or runtime implementation is authorized by this document.
- PR #33 HCFG-4A and the proposed HCFG-4B snapshot remain prerequisites and
  may not be treated as accepted or implemented.
- The watch is read-only. It cannot approve, deny, activate, revoke, mutate
  configuration, or widen action authority.
- The server is the source of event order and cursor meaning. Client clocks,
  arrival order, and missing messages cannot establish order or outcome.
- Cursor values are opaque protocol metadata, never authentication or action
  authority. They must not expose installation paths, identities, secrets, or
  event contents.
- Retention and resource bounds must be explicit, observable, and fail closed.
- The installation-wide `ReadEvidence` scope for owner/operator/auditor is an
  open owner decision; this packet does not choose between that scope and a
  narrower project or resource scope.
- No Docker, release, production, or deployment action is part of this packet.

## Non-goals

- implementing HCFG-4A routes or accepting PR #33;
- adding list/search, mutation, approval, audit-writing, or control endpoints;
- promising lossless delivery across a retention boundary;
- treating a watch stream as a durable queue, command channel, or audit store;
- selecting a Docker image, OS, or supported deployment;
- creating a second authorization path or embedding credentials in a cursor;
- shipping `lnsatctl` in this contract packet.

## Assumptions and verified facts

- **Verified:** HCFG-4 orders authenticated reads, operations and
  approvals/audit readback, then versioned watch with bounded retention,
  cursor/resume, ordering, disconnect, and backpressure tests.
- **Verified:** current project status says monitoring and later headless V1
  gates remain incomplete.
- **Verified:** [PR #33](https://github.com/hypler-dev/LNSAT/pull/33)'s HCFG-4A
  intent/spec are proposed and require owner acceptance before source
  implementation.
- **Assumption:** a future server implementation can atomically assign one
  monotonic journal position and bind it to the newly persisted source evidence
  before making the event visible to readers. This must be proven by tests.
- **Dependency:** the proposed HCFG-4B snapshot supplies the only valid first
  and post-gap cutover cursor. A known-ID HCFG-4A read alone cannot enumerate
  missing records or prove a cutover watermark.
- **Open decision:** whether installation-wide exact-ID/read-watch access is
  accepted for all existing `ReadEvidence` roles, or whether the contract
  requires a narrower resource/project selector.

## Risks

- A non-atomic append can expose a cursor for an event whose evidence is not
  readable. The implementation must publish only after the append's evidence
  reference is durable and internally consistent.
- Cursor expiry can cause silent loss if the server disconnects without an
  explicit gap. Expiry must return a typed retention-gap result and require a
  new snapshot; the missing interval remains a recorded continuity loss.
- Backpressure bugs can turn a local watch into unbounded memory growth. One
  long-poll page must have fixed event, byte, wait, and concurrent-waiter caps.
- A client crash after processing but before persisting the returned cursor
  can replay events. Consumers must deduplicate by the event cursor.
- Authorization changes during a watch can expose later evidence. Each emitted
  event must pass the active read check; denial or authorization uncertainty
  terminates the stream without implying an event outcome.

## Acceptance evidence

Acceptance requires the project owner to decide the open read-scope question,
accept the HCFG-4B snapshot prerequisite, accept this intent and companion
specification, and authorize a separate source implementation packet. Its
tests must prove atomic evidence binding, total ordering, exclusive resume,
retention gaps, unknown cursors, disconnects, bounded long-poll resources,
active authorization, redaction, and the rule that missing events never imply
outcome.

## Source-of-truth links

The [Product Build Sequence](../../PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control)
is the canonical requirement and [Project Status](../../PROJECT_STATUS.md#current-build-position)
is the canonical status record. PR #33's proposed HCFG-4A intent/spec are
supporting prerequisites. This file owns the proposed HCFG-4C watch intent;
it does not replace either canonical record.
