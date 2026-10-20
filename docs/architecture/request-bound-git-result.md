# Request-Bound Git Result Persistence

- Status: merged experimental private result source; synthetic action-loop
  fixture implemented with focused validation and independent test review
- Acceptance: direct human acceptance on 2026-10-18 covers bounded source,
  fake-adapter tests, documentation, and independent review
- Parent validation: 13 result groups and 35 affected Rust regressions passed;
  34 Node checks, strict Clippy, and Rustfmt passed
- Parent independent review: source and test PASS, no open actionable findings
- Product and runtime effect: none

This document records a source-only result-persistence seam for an already
admitted request-bound Git attempt. It creates no execution authority and does
not claim that a Git consequence occurred.

## Distinct protocol and schema boundary

The candidate uses the exact adapter identity
`adapter:local:request-bound-git-commit@v1` and protocol
`lnsat.request-bound-git.protocol.v1`. The earlier
`lnsat.request-execution-admission.source.v1` remains receipt-free; this work
does not reinterpret its attempts, records, or unknown-state labels.

Schema 18 is reused without a migration. Before result persistence, the store
must rederive the immutable request root, recorded policy, authorization,
consumption, and protocol binding from durable rows. It separately rederives
the full-request commitment and the Git tool-arguments digest. The protocol
launch commitment joins both domains without substituting one for the other.
Missing roots, changed parents, wrong protocol, inconsistent history, and
altered bindings fail closed. Future headless schema 19 remains unchanged.

## Proof and synthetic observation boundary

The result core accepts only a private verifier-owned proof value. It is neither
cloneable nor serializable. Its only constructor in this candidate is guarded by
`cfg(test)` and represents a trusted, independent synthetic observation. The
observation constructor is separate from the fake dispatch callback: callback
return alone cannot mint proof.

Synthetic temporary-database fixtures exercise persistence semantics only. They
do not establish a real Git consequence, authenticated runtime evidence, or an
operator-visible production ledger. No production observer, dispatch path,
Git/host/native proof, or public result-submission interface is present.

## Result transaction

One immediate SQLite transaction rechecks schema and the complete durable
binding before accepting the proof. Its stable result equality commits the
request, operation, attempt, authorization, consumption, launch, tool,
adapter, protocol, commit, tree, path, patch, and metadata fields. Observation
and persistence timestamps are excluded from that equality.

For an existing receipt, only the identical completed result returns readback;
it performs no observation refresh or writes. A changed result, failed state,
or binding drift is rejected. For a new result, the transaction writes the
receipt plus completed operation and attempt state/audit records atomically. If
the prior state is `outcome_unknown`, it also writes exactly one matched
reconciliation in that transaction. Any rollback leaves no partial result
history. A lost acknowledgement may leave the caller uncertain despite durable completion,
but cannot mint authority, retry the request, or re-execute the action.

## Closed gates

This candidate does not add a public API, HTTP route, CLI, SDK, MCP tool,
production adapter, supervisor, process, host operation, deployment, package,
release, or supported-operation claim. It does not complete Phase 11 or change
the separate runtime proof gates.

The result groups cover valid failed-state rejection, denied and revoked
admission, exact full-ledger duplicate/conflict/rollback comparisons, lost
acknowledgement recovery, concurrent writers, request-binding drift, missing
root/protocol rejection, and startup unknown reconciliation. Repeated runs are
not additional unique tests. Receipts retain the result commitment and lineage;
the detailed Git observation remains an input to that commitment, not a new
persisted observation payload.

Full npm checks remain blocked by local Node 24.21.0 versus required 22.22.3.
The local public-history validator remains blocked by missing `smol-toml`. No
dependencies were installed. Independent source and test reviews passed with no open actionable findings.
Source-test success is not runtime, release, or support qualification.

## Synthetic action-loop integration fixture

Direct human acceptance on 2026-10-18 opened a bounded fixture joining the
existing authenticated request, approval/admission, test-only dispatch, result
persistence and authenticated evidence-readback seams. The parent result source
merged through PR #102 after PR #101. Direct acceptance on 2026-10-19
separately opened reconciliation of the reviewed fixture onto public main after
PR #104, public branch/PR publication and hosted source CI; it did not authorize
merge or runtime work. The original fixture checkout is preserved. Four focused
groups, strict Clippy and Rustfmt passed. Independent
test review passed after two oracle gaps were corrected and the affected
groups rerun; repeated executions are not additional unique tests.

Four focused Rust groups passed using the current store APIs and linked-evidence
projection. They cover completed-result replay followed by reopen and
authenticated readback, unknown recovery, authorization denial, and corrupted
linkage. The non-owner original-requester scope case uses a separate
authenticated request; the completed-chain reads use the original Owner.
An independent synthetic observation remains separate from the fake callback.
Completion after reopening exposes exactly one accepted receipt and, when
resolving an unknown attempt, one matched reconciliation. Exact result replay
preserves the result ledger. An active reservation attempt after reopening an
unknown result requires `RedemptionRejected` with no result-ledger changes.
Operation and authorization IDs are anchored to fixture-owned values before
checking projection lineage. Session
activity recorded by authenticated reads is separate from result-ledger writes.
Unauthorized reads and inconsistent linkage reveal no partial evidence;
projected records are checked for redaction and response bounds.

The existing ambiguous-callback path samples wall time. Its recovery fixture
therefore uses a later canonical result time and a newly authenticated,
118-second session before readback. This is reported chronology, not a new
production clock seam or deadline proof. The first attempt used an invalid
shorter session; the corrected affected group passed. Existing test groups
were not rerun merely to acknowledge their prior results.

This is a controller-local synthetic database fixture. It does not run a Git
target, server, Docker engine, native adapter or production observer, and does
not introduce another read projection, public mutation route or schema version.
Store reopen is source persistence evidence, not crash durability or physical
cleanup proof. The accepted fixture does not open Phase 11 runtime or support
gates.

## Private coordinator composition

The private `cfg(test)` coordinator composes these existing authority/result
seams with independently selected trusted synthetic ports. All 36 conformance
groups and fresh independent source/test review passed. It preserves this
protocol, result equality, historical resolution and atomic ledger semantics.
The [coordinator contract](request-bound-coordinator.md) documents lock release,
original-store identity, explicit inspection-only recovery and remaining
physical/runtime limits. No existing result or wrapper body changes.
