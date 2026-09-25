<!-- intent-driven-delivery:spec:v1 -->

# Specification: HCFG-4C versioned monitoring evidence watch

Status: proposed
Intent: [HCFG-4C watch intent](intent.md)
Owner: LNSAT project owner
Last updated: 2026-09-25

## Behavior

The canonical server publishes a read-only, server-ordered journal of newly
created monitoring evidence. It assigns one strictly increasing journal sequence
inside the same SQLite transaction that creates the referenced source evidence.
A replay or no-op writes no second journal event. Publication follows commit;
failed transactions publish nothing. Timestamps and client arrival order never
supply cross-family order.

The [proposed HCFG-4B snapshot](../headless-monitoring-snapshot/spec.md) is a
required prerequisite. An authenticated snapshot supplies a current-state
inventory and a cutover cursor from one atomic database boundary. That cursor
is the only way to begin a watch without a prior cursor. After a retention gap,
a new snapshot supplies a new cutover cursor; it restores current-state
visibility, not missing historical event continuity. The gap remains visible to
the operator. PR #33's proposed exact-ID readback cannot by itself establish a
complete inventory or cutover cursor.

Every event binds one closed subject family and exact subject ID to one
independently rederived immutable source-evidence record and its mandatory
canonical digest. The subject ID and referenced record ID must be identical.
The journal row contains no raw payload. Before returning an event, the server
rederives the source record through its accepted read path and compares family,
ID, and digest. Missing, drifted, or mismatched evidence fails the whole page
closed. A watch event does not itself establish approval, execution, receipt,
reconciliation, or container cleanup; clients use exact evidence readback for
those claims.

## Interfaces and contracts

The proposed first transport is bounded long polling through canonical
`lnsatd`. Owner acceptance must confirm this transport and the closed initial
event-family mapping before implementation. The proposed request is:

```text
GET /v1/monitoring/watch
LNSAT-Contract-Version: lnsat.contracts.v1_0
X-LNSAT-Local-Session-Token: <opaque session token>
X-LNSAT-Local-Session-Proof: <independent proof>
X-LNSAT-Watch-Cursor: <opaque snapshot cutover or prior next_cursor>
X-LNSAT-Watch-Limit: <1..64 decimal; optional, default 64>
X-LNSAT-Watch-Wait-Millis: <0..5000 decimal; optional, default 5000>
```

No query string, body, transfer encoding, CSRF header, cookie authentication,
forwarded header, caller idempotency key, or product-surface selector is
accepted. Existing numeric-loopback peer, bound Host, contract-version,
same-origin, session, and `ReadEvidence` checks apply. The cursor is required;
there is no implicit beginning, latest, or empty-cursor interpretation. A
cursor is continuity metadata, never authentication or action authority.

A successful page has only these top-level fields:

```json
{
  "contract": "lnsat.monitoring.watch_page.v1_0",
  "contract_version": "lnsat.contracts.v1_0",
  "status": "page",
  "events": [],
  "next_cursor": "opaque",
  "waited_millis": 0
}
```

Each event has exactly `cursor`, `family`, `subject_id`, and
`evidence_digest`. `family` comes from an accepted closed enum; `subject_id`
uses that family's exact content-bound identifier; `evidence_digest` is
`sha256:` plus 64 lowercase hex characters over the same domain-separated
canonical public-safe evidence representation used by HCFG-4B. The full
source-evidence record must still rederive exactly before that digest is
emitted. No raw record, path, actor/session secret, command,
configuration, or private Docker evidence appears in a watch page. The exact
initial family-to-source-record mapping remains an owner decision; no source
implementation may add a family before that mapping is accepted and tested.

The request cursor denotes the **last delivered event**, or the atomic
snapshot cutover position. The server returns only events with sequence greater
than that cursor, in strictly increasing sequence. `next_cursor` equals the
cursor of the last event actually included in the page. If `events` is empty,
`next_cursor` must equal the request cursor byte-for-byte. A page never advances
past a filtered, failed, or undelivered event. The client persists
`next_cursor` only after it has processed the full page. A crash between
processing and persistence can replay events; consumers deduplicate by exact
event cursor. No gap can be silently skipped.

The server captures one journal read boundary for page selection and evaluates
all candidate events against the same active authorization state. It
revalidates session authority immediately before returning a page after a
wait. If authority or any source evidence cannot be revalidated, it returns
one generic denial or journal-unavailable result with **no events and no new
cursor**. A partial HTTP response or disconnect grants no cursor advancement.

### Error and continuity responses

- `403` generic watch denial covers missing/invalid/revoked session, denied
  `ReadEvidence`, and authorization uncertainty. It reveals no event presence.
- `400` rejects malformed, unknown, wrong-journal, wrong-epoch, or unsupported
  cursors without substituting a start position.
- `409` `retention_gap` contains no cursor or events. A client must record the
  gap and take a new HCFG-4B snapshot. That snapshot cannot erase the
  historical continuity loss.
- `429` `watch_busy` means the fixed concurrent-waiter cap is reached. It has
  no events or cursor advancement; the client may retry its prior cursor.
- `503` `journal_unavailable` covers storage, integrity, or source-rederivation
  uncertainty without leaking which record failed. It has no events or cursor
  advancement.
- Unsupported contract versions retain the shared version-negotiation failure.

