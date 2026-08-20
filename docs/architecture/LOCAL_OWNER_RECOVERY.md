# Local Offline Owner Recovery

Status: implementation note for source-local Phase 5 behavior.

This slice provides a fail-closed Rust/SQLite recovery transition for the only
local owner. It is deliberately offline: no browser session, HTTP route, agent,
adapter, or ordinary authenticated identity can invoke it. Stable operator
command ownership, secret-file intake, interactive confirmation, and packaged
runbooks remain Phase 10 and Phase 13 work.

## Authority Boundary

v1 assumes the deployment owner controls the local host, operating-system file
permissions, and database location. Offline recovery uses that existing host
authority; it does not create a second product identity or remote recovery
channel.

`lnsatd` acquires an exclusive operating-system lock on an owner-only sidecar
named `<database>.lnsat.lock` before opening SQLite and holds it for the server
lifetime. The lease path must be a regular, single-link, owner-only file.
Symbolic links, group/world permissions, replacement races, and an already-held
lock fail closed.

`acquire_offline_owner_recovery_authority_v1` acquires the same lock for one
existing database. Recovery cannot begin while the daemon holds its lease. The
opaque authority value binds the canonical database path and cannot authorize a
different store.

The sidecar is exclusion evidence, not a secret or credential. Deleting,
replacing, or bypassing it requires the same trusted host-owner authority that
already controls the database. LNSAT does not claim protection from compromised
root, kernel, filesystem, or host owner.

## Atomic Recovery Transition

`SqliteStore::recover_local_owner_offline_v1` requires:

- the opaque offline authority for the exact database;
- an exact expected owner identity reference;
- a new valid password different from the latest generation;
- trusted canonical recovery time later than the current credential;
- current schema, migration, identity, credential, session, and audit evidence.

One immediate SQLite transaction:

1. revalidates the exact active owner and all credential generations;
2. appends the next Argon2id credential generation;
3. revokes every active owner session with reason `recovery`;
4. appends actorless session-revocation audit events;
5. appends one actorless `owner_recovered` identity event;
6. commits only when all evidence rereads exactly.

The result contains only owner reference, credential version, trusted time, and
revoked-session count. Raw password and PHC verifier never enter public
evidence.

Schema v15 permits actorless revocation events only when the reason is exactly
`recovery`, and only owner sessions validate under that path. It permits
actorless `owner_recovered` identity events only for the owner and credential
versions 2 through 64. Existing authenticated rotation, disablement, and
session-event rules retain their actor requirements.

## Failure and Replay Posture

Recovery fails closed for:

- live-daemon or competing-recovery lease ownership;
- missing, symbolic-link, non-file, hard-linked, or broadly readable lease or
  database evidence;
- authority/database or expected-owner mismatch;
- malformed, reused, weak, exhausted, or non-monotonic credential input;
- schema, migration, credential, session, or event drift;
- partial credential, revocation, or audit persistence.

Injected revocation failure rolls back the new credential and every recovery
event. The old password and prior sessions retain their exact pre-attempt state.
A successful recovery invalidates the old password and every active owner
session; a fresh login with the new password is required.

## Current Proof

Checked-in tests cover:

- daemon-held lease denial and post-drop acquisition;
- owner-only lease mode, exclusivity, and symbolic-link refusal;
- exact database/owner binding;
- two-session atomic recovery and old-session rejection;
- old-password rejection and replacement-password verification;
- actorless recovery-only identity/session audit validation;
- wrong database, wrong owner, password reuse, and time-boundary negatives;
- injected revocation failure rollback;
- exact schema-v14 to schema-v15 migration;
- interrupted schema-v15 rollback to exact schema v14 and forward recovery.

## Still Closed

This source-local core does not provide:

- an HTTP, MCP, REST, or browser recovery route;
- a stable `lnsatctl` or `lnsatd` recovery command;
- password input through command arguments or environment variables;
- identity re-enable, role change, delegation, or second owner;
- recovery of a corrupt or unreadable database;
- quarantine activation, backup replacement, or automatic repair;
- approval signing, packet/action mutation, adapter access, or execution.

Phase 10 must expose a stable local operator command without putting secrets in
process arguments or environment variables. Phase 13 owns operator runbooks,
quarantine/recovery activation, incident proof, and release-candidate recovery
drills.
