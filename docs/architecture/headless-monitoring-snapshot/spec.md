<!-- intent-driven-delivery:spec:v1 -->

# Specification: Versioned monitoring evidence-subject snapshot

Status: proposed
Intent: [Versioned monitoring evidence-subject snapshot intent](intent.md)
Owner: LNSAT project owner
Last updated: 2026-09-25

## Protocol and limits

The proposed private protocol is `lnsat.monitoring.snapshot.v1`. The server
must advertise or enforce these conservative limits for every snapshot:

| Limit                              | Proposed value | Required behavior                                         |
| ---------------------------------- | -------------: | --------------------------------------------------------- |
| maximum page size                  |      100 items | Reject larger requests with `limit_exceeded`.             |
| default page size                  |       50 items | Apply when omitted.                                       |
| maximum inventory                  |   10,000 items | Fail explicitly with `capacity_exceeded`; never truncate. |
| maximum pages                      |            200 | Fail explicitly if the bound would be exceeded.           |
| handle TTL                         |     15 minutes | Expire the snapshot and every page token together.        |
| maximum active handles per session |              4 | Reject a fifth with `capacity_exceeded`.                  |
| maximum page reads per handle      |          1,000 | Return `capacity_exceeded` before an unbounded read.      |

The read cap permits retries of every page after a lost response; a failed
page does not advance or destroy its token. These are proposed contract
defaults. An implementation packet may choose lower
values only with owner acceptance and must expose the applied finite values in
the opened response. It must never silently increase them.

## Behavior

Opening a snapshot captures a bounded evidence-subject ID inventory and one
journal cutover watermark. Pages expose only that materialized inventory until
the handle expires. Later exact reads may show additional related evidence;
later watch events cover changes after the cutover. A missing, delayed, empty,
failed, or expired page never establishes an outcome. The cutover cursor is a
handoff point to later watch events, not a claim that earlier journal history
is complete.

## Authorization and scope

The client uses the existing authenticated session and evidence-read
permission. The owner must choose one of these scopes before implementation:

```text
scope.v1 {
  kind: "installation" | "project" | "resource",
  id?: opaque-string
}
```

`id` is required for `project` and `resource`, forbidden for `installation`,
and is returned only as a redacted scope reference if the accepted policy
allows it. A request outside the accepted scope returns `forbidden` without
revealing whether a narrower object exists. Authorization is checked when the
handle opens and again for every page. Revocation or uncertainty fails closed.

The installation-wide `ReadEvidence` choice versus a narrower project/resource
choice is an **OPEN OWNER DECISION**. No route below is implementable until it
is recorded.

## Interfaces and contracts

The following route and fields are an exact proposed logical shape for owner
review. They are not accepted transport or implementation authority. The
authenticated `POST` creates an ephemeral read handle; it requires the
existing authenticated token/proof header pair and `ReadEvidence` permission,
but changes no durable evidence, authorization, or application state. A
transport owner may propose an equivalent mapping only through owner
acceptance; no mapping may add mutation authority.

### Open request

```text
POST /v1/monitoring-snapshots
Content-Type: application/json

snapshot.open.v1 {
  protocol: "lnsat.monitoring.snapshot.v1",
  scope: scope.v1,
  page_size?: positive-integer <= 100
}
```

The request has no filter, search, sort override, or caller-supplied cursor.
The server owns inventory membership and ordering. A malformed or unsupported
request returns a typed error and creates no handle.

### Open success

```text
snapshot.opened.v1 {
  type: "opened",
  protocol: "lnsat.monitoring.snapshot.v1",
  snapshot_token: opaque-string,
  first_page_token: opaque-string,
  scope: scope.v1,
  page_size: positive-integer <= 100,
  item_count: nonnegative-integer <= 10000,
  page_count: positive-integer <= 200,
  cutover_cursor: opaque-string,
  expires_at: RFC3339-string,
  audit_history_complete: false,
  inventory_semantics: "evidence_subject_ids_at_cutover"
}
```

`item_count` and `page_count` describe the bounded materialized inventory; they
are not a promise about later state or historical event count. The fixed
`audit_history_complete: false` field prevents a subject inventory from
being mistaken for a complete audit history. The cutover cursor is usable as
the later watch's exclusive `after_cursor` only when its protocol and journal
epoch match. Events with journal sequence strictly greater than the cutover
are eligible for that watch.

