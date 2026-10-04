# HCFG-6 Preparation Journal and Store Synchronization Source Specification

Status: supporting source specification for the accepted HCFG-6 design. The
owner accepted the exact PR #72 decision on 2026-10-01. This document freezes
the journal, bootstrap transaction, and installation-wide synchronization seam
for later source implementation. It does not claim that the full source freeze
has passed, that this behavior exists in the current source, or that Linux,
Docker, package, release, or production evidence exists.

## Authority and scope

[Project Status](../../PROJECT_STATUS.md) owns current HCFG-6 acceptance and
implementation status. The HCFG-6 `spec.md` and `plan.md` own the complete
resource and runtime design. The accepted headless-local-bootstrap artifacts
own the fresh-store, owner-transaction, selected-store custody, and
no-authority bootstrap prerequisites. This document is limited to the private
preparation journal, its durable replacement rules, the one atomic bootstrap
transaction, and the synchronization boundary that protects startup release.

The journal is custody evidence. It is never an authority record, permit,
retry token, or substitute for current SQLite readback or live resource and
runtime observations.

## Current source anchors

The implementation target is `crates/lnsat-store`. Current source defines
`SQLITE_SCHEMA_VERSION = 17`; the next schema migration is therefore the
actual current version plus one, migration 18. `headless_bootstrap.rs` is a
read-only schema-17 eligibility inspection and explicitly provides no
initialization authority. `owner_bootstrap.rs` provides transaction-local
owner preparation and insertion; the caller owns the immediate transaction,
commit, and rollback. `selected_store.rs` holds selected-store path, identity,
and lease custody. None of these current seams implements the HCFG-6 journal,
installation binding, or release synchronization described here.

## Private preparation directory and journal

The selected-store parent contains the exact owner-private directory
`<selected-db-filename>.lnsat-preparations`, directly under the selected
database's parent. That directory is private mode `0700`, owned by the
accepted non-root owner, and is opened and revalidated with no-follow
semantics. Each preparation has a direct child directory named by its exact
64-hex `preparation_id`, also mode `0700`. The implementation must reject
symlinks, wrong owner or mode, unexpected object type, hard-link ambiguity,
and any unrecognized entry before preparation starts. It must not create or
relax host permissions to make a directory pass.

Before resource-free probe creation, generate `preparation_id` from 32 random
bytes and encode it as exactly 64 lowercase hexadecimal characters. There is
no installation ID at this point. Journal revision files are direct children
of the exact per-preparation directory. Each filename is exactly eight
decimal digits followed by `.json`; revision 0 is `00000000.json`. The file
is mode `0600`, has one link, and is no larger than 16 KiB. Creation must use
exclusive create semantics; an existing path is never overwritten or
truncated. The overall preparation root admits at most 64 preparation
directories and 1 MiB of regular-file bytes. Unexpected names, extra files,
symlinks, and other object types are rejected. The root and each preparation
directory are bounded and revalidated before every transition.

Each record is strict JSON with exactly these fields, in this canonical order.
`schema_id` is `lnsat.hcfg_preparation_journal.v1` and
`contract_version` is `lnsat.contracts.v1_0`. The record is one canonical
compact UTF-8 struct-order object followed by exactly one LF byte. No
whitespace, duplicate key, trailing byte, or alternate object ordering is
accepted. The complete record including that LF is at most 16 KiB.

```text
schema_id
contract_version
preparation_id
candidate_digest
store_digest
recipe_digest
owner_uid
challenge_digest
phase
container_name
container_id
previous_digest
revision
```

Unknown fields, duplicate fields, missing fields, wrong types, invalid digest
encodings, invalid phase values, invalid nullable values, out-of-range UID or
revision, and trailing bytes are rejected. The encoded record, including its
canonical field order and framing, must remain within 16 KiB. `container_id`
and `previous_digest` are nullable; all other fields are required. The initial
record is `phase = pending`, `revision = 0`, `container_id = null`, and
`previous_digest = null`. A preparation record never contains raw paths,
resource contents, descriptors, UID mappings, credentials, or native proof
bytes.

The deterministic object name is
`lnsat-hcfg6-probe-{preparation_id}`. The name and challenge are fixed before
the create request. Cleanup may inspect only that exact name, and, after a
create response supplies an ID, that exact ID together with the fixed name.
Global searches, label-only selection, and deletion of a merely matching name
are forbidden.

