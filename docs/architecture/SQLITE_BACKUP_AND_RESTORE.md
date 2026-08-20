# SQLite Backup and Restore

Status: implementation note for local source behavior. This contract does not
authorize production data handling, daemon activation, remote storage, release,
or deployment.

## Implemented Boundary

`crates/lnsat-store` exposes two fail-closed Rust operations:

- `SqliteStore::create_online_backup_v1` creates one online-consistent,
  standalone snapshot at a fresh local path.
- `SqliteStore::restore_backup_v1` verifies one snapshot and copies it to a
  fresh inert database path.

Neither operation replaces an existing file, changes active database
configuration, starts a service, authenticates an operator, schedules work,
applies retention, or grants runtime authority.

`SqliteStore::inspect_recovery_state_v1` separately opens one existing database
read-only and classifies structural state. It never migrates, repairs,
quarantines, replaces, or activates the inspected file. Its dispositions are
ready, bootstrap candidate, migration pending, legacy Phase 7 evidence,
unsupported schema, unrecognized database, migration drift, integrity failure,
and unreadable.
Readiness is evidence, not activation authority.

`legacy Phase 7 evidence` means structurally and semantically valid populated
v16 authority evidence that migration 0017 deliberately refuses to rewrite.
It is not migration eligible. Preserve original database and verified backup;
inspect read-only or with v16-compatible tooling. Use a separate fresh v17
database if clean-schema work must continue. Never force `user_version`, delete
evidence rows, or rewrite them into v17 without separate future approval.

## Backup Contract

Backup creation:

1. verifies current source schema, ordered migration digests, SQLite integrity,
   and foreign-key integrity;
2. rejects empty, in-memory, same-source, existing, invalid, and symlink
   destinations;
3. uses SQLite's online backup API with bounded busy/locked retry;
4. writes only to an owner-only temporary sibling;
5. converts the snapshot to standalone rollback-journal form;
6. reopens the snapshot read-only with query-only, defensive, and untrusted
   schema posture;
7. rechecks schema, migration count, integrity, and foreign keys;
8. records exact byte size and SHA-256;
9. publishes with a no-clobber hard link and directory synchronization.

Committed WAL state is included without stopping or replacing the live source.
A failed or interrupted operation removes its unpublished temporary file.

Returned `SqliteBackupEvidenceV1` includes canonical backup path, schema
version, migration count, byte size, SHA-256, online-consistency state, and
explicit `replaced_existing: false`.

## Restore Contract

Restore:

1. rejects missing, invalid, same-source, existing, and symlink paths;
2. verifies source snapshot schema, migration digests, integrity, foreign keys,
   size, and SHA-256;
3. copies into an owner-only temporary sibling;
4. synchronizes copied bytes;
5. requires exact source/copy size and SHA-256 equality;
6. rechecks copied schema, migrations, integrity, and foreign keys;
7. publishes without replacing any existing path.

Returned `SqliteRestoreEvidenceV1` includes source and destination paths,
schema version, migration count, size, snapshot SHA-256, and explicit
`replaced_existing: false` and `activated: false`.

Restore creates evidence only. It does not select the restored file as active.

## Activation and Recovery Procedure

Runtime activation remains unimplemented. Future `lnsatctl` recovery must:

1. stop or prove quiescence of `lnsatd`;
2. preserve current database and recovery evidence;
3. verify backup and restored snapshot through this contract;
4. require explicit operator choice of the fresh restored path;
5. start in loopback-only mode;
6. verify schema, integrity, identity/session revocation state, and audit
   continuity before accepting mutations;
7. retain rollback evidence until operator confirmation.

Automatic replacement, fallback to an older snapshot, or silent activation is
forbidden.

## Test Evidence

Rust tests cover:

- backup while committed source records remain in live WAL;
- full packet, policy, approval, and audit-chain restore/readback;
- exact snapshot digest and size equality;
- current schema and migration verification;
- corruption refusal;
- source/destination identity conflict;
- no-clobber backup and restore;
- owner-only Unix file modes;
- source and destination symlink refusal;
- interrupted temporary-copy cleanup;
- publication-race preservation of operator-created target bytes.
- interrupted latest migration after schema and ledger writes but before commit,
  with exact rollback and forward migration recovery;
- read-only recovery classification across ready, older, empty, unknown,
  future-version, valid populated-v16 legacy evidence, drifted,
  foreign-key-invalid, and unreadable databases;
- deterministic `SQLITE_FULL` rollback for raw and public atomic writes,
  preservation of prior evidence, and successful retry after capacity returns.

## Deferred Dependent Work

- Phase 5 defines authenticated operators, sessions, and the first explicitly
  removable session family before any bounded cleanup implementation.
- Phase 6 owns authenticated Gateway command and recovery-event composition.
- Phase 10 owns stable operator command and service lifecycle contracts.
- Phase 13 owns operator-controlled quarantine/recovery activation and runtime
  recovery proof.
- Phase 14 owns packaged install, upgrade, rollback, uninstall, and
  disabled-by-default service evidence.

[Phase 4 source exit evidence](PHASE_4_EXIT_EVIDENCE.md) closes only the
source-local durability and daemon failure contract. None of these deferred
lanes is implied or authorized.