### Page request

```text
GET /v1/monitoring-snapshots/{snapshot_token}/pages/{page_token}
Accept: application/json
```

Both path tokens are opaque, fixed-length URL-safe ASCII values. Percent
encoding, separators, and query strings are rejected. Clients must not decode
them into assumed database keys. The page
token is valid only for its snapshot, session authorization, protocol version,
and expiry window.

### Page success

```text
snapshot.page.v1 {
  type: "page",
  protocol: "lnsat.monitoring.snapshot.v1",
  snapshot_token: opaque-string,
  page_token: opaque-string,
  next_page_token?: opaque-string,
  done: boolean,
  items: [snapshot.item.v1],
  cutover_cursor: opaque-string,
  expires_at: RFC3339-string,
  audit_history_complete: false,
  inventory_semantics: "evidence_subject_ids_at_cutover"
}
```

`next_page_token` is required exactly when `done: false` and forbidden when
`done: true`. The token selects the immediately following materialized page;
it cannot skip a page or change the inventory. `done: true` is the only
successful terminal page state.
An empty successful page is allowed only for an empty inventory and must still
include `done`, `cutover_cursor`, and the closed fields above. A page never
silently truncates, skips, or reorders materialized items. Repeating the same
page token before expiry returns byte-identical successful page bytes while
its immutable source records remain valid. A failed or lost response leaves
the token usable for that retry and never advances the client.

### Evidence-subject inventory item

```text
snapshot.item.v1 {
  family: accepted-versioned-family-string,
  subject_id: opaque-string,
  evidence_digest: "sha256:" plus 64 lowercase hex characters
}
```

`family` must be one of the exact versioned evidence families accepted by the
owner. The mapping is currently **OPEN**; no implementation may invent or
silently broaden it. `subject_id` identifies the evidence subject under that
family. `evidence_digest` is mandatory and uses the same domain-separated
canonical public-safe evidence representation as the HCFG-4C watch. The
snapshot contains no generic state object, optional evidence reference,
source bytes, or mutable domain object. Each `(family, subject_id)` appears
exactly once. The subject ID must equal the exact identifier of the
independently rederived immutable source-evidence record for that family;
the digest is computed only after that equality and all linked evidence are
verified. A duplicate, missing source, rederivation failure, family mismatch,
or digest mismatch aborts the entire open before a handle is published.
Mutable aggregate views cannot be snapshot items.

Items are sorted by canonical UTF-8 byte order of `family`, then
`subject_id`, then `evidence_digest`. Clients must not infer semantic priority
from this order. Later exact reads may reveal new related evidence, but this
snapshot item's bound immutable record and digest cannot change. Missing or
drifted source evidence fails closed at page read.

Every page read independently rederives each included source record through
the accepted read path and rechecks the stored family, subject ID, and digest.
One missing or drifted record fails the whole page with no partial items or
continuation token. The materialized item cannot substitute for source truth.

The family mapping and digest calculation are subject to the accepted HCFG-4A
read contract. They must exclude secrets, session headers, credentials, source
bytes, installation paths, private keys, and unapproved principal or resource
details. If a family or digest cannot be authorized and produced
deterministically, the page fails closed; it is never replaced with a
misleading placeholder.

## States and failure handling

Every failed page or open attempt returns a closed response with no partial
items:

```text
snapshot.error.v1 {
  type: "error",
  protocol: "lnsat.monitoring.snapshot.v1",
  operation: "open" | "page",
  code: "invalid_request" | "unsupported_version" | "forbidden" |
        "authorization_revoked" | "unknown_snapshot" | "unknown_page" |
        "expired" | "capacity_exceeded" | "limit_exceeded" |
        "snapshot_unavailable" | "journal_unavailable",
  retryable: boolean,
  snapshot_token?: opaque-string,
  page_token?: opaque-string,
  expires_at?: RFC3339-string
}
```

`expired` explicitly means the handle or page is past its TTL. It does not mean
the inventory was empty or that an event occurred. `capacity_exceeded` means
the server refused to create or continue a bounded handle; it does not mean
the state was absent. `unknown_snapshot` and `unknown_page` never restart from
the beginning. Error responses contain no item count, existence oracle, source
path, token contents, or evidence payload beyond the closed fields shown.

