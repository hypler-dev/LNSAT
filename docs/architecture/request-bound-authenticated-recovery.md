# Request-Bound Authenticated Recovery

Status: private test-only source candidate. The November 3 integration copies
four hash-matched recovered source files into a fresh public-main checkout.
This document is newly written; it does not reconstruct the missing historical
document or its unlocated final hash. Current build and runtime evidence remain
separate from the recovered byte identities.

## Authority And Modes

The private observer child accepts paired current session and CSRF credentials
before selected-object lookup or disclosure. Inspection requires ReadEvidence
and active Owner or exact original-requester scope. Reconciliation additionally
requires the current Owner and an exact `outcome_unknown` attempt. Requester
status and evidence-read permission cannot authorize a result-ledger write.

Request, policy, authorization, consumption, operation, attempt, target and
launch commitments remain bound to the original store instance. A coherent
entry snapshot classifies terminal states. Completed entry bypasses observation
and proof construction; failed terminal entry rejects. Recovery has no dispatch
port and cannot restore consumed execution authority.

## Acquisition And Commit

One trusted synthetic observer runs after releasing the store lock and
transaction. It receives a bounded expectation without credentials or store
access. Acquisition failure, panic, drift, substitution or uncertainty cannot
produce completion or permission to retry an effect.

After acquisition, the child reauthenticates the same caller, session and role
and compares the full readback and observation context. A mandatory test-only
fence repeats current authorization and exact attempt checks on the actual
result writer's Immediate transaction before result-ledger mutation. It cannot
fall back to the older unfenced writer. Existing receipt and reconciliation
atomicity is reused; lost acknowledgement remains unconfirmed until durable
readback. Projection uses the existing bounded authenticated request read.

## Validation And Product Gaps

The recovered test file declares 28 groups: positive inspection/reconciliation,
identity and credential denial, time and context drift, original-store binding,
terminal bypass, unlocked acquisition, exact transaction fencing, rollback,
lost acknowledgement, bounded projection, activity accounting and structural
production closure. All 28 passed on the initial integration using Rust 1.97.1. The broader suite
then exposed overlapping fixture filenames. The candidate separates the
fixture namespaces, including the authenticated recovery test database prefix.

Only `cfg(test)` selects this child and its result fence. Production collection,
proof construction, authenticated recovery transport and coordinator promotion
remain missing. Trusted callbacks, logical clocks and pointer identity do not
prove physical provenance, freshness, deadlines, custody, cleanup or crash
durability. No schema, public route, role, execution protocol or supported
runtime is added. See [Project Status](../PROJECT_STATUS.md) for current truth
and the [observer contract](request-bound-git-observer.md) for inherited limits.
