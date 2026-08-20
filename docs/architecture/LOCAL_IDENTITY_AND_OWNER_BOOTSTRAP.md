# Local Identity and Owner Bootstrap

Status: implementation note for source-local Phase 5 behavior. The current
foundation creates one durable local human owner, append-only password
credential generations, permanent owner-authorized non-owner disablement, and
an explicit source-local offline owner-recovery transition.
The [local server-session evidence](LOCAL_SERVER_SESSION_EVIDENCE.md) slice
consumes this foundation and serves bounded local authentication plus permanent
non-owner disablement. Neither exposes an approval signer, stable recovery
command, re-enable path, or execution authority.

## Implemented Boundary

`crates/lnsat-auth` defines the versioned
`lnsat.argon2id.v1` local-password profile:

- Argon2id version 19;
- 19,456 KiB memory, two iterations, and one lane;
- 32-byte output and a random operating-system salt;
- 15 through 128 Unicode scalar values, at most 512 UTF-8 bytes;
- no trimming or Unicode normalization; NUL is refused;
- exact PHC algorithm, version, parameters, and output length are revalidated
  before password verification.

This explicit profile follows the current minimum Argon2id work factor in the
[OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
The implementation uses the
[RustCrypto Argon2 crate](https://docs.rs/argon2/latest/argon2/index.html) and
the Argon2id construction standardized by
[RFC 9106](https://www.rfc-editor.org/rfc/rfc9106.html).

Schema version 9 adds:

- one immutable `identity:human:*` owner record enforced by a unique singleton
  marker;
- immutable versioned password-credential evidence bound to that identity;
- preserve-only retention policy for both record families;
- exact table, index, trigger, migration-digest, and verifier-profile checks.

Schema version 12 extends that evidence without mutating bootstrap rows:

- credential generations `1..64`, contiguous and strictly time ordered;
- latest-generation-only password verification;
- one immutable `disabled` status event per non-owner identity;
- exact actor-session, event-time, and content-digest binding;
- preserve-only retention plus exact migration and rollback checks.

Schema version 13 adds a preserve-only identity security-audit stream. New
owner bootstrap, non-owner creation, password rotation, and disablement
operations append one immutable event in the same transaction as their source
records. Each event binds a contiguous per-identity sequence, exact event kind,
actor session when one exists, credential generation when applicable, source
record digest, and canonical time. Schema-v12 upgrades do not fabricate
historical actors or events; their first later mutation starts sequence one.

`SqliteStore::bootstrap_local_owner_v1` hashes the candidate password before an
immediate transaction and atomically inserts both records. Concurrent first-run
attempts serialize to one success; later attempts return
`owner_already_bootstrapped`. Public bootstrap and read records never contain
the password or PHC verifier.

`SqliteStore::verify_local_owner_password_v1` returns only `verified` or
`rejected` for valid stored evidence. Missing identities and wrong candidates
share the rejected result. Malformed or downgraded stored verifier evidence
fails closed as evidence drift.

Unknown, invalid, and inactive identity lookups consume password candidates
against one fixed, non-secret `lnsat.argon2id.v1` dummy verifier. The verifier
is validated when the store opens and is never regenerated per request. The
daemon's route-neutral session issuer additionally caps attempts to five per
identity and 30 process-wide in one monotonic 60-second window, with at most
128 retained identity keys. Every credential, limiter, clock, and persistence
failure collapses to one public denial.

`SqliteStore::create_local_identity_v1` derives an active owner actor from the
bearer/CSRF pair, enforces `manage_identities`, and atomically appends one
immutable operator or auditor identity, initial Argon2id credential, and
actor-session-bound `identity_created` event. Stable `POST /v1/identities`
serves this transaction through `lnsat.gateway.identity_creation.v1_0`: strict
same-origin proof, a closed four-field body, per-session/process limiting,
create-once identity-reference replay semantics, secret-free success evidence,
and one generic denial exposing only possible limiter advancement. Duplicate or
failed creation rolls back durable activity, identity, credential, and event
evidence together.

`SqliteStore::rotate_local_password_credential_v1` derives the target identity
from an active bearer session, requires independent CSRF proof, the default
idle bound, and reverification of the latest current password, then atomically
appends the next Argon2id verifier generation and revokes every active
same-identity session with reason `credential_revoke`. The raw new password and
PHC verifier never appear in public results. No replacement session is issued;
the identity must authenticate again with the new password. Stable
`PATCH /v1/identity/password` serves this transaction through
`lnsat.gateway.identity_password_rotation.v1_0`: strict same-origin
bearer/CSRF proof, a closed secret body, per-session/process limiting, generic
denial with possible limiter advancement, and host-only cookie clearing.

`SqliteStore::disable_local_identity_v1` requires an active owner session and
CSRF proof, refuses owner, missing, malformed, and already-disabled targets,
then atomically appends one immutable `disabled` event and revokes the target's
active sessions with reason `owner_revoke`. Disablement is permanent in v1.
Disabled identities consume the dummy Argon2id path and cannot authenticate.
Stable owner-only `DELETE /v1/identities/{identity_ref}` serves this
transaction through `lnsat.gateway.identity_disablement.v1_0`: exact version
and empty mutation framing, validated route-only target selection, strict
same-origin bearer/CSRF proof, one-time active-target replay, secret-free
success, and one generic zero-side-effect denial. Its authenticated read-only
composition can return validated identity events to roles with evidence-read
permission through stable `GET|HEAD /v1/identities/{identity_ref}/events`
under `lnsat.gateway.identity_event_read.v1_0`; no identity re-enable or other
identity mutation route is added.

## Source Evidence

Tests prove:

- random salts with exact profile parameters;
- character, byte, and NUL boundaries;
- malformed, altered, and downgraded verifier refusal;
- atomic persist, reopen, read, and verification;
- exact-one bootstrap under competing connections;
- invalid-input rollback with no partial identity;
- update/delete refusal and stored-evidence drift detection;
- exact schema-v8 to schema-v9 migration;
- interrupted schema-v9 rollback to exact schema v8 and forward recovery.
- append-only two-generation rotation, latest-only authentication, family
  revocation, replay closure, immutable rows, and no raw-secret storage;
- atomic rollback of credential, activity, and revocation evidence under an
  injected revocation failure;
- owner-only scoped disablement, permanent status, dummy-verifier denial,
  target session closure, replay refusal, and immutable status evidence;
- atomic disablement rollback under injected target-revocation failure;
- exact schema-v11 to schema-v12 migration and interrupted rollback to exact
  schema v11;
- atomic create/rotate/disable audit append, source/actor/time binding,
  immutable-row and substitution negatives, reopen equality, and injected
  event-write rollback;
- exact schema-v12 to schema-v13 migration, forward-only legacy event start,
  and interrupted rollback to exact schema v12.
- schema-v14 session lifecycle events bind issue/revocation/rotation outcomes
  to their exact actor, replacement, reason, source digest, and trusted time;
  see [Local Server Session Evidence](LOCAL_SERVER_SESSION_EVIDENCE.md).
- schema-v15 offline owner recovery binds an exclusive daemon-shared lease,
  exact database/owner confirmation, one append-only credential generation,
  full active-owner-session revocation, and recovery-only actorless identity
  and session events; see [Local Offline Owner Recovery](LOCAL_OWNER_RECOVERY.md).

## Later Owning Phases

The completed source-local Phase 5 slice deliberately does not implement:

- a stable operator recovery command (Phase 10), identity re-enable, or
  delegation;
- optional user-key signed approval evidence (Phase 7 signed lane).

Role permissions, strict browser transport, authenticated approval persistence,
idle activity, and atomic session rotation now exist as source-local evidence;
credential-taking session issue and authenticated current-session rotation are
served, as are self-service password rotation, owner-only operator/auditor
creation, and owner-only permanent non-owner disablement, as described in
[Local Server Session Evidence](LOCAL_SERVER_SESSION_EVIDENCE.md). No
authenticated mutation or execution authority is opened. The
[offline owner-recovery core](LOCAL_OWNER_RECOVERY.md) remains separate because
an ordinary owner session cannot infer offline recovery authority. Future
credential/status changes must use append-only versioned evidence rather than
mutating these bootstrap records.
