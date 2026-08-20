# SQLite Recovery Inspection Events

Status: implementation note for local source behavior. This contract does not
authenticate an operator, trust wall-clock input, repair or quarantine data,
activate a database, expose a recovery command, or authorize production use.

## Implemented Boundary

Schema version 8 adds immutable
`lnsat.sqlite_recovery_inspection_event.schema.v1_0` rows.
Schema version 17 extends its closed disposition vocabulary with
`legacy_phase7_evidence` so a current observer can record valid populated-v16
evidence without calling it migration eligible. No migration or activation
authority follows from this classification.
`SqliteStore::append_recovery_inspection_event_v1`:

1. validates bounded deployment, target, idempotency, and canonical UTC fields;
2. opens the named existing database through the read-only recovery inspector;
3. classifies exact structural, migration, and integrity state;
4. fingerprints the canonical OS-local path with domain-separated SHA-256;
5. derives a deterministic event identity from classification evidence;
6. appends under an immediate SQLite transaction or returns exact replay.

Raw paths are never stored. The path fingerprint is linkable evidence, not
anonymization or a secret-safe transformation; exported evidence must still
receive privacy review.

Event identity excludes the idempotency key. Reusing one deployment-scoped key
for different evidence is an idempotency conflict. Reusing exact event content
under another key is an event-identity conflict. This prevents replay aliases
from creating duplicate observations.

## Persisted Evidence

Each event binds:

- deployment and operator-selected target references;
- OS-local canonical-path fingerprint;
- canonical observation time supplied by future authenticated composition;
- recovery disposition, observed schema, and migration count;
- integrity result and deterministic quarantine recommendation;
- `inspection_mode: read_only`;
- `automatic_action: none`;
- `activation_authorized: false`.

Reads require exact deployment, target, and event scope. They revalidate
reference/time grammar, digests, event identity, flags, quarantine semantics,
schema evidence, and immutable trigger definitions.

Quarantine is a recommendation only. No file is moved, renamed, permission
changed, repaired, migrated, replaced, or selected for runtime use.

## Failure and Recovery

- invalid refs, time, and paths fail before persistence;
- missing, invalid, or symlink targets fail without an event;
- competing exact writers serialize to one insert and one replay;
- conflicting idempotency or event identities fail atomically;
- update/delete triggers and table checks preserve immutable zero-authority
  fields;
- schema/trigger or stored-content drift fails read and reopen;
- backup and inert restore preserve event evidence;
- interrupted schema-v10 migration leaves exact version-9 state and recovers
  forward on the next explicit open.

The event time is caller-supplied and unsigned. Phase 5 now has source-local
owner/session source evidence, but authenticated operator composition still must
bind a trusted session and clock posture before any supported recovery
workflow. Explicit recovery activation remains separately closed.
