# Phase 7 Local-v1 Conformance Freeze

Status: P7-X1 source-only conformance evidence. This freeze adds no served
mutation route, runtime adapter wiring, supported package, deployment,
publication, or production authority.

## Frozen Claim

Local source proves one bounded chain:

```text
proposal -> deterministic policy -> authenticated local approval
-> exact expiring authorization -> atomic one-time consumption
-> disposable local Git commit -> digest-bound receipt or outcome_unknown
-> exact-object reconciliation -> immutable audit evidence
```

The full-chain Rust test uses live local requester and approver sessions, the
P7-A1 authorization issuer, authenticated C1 redemption, and the P7-R1
disposable-repository adapter. It then backs up and inertly restores completed
state and proves replay cannot repeat the Git consequence. Existing focused
tests retain negative evidence for substitution, expiry, cancellation,
revocation, concurrency, capacity failure, audit failure, sandbox escape,
receipt tamper, ambiguity, and blind retry.

Shared `execution-request-v1_0.json` vectors freeze TypeScript/Rust canonical
request and digest parity. Schema remains 17/17 with only migrations 0016 and
0017 registered. P7-X1 creates no migration and opens no authority transition.

## Selected Platform and Filesystem Statement

Selected source-conformance profile: macOS 26, arm64, APFS.

GitHub source verification provides an additional Ubuntu 24.04 x86_64 source
gate. Its runner filesystem is not claimed. This profile is not a supported
binary, package, installer, or production runtime claim. Phase 14 must select
and prove exact target/package rows before any supported-artifact statement.
Unknown or untested platforms and filesystems remain unsupported.

## Diagnostics, Audit Health, and Resource Bounds

Source-local operator evidence is read-only:

- `SqliteStore::state` reports exact database path, schema/migration count,
  journal mode, foreign-key posture, trusted-schema posture, and integrity;
- `SqliteStore::verify_integrity` and
  `SqliteStore::inspect_recovery_state_v1` fail closed without repair,
  migration, quarantine, replacement, or activation;
- store open verifies schema, migration digests, immutable policy/audit guards,
  integrity, and foreign keys before use;
- retention planning accepts only candidate limits 1 through 1024, preserves
  every current authority/audit family, returns zero cleanup candidates, and
  performs no deletion;
- `lnsatd` bounds request head/body/header count, tracked authentication
  identities, and concurrent connections; capacity refusal grants no
  authority;
- SQLite capacity tests prove failed writes leave no partial authoritative
  record and prior evidence remains verifiable.

These APIs are source-local evidence. P7-X1 adds no owner route, public API,
background worker, telemetry authority, or automatic maintenance.

## Minimal Source Runbook

1. Start from one clean checkout at an exact reviewed commit.
2. Confirm Node 22.22.3, npm 10.9.8, pinned Rust 1.97.1, target triple, and
   selected source-conformance filesystem.
3. Run `npm ci` only when dependency installation is explicitly allowed.
4. Run `npm run source:check`, `npm run audit:dependencies:check`, and
   `git diff --check`.
5. For database evidence, preserve original database, create a verified online
   backup at a fresh path, restore to another fresh inert path, inspect
   read-only, and never silently activate restored bytes.
6. Treat any failed binding, audit, integrity, migration, capacity, receipt,
   or review gate as no-go. Never repair by forcing `user_version`, deleting
   evidence, or retrying an ambiguous consequence.

## Source Update, Rollback, Uninstall, and Data-Loss Semantics

P7-X1 freezes source behavior only; no installable artifact exists.

- **Update:** fetch or acquire an exact source revision into a separate clean
  checkout, run all gates, and adopt it only after review. Never update an
  active database by replacing source and assuming compatibility.
- **Rollback:** retain prior reviewed source plus database/backup evidence.
  Reopen only when that source explicitly accepts the existing schema and
  migration digests. Otherwise keep data inert and inspect read-only.
- **Uninstall:** removing a source checkout removes source files only. It does
  not remove databases, backups, configuration, logs, or evidence.
- **Data loss:** no contractual RPO/RTO exists. Backup creation captures one
  committed SQLite snapshot; uncommitted work is outside that snapshot.
  Restore never replaces or activates an existing database. Explicit purge is
  unimplemented and requires separate operator authority and evidence.

No uninstall or rollback step deletes authority or audit data. Automatic
downgrade, silent fallback, evidence rewriting, and implicit purge are
forbidden.

## Explicit Exclusions

- no public/runtime adapter route or production/user-repository Git target;
- no migration 0018, signed-evidence lane, key material, signer, or provider;
- no PostgreSQL, HA, fleet, multi-tenancy, SIEM, legal-hold, or cross-region
  claim;
- no package target selection, artifact build, signing, installation,
  publication, deployment, or production write;
- no claim against compromised kernel, root account, firmware, hypervisor, or
  malicious host owner.

Canonical machine-readable evidence lives in
`fixtures/contracts/phase7-local-v1-conformance-v1.json`. Passing this freeze
does not grant any excluded authority.