Every response is secret-free and bounded. Error bodies contain stable codes,
not raw request headers, cursors, subject IDs, source records, SQL text, or
internal error details. The exact generic denial envelope must match the
existing served-route style when implementation is accepted.

## States and failure handling

An empty page after a wait is liveness evidence only. It does not mean that an
operation failed, succeeded, did not execute, or has no pending approval. A
client disconnects or server shutdowns by closing the HTTP exchange; there is
no fabricated terminal event. The client retains its last fully processed and
persisted cursor and reconnects from it. A timeout, partial body, malformed
page, or transport loss never advances that cursor.

A retention gap is a permanent loss of watch continuity for the skipped
interval. The client must present it to the operator, obtain a fresh snapshot
and cutover, and continue only with an explicit record that historical events
were not recovered. Exact known-ID reads and reconciliation may resolve
specific uncertain outcomes; a snapshot of current state does not prove the
content or order of every missed historical event.

The journal begins a new epoch at migration. Pre-migration evidence remains
outside the journal's historical order and is represented only through the
HCFG-4B snapshot. A cursor from another epoch or installation is rejected.
Changing the journal epoch cannot silently reset a client to the beginning or
latest position.

## Retention, limits, and backpressure

The proposed V1 limits are at most 64 events and 64 KiB serialized body per
page, a 5,000 ms server wait, a 2,000 ms response-write deadline, one in-flight
wait per session, and 128 concurrent waits per installation. The journal keeps
at most 100,000 events and at most seven days of entries, pruning the older of
the two boundaries. These are proposed fixed contract values; changing them
requires owner review and a versioned compatibility decision.

The first transport has no per-client event queue. Each request selects at most
one bounded page; a slow client holds no server-side backlog beyond its one
bounded in-flight response. A second concurrent request for the same session
or an installation at the waiter cap receives `429` without cursor movement.
A page that cannot fit the first eligible event under the byte cap fails
closed with `503`; it never skips that event. Retention pruning must retain a
watermark sufficient to distinguish an expired cursor from an unknown cursor.
The implementation must test limits at boundary and one unit over, including
concurrent waiters, slow response writers, and pruning during wait.

## Data, privacy, and permissions

The installation-wide `ReadEvidence` role scope for owner/operator/auditor is
an **OPEN OWNER DECISION**. A narrower project/resource scope would require a
separately accepted filter, cursor binding, and snapshot contract; this spec
must be revised before implementation. Existing session headers authorize
each request. Cursor possession grants nothing. Do not log raw cursors, session
headers, event IDs, or evidence contents; diagnostics may record fixed error
codes and bounded counts. Journal storage contains only family, exact subject
ID, canonical evidence digest, sequence, epoch, and publication metadata.

## Compatibility and migration

The proposed `lnsat.monitoring.watch_page.v1_0` response is additive. It
changes no existing Gateway route, HCFG-4A response, product-surface v1 bytes,
approval/operation mutation behavior, runtime profile, or adapter protocol.
One new journal migration is expected only after owner acceptance. Every
selected source-evidence writer must append its journal row in the same
transaction; any uninstrumented writer or partial backfill blocks source
acceptance. Existing immutable evidence is not falsely assigned historical
cross-family order. Rollback closes the watch route without deleting source
evidence; accepted journal data needs a separately reviewed migration policy.

A later `lnsatctl watch` consumes full pages and emits one versioned JSONL
record per event, gap, or typed error. It stores the opaque cursor only after
processing the page and keeps diagnostics separate from event JSONL. A true
multi-record JSONL client needs its own accepted packet and tests; the current
single-object renderer is not a stream implementation.

## Acceptance mapping

A later implementation packet must name exact event families and immutable
source-record mappings, then prove:

- created source evidence and its bound journal row commit atomically; replay,
  rollback, crash, and write failure publish no duplicate or orphan event;
- exact subject family/ID and canonical digest rederive before publication and
  before every page; mismatches and tampering return no event;
- one total order under concurrent writers, with no timestamp ordering claim;
- snapshot cutover has no gap to the first watch page; exclusive cursor resume,
  crash replay, empty-page cursor stability, and no skip on partial delivery;
- explicit gap, wrong epoch, malformed/unknown cursor, pruning, and no implicit
  start; post-gap snapshot preserves the recorded continuity loss;
- session, role, origin, Host, version, revocation-during-wait, and generic
  denial behavior match the accepted read scope;
- page, byte, wait, write-deadline, per-session, and global waiter bounds; and
- no secret, raw private evidence, event inference, mutation, or Docker action.

Focused store, served-route, and future CLI tests, pinned Rust checks,
`npm run source:check`, `npm run public:check`, local scans when applicable,
`git diff --check`, and fresh independent review are required. A green check
or this proposal alone grants no merge, runtime, release, or support authority.

## Non-goals and open questions

This proposal does not implement a journal, snapshot, API route, CLI command,
Docker adapter, runtime proof, release artifact, or production monitoring.
It cannot close HCFG-4 or V1 until HCFG-4A, HCFG-4B, the exact journal-family
mapping, and the future CLI packet are accepted and implemented.

Owner decisions still required: installation-wide versus scoped `ReadEvidence`,
acceptance of bounded long polling and the fixed limits above, exact initial
event families and source-record mappings, and snapshot retention/capacity.
No implementation may resolve these decisions silently.
