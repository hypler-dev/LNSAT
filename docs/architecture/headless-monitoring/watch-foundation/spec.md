<!-- intent-driven-delivery:spec:v1 -->

# Specification: HCFG-4B durable watch foundation

Status: proposed
Intent: [HCFG-4B durable watch foundation](intent.md)
Owner: LNSAT maintainers
Last updated: 2026-09-26

## Behavior

An additive store migration creates a separate reference-only monitor journal
and one durable store epoch. Source-evidence append paths named in the accepted
implementation inventory append exactly one journal entry per committed source
event inside the same SQLite transaction. Entries have one increasing local
sequence. A failed index insert rolls back the source append; a failed source
append produces no index entry. Retries that return an already committed source
record create no duplicate journal entry.

The first journal event is a post-migration commit. Pre-existing evidence is
not backfilled, guessed from timestamps, or assigned a synthetic sequence.
The epoch is a persisted journal-generation identifier and survives an ordinary
process restart. A byte copy or restore of the database copies that identifier;
HCFG-4B alone cannot detect such replacement. The store verifies its epoch and
journal metadata before read or append. Served resume across restore remains
blocked pending a separately accepted recovery/generation contract.

## Interfaces and contracts

This packet adds only internal Rust store APIs. No HTTP route, CLI command, or
public wire contract is defined. A versioned internal event descriptor contains
`journal_version`, `store_epoch`, `sequence`, `family`, and `source_id`. Family
is a closed enum. `source_id` is the exact stable source identifier for that
family. No raw evidence body or caller-provided metadata is copied.

The implementation inventory must identify every canonical commit path for
approval requests, approval decisions, audit events, operation lifecycle
events, operation attempts, receipts, and reconciliations. If any family lacks
an immutable exact source identifier or an atomic append path, the producer
stops and revises the accepted scope before coding that family. No partial
family coverage may be described as the complete HCFG-4 watch. Local identity,
session lifecycle, and session activity events are explicitly excluded from
this consequential-action journal, including activity appended by exact reads.
They require a separate family and retention decision before any watch claims
coverage of them.

A cursor is a versioned, strictly parsed `(store_epoch, last_sequence)` pair.
It is a position marker, not a credential or integrity proof. The initial
positions are explicit `tip` (events after the current transactionally read
tip) and `retained_start` (all currently retained events). A caller may resume
from a previously returned cursor only for the same store epoch. No timestamp,
source ID, offset, or raw SQL selector is accepted as a cursor. The store
returns at most 100 entries per page, sorted by ascending sequence, with a
`next_cursor` at the last returned sequence. An empty page retains the input
position. Each page is read from one consistent SQLite snapshot.

Sequences are signed SQLite integers from `1` through `i64::MAX`, never reused
within one epoch. If the next sequence would exceed `i64::MAX`, the indexed
source append fails and rolls back with a typed persistence error. It never
wraps, resets the epoch automatically, or silently omits a monitor entry.

The journal retains at most 10,000 entries in a single store. On each indexed
commit, pruning and the durable oldest-retained floor update occur in the same
transaction; there is no unbounded deferred cleanup. This count is a proposed
contract value for owner acceptance, not an operational setting. Source
evidence is never pruned. A cursor whose last sequence is less than one before
the oldest retained sequence, or whose epoch differs, returns a typed `gap`
error with no partial events. A malformed or future-sequence cursor returns a distinct invalid
cursor error. No error is interpreted as an action outcome.

Every entry returned to an internal consumer must pass exact source-record
rederivation and identifier/family agreement. Any mismatch, corruption,
unreadable source, or sequence discontinuity fails the entire page. Future
Gateway serialization must independently redact and authorize these records;
this packet exposes no served list.

## States and failure handling

- **Append committed:** source and one index entry commit together.
- **Append rolled back:** neither source nor index entry becomes visible.
- **Replay page:** contiguous retained entries are returned in sequence order.
- **Empty at tip:** an empty page states only that no indexed event was visible
  at that snapshot; it is not proof of a remote outcome.
- **Expired or foreign cursor:** explicit gap, requiring a future client to
  restart from an accepted snapshot boundary or acknowledge lost replay.
- **Corrupt evidence or journal:** entire page fails closed; no partial JSONL
  event, guessed position, or automatic skip.
- **Process restart:** durable epoch, floor, and sequence persist.
- **Database copy or restore:** byte-identical lineage is not detectable by
  this in-database epoch; HCFG-4C cannot claim resume safety across it until a
  separate recovery/generation boundary is accepted and proven.
- **Client disconnect:** outside this source-only packet; no event is marked
  delivered or acknowledged by a store read.

## Data, privacy, and permissions

The index contains operational references and is sensitive local data. It
inherits the store's existing local protection and never logs identifiers or
raw rows. It stores no credential, secret, raw payload, command, environment
value, or free-form event text. There is no new served permission in HCFG-4B.
HCFG-4C must separately decide and accept installation-wide enumeration under
`ReadEvidence`, route admission, closed event bodies, and session activity.

## Compatibility and migration

Migration is additive and deterministic; the pre-migration evidence and
retention guards remain byte-for-byte authoritative. Migration must refuse
drift or partial journal metadata and must not rewrite old evidence. Ordinary
rollback before merge drops the branch. After a real database has recorded
journal entries, binary rollback or schema deletion needs a separately reviewed
recovery plan; no runtime rollout is authorized by this source packet.

The future HCFG-4C Gateway watch and `lnsatctl` JSONL transport must use this
source order and gap contract. It must define authenticated enumeration,
snapshot bootstrap, database restore/replacement generation control, frame
versioning, bounded fan-out/backpressure, timeout, disconnect, and resume
without interpreting transport loss as an outcome.

## Acceptance mapping

- Migration tests: old store upgrades without synthetic history; metadata,
  epoch, and guard drift fail closed.
- Atomicity tests: every inventoried append path, rollback, deduplication,
  concurrent writers, and index failure.
- Replay tests: 100-entry page boundary, 10,000-entry retention boundary,
  contiguous order, empty tip, old/future/foreign/malformed cursors, restart,
  source drift, tampered/unknown family, malformed source ID, duplicate or
  missing sequence, and no partial page.
- Exhaustion tests: seed the signed-integer boundary and prove no wrap, epoch
  reset, source commit, or index omission when the next sequence is unavailable.
- Scope tests: session activity and identity/session lifecycle appends never
  enter this journal or consume its bounded window. A copied database retains
  its in-database epoch, documenting the separate restore gate.
- Regression tests: exact reads, evidence retention, approval mutation,
  operation lifecycle, and Phase 7/8/9/10/11 source gates.
- Named full source, docs, public, migration, inventory, scanner, and
  independent review evidence before a separate merge decision.

## Non-goals and open questions

The next design packet must settle the authenticated Gateway route and stream
transport, initial snapshot semantics, database restore/replacement generation
control, public cursor encoding, JSONL frame format, slow-client backpressure,
disconnect and resume policy, and CLI exit codes. HCFG-4B authorizes none of
these. The producer must verify the exact
source-family inventory before implementation; any unsupported family returns
to the owner as a design change rather than silently narrowing coverage.
