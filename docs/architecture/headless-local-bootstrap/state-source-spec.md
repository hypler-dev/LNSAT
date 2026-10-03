<!-- intent-driven-delivery:spec:v1 -->

# Specification: HCFG-5B B4 Durable Installation and Generation State

Status: proposed
Intent: [Accepted atomic local bootstrap](intent.md)
Authority: [Project Status](../../PROJECT_STATUS.md#hcfg-5b-b4-durable-state-contract)
Owner: LNSAT maintainers
Accepted baseline: HCFG-5B `662fc5f489d70d735d9d612e9f8cce6ed3a2b593`; HCFG-6 `0dbe0a2874428721b1a4ba6bad1708ec5fdbb572`
Last updated: 2026-10-03

## Behavior

This supporting contract freezes the durable root and generation bindings
needed by atomic initialization and later authenticated comparison. It supplies
no migration, initializer, verified current-state value or configuration
authority. The existing source-order gate, including its pending amendment,
remains controlling before candidate implementation. Review of B4 is one
part of the complete native/wire/daemon/store freeze.

The four table names already specified by the
[preparation/store contract](../headless-resource-enforcement/preparation-store-source-spec.md)
are retained: `headless_installations`, `headless_generations`,
`headless_active` and `headless_config_audit`. Current source remains schema 17
and contains none of them. The next mandatory migration is provisionally 18,
as that supporting contract states; no migration is registered here.

## Identity and confirmed input

The declaration's `installation_ref` is a bounded owner assertion. The HCFG-3
parser includes it in the confirmed declaration digest; S1 requires the same
reference in the binding declaration; the comparison model requires it in its
asserted context. None authenticates an installation UUID.

Persist two distinct identities:

- `installation_id`: fresh random lowercase UUID created by the initializer
  within the atomic initialization operation, never selected from caller data;
- `declaration_installation_ref`: the exact confirmed HCFG-3/S1 reference,
  immutable for this installation and never used alone to select authority.

Do not replace the declaration reference with the generated UUID, rewrite its
confirmed canonical bytes, or reinterpret the precommit candidate/binding
digests. The preparation still has no installed UUID before the transaction.
The immutable installation record and bootstrap audit bind that unchanged
declared reference to the new physical installation/store-instance identities.
Two distinct stores may contain the same declaration reference; their UUID,
store/file binding and generation commitments must remain distinct.

Later candidate declarations must match the stored declaration reference.
The private trusted-state reader derives the pure model's `installation_ref`
from that stored value, while the future authenticated comparison separately
binds the actual `installation_id` and `store_instance_id`. No caller label,
model digest or numeric generation can select or authenticate that root.

## Interfaces and contracts

Production ownership for the later implementation is private `lnsat-store`
modules and its compiled migration/schema verifier. There is no public JSON
constructor, serialized permit, caller transaction adapter, fixture observer
or API/CLI entrypoint in B4. The read result must have private fields, no
`Clone`, `Debug` or wire representation, and be bound to one actual selected
store/connection and current transaction. It cannot survive as admission proof
after the transaction or replace a fresh resource/native check.

### Closed value vocabulary

UUIDs use lowercase canonical UUID text. Generation and audit references use
the existing bounded opaque-reference grammar and exact `generation:` and
`config-audit:` prefixes. The owner reference uses the existing
`identity:human:` grammar. Credential and identity-event links retain their
existing content-addressed `sha256:` IDs and store validation; they are not
new `credential:` or `identity-event:` opaque-reference families. SHA-256 values use lowercase
`sha256:` plus 64 hexadecimal digits. Counters are integers in
`1..=9007199254740991`; stop/revocation epoch may be zero. Overflow denies;
wrapping and reset are forbidden. Timestamps reuse the existing canonical UTC
millisecond grammar and come from trusted source time, never a request body.

Every table has strict SQLite types, explicit NOT NULL requirements except
the nullable values below, foreign keys, exact singleton/unique constraints,
and immutable-row UPDATE/DELETE rejection where specified. SQL constraints
are structural protection; Rust must rederive canonical bytes, digests and
linked semantics. A valid-looking SQL row is not authenticated OS evidence.
The later DDL freezes exact SQL, trigger/index names and complete schema-object
inventory before registration; these logical columns are not that DDL.

### `headless_installations` — immutable root

Exactly one row is possible; `singleton = 1` is its primary key.

```text
singleton
installation_id
store_instance_id
declaration_installation_ref
owner_identity_ref
owner_identity_event_ref
owner_identity_event_digest
initial_credential_ref
initial_credential_generation
store_binding_json
store_binding_digest
preparation_id
preparation_candidate_digest
preparation_store_digest
preparation_recipe_digest
cleanup_journal_digest
first_generation_ref
bootstrap_audit_ref
initialized_at
installation_digest
```

Installation/store-instance UUIDs and generation/audit references are unique.
The owner identity/event/credential links must resolve to the owner rows
created in the same transaction. The initial credential generation is exactly
`1`. Initial metadata records remain immutable after later password rotation;
current credential checks always rederive the current credential chain.

`preparation_id` is the existing 64-hex random preparation identity, not an
installation UUID. The three preparation digests and terminal
`cleanup_journal_digest` must rederive the exact verified `cleanup_verified`
journal chain before commit. The later `bound` journal revision is not inserted
into this digest: it is written after exact committed readback, avoiding a
precommit/postcommit dependency cycle.

`store_binding_json` is a closed canonical object of at most 16,384 UTF-8
bytes, with exactly `schema_id`, `platform`, `database_path`, `parent_device`,
`parent_inode`, `database_device`, `database_inode`, `owner_uid`,
`parent_mode`, `database_mode` and `database_link_count`. Its schema is
`lnsat.headless_store_binding.v1`; the first verified backend is `linux`.
The canonical database path uses the existing selected-store grammar and
4,096-byte ceiling. Device/inode values are canonical unsigned decimal strings
parsed as u64, preserving values above the JSON safe-integer range. UID is
nonzero and observed under the existing equal real/effective UID rule.
Parent mode is `0700`, database mode is `0600`, and link count is 1.
No VFS descriptor, file handle, PHC verifier, password or runtime observation
is serialized. Reuse B3B's actual SQLite-owned descriptor observation; never
open an extra database handle to construct this record.

`installation_digest` commits the ordered logical columns above excluding
itself. It includes first-generation/audit references, but not their digests.
This permits deferred foreign-key linkage without circular hash definitions.

### `headless_generations` — immutable configuration

```text
generation_ref
installation_id
installation_digest
generation_sequence
previous_generation_digest
declaration_json
declaration_digest
declared_composed_json
declared_composed_digest
effective_envelope_json
effective_envelope_digest
binding_declaration_json
binding_declaration_digest
resource_evidence_digest
policy_floor_version
policy_floor_digest
enforcement_profile_version
created_at
generation_digest
```

Primary key is `generation_ref`; `(installation_id, generation_sequence)` is
unique. The installation link must match the immutable root and digest. The
first sequence is 1 with `previous_generation_digest = null`; subsequent
sequences require exactly the preceding verified generation/digest. Future
apply, rollback and generation creation need their separately frozen writer
contracts and accepted HCFG-5A authority; B4 opens none of those writers.

`declaration_json` is the complete canonical confirmed HCFG-3 document, at
most 65,536 UTF-8 bytes, reparsed and recomposed before use. Binding declaration
bytes retain S1's 65,536-byte ceiling and exact reference/inventory matching.
The two envelope objects have exactly `resource_allow` and `rules`, using the
existing comparison envelope's sorted reference/tuple arrays, closed modes
and all five safe-integer limits. Each is bounded to 262,144 UTF-8 bytes.
The declared object is the complete HCFG-3 ceiling; the effective object is
the server-derived intersection with the current compiled policy and installed
restrictions, never a client-selected envelope.

The first effective envelope grants no agent action: every rule is deny with
zero limits. Retained verified resource identities do not grant agent actions.
Preparation uses the existing finite owner budget and cannot borrow agent
action budgets. Initial `resource_allow` is exactly the final composed HCFG-3
resource allow set, after every listed resource passes the accepted native
identity/enforcement checks; it cannot restore a resource removed by a layer
or add a resource from the larger original inventory. Unsupported/nonempty
backend eligibility retains HCFG-6's gate independently of this array.

The compiled policy floor/version must match the actual current source's
policy descriptor. Stored fields or a model constructor cannot select an older
floor. Resource evidence is a commitment to verified observations, not durable
freshness proof; startup and each use must reobserve current identity and
enforcement through the accepted HCFG-6 boundary.

`generation_digest` commits the ordered columns excluding itself. It includes
the installation digest and both declared/effective commitments. Recomposition
must independently reproduce every stored JSON/digest pair.

### `headless_config_audit` — immutable linked evidence

```text
audit_ref
installation_id
audit_sequence
previous_audit_digest
event_kind
payload_json
payload_digest
recorded_at
audit_digest
```

Primary key is `audit_ref`; `(installation_id, audit_sequence)` is unique.
The bootstrap event has sequence 1, null previous digest and exact event kind
`headless_bootstrap.v1`. Its closed payload has exactly:

```text
installation_id, store_instance_id, installation_digest,
declaration_installation_ref, store_binding_digest, owner_identity_ref,
owner_identity_event_ref, owner_identity_event_digest,
initial_credential_ref, initial_credential_generation,
preparation_id, preparation_candidate_digest, preparation_store_digest,
preparation_recipe_digest, cleanup_journal_digest,
first_generation_ref, first_generation_digest,
declaration_digest, declared_composed_digest, effective_envelope_digest,
binding_declaration_digest, resource_evidence_digest,
policy_floor_version, policy_floor_digest, enforcement_profile_version,
authority_epoch, active_stop, stop_revocation_epoch
```

The initial authority epoch is 1, active stop is false, and stop/revocation
epoch is zero. The event links the newly created owner, root, generation,
confirmed input and cleaned preparation. It contains no credential verifier,
raw paths, declaration, resource details or native proof bytes. Payload JSON
is bounded to 16,384 bytes. The audit row commits its ordered columns excluding
`audit_digest`; its payload digest commits the closed payload.

The exact bootstrap variant is frozen here. Every later transition, decision,
stop, recovery or release-intent variant needs its own closed payload and
writer contract before integration; unknown kinds deny. Current-state
verification must validate the complete linked audit chain from bootstrap,
with bounded row decoding and incremental hashing rather than loading an
unbounded history into memory. No unchecked last-row shortcut or silent
fallback to an older head is permitted. Time/resource exhaustion denies.

### `headless_active` — one current pointer

```text
singleton
installation_id
generation_ref
generation_digest
authority_epoch
active_stop
stop_revocation_epoch
audit_head_ref
audit_head_digest
```

`singleton = 1` is the primary key. Deferred foreign keys bind the installation,
generation and audit head. The first row is generation sequence 1, authority
epoch 1, false stop, zero stop/revocation epoch, and the bootstrap audit head.
No pointer row without all exact immutable links may commit. SQL readers must
not call this row an execution permit. Future pointer updates require the
shared installation-wide synchronization and immediate transaction; epoch
advances strictly and stop/revocation floor never decreases.

## Canonical encodings

JSON uses the existing contract canonicalizer: recursively sorted UTF-16 object
keys, preserved validated array order, safe decimal integers, exact string
escaping and no trailing LF. Each digest is SHA-256 of its domain text, one LF
byte, then canonical JSON. Hashes are lowercase `sha256:` strings.
In column-value arrays, persisted `*_json` text is a JSON string containing
its complete canonical bytes, not an embedded object. SQL NULL is JSON null;
decoded counters remain integers. Closed object digests in the table below
hash the object itself. The bootstrap payload's `active_stop` is a JSON
boolean; SQLite's corresponding pointer column is a strict 0/1 integer.

| Value                     | Exact domain                                  | Canonical body                              |
| ------------------------- | --------------------------------------------- | ------------------------------------------- |
| Store binding             | `lnsat.headless_store_binding.v1`             | closed binding object                       |
| Declared composed ceiling | `lnsat.headless_config.composed_envelope.v1`  | closed envelope object                      |
| Effective envelope        | `lnsat.headless_config.effective_envelope.v1` | closed envelope object                      |
| Installation              | `lnsat.headless_installation.v1`              | ordered column-value array excluding digest |
| Generation                | `lnsat.headless_generation.v1`                | ordered column-value array excluding digest |
| Bootstrap payload         | `lnsat.headless_bootstrap.v1`                 | closed payload object                       |
| Configuration audit       | `lnsat.headless_config_audit.v1`              | ordered column-value array excluding digest |

HCFG-3, S1 and preparation digests retain their existing domains/encodings.
Their bytes are never relabeled as a new digest family or authority proof.

## States and failure handling

Schema installation adds only empty tables. It must not convert owner-only
legacy rows, copied/restored authority, a diagnostic or a preparation journal
into an initialized installation. Authority-empty eligibility must enumerate
the complete new compiled schema and all added tables. Missing/unknown objects,
schema drift, partial root/generation/pointer/audit state or unverifiable links
deny. Current B1's schema-17 manifest cannot approve a schema-18 initializer.

One immediate transaction under selected custody and the private installation
mutex rechecks eligibility, current native/preparation evidence and trusted
time. It inserts B2's prepared owner, root, first generation, bootstrap audit
and active pointer; rederives every link; then commits all or rolls back all.
Deferred foreign keys are checked before commit. No OS/process/permission work
occurs inside the transaction. A lost commit response is unknown until exact
local readback under the lease; it never permits another initialization.

Current-state derivation rechecks selected-store custody/actual connection,
root/file binding, owner/event evidence, generation sequence/digests, complete
audit chain, active pointer, compiled floor, epochs/stop and fresh resource/
enforcement evidence in the same authoritative transaction. It derives the
pure model context from these values and keeps the physical root binding in
the separate private authenticated comparison. C1 credential recheck and the
existing transaction-local owner-session/CSRF verifier remain necessary for
owner decisions. They grant no installation or generation authority alone.

Before copying row text/JSON into Rust, readers require exact SQL types and
byte lengths and use a temporary 1,048,576-byte SQLite length limit, restored
on every success/error path. Per-field ceilings above still apply. Audit
verification streams one bounded row at a time and checks contiguous sequence,
previous digest and exact root linkage; no aggregate history allocation is
permitted. SQLite/decoder size failure, corrupt foreign keys or incomplete
validation denies before a trusted-state result can escape.

## Data, privacy, and permissions

Internal canonical declarations/bindings contain sensitive references and
paths; no generic stored-row serializer or logging is permitted. The future
protected owner view uses a closed projection with complete change content and
bounded output. Hashes and SQLite audit remain evidence under the trusted host
owner; they provide no independent anti-rollback, hostile-root or government
assurance. Official initialized-store restores remain inert at their fresh
path until separately accepted recovery activation.

## Compatibility and migration

Current product/wire/profile versions and schema 17 are unchanged. Historical
Phase 7d v18 signed-evidence SQL remains an unregistered test-only proposal.
It is not this headless layout and cannot be composed with or applied to it
implicitly. Before registering the mandatory headless migration, the source
packet must reconcile the compiled migration/schema verifiers and historical
test-only truth labels together. Optional signed-evidence enrollment/custody
stays blocked and must be redesigned against the then-current schema if opened.

## Acceptance mapping

- Independent canonical vectors bind every installation/generation/audit
  field, null genesis, UUID versus declared-reference distinction and domain.
- Same declaration alias in distinct stores yields distinct root/generation
  identities; no input rewrite changes the confirmed preparation digest.
- Future migration adds only the four empty families, exact schema objects,
  foreign keys, singleton/unique keys and immutable-row protections. Historical
  populated owner-only stores cannot acquire initialization authority.
- Same transaction links owner/root/generation/audit/pointer; injected insert,
  rederivation, deferred-FK and commit failures leave no partial authority.
- Current-state reads reject copied file identity, partial state, every link/
  digest/sequence substitution, stale compiled floor, stop/epoch regression,
  unknown audit kind and incomplete native proof. No caller model is trusted.
- Source implementation requires the controlling source-order gate, exact DDL/
  schema inventory and variant readers, independent review, focused pinned
  Rust tests, broad proportional checks and installed local scans. B4 review
  supplies no evidence that those source tests or runtime operations passed.

## Non-goals and open questions

No current schema migration, table, state reader, initializer, candidate,
challenge, decision, apply, stop writer, route, CLI or permission change is
implemented. Candidate/challenge quotas, protected authenticated comparison/
view and later audit variants require their exact source contracts. Full
native/wire/daemon/store freeze and the pending staging amendment retain their
gates. Docker, host ACL changes, artifact/image construction, merge, runtime,
release and production remain closed. V1 and enterprise/government assurance
are incomplete.