## Transactional cutover and watch recovery

Opening a snapshot must use one bounded SQLite `IMMEDIATE` transaction, or an
equivalent serializing boundary, that:

1. establishes the accepted scope and reads the complete bounded evidence-
   subject ID inventory;
2. materializes the canonical item order and the finite page count;
3. records the journal epoch and the current opaque journal watermark; and
4. publishes the ephemeral handle only after all three values are consistent.

The accepted family mapping must be identical for snapshot inventory and watch
events. Every retained source-evidence subject from those families appears in
the inventory at cutover; a family omitted from either surface blocks HCFG-4
source acceptance. State changes that publish monitoring journal entries must
update the evidence state and journal in the same SQLite transaction. A writer that commits before
the snapshot transaction's cutover is included in the inventory and has a
sequence less than or equal to the returned watermark. A writer that commits
after the cutover is excluded from the inventory and has a sequence strictly
greater than the returned watermark in the later watch. SQLite transaction
serialization, the journal epoch, and the watermark must be tested together;
the implementation must exercise the writer/snapshot race and prove that no
committed event falls between those cases.

The first watch request uses the returned `cutover_cursor` as an exclusive
`after_cursor`; only journal sequences strictly greater than the cutover are
eligible. Each later watch request uses the last delivered cursor as its
exclusive `after_cursor`. The snapshot does not replay historical events and
does not promise that evidence before the journal epoch is present. If the
cursor is expired or from another epoch, the watch returns its typed gap or
unsupported-cursor result; the client must obtain a fresh snapshot/read path.

A retention gap says only that continuity is no longer available. It never
establishes an outcome for a missing event. A snapshot item likewise does not
establish the historical sequence that produced it.

## Data, privacy, and permissions

Tokens are continuity handles bound to an authenticated session, never bearer
authentication or action authority. Do not log them with credentials,
place them in metrics labels, expose them in diagnostics, or derive them from
sequential database IDs. Logs may contain bounded counts and typed result
codes, but never payloads, session headers, secrets, or evidence contents.
Snapshot storage and page reads must enforce the stated TTL, item, page, and
session bounds. Expiry cleanup may be lazy, but every read must reject expired
tokens before returning data.

## Compatibility and migration

The protocol version and journal epoch are part of token validation. A v1 token
must not be reinterpreted under another protocol version or epoch. Unsupported
versions return `unsupported_version`. Migration begins a new epoch; pre-epoch
state is available only through a new snapshot/read path and is not fabricated
as ordered watch history. Rollback removes the implementation or routes to the
prior read-only surface without deleting evidence.

## Acceptance mapping

The implementation packet must provide focused deterministic tests for:

- accepted scope and active authorization at open and every page;
- a complete bounded inventory under one SQLite transaction;
- deterministic ordering and page boundaries across repeated opens;
- unique exact `(family, subject_id)` binding to an independently rederived
  immutable record and matching `sha256:` digest at open and page time;
- `next_page_token` iff a page is nonterminal, byte-identical retry until
  expiry, and no client advancement after a failed or lost page;
- opaque token handling, protocol/epoch binding, and no existence oracle;
- default and maximum page sizes, item/page/session capacities, and TTL;
- empty inventory versus failed, expired, unknown, and capacity-limited pages;
- redaction, closed response fields, and audit history remaining explicitly
  incomplete;
- concurrent writer and snapshot cutover with no missing event;
- exclusive watch resume (`sequence > cutover_cursor`), retention-gap recovery,
  and unknown outcome rules;
- journal unavailability, shutdown, and rollback behavior; and
- no new mutation or action-authority path.

Owner acceptance of the read scope and this proposed API/data contract is
required before source implementation.

## Non-goals and open questions

The non-goals are implementation, mutation authority, Docker/runtime proof,
release, deployment, complete audit-history replay, and any implied outcome
from missing data. Open decisions are the authorization scope, exact transport
method/path/fields, durable materialization mechanism, journal epoch
representation, and the exact evidence-family mapping. These choices require
owner acceptance before an implementation packet can claim readiness and must
not be inferred from fixtures.
