# Rooted Preparation Journal

## Scope

This document records a narrow HCFG-6 source milestone. It describes a
data-only canonical preparation-journal adapter and its selected-store custody
boundary. It is not an installation contract, a runtime profile, or a readiness
claim.

The source retains the original operation and held procfs owner, rechecks the
original sampled mount namespace, and adds fixed journal roles for `root`, `preparation`, and revisions `0` through
`3`. The journal schedule contains 81 ordered source checkpoints. Only the
initial pending-record path has native Linux source at this milestone: its
first 23 checkpoints cover creation of the root, empty-root scans, preparation
and revision-zero creation, write/readback synchronization, and the associated
bounded custody checks. No later journal phase is implied by the schedule.

## Canonical pending adapter

The adapter accepts one canonical `pending` record after bounded decoding and
exact comparison against control-selected preparation, candidate, store,
recipe, challenge, and owner values. It prepares all bounded names and paths
before custody I/O. The selected root, preparation directory, and revision-zero
file are then created through the existing rooted frame, with exact file name,
owner, mode/ACL, mount association, synchronization, and byte-readback checks
where the platform implementation supplies them.

Returned owners are stored in their root slots before post-call budget or
association checks. The original operation budget and sampled mount-namespace association remain
in force; a failed boundary invalidates the operation rather than obtaining a
new budget. The adapter has no retry, adoption, unlink, cleanup-plan producer,
or product entry point. A pending record is data and continuity input only; it
does not prove a prepared installation, a verified credential, or a Ready
state.

## Remaining gates

The genuine immutable helper/image/kernel recipe, independent selection,
nonempty held-resource preparation, probe and exact cleanup, complete cleanup
plan, checked SQL/native lifecycle, atomic initializer, and management-system
integration remain unfinished. The complete production cleanup-plan producer is
absent. Root fields alone do not establish genuine preparation or HCFG-6
enforcement.

Focused evidence includes three canonical-input tests, strict macOS all-target
Clippy and strict Linux x86_64 cross-target all-target Clippy. Independent
source review found no actionable P1/P2; its P3 records four new native cases
as compiled but not executed: positive persistence/owner retention and denial
of a preexisting empty root, a symlink root, and a foreign reported UID.

The current macOS runner harness repair is separately validated: the Darwin
legacy test, Phase-7 local conformance, and product-surface jobs default the
outer `RUST_TEST_THREADS` value to `1` only when the caller has not supplied
one. Explicit caller values and Linux behavior remain unchanged. Inner
32-writer threads, barriers, assertions, and the single 20-second production
acquisition budget remain unchanged.
Source launch and actual-outcome review passed; 24 of 24 runner checks and 2 of
2 focused checks passed. The Rust remainder, store, and daemon counts are
reported as separate evidence, not as one combined full-check result. The
original npm invocation stopped at nested Fastify resolution; existing admitted
workspace links restored resolution and the Node stages passed. Its first Rust
suffix failed (`649/2/1`), with cause unestablished. Those failed attempts remain
recorded; the later passing Rust remainder does not constitute one complete
npm invocation returning zero.

[Published Ubuntu run 42266695033](https://github.com/hypler-dev/LNSAT/actions/runs/42266695033),
attempt 1 at `1fd21d3`, passed 19 rooted groups, with separate full-store
`659/0/5` and daemon `309/0/0` counts. Its exact synthetic checkout `2f42aad9`
and tree `c438e17c` precede this thirteen-file source revision. That result does
not qualify the new journal candidate.

This source milestone does not qualify native compatibility, physical
durability, runtime, support or release. PR #120 remains draft and unmerged.