## Canonical digest inputs

All digest inputs use domain-separated SHA-256 over canonical JSON arrays. The
array elements are positional, with no object-key reordering or optional-field
elision. Strings use UTF-8; nullable values use JSON `null`; arrays contain no
duplicate or unknown elements. The domain label is UTF-8 and includes one LF
byte before the compact array; the array itself has no final LF. Candidate and
journal digests therefore cannot be confused with one another.

The candidate digest array has exactly this order:

```text
[declaration_digest, composed_digest, binding_digest, store_digest,
 owner_uid, profile_digest, recipe_digest]
```

The candidate domain is exactly `lnsat.hcfg_preparation_candidate.v1\n`.

The journal digest domain is exactly `lnsat.hcfg_preparation_journal.v1\n`.
Its positional array contains all 13 record values, in the field order above,
including `null` for nullable values. The compact object record and the digest
array are separate encodings: the object is struct-order JSON plus one LF;
the digest input is domain LF plus compact positional JSON with no LF. The
`store_digest` binds selected-store path/file custody and current schema/store
instance evidence; it is not a digest of a caller-supplied path string.
The [B6 selected-write proposal](../headless-local-bootstrap/selected-write-source-spec.md#preparation-and-bootstrap-transaction)
defines its exact precommit physical binding and schema-18 framing. The
installation/store-instance UUIDs do not exist until atomic bootstrap.
Migration commits before preparation; schema-17 candidate/journal evidence
cannot be relabeled after migration.
`recipe_digest` binds the immutable resource-free preparation recipe. The
journal `phase` is descriptive custody state and is never used as authority.
A stale or valid journal digest cannot replace fresh store or live resource
evidence.

## Durable replacement and continuity

Every journal transition is an immutable replacement revision. Write the new
record to a new no-clobber file in the same private preparation directory,
flush the complete file, then flush the directory. Never overwrite, rename
over, truncate, or edit an earlier revision. The implementation must verify
the file and parent after each operation and fail closed on any custody drift.

The first record is revision 0 with a null previous digest. Each later record
has revision `n + 1` and `previous_digest` equal to the digest of the exact
prior record. Continuity is strict: reject gaps, duplicate revisions, wrong
previous digests, duplicate preparation IDs, extra files, symlinks, nonregular
files, and any nonterminal prior record before accepting a new initialization.
Each preparation directory is bounded by at most 64 revision files. The
preparation root is bounded by at most 64 preparation directories and 1 MiB
total regular-file bytes. Exceeding any bound denies and quarantines; it never
triggers pruning or replacement.

The accepted phases are `pending`, `probe_created`, `cleanup_verified`,
`bound`, and `quarantined`.

- `pending` records durable intent before probe creation.
- `probe_created` records the exact returned container ID only after private
  identity checks prove the deterministic name, recipe, challenge, owner,
  candidate, and current daemon identity agree.
- A lost create response may inspect only the exact deterministic name. Any
  conflict, incomplete identity, duplicate, or ambiguous response becomes
  `quarantined`; it cannot delete the object or resend the create request.
- `cleanup_verified` is legal only after private inspection proves the owned
  object is absent or proves removal of the exact verified-owned object. A
  verified current-endpoint exact `404` is sufficient for the zero-created
  `pending` to `cleanup_verified` transition. A label, name, timeout, or
  successful delete request alone is insufficient.
- `bound` is written only after exact current SQLite store and audit readback
  proves the committed binding. It never authorizes work.
- `quarantined` is terminal until separately authorized offline host-owner
  inspection proves safe cleanup. Quarantine forbids retry, deletion by
  ambiguity, or new initialization/admission.

Before a new initialization, inspect every prior journal entry under the
selected-store lease. Any orphan, malformed revision chain, extra object, or
ambiguous durability result quarantines the preparation directory and denies.
Recovery of a stale or pending entry permits exact-object inspection and
cleanup only. It never retries or resends creation. A new initialization
receives a fresh random preparation ID only after verified cleanup; an old ID
is never reused. Candidate and store identity are immutable across revisions.
The normal phase path is `pending` -> `probe_created` ->
`cleanup_verified` -> `bound`; a lost create with confirmed exact absence may
use `pending` -> `cleanup_verified`. Any failure before `bound` enters
`quarantined`; `bound` is terminal and cannot be reused for a new attempt.

## Stage-A private journal codec contract

The human-accepted [source-order amendment](source-freeze-staging-decision.md)
permits this exact codec contract to receive fresh independent review before
implementation. This is the first codec-first preparation-engine candidate,
not the complete native/store freeze. Primary source ownership is
`crates/lnsat-store/src/headless_preparation.rs`, its private test module
`headless_preparation_tests.rs`, and the private module declaration in
`crates/lnsat-store/src/lib.rs`. No public re-export or active caller is added.

The module decodes the exact 13-field record above, derives the exact candidate
and journal commitments above, and validates a bounded ordered revision chain.
Fields and validated objects remain private. Inputs are untrusted assertions;
success establishes syntax, canonical bytes and internal continuity only.
It establishes no actual custody, observed cleanup, committed bootstrap,
current store identity, authority or admission. There is no successful-observer
injection, database operation, filesystem operation, random-ID generator or
transition writer in this slice. The scoped dormant-module `dead_code`
allowance records its disconnected status; unsafe code remains forbidden and
all other existing source lints remain enforced.

The following codec rules make the existing journal contract precise:

- A record is at most 16,384 bytes including exactly one final LF. Typed
  canonical re-encoding must match every input byte; alternate whitespace,
  order, escapes, integer forms, duplicate/unknown/missing fields, extra frames
  and invalid UTF-8 reject. Nullable fields must be explicitly present.
- `owner_uid` is a nonzero u32 other than `4294967295`. Revision is an unsigned
  integer from 0 through 63. Preparation and container IDs have exactly 64
  lowercase hexadecimal characters. Every digest is exactly the seven ASCII
  bytes `sha256:` followed by 64 lowercase hexadecimal characters; whitespace,
  uppercase, alternate prefixes or lengths reject. The six candidate input
  digests use that same encoding, with the same owner UID rule.
  `container_name` equals `lnsat-hcfg6-probe-` plus the preparation ID.
- Revision 0 is `pending` with null previous/container values. Later records
  are not `pending` and require the preceding digest. `probe_created` requires
  a container ID. Later phase shape alone is descriptive and cannot prove the
  observations required by the durable writer.
- A chain contains 1 through 64 records, with total bytes at most 1 MiB, starts
  at revision 0, and increments exactly once at each entry. Preparation,
  candidate, store, recipe, owner, challenge and deterministic name are
  immutable. Each previous digest equals the actual prior journal digest.
- Legal phase edges are `pending -> probe_created`,
  `pending -> cleanup_verified`, `probe_created -> cleanup_verified`, and
  `cleanup_verified -> bound`. Each nonterminal phase may enter `quarantined`;
  `bound` and `quarantined` are terminal. Repeated phases and any terminal reuse
  reject. Offline quarantine resolution is outside this codec.
- Container identity may first appear on `pending -> probe_created` or
  `pending -> quarantined`. A direct `pending -> cleanup_verified` retains
  null. Once an ID exists it cannot change or disappear; other edges retain
  the previous value. A quarantined ID conveys no ownership or deletion proof.
- Errors are fixed bounded codes with no raw input, metadata, identifiers,
  hash values or provider errors. Record types have no diagnostic `Debug`
  representation or serialization outside the private codec.

The exact error set is `journal.limit_exceeded`, `journal.invalid_frame`,
`journal.invalid_record`, `journal.invalid_candidate` and
`journal.invalid_chain`. Errors are five data-free enum variants; `code()`
returns only the corresponding static ASCII string, at most 25 bytes.
Record/chain size or count overflow returns the limit
code before parsing. An empty/non-LF-terminated/noncanonical record returns the
frame code. JSON/type/field/schema/encoding/initial-shape violations return the
record code; raw parser errors are discarded. Invalid candidate fields return
the candidate code. Empty chains, nonconsecutive revisions, altered immutable
fields, wrong prior digest, forbidden edges or container drift return the chain
code after each record has passed its own checks. Internal typed serialization
failure maps to the corresponding record/candidate code without raw detail.

The existing literal digest labels and framing are fixed for this private
candidate contract. Manual independent golden vectors must test the object
and positional-array distinction, exact LF boundaries and SHA-256 domains.
Positive tests cover normal and zero-created cleanup paths and all quarantine
edges from `pending`, `probe_created` and `cleanup_verified`, including null
and retained container identity. `pending -> quarantined` has two required
positive vectors: null container identity and the first valid 64-hex container
ID. Later quarantine edges cover every permitted null/non-null retention shape.
Terminal reuse always rejects;
negative tests cover every field class, alternate encodings, identity drift,
gaps/replays, altered prior digest, invalid phase edges and bounds. Corpus cases
exercise hostile parser inputs without accessing live resources. Future durable
custody, schema-18 writing, bootstrap/release, native observations and actual
target proof remain separately reviewed implementation steps.

## Atomic bootstrap and schema migration

The future source packet adds migration 18, derived from the actual current
schema version 17. Migration 18 must add the inactive tables
`headless_installations`, `headless_generations`, `headless_active`, and
`headless_config_audit`, with strict keys, foreign keys, and the journal
binding required to link the exact preparation and digest chain. It must not
rewrite older authority/evidence tables or create authority in an
existing store. Explicit metadata-version and retention-seed rebuilding is
required by their current closed SQL checks; the
[B5 schema proposal](../headless-local-bootstrap/schema-source-spec.md)
limits that mechanic to exact seeds and four new preserve-only families.
Existing schema-17 stores, owner-only stores, and restored
initialized stores remain ineligible for first headless initialization unless
a separately accepted migration says otherwise.

The supporting [B4 durable-state contract](../headless-local-bootstrap/state-source-spec.md)
specifies logical columns, canonical domains and bootstrap linkage. It keeps
the confirmed declaration reference distinct from the newly generated
installation UUID; the immutable root/audit bind both without rewriting the
preparation candidate. Exact DDL/schema inventory and the complete source
freeze remain required. B5 proposes exact SQL and static object expectations,
but its actual pinned schema manifest remains unset. Historical Phase 7d's unrelated v18 test-only proposal
does not supply or authorize this migration.

After successful resource-free preparation and verified cleanup, one immediate
SQLite transaction performs all initialization writes. It creates the random
installation UUID, store-instance identity, generation 1, and epoch 1, then
binds the exact preparation ID, candidate/store/recipe digests, owner and
binding evidence, first configuration generation, active pointer, stop and
revocation floor, and linked bootstrap audit. The transaction must recheck
schema, authority-empty state, selected-store path/file/owner identity,
declaration and binding digests, resource identities, and preparation state
inside the transaction. It must rederive and verify every inserted row before
commit.

The transaction is all-or-nothing. Owner identity, credential, generation,
binding, installation, journal linkage, active pointer, and audit rows commit
together or none commit. No process creation, Docker call, filesystem
permission change, mount, namespace change, cleanup, or other OS mutation may
occur inside the transaction. A precommit crash leaves the authority store
empty and inert. A postcommit crash resolves through exact local store/audit
readback; it never reinitializes or redispatches. If readback is ambiguous,
the state denies and remains quarantined.

## Installation-wide release synchronization

The synchronization boundary covers every writer that can invalidate a
permission. It is a private process-wide `Arc<Mutex<...>>`, exclusive rather
than an `RwLock`; the installation map is private and inaccessible to callers.
The daemon also holds the exclusive selected-store lease. A private headless
store means one owned store instance plus that daemon lease. Ordinary
`SqliteStore::open` must not bypass this boundary for a headless-selected
store; an unbound ordinary store cannot obtain headless authority.

The lock order is fixed:

```text
selected-store custody -> private process-wide installation mutex
-> SQLite BEGIN IMMEDIATE -> exact state/readback checks -> COMMIT
-> bounded exact frame write -> release locks
```

The release path acquires custody and the installation-wide lock before the
fresh immediate transaction, checks the current installation UUID, store
instance, generation, epoch, active pointer, stop floor, revocation floor,
resource/profile/action digests, and one exact durable attempt. It commits one
private one-use release-intent audit bound to the same attempt, channel, and
epoch. The lock remains held through the bounded exact frame write. A stop,
revocation, generation change, session invalidation, or identity invalidation
cannot commit between that transaction and the frame write.

Every invalidating writer acquires the same mutex before its immediate
transaction and commits under it. This includes owner bootstrap; identity
creation, password rotation, recovery, and disablement; session issue,
verification touch, rotation, and revocation; policy, approval, and any audit
writer that changes authority; phase-7 nonce and consumption issue, cancel,
revoke, and redeem; attempts and reconciliation; and future headless
generation, epoch, and stop writers. Audit-only non-authority appends may
remain transaction-only, but may never bypass an authority writer lock.
Commit order defines the result:
revocation committed first denies release; release commit first is the grant
linearization point, and a later revocation cannot claim that already released
work never happened. A write or commit ambiguity consumes the attempt and
becomes `unknown`; it never resends or creates a replacement attempt.

Mutex acquisition uses source monotonic time, 100 ms try-lock polling, and a
five-second acquisition cap. These values are fixed source behavior, not user
configuration. The exact frame write is bounded by the remaining action
deadline and has a five-second minimum cap; it may not extend the action
deadline. Timeout, owner loss, custody drift, stale generation/epoch, missing
audit, or any unrecognized writer denies release and preserves consumed-attempt
reconciliation evidence.

## Crash and ambiguity matrix

| Failure point                                | Required result                                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before journal creation                      | No authority; no probe cleanup claim.                                                                                                                         |
| After `pending`, before create               | Reopen and verify the exact chain; recovery permits exact-object inspection/cleanup only and never resends creation.                                          |
| Lost create response                         | Inspect only exact deterministic name; prove owned identity or exact absence, otherwise quarantine. Never global-search, delete by label, or resend creation. |
| After `probe_created` before cleanup         | Prove exact owned-object cleanup; otherwise quarantine.                                                                                                       |
| Cleanup response ambiguous                   | No `cleanup_verified`; quarantine and require offline proof.                                                                                                  |
| SQLite transaction before commit             | Roll back all rows; journal remains terminal custody evidence and store remains inert.                                                                        |
| SQLite commit response lost                  | Exact current store/audit readback; committed means bind, absent means fresh preparation ID after verified cleanup, ambiguity denies.                         |
| Crash after commit before `bound`            | Read back the complete binding; write `bound` only on exact match; never reinitialize.                                                                        |
| Release transaction or frame write ambiguous | Attempt remains consumed and `unknown`; no resend or replacement attempt.                                                                                     |
| Revocation/stop before release commit        | Deny release.                                                                                                                                                 |
| Revocation/stop after release commit         | Preserve the grant and its receipt or unknown consequence; deny subsequent work.                                                                              |

## Requirements and evidence matrix

| Requirement               | Source evidence required before implementation acceptance                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Private journal custody   | Unit tests for `0700` directory, `0600` no-clobber files, owner/mode/type/symlink/hard-link rejection, 16 KiB/64-file/1 MiB bounds, file-plus-parent flush, and crash reopen.                         |
| Strict record contract    | Tests for exact field order, duplicate/unknown/missing fields, nullable rules, lowercase `preparation_id`, digest framing, trailing bytes, and revision continuity.                                   |
| Exact cleanup             | Private observer tests for deterministic name/ID, complete identity comparison, lost-create conflict, proved absence, quarantine, and no global search/delete.                                        |
| Atomic bootstrap          | Pinned Rust tests showing migration 18, fresh immediate transaction, installation UUID/store-instance/generation 1/epoch 1, linked audit, all-or-nothing rollback, and no OS mutation in transaction. |
| Release linearization     | Tests covering every invalidating writer, shared lock participation, lock order, bounded frame write, commit order, stale generation/epoch, and write/commit ambiguity with no resend.                |
| Current store integration | Tests proving selected-store lease custody is required and ordinary `SqliteStore::open` cannot bypass headless-selected authority.                                                                    |
| Honest boundary           | Documentation and public checks must retain source-only wording. Actual Linux, Docker, selected-target, package, release, and production gates remain separate.                                       |

## Explicit non-claims and open review questions

This is a source-only supporting contract. It does not claim full HCFG-6 source
freeze approval, implementation, actual Linux or Docker proof, selected-target
proof, merge authority, release readiness, package publication, deployment, or
production activation. No source, schema, lock, or protocol implementation is
authorized by this document alone.

The Stage-A codec contract above fixes its existing literal domain labels and
canonical framing for private candidate implementation after independent
review. The following exact details still require the primary controller's
final complete-freeze decision before integration: migration-18 exact DDL/schema inventory and later audit
variant payloads (B4 specifies bootstrap logical columns/domains); the
native lock primitive and bounded deadline values; and the complete set of
installation-wide writer call sites that must join the lock. If source or
accepted artifacts expose a semantic conflict in these details, stop and
escalate to Sol rather than infer a compatibility rule.
