<!-- intent-driven-delivery:spec:v1 -->

# Specification: HCFG-5C C1 Current Owner Credential Snapshot

Status: accepted
Intent: [Accepted exact owner-decision contract](https://github.com/hypler-dev/LNSAT/blob/0d5db17a1de7fdbd40abcfe4ddf901a39e89e160/docs/architecture/headless-owner-decision/spec.md)
Authority: [Project Status](../../PROJECT_STATUS.md#hcfg-4b4c-and-hcfg-5-contracts)
Owner: LNSAT maintainers
Accepted baseline: human owner on 2026-09-30 at exact HCFG-5C head `0d5db17a1de7fdbd40abcfe4ddf901a39e89e160`
Last updated: 2026-10-03

## Behavior

The bounded C1 source implementation is present within the accepted HCFG-5C
scope and has passed independent source review. This document does not
introduce a new capability or record an owner decision; Project Status remains
the acceptance authority.

The accepted decision design requires expensive Argon2id verification outside
the immediate SQLite write transaction and rechecking the exact current owner
credential generation and verifier identity inside that later transaction.
The existing public credential API returns only verified/rejected; that result
cannot carry the required identity across the interval.

C1 adds a private credential snapshot and transaction-local recheck, reusing
the existing credential profile and generation validation. It exercises this
composition through the existing `verify_local_owner_password_v1` API without
changing its public result family. It is a credential prerequisite, not a
configuration decision, session authentication, human-presence proof or grant.
No HCFG-6 observer, startup candidate or source-order amendment is implemented.

## Interfaces and contracts

The exact production ownership is `crates/lnsat-store/src/lib.rs`,
`owner_decision_credential.rs` and the selected-store constructor's initialization
of an inert private scope. Tests live in
`crates/lnsat-store/src/tests/owner_decision_credential.rs`.
No manifest, lockfile, dependency, migration, route, CLI, schema or product
surface changes. The contributor owns security integration and validation.

Each `SqliteStore` open creates a private `Arc` identity marker. Its address is
not serialized or treated as durable store identity. A prepared snapshot holds
an internal clone of that marker; recheck derives the marker from its `SqliteStore`
receiver and requires pointer equality. It also compares the actual borrowed
`Connection` obtained from the `Transaction` with that receiver's connection.
Neither a marker nor a connection address is supplied as an independent
argument or captured as durable evidence. Moving that store preserves the marker. Another
open, another process or a reopened store cannot reuse the snapshot, even if
all credential bytes match. This is transient source provenance, not selected
file/lease custody, installation identity or restored-store admission.

The snapshot has private fields and no `Debug`, `Clone`, wire representation,
public constructor or success-injection seam. It contains the exact immutable
owner identity record, credential ID, version, profile and creation time, plus
a fixed SHA-256 fingerprint of the verified PHC bytes. The private fingerprint
uses ASCII domain `lnsat.owner_decision.credential_verifier.v1`, one LF byte,
then the exact PHC bytes. It does not select future persisted decision/audit
encoding or a validated crypto profile. No password or PHC verifier is retained
in the snapshot.

## Preparation

Preparation rejects if the connection is already inside any transaction.
After existing schema verification, it uses one short deferred read transaction
to load the identity and its complete bounded credential chain, validate the
existing profile/generation/credential-ID rules, and capture the latest exact
credential. Missing, malformed, inactive or non-owner identities cannot produce
a snapshot. Their password attempt follows the existing dummy-verifier
rejection posture where applicable.

The read transaction ends before Argon2id. The selected PHC is held in
`Zeroizing<String>` only through verification and then dropped; credential row
PHC fields use that same guard on success and error paths and lose their existing
`Debug` derivation. The password is borrowed, never copied or retained by this
helper. Its caller owns the transient protected request and its zeroization;
current HTTP password bodies already use `Zeroizing<String>`. Input limits and
Argon2id parameters remain the existing profile: 15–128 Unicode scalar values,
at most 512 UTF-8 bytes and no NUL. No output contains password/verifier bytes.

Only actual successful verification against the captured owner credential can
construct the snapshot. No lock is held during Argon2id and no counter, session,
credential, candidate, challenge, decision, installation or audit row is written.
Preparation does not attest that a password was entered by a person.

## Transaction-local recheck

Recheck accepts a `SqliteStore` receiver, an existing `&rusqlite::Transaction`
and the prepared snapshot. The marker and connection are read from the receiver,
never nominated separately. A transaction from another connection rejects
before credential reads, even if its rows match and the snapshot belongs to the
receiver. It starts, commits and rolls back no
transaction; performs no Argon2id work; and writes no rows. It reloads and
validates the current owner identity and bounded credential chain, then requires
exact agreement with every captured identity/credential field and PHC
fingerprint. Rotation/recovery, profile/version drift, verifier substitution,
identity drift or another store instance denies. Unreadable or malformed stored
evidence remains fail-closed.

The later configuration decision must own its immediate write transaction and
repeat schema, live session/independent-proof, challenge/counter, exact digest/
view, installation/generation/resource, policy/floor, stop/revocation and expiry
checks. The process identity and verified-session mutation limiters must run
before password work, and durable failed-challenge counters must serialize as
accepted. C1 neither implements those requirements nor makes a reusable
step-up permit; it supplies only the credential component of their composition.

The existing owner-password read API prepares a snapshot, opens a fresh deferred
read transaction, repeats schema verification and recheck, and ends that
transaction before returning its existing public verified/rejected result.
A valid concurrent credential change maps to rejection; corrupt/unreadable
evidence retains the existing safe storage-error family. No snapshot escapes
that API, and no Boolean is consumed as configuration authority.

## States and failure handling

The only transient states are no prepared snapshot, credential verified against
the captured owner row, and recheck success or rejection. None is persisted or
serialized. Any preparation error produces no snapshot. A recheck error grants
nothing and leaves transaction rollback/commit to its caller. The existing read
API ends its own read transaction on every path; failure never becomes verified.

## Data, privacy, and permissions

Credential PHC copies are guarded and excluded from debug output. The private
snapshot holds only bounded identity/credential metadata and a verifier
fingerprint. It is neither a credential nor a challenge/decision reference.
No new permission, transport, telemetry or secret input channel is introduced.

## Compatibility and migration

Schema remains 17; no migration or new authority record exists. The existing
public owner-password API and its result/error family remain unchanged. Its
verified result still cannot substitute for an authenticated one-use
configuration decision. Current selected-store and bootstrap admission rules
and all HCFG-6/Phase 11 source locks remain unchanged.

## Acceptance mapping

- A real fixture owner and valid current password produce a snapshot; unchanged
  current evidence passes recheck in an existing transaction with no writes.
- Missing/malformed identity, non-owner roles, wrong/unbounded passwords and an
  already-active transaction produce no successful snapshot.
- A normal credential rotation between verification and recheck denies the old
  snapshot and permits a new verification of the new credential.
- Valid same-version verifier replacement, malformed profile/credential
  evidence and immutable identity substitution deny without secret output.
- A second store instance with identical credential bytes rejects the snapshot;
  moving the original store does not invalidate its private marker.
- A snapshot from store A, receiver A and transaction B rejects even if B has
  identical owner/credential rows; receiver B with snapshot A also rejects.
- An active-owner snapshot followed by fixture-only disabled status or owner
  role drift rejects. The existing public API never returns verified for that
  state. V1 has no valid owner-disable operation; malformed lifecycle evidence
  remains a safe storage error rather than being accepted as a new transition.
- Preparation/recheck do not touch session activity, create an owner decision,
  write authority rows or change public credential-result/error contracts.
- Existing owner/session, rotation/recovery, selected-store and bootstrap tests
  remain compatible. Focused pinned Rust tests, strict Clippy/Rustfmt, broad
  `npm run check`, docs/public/inventory checks, installed named source audit
  tools and fresh independent security review are required before handoff.

## Non-goals and open questions

Tests use disposable source fixtures and current credential primitives. No
Docker, host permission changes, actual kernel probes, artifact construction,
merge, release, publication, deployment or production action is authorized.
Full HCFG-5C challenge/decision/apply, HCFG-6, runtime, package and V1/security
assurance remain incomplete; no MFA, FIPS or government certification is claimed.
