# Audit Ledger Migration Artifacts

LNSAT includes versioned PostgreSQL source artifacts for the append-only audit
ledger:

```text
packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql
packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json
```

These files are reviewable source. They do not connect to a database or execute
automatically.

## SQL Contract

The migration defines `audit_events.v0_1` storage for validated audit records,
including stable record identity, schema version, canonical digest, idempotency
key, bounded record data, and insertion time. Exact columns, constraints, and
indexes are authoritative in SQL and manifest.

## Manifest Contract

The adjacent manifest identifies the migration, target schema contract, source
files, integrity metadata, and expected verification posture. Changes to SQL
and manifest must be reviewed together.

## Naming and Ordering

- Migration filenames use a zero-padded sequence and stable contract name.
- Applied migrations are immutable. Corrections use a new sequence.
- Destructive changes require explicit recovery and compatibility plans.
- Contract versions change when stored semantics break compatibility.

## Execution Boundary

Repository scripts must never install PostgreSQL, discover credentials, or run
this migration implicitly. An operator-controlled workflow must select the
target, verify checksums, review SQL, establish least-privilege roles, execute
in an isolated environment, and retain logs.

## Verification

Before environment use:

1. compare SQL and manifest against package contracts;
2. apply to a disposable PostgreSQL database;
3. verify tables, constraints, indexes, and grants;
4. test idempotent append and conflicting replay behavior;
5. prove update, delete, truncate, and schema mutation are denied to writer;
6. test backup and recovery procedure;
7. record environment-specific authorization.

Source validation is covered by `npm run source:check`. Environment migration
proof is deliberately separate.
