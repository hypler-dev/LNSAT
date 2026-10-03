<!-- intent-driven-delivery:intent:v1 -->

# Intent: HCFG-5B atomic local bootstrap

Status: accepted
Authority: [Product Build Sequence, HCFG-5](../../PRODUCT_BUILD_SEQUENCE.md#headless-source-packet-order)
Owner: LNSAT maintainers
Accepted by: human owner in development conversation on 2026-09-30
Last updated: 2026-10-01

## Problem and evidence

V1 needs one local owner, installation, and initial least-privilege configuration bound before any headless authority is available. Existing `bootstrap_local_owner_v1` atomically creates only an owner credential and identity event. HCFG-3 composes declarations for diagnostics, and the existing restore publishes a fresh inert database path. Neither creates an active configuration. The proposed [HCFG-5A online transition](https://github.com/hypler-dev/LNSAT/blob/360c42cb10b4f615d6cf424a33eec714c1684b94/docs/architecture/headless-protected-control/spec.md) depends on this accepted initial bootstrap contract.

The existing daemon-shared lease excludes a competing local process; it does not prove ownership or store freshness. A database row or digest copied with SQLite cannot provide an independent anti-rollback root. V1 trusts the local host owner and must state that boundary plainly.

## Desired outcome

One non-root host-owner `lnsatctl` command initializes a fresh empty local store with exactly one owner, installation, first deny-by-default configuration generation, and linked audit evidence in one SQLite transaction. It accepts an explicitly selected HCFG-3 declaration only after exact local source, owner, resource-identity, and selected-platform enforcement checks. No incomplete owner-only state becomes eligible for later first-configuration activation through the supported V1 command.

The initialized store records its canonical path and selected-platform file identity. Normal admission rechecks that binding and the current resource/OS controls. The official restore continues to publish a fresh inert path and cannot auto-admit or reuse an initialized store's bootstrap as recovery. An authority-empty restored snapshot may be explicitly initialized as a new installation because it contains no prior authority. An interrupted transaction is either absent or fully committed and resolved by exact local readback.

## Users and systems

The local host owner, `lnsatctl`, `lnsatd`, existing SQLite identity and audit foundations, the daemon-shared lease, and selected-platform resource verifiers. No external product identity or network bootstrap endpoint is introduced.

## Constraints

- Reuse the existing owner-bootstrap validation, credential profile, identity event, and daemon-shared lease inside a new atomic initialization path. Do not add a second owner identity or recovery authority.
- The supported V1 initialization starts from a fresh authority-empty store. A pre-existing owner-only or experimental store is ineligible; its later migration needs a separate decision.
- Bootstrap and restore are local-only host-owner operations. No API, MCP, agent, browser, or UI route invokes them. No default grant or diagnostic-to-active promotion exists.
- HCFG-6 grant/use resource identity and observed OS enforcement gate admission. Unsupported selected platforms remain inert.
- The local V1 threat model trusts the host owner. Path/file binding prevents accidental or unsupported new-path activation of an initialized store, including its official inert restore. An authority-empty restored snapshot may be initialized as a new store. This is not an independent defense against a trusted host owner manually replacing or rolling back the database at the same selected location.
- Human owner acceptance of this new authority design precedes source implementation. Merge, runtime proof, package, and release have separate gates.

## Non-goals

This design packet makes no source or schema change, command execution, database creation, OS permission change, Docker operation, production action, package, or release. Human acceptance authorizes the later source implementation packet only; merge, Docker proof, runtime proof, package, and release remain separate gates. HCFG-5A owns online apply and its fresh owner decision. General restore activation, emergency stop/resume, and OS adapter implementation need separate packets.

## Assumptions and verified facts

- Verified: `bootstrap_local_owner_v1` inserts one owner, credential, and event in one immediate SQLite transaction. It does not bind an installation or headless configuration.
- Verified: daemon and offline recovery share an exclusive owner-only `<database>.lnsat.lock` lease bound to the canonical database path. It is exclusion evidence, not a credential. See [Local Owner Recovery](../LOCAL_OWNER_RECOVERY.md).
- Verified: `restore_backup_v1` publishes only to a fresh inert path and never selects it for runtime activation. See [SQLite Backup and Restore](../SQLITE_BACKUP_AND_RESTORE.md).
- Assumption for owner review: the host owner controls the selected local database and its path. V1 does not promise tamper-resistant monotonic history against that trusted actor.

## Risks

Old owner-only stores, copied databases, wrong local paths, symlinks, hard links, weak permissions, target replacement, interrupted commits, stale approvals or sessions, and unverified OS controls could be mistaken for authority. The supported initialization requires authority-empty state; admission requires current store and resource proof. Missing or ambiguous evidence denies new admission while preserving consequence history for inspection.

## Acceptance evidence

- Human owner accepted the exact host-owner assumption, atomic fresh-store bootstrap, admission binding, and inert-restore policy in the [specification](spec.md) during the 2026-09-30 development conversation. Acceptance is separate from implementation, merge, Docker proof, runtime proof, package, and release.
- Fresh independent review finds no unresolved P1/P2 in the proposed contract.
- Later source tests prove one-time atomic initialization, concurrent/replay denial, old-owner-store and restored-initialized-path denial, explicit new initialization of authority-empty restored snapshots, path/file/owner/lease/target-substitution denial, OS-preparation crash/cleanup, exact audit linkage, no raw secret leakage, and selected-platform grant/use enforcement. Official restore activation of prior authority remains closed until separately designed.

## Source-of-truth links

[Product Build Sequence](../../PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control) owns the V1 requirement and sequence. [Project Status](../../PROJECT_STATUS.md#current-build-position) owns implementation and live acceptance truth. This packet is the accepted HCFG-5B design; [HCFG-5A](https://github.com/hypler-dev/LNSAT/blob/360c42cb10b4f615d6cf424a33eec714c1684b94/docs/architecture/headless-protected-control/intent.md) owns online transitions. The [Phase 11 operator packet](../PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md) remains Phase 11 runtime status authority.

## HCFG-6 metadata-only amendment

The human owner accepted the narrow HCFG-6 bootstrap amendment on 2026-10-01 at [PR #72](https://github.com/hypler-dev/LNSAT/pull/72), exact head `0dbe0a2874428721b1a4ba6bad1708ec5fdbb572`. [Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design) records the decision; the original bootstrap design acceptance remains dated 2026-09-30.

The amendment permits only LNSAT's bounded host-side metadata observations after the exclusive selected-store lease and declaration/binding checks: metadata-only directory handles and bounded marker/Git identity reads. It permits no Git subprocess, target-mounted workload, target action or grant during bootstrap. A separate finite resource-free zero-authority platform probe is part of the accepted HCFG-6 design within the trusted same-host rootful daemon boundary; Docker observation/execution remains separately closed.

The exact handle order/lifetime, genuine native observation methods, immutable probe/recipe identities, finite preparation budget, precommit preparation journal and later atomic installation/audit binding must pass the HCFG-6 source freeze and independent review before behavioral integration. Existing B1/B2/B3B source behavior remains unchanged. Design acceptance does not authorize initialization, activation, merge, release, publication, deployment or production.
