<!-- intent-driven-delivery:spec:v1 -->

# Specification: HCFG-5B B6 Selected Writable Store Custody

Status: proposed
Intent: [Accepted atomic local bootstrap](intent.md)
Authority: [Project Status](../../PROJECT_STATUS.md#hcfg-5b-b6-selected-write-and-migration-custody-contract)
Owner: LNSAT maintainers
Accepted baseline: HCFG-5B `662fc5f489d70d735d9d612e9f8cce6ed3a2b593`; HCFG-6 `0dbe0a2874428721b1a4ba6bad1708ec5fdbb572`
Last updated: 2026-10-03

## Behavior

This proposal specifies the connection and migration ordering between B3B's
read-only main-file observation and B4/B5's future atomic installation. It
changes no source, pragma, schema, migration registration, file or authority.
The pending HCFG-6 source-order amendment and complete integration freeze retain
their gates. Review of B6 is not Stage-A acceptance or implementation.

The supported initializer needs actual writable selected custody. A successful
read-only diagnostic, an ordinary store reopened by filename or a serialized
permit cannot supply it. The connection stays privately owned under the shared
lease; the preparation journal stays separate inert custody evidence.

Current source remains distinct:

- `open_selected_local_store_inspection_v1` opens schema 17 read-only through
  the fixed `unix` VFS. Its custody verifier explicitly requires read-only mode.
- `SqliteStore::open` prepares a path, opens read/write, configures WAL and
  applies the global migration list without selected custody.
- B2 inserts identity, credential and owner-event rows in a caller-owned
  transaction. C1 checks its actual original store scope and borrowed connection.
  Neither creates an installation or supplies writable custody.

These APIs are unchanged here. B5's SQL must not enter global `MIGRATIONS`.

## Interfaces and contracts

### Private connection and lifetime

Later production ownership is private `lnsat-store` selected-store,
installation, schema and preparation modules. One private wrapper owns the
actual store/connection, transient credential scope, parent/lease custody and
preparation-directory custody. It has no public constructor, `Clone`, `Debug`,
wire representation, `Deref` to `SqliteStore`, raw descriptor escape, caller
transaction or production observer callback. No API returns its inner store.

Require the existing canonical absolute UTF-8 path within B3B's 4,096-byte
bound, nonzero equal real/effective UID, owner-owned exact `0700` parent,
regular single-link exact `0600` database and exact shared lease. HCFG-6 must
also prove selected Linux mount/ancestry/effective ACLs. Linux is the first
enforcement backend; macOS inspection alone cannot select headless authority.

Acquire and verify the lease before the first SQLite open. Open with
`SQLITE_OPEN_READ_WRITE`, no CREATE or URI option and fixed native `unix` VFS.
Do not prepare a missing path, chmod, convert journal mode, implicitly migrate
or fall back to ordinary open. Require existing WAL; another mode denies.
Configure and verify foreign keys, recursive triggers, FULL synchronous mode,
defensive mode, disabled trusted schema and disabled double-quoted strings.
Retain B3B's source-pinned SQLite 3.53.2/FILESTAT capability and bounded native
main-descriptor observation. This is not release-artifact authenticity.

Connection-local `query_only=ON` is an initial accidental-write fuse, not
filesystem read-only or authorization. Only the private phase owner under
custody and the installation mutex may disable it immediately before an
explicit immediate transaction. Repeat eligibility inside that transaction
before any row/schema write. Restore the fuse before inert preparation;
restoration failure poisons the wrapper. No caller can toggle it or run SQL.

C1 must see the same actual scope and connection for the wrapper lifetime.
A reopened connection has a new scope and requires fresh credential proof.
An earlier B3B inspection snapshot cannot survive a writable reopen as proof.
If inspection preceded this path, close its SQLite connection, retain the
same lease through the handoff and rederive all writable/native custody.

### Main file and SQLite coordination files

Never open, duplicate, own, hash through another handle or close an alias of
the selected database, WAL or SHM for evidence. Observe the actual main
descriptor in place. No checkpointed header, `/proc/self/fd`, `/dev/fd`,
immutable-file URI, external VFS/function or checkpoint is a shortcut.
An independently closed alias can invalidate process-associated POSIX locks;
keeping it until drop does not correct the hazard.

Under the held owner-private parent, allow only the exact SQLite coordination
names `<selected-filename>-wal` and `<selected-filename>-shm`. Validate existing
objects before open as owner-owned regular single-link `0600` files with the
reviewed ACL/mount predicate. Symlink, hard-link, wrong owner/type/mode/ACL or
mount denies. Absence before SQLite creates its coordination file is permitted,
not cleanup evidence. Unexpected `-journal` state in this WAL-only selection
denies; an application repair routine must not delete or replay it.

Recheck named metadata/ACL association after open, transaction acquisition,
before commit, ambiguity readback and close. SQLite can create, checkpoint,
truncate and retire coordination files. A transition must agree with the
pinned VFS lifecycle and owned connection, not just a filename. The concrete
lifecycle observer and tests still require source freeze and independent
review; B3B's main-only FILESTAT supplies no WAL/SHM observation. Unexplained
replacement or unavailable association denies without unlinking evidence.

Named sidecar observations are not descriptor-bound WAL/SHM proof. They rely
on the explicit trusted host-owner/root, private-parent and single supported
writer boundary. A stricter assurance profile needs an actual reviewed safe
native observer; main metadata, WAL bytes or SQL success cannot invent it.
The preparation journal is neither SQLite WAL nor SHM and substitutes for
neither. No hostile trusted-owner anti-tamper claim is made.

### Selected migration admission

Candidate headless schema stays absent from the global legacy migration list.
Ordinary opens preserve schema-17 behavior and reject future/headless schema;
they cannot migrate to 18, return a headless wrapper or obtain headless
mutation/release authority. Raising the ordinary version to 18 is forbidden.

Future private version dispatch distinguishes legacy 17 from selected headless 18. Reconcile every schema/seed/table/index/trigger, integrity, authentication
and eligibility call site; bypassing `verify_schema` or changing a constant is
insufficient. A request or row cannot set the private mode. B3B's public
schema-17 diagnostic remains unchanged.

Under the lease and installation mutex, one immediate transaction repeats
B1's complete schema-17 manifest, seeds, integrity and all 28 non-seed empty
checks before lasting candidate DDL/version writes. Apply only B5's exact
reviewed body. Atomically publish its ledger/version, check all 35 tables and
242 objects, all 32 non-seed tables empty, exact seeds, foreign keys, integrity
and the actual pinned schema-18 digest. Static counts or an unset digest cannot
pass. Historical signed-evidence v18 is ineligible. Failure rolls back;
migration creates no owner or installation rows.

Migration commits before allocating a preparation ID, deriving its candidate
or running its resource-free probe. No schema-17 preparation is relabeled or
reused after migration. Migration-only schema 18 is inert and repeats full
schema/32-empty-table/custody checks. Owner-only and restored initialized
authority remain ineligible. An authority-empty official restore can be
explicitly initialized as a new installation only under accepted fresh-store
rules; no restore auto-activation exists.

### Preparation and bootstrap transaction

Reuse the exact directory, 16-KiB record, 64-file/1-MiB bounds, no-clobber
immutable revisions, file/directory flush, continuity, orphan/quarantine and
cleanup rules in the [preparation/store contract](../headless-resource-enforcement/preparation-store-source-spec.md).
Hold journal directory custody under the same selected lease. A valid journal
cannot become a connection, installation, cleanup proof or permission.

The [Stage-A private Linux journal custody candidate](../headless-resource-enforcement/preparation-store-source-spec.md#stage-a-private-linux-journal-custody-contract)
borrows an actual selected read-only store and its lease for bounded file
persistence. It does not implement this B6 writable wrapper, migration 18,
precommit store commitment or bootstrap. A parsed phase or successful file
flush cannot substitute for this future actual writable/native/SQL readback.

Before preparation, rederive B4's `store_binding_digest` from current actual
parent/main-file observations. The preparation `store_digest` is
domain-separated SHA-256 over exactly this compact positional JSON array:

```text
[store_binding_digest, 18, schema_manifest_digest]
```

The domain is UTF-8 `lnsat.hcfg_preparation_store.v1` plus one LF byte; the
compact array has no trailing LF. Both digests use exact lowercase `sha256:`
grammar. The schema digest is B5's independently captured actual full schema-18
identity, still `UNSET_BLOCKING`. The binding supplies owner/path/device/inode
identity. Do not substitute a database content hash, caller path or invented
precommit UUID. Random installation/store-instance UUIDs are created later
inside the bootstrap operation. This is physical precommit custody, not an
external anti-rollback root.

After genuine resource/OS preparation and verified cleanup, acquire the same
mutex and a fresh immediate transaction. Recheck actual connection/lease/native
file association, exact schema 18, all 32 empty tables, unchanged declaration/
binding/profile/recipe, held nonempty resources and the exact cleanup-verified
journal chain. Rederive store/candidate digests from current state. No stale
snapshot, schema transition or copied journal bridges a failed check.

Prepare B2's zeroizing owner credential outside the transaction. Inside it,
compose identity/credential/event, root, generation 1, epoch 1, bootstrap audit
and pointer in B4/B5 order. Rederive and cross-check all rows before commit.
First bootstrap is local host-owner authority on an empty store; it invents no
pre-existing owner session. Later decisions require actual C1 credential
recheck, existing transaction-local session/CSRF, full installation/generation/
epoch/stop state and fresh native proof. No component alone is configuration
authority.

Append journal `bound` only after exact committed store/audit readback. It is
not part of the precommit cleanup digest or a second database commit. Journal
failure after commit preserves the root and denies further admission pending
reconciliation; never initialize again or manufacture cleanup. Resource
process/permission/mount/cleanup mutations stay outside SQL transactions.
SQLite's authorized transaction/coordination I/O is distinct from those
external host mutations.

### Serialization, closure and ambiguity

Keep the accepted order: selected lease/custody, private installation-wide
process mutex, immediate transaction, exact checks, commit/readback. Before an
installation exists, mutex scope binds the actual selected physical store;
afterward it also binds the installed root. Filename-only, per-request or
independently recreated mutexes cannot serialize that store. The exact native
primitive, bounded acquisition/cancellation and all-writer call-site inventory
remain complete synchronization-freeze work. All supported owner/identity/
password/recovery/session/policy/nonce/consumption/generation/stop writers join
it. B6 does not shorten the accepted release-intent/frame-write lock lifetime.

Drop statements and roll back unresolved transactions before closing the
owned SQLite connection. Prove closure before releasing the lease or
journal/parent custody, including early returns. Close failure retains custody
or quarantines the owner; it cannot return a reusable success handle. No
unrelated database alias may close during error cleanup. Credential/native
proofs expire with their scope/connection/lifetime.

Failed or unknown commit is not a retry signal. Resolve transaction state
under the same custody, then use a fresh read transaction to classify complete
exact old state, exact migration-only inert state or exact committed bootstrap
root/audit. Partial, mismatched, unverifiable or custody-lost results remain
unknown/quarantined. Never rerun DDL/initialization, reset a pointer, delete
authority evidence/sidecars or resend an action to repair ambiguity. Readback
is not action authority before the separate current-state/native/use gate.

## States and failure handling

| State or failure                           | Required result                                                    |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Lease busy before open                     | Deny without SQLite open, coordination creation or migration.      |
| Missing/insecure store, parent or sidecar  | Deny; no CREATE, chmod, mode conversion or repair.                 |
| Native/schema/ACL association unavailable  | Deny; main-only inspection cannot replace it.                      |
| Schema 17 occupied/malformed               | Deny before lasting migration metadata; preserve evidence.         |
| Exact selected migration committed         | Empty schema 18 stays inert; prepare against that identity only.   |
| Stale/copied preparation or reopened scope | Deny; no snapshot or permit reuse.                                 |
| Bootstrap precommit failure                | Roll back all owner/root/generation/audit/pointer rows.            |
| Commit/postcommit journal ambiguous        | Exact held-store readback or quarantine; no reinitialization.      |
| Ordinary/foreign store or transaction      | No headless migration, mutation or authority.                      |
| Close/custody failure                      | Retain/quarantine; no early lease release or successful admission. |

Outward errors use bounded static categories: unsupported backend, invalid
selection, busy, custody changed, schema unverifiable, occupied, preparation
unverifiable or outcome unknown. Later interface contracts freeze wire/CLI
spellings; none is introduced here. Raw SQLite errors, paths, ACL bytes,
descriptors, journal text and credential material never escape.

## Data, privacy, and permissions

Protected B4 binding/declaration stay local. No password, verifier, session/CSRF
secret, native proof or journal body enters generic logs/output. Retain
zeroizing credential ownership on every exit. This creates no MFA, crypto-
provider assurance, remote authentication, trusted-owner anti-tamper guarantee
or government certification. The separate
[security requirements](../ENTERPRISE_GOVERNMENT_SECURITY_REQUIREMENTS.md)
remain V1 assurance gates.

## Compatibility and migration

Product `0.1.0`, Gateway `lnsat.contracts.v1_0`, current schema 17, B1/B2/B3B/C1,
ordinary opens and the Phase 11 packet are unchanged. Candidate 18 and this
ownership contract are proposed. Owner acceptance of the source-order
amendment, candidate source review, actual schema capture, complete integration
freeze and separate runtime/merge/release gates remain required. Declaration-
only, fixture-injected, empty-only or always-denying substitutes cannot complete
the nonempty usable engine requirement.

## Acceptance mapping

Future source evidence must prove:

- Lease before every open; real writable positive path and unsupported/ordinary
  negatives; no CREATE or global migration.
- Native main and actual pinned sidecar lifecycle; path/mode/owner/ACL/mount
  substitution denials without extra aliases.
- Real cross-process POSIX lock contention across open, denial, migration,
  rollback, repeated observation and close while another reader remains alive.
- Schema-17 empty gate repeated in the immediate transaction, unchanged legacy
  registration, exact captured schema-18 objects/seeds/digest and occupied/
  old/future/copied-state denial.
- Migration-before-preparation, exact digest framing and mismatched schema/
  store/root/journal/native denials without relabeling.
- Complete nonempty bootstrap success, one-time/replay/race denial, failures
  at each insert/link/commit edge and externally invisible partial rows.
- C1 same-scope/connection and current session/CSRF on later decisions; rotation,
  recovery, revocation, stop and epoch races.
- Every invalidating writer joins the shared lock; bounded wait/poisoning/
  cancellation, close/drop order and no frame resend on ambiguity.
- Journal durability, orphan/quarantine, interruption before/after commit,
  exact readback and postcommit `bound` failure without sidecar/evidence deletion.
- Static errors, secret canaries, zeroization, focused pinned Rust tests,
  proportional full source/docs/public/inventory/audits and fresh independent
  source review on the later implementation.

No candidate SQL, source test, native observation or selected-target proof was
performed to produce this proposal. Current tests/CI do not prove the future
contract. Complete native/synchronization integration and real runtime/artifact
proof remain outstanding.

## Non-goals and open questions

B6 implements no writable connection, journal, native observer, migration,
initializer, current-state reader, API, CLI or action authority. It supplies
one supporting contract under the existing accepted outcome, not new owner
acceptance or a complete integration freeze.

Concrete safe coordination-file lifecycle observation, the synchronization
primitive/deadlines and exhaustive writer call sites remain source-freeze
dependencies. Candidate SQL output and schema digest remain unobserved. These
must be resolved and reviewed before source integration; absence cannot be
papered over by a diagnostic or successful empty-only test.

## Source references

- [B3B custody](../../../crates/lnsat-store/src/selected_store.rs),
  [constructors/migrations](../../../crates/lnsat-store/src/lib.rs),
  [B2 owner helper](../../../crates/lnsat-store/src/owner_bootstrap.rs) and
  [C1 recheck](../../../crates/lnsat-store/src/owner_decision_credential.rs).
- [B4 state](state-source-spec.md), [B5 schema](schema-source-spec.md),
  [native observations](../headless-resource-enforcement/native-source-spec.md)
  and [preparation/synchronization](../headless-resource-enforcement/preparation-store-source-spec.md).
- SQLite [WAL lifecycle](https://www.sqlite.org/wal.html) and
  [query-only pragma](https://www.sqlite.org/pragma.html#pragma_query_only)
  explain coordination behavior and the connection fuse. Actual pinned
  source/lifecycle and selected-target evidence still need verification.
