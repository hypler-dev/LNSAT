# PostgreSQL Audit Ledger Writer Scope

This document defines the narrow source boundary for PostgreSQL audit appends.
The writer is dependency-injected and has no default production composition.

## Ownership

- record validation and append semantics: `packages/audit/src`;
- database schema: `packages/audit/migrations/postgresql`;
- policy and authorization evidence: `packages/policy`;
- environment connection and credentials: operator-owned, outside repository.

## Append Contract

The writer accepts a validated record, canonical digest, idempotency key, and
granted authorization bound to the exact request. It passes parameterized data
to an injected executor and verifies returned identity, digest, and schema
version before reporting success.

- New key and valid digest may append one immutable row.
- Existing key and same digest returns exact replay evidence.
- Existing key and different digest fails closed.
- Missing, requested, denied, expired, or mismatched authorization fails before
  executor invocation.
- Invalid executor output and database errors return bounded failure evidence.

## Data Boundary

Contract fields come from validated `AuditLedgerRecord` data. Database-owned
defaults are limited to schema-defined storage metadata. Raw secrets, SQL
fragments, environment variables, unrestricted payloads, and rejected values
must not cross the writer boundary.

## Non-Authority

Presence of writer source does not permit a connection, migration, role grant,
or production write. Runtime composition requires separate environment
authorization and the full persistence preflight.
