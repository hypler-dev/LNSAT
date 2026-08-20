# SQLite Retention Policy

Status: implementation note for local source behavior. This contract does not
authorize data deletion, background workers, daemon activation, production
storage, release, or deployment.

## Implemented Boundary

Schema version 7 introduced immutable retention policy evidence. Schema version
8 preserves it and adds the recovery-inspection event family. Current families:

- packet envelopes and resource references;
- policy decisions;
- approval requests and decisions;
- audit events and ordered reason codes.
- recovery inspection events.

Every row uses retention class `control_plane`, disposition `preserve`,
`cleanup_eligible = 0`, and no time-based deletion deadline. Current records
form authority and audit source chains. Deleting one could invalidate replay,
scope, approval, or audit proof, so no current family is eligible for cleanup.

Policy rows reject update and delete. Store open verifies exact required table,
migration, policy-row, trigger-name, trigger-table, trigger-operation, and
trigger-body evidence. A missing trigger or same-name no-op replacement fails
closed as migration drift.

## Bounded Planning

`SqliteStore::plan_retention_v1` accepts a candidate limit from 1 through 1024.
It:

1. reads all eight immutable retention policies in stable order;
2. rejects missing or changed policy evidence;
3. counts protected records across current families;
4. returns zero cleanup candidates;
5. records `cleanup_attempted: false`.

The limit reserves an explicit upper bound for future candidate selection. It
does not authorize deletion, mutation, compaction, scheduling, or automatic
maintenance.

## Future Removable Families

Bounded cleanup remains unimplemented because no current family is safely
removable. A future session, cache, derived-knowledge, or other transient family
must add all of:

1. versioned retention class and purpose;
2. stable cutoff semantics and clock-skew behavior;
3. project/tenant scope;
4. reference-safe deletion or tombstone rules;
5. bounded candidate selection and atomic batches;
6. idempotent retry, interruption, and concurrent-writer proof;
7. durable cleanup audit evidence;
8. backup, restore, and recovery compatibility;
9. authenticated operator or daemon composition.

Unknown families and policy drift fail closed. No generic deletion API exists.
