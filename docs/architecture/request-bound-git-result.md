# Request-Bound Git Result Persistence

- Status: unmerged experimental private source candidate
- Acceptance: direct human acceptance on 2026-10-18 covers bounded source,
  fake-adapter tests, documentation, and independent review
- Validation: 13 result groups and 35 affected Rust regressions passed; 34 Node
  checks, strict Clippy, and Rustfmt passed
- Independent review: source and test PASS, no open actionable findings
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
