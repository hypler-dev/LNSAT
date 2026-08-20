# Phase 4 Exit Evidence

Status: current source checkpoint. This document records repository-local test
evidence only. It does not claim a supported runtime, installer, service,
release, deployment, production database, or mutation authority.

## Gate Interpretation

Phase 4 owns the durable embedded SQLite and loopback-default `lnsatd` source
foundation. Its fresh-start gate means bootstrap and invocation from checked-in
source against a new local database path.

Product clean-install, upgrade, rollback, uninstall, and service-mode evidence
cannot be a Phase 4 prerequisite: canonical binaries and thin installers are
defined by mandatory Phase 14. Phase 4 therefore closes the source-local
storage and daemon failure contract while Phase 14 remains fully blocking for
every packaged-install claim.

## Evidence Matrix

| Gate                  | Checked-in evidence                                                                                                                  | Fail-closed boundary                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Fresh bootstrap       | `bootstraps_reopens_and_reports_required_posture`; `storage_opens_and_verifies_before_listener_is_returned`                          | explicit file-backed path, storage verified before listener                             |
| Restart               | `slow_peer_does_not_block_concurrent_readiness_or_graceful_shutdown`; `sigint_sigterm_and_sighup_shutdown_cleanly_and_allow_restart` | stop intake, drain bounded workers, close cleanly, reopen same database                 |
| Migration             | exact v1-through-v9 upgrade tests into current schema v10                                                                            | ordered digest-bound migrations; future, unknown, or drifted state refused              |
| Backup                | `online_backup_and_inert_restore_preserve_complete_wal_chain`                                                                        | committed WAL captured; fresh owner-only target; no replacement                         |
| Restore               | same complete-chain test plus backup/restore path negatives                                                                          | exact size/digest verification; restored copy remains inert                             |
| Corruption            | `backup_restore_paths_fail_closed_without_clobbering`; recovery inspection integrity/unreadable tests                                | corrupt input refused; existing target preserved; no automatic repair                   |
| Disk full             | `sqlite_full_rolls_back_raw_and_public_atomic_writes`                                                                                | atomic rollback, prior evidence preserved, retry succeeds after capacity returns        |
| Interrupted operation | migration interruption and recovery temp/publication-race tests                                                                      | no partial migration, no partial published target, forward recovery after fault removal |

Retention rows preserve every current authority and audit family. Bounded
retention planning returns no cleanup candidates and performs no mutation.
Recovery inspection and immutable recovery-inspection events classify evidence
and may recommend quarantine, but never repair, move, quarantine, replace, or
activate a database.

## Phase Boundary

The following work remains closed and moves only through its owning later
phase:

- Phase 5: owner bootstrap and hash-only absolute-expiry session evidence exist;
  HTTP transport, role enforcement, origin/CSRF policy, trusted server time,
  distinct-human approval, and removable session-family retention remain;
- Phase 6: authenticated Gateway reader/writer and recovery-event composition;
- Phase 10: stable `lnsatd`, `lnsatctl`, and `lnsat` command/configuration and
  product lifecycle contracts;
- Phase 13: authenticated recovery/quarantine execution, activation,
  crash-recovery, revocation, and release-candidate proof;
- Phase 14: canonical binaries, package/service integration, clean install,
  upgrade, rollback, uninstall, disabled-by-default service, and compatibility
  evidence.

No phase transition grants production adapter, provider, signing, publication,
deployment, remote access, secrets, automatic service start, or live
infrastructure authority.

## Reproduction

Run:

```sh
npm run source:check
npm run audit:dependencies:check
```

The release gate includes Rust formatting, lint, TypeScript/Rust conformance,
workspace tests, metadata checks, and the complete source build. Phase 14 later
adds target/package compatibility and cross-installer component-digest proof.
