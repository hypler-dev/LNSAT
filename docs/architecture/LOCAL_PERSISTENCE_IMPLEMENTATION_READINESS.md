# Local Persistence Implementation Readiness

LNSAT includes local, isolated PostgreSQL integration coverage for audit and
workflow persistence plus an embedded SQLite packet/policy/approval evidence
foundation. These prove source behavior against disposable data; they do not
configure or authorize production storage.

## Implemented Source

- versioned audit migration and manifest;
- deterministic append-semantics evaluation;
- injected verifier/executor writer boundary;
- canonical record digest and authorization evidence;
- local-beta migration, restart, and integration tests;
- loopback-only test database configuration;
- explicit file-backed SQLite open with Unix mode `0600` creation;
- required WAL, foreign-key, full-sync, defensive, and untrusted-schema posture;
- ten atomic migrations with binary-bound SHA-256 ledger evidence;
- exact v1-through-v9 upgrade/reopen, future/unknown schema rejection,
  integrity, and rollback tests;
- immutable stable packet canonical bytes and SHA-256 evidence;
- project/resource-scoped reads and project-scoped exact idempotency replay;
- collision, cross-scope, mutation, and stored-evidence-drift negatives;
- immutable stable policy decisions rederived from exact persisted packet
  digest, project, evaluation time, and outcome bindings;
- policy restart, competing-writer replay, missing/mismatched packet, scope,
  mutation, and evidence-drift negatives;
- immutable pending approval requests rederived from exact approval-required
  policy, packet digest, requester/session, project, time, and expiry bindings;
- request restart, competing-writer replay, missing/mismatched policy, scope,
  mutation, and evidence-drift negatives;
- immutable one-terminal-outcome approval decisions rederived from exact
  request, policy, project, approver/session, outcome, reason, time, and expiry;
- decision restart, competing-writer replay, missing/mismatched request,
  second-outcome, scope, mutation, and evidence-drift negatives;
- approved evidence preserves `execution_authorized: false`;
- immutable policy, request, and decision audit-event families rederived from
  complete persisted source chains with ordered reason codes;
- audit restart, competing-writer replay, second-observation collision,
  missing/mismatched chain, scope, mutation, and drift negatives;
- audit authentication, persistence-request, and execution flags remain false;
- online-consistent committed-WAL backup to a verified standalone owner-only
  snapshot at a fresh path;
- inert restore with exact source/copy size and SHA-256 equality, schema,
  migration, integrity, and foreign-key verification;
- no-clobber, same-path, corruption, symlink, interrupted-temp, and
  publication-race failure proof.
- read-only recovery classification for current, bootstrap, older, unsupported,
  unknown, migration-drift, integrity-failure, and unreadable states, with no
  automatic repair, quarantine mutation, migration, or activation;
- interrupted latest-migration rollback and forward-recovery proof;
- deterministic `SQLITE_FULL` raw/public write rollback, prior-evidence
  preservation, and retry-after-capacity recovery proof.
- immutable preserve-only retention policy rows for every current authority and
  audit family;
- bounded read-only retention planning with exact policy verification, protected
  row counts, zero cleanup candidates, and no mutation authority;
- exact immutable-trigger definition verification, including refusal of
  same-name no-op replacement.
- immutable recovery-inspection events with deployment/target scope, canonical
  path fingerprint, exact replay/conflict handling, quarantine recommendation,
  and false automatic-action/activation fields;
- recovery-event restart, competing-writer, backup/restore, schema-v10
  interruption, mutation, scope, path-disclosure, and stored-drift negatives.
- exact-one immutable local human-owner bootstrap with versioned Argon2id
  credential evidence, competing-connection serialization, no secret output,
  schema-v9 interruption recovery, and stored-verifier drift refusal;
- immutable hash-only absolute-expiry owner sessions with independent bearer
  and anti-CSRF digests, content binding, append-only revocation, exact expiry,
  append-only idle activity, immutable rotation links, reopen, negative, tamper,
  schema-v10/v11 migration, and interruption proof;
- schema-v12 append-only credential generations and permanent non-owner status
  evidence with atomic `credential_revoke`/`owner_revoke` session-family
  closure, exact v11 migration, interruption rollback, and tamper negatives;
- schema-v13 append-only identity lifecycle audit events with actor/source/time
  binding, forward-only v12 upgrade semantics, authenticated route-neutral
  reads, exact migration rollback, and atomic write-failure proof;
- schema-v14 append-only session issue/revocation/rotation events with exact
  actor/replacement/reason/source/time binding, forward-only v13 upgrade
  semantics, authenticated route-neutral reads, exact migration rollback, and
  atomic write-failure proof;
- schema-v15 offline owner recovery with daemon-shared exclusive lease, exact
  database/owner binding, append-only credential generation, full active-owner
  session closure, recovery-only actorless audit, exact migration rollback, and
  injected-write-failure proof;
- schema-v16 inert core authority-loop persistence with exact-bound
  authorization attempts, nonce/authorization/capability-digest/operation/
  receipt/reconciliation tables, immutable audit bindings, preserve-only
  retention, atomic v15 upgrade, exact replay/conflict handling, migration
  interruption, capacity, competing-writer, backup/restore, and drift proof;
- store-only server-owned 32-byte OS-CSPRNG nonce issuance with raw-once
  zeroizing secret output, SHA-256 digest-only persistence, exact
  project/resource/attempt binding, trusted UTC five-minute approval-capped
  expiry, terminal cancellation/expiry, immutable audit/state events, and
  rollback/restart/backup/concurrency/tamper proof;

## Required Before Environment Use

- explicit target and data classification;
- tenant/project isolation design;
- least-privilege migration, reader, and writer roles;
- secret-reference provider and rotation plan;
- retention and incident procedures;
- approved runtime composition behind Gateway policy;
- monitoring, bounded errors, timeouts, and rollback proof;
- Phase 5 source-local offline owner recovery now uses an exclusive
  daemon-shared lease, append-only credential/event evidence, and full active
  owner-session revocation; a stable operator command remains Phase 10 and no
  re-enable path exists;
- an explicitly removable session family remains required before cleanup;
- Phase 6 stable authenticated Gateway writer/recovery composition;
- Phase 7 local one-time execution authorization plus optional user-key signed
  approval lane;
- Phase 10 stable daemon/operator command ownership;
- Phase 13 operator-controlled quarantine and explicit recovery activation;
- Phase 14 package/service lifecycle and target compatibility evidence.

The [Phase 4 source checkpoint](PHASE_4_EXIT_EVIDENCE.md) is complete. Later
phase requirements remain closed and are not environment-use evidence.

## Closed by Default

Repository tests do not grant production connection, migration, write, queue,
worker, service, network, or credential authority. No fallback file store may
silently replace a failed database. Missing or conflicting migration evidence
fails closed.

## Verification

Root checks validate source and disposable local-beta behavior. Environment
operators must separately record target-specific migration and role evidence.
See [persistence preflight](AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md).
