# Audit Ledger Writer Persistence Preflight

This checklist defines evidence required before enabling an append-only audit
ledger writer. Repository source provides contracts and local artifacts; it
does not grant production database authority.

## Required Evidence

### Contract

- `AuditLedgerRecord` version and validator are fixed.
- Canonical serialization and digest behavior are deterministic.
- Record identity and idempotency key rules are documented.
- Secret values and unrestricted request bodies are prohibited.

### Authorization

- Writer capability is named and policy-controlled.
- Every write carries a granted authorization bound to packet and digest.
- Approval-required decisions cannot reach the executor.
- Unknown, expired, revoked, or mismatched evidence fails closed.

### Storage

- Migration SQL and manifest match `audit_events.v0_1`.
- Insert-only role has minimum privileges.
- Application roles cannot update, delete, truncate, or alter ledger rows.
- Tenant/project isolation is verified for the intended environment.
- Backup, restore, retention, and incident procedures exist.

### Execution

- Writer accepts only validated records.
- Same idempotency key and digest returns existing identity.
- Same idempotency key with a different digest fails closed.
- Database errors return bounded failure evidence.
- Timeouts and retries cannot create divergent records.

### Verification

- Unit tests cover validation, authorization, idempotency, and failure cases.
- Migration is tested against an isolated disposable PostgreSQL instance.
- Role and grant assertions run after migration.
- Audit readback proves stored digest and schema version.
- Production enablement has an explicit owner and rollback decision.

## Source Locations

- contracts and writer logic: `packages/audit/src`;
- migration: `packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql`;
- manifest: `packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json`;
- fixtures and tests: `fixtures/audit` and package test directories.

## Gate

Passing repository tests proves source consistency only. Migration execution,
role creation, credential configuration, and live writer enablement require a
separate environment-specific authorization.
