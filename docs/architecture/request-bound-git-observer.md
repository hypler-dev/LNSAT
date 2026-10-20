# Private Request-Bound Git Observer and Verifier

- Status: implemented private source candidate; G01–G26 narrow local conformance passed
- Scope: trusted synthetic observation and verification under `cfg(test)`
- Compatibility: existing request-bound Git adapter/protocol and SQLite schema 18

This document records the first source candidate for a request-bound Git
observer/verifier boundary. It extends the private coordinator without opening
a production observer, real Git collector, public result route, new protocol,
schema migration, runtime operation or release gate. Project Status owns
implementation truth; the build sequence owns ordering and later qualification.

## Control, observation and verification

Control independently selects the expected immutable request, exact durable
operation attempt, approved repository identity, acquisition expectation and
trusted synthetic observer. Dispatch cannot select the observer, return proof,
change the expected context or authorize acquisition. The observer receives
bounded owned expectation data only; it receives no store, transaction, mutex
guard, reservation, capability or proof constructor.

The coordinator releases every store borrow, transaction and outer lock before
dispatch or synthetic observation. After observation, it reacquires the
original store and rederives the current request lineage, policy and
authorization parents, exact operation and attempt, store-instance identity,
adapter/protocol bindings and approved Git expectation. A pre-observation
snapshot is not current authority after the unlocked interval. Existing
controller state retains the complete validated operation readback from
expectation assembly. Normal freeze requires the entry to be `dispatching`.
For recovery, the initial coherent entry classification is retained before
observation. After observation, exact current full-readback equality is
required; any transition or readback drift blocks the boundary before its proof
constructor call. Only then does existing test-only semantic verification check
exact repository identity, commit, tree, ordered paths, patch and commit
metadata before existing result persistence is called.

This equality boundary preserves modeled state integrity. It does not provide
physical temporal authority against arbitrary concurrent writers.

The stable result and launch commitment domains remain distinct. No
`observed_at` field or new digest domain is introduced. Recording time remains
the existing canonical persistence time, not collection time or proof of a
physical consequence.

## Failure, uncertainty and recovery

Missing, incomplete, uncertain or panicking synthetic observation cannot mint a
proof. Dispatch error or panic skips automatic observation and follows the
existing conservative unknown-marker path. Unknown-marker return alone never
claims durable unknown; lock contention, write failure and lost acknowledgement
remain unconfirmed. No failure path redispatches, creates a replacement
reservation or downgrades a completed entry.

Completed recovery returns validated readback with zero observer, proof or
dispatch calls. Failed terminal recovery rejects with the same zero-call
property. Recovery compares its initial coherent classification before opening
observation; only eligible dispatching or outcome-unknown recovery may perform
one explicit observation. Normal freeze still requires `dispatching`. Later
inspection remains inspection-only. Reopened
stores derive a fresh current binding; an old proof or inner-store identity
cannot transfer across reopen. Existing exact replay is read-only; conflicting
result replay rejects; unknown-to-completed recovery retains one matched
receipt and reconciliation.

## Synthetic limits and evidence boundary

The source candidate accepts one semantic payload of at most 16 KiB across the
frozen expectation, capture-bound context and capture fields. It permits at
most 64 changed paths; each path, repository identity scalar and identifier
scalar is at most 1,024 UTF-8 bytes; each metadata field is at most 2,048 bytes.
These are semantic payload limits. They do not define a serialized envelope,
allocator ceiling, callback duration, clock deadline or cleanup deadline.

Capture carries the full immutable expectation and a fresh `Arc` pointer stamp
for each invocation. The pointer stamp establishes logical per-invocation
freshness only; it cannot prove physical collector provenance, causal
attribution, target custody or absence of an intervening writer. Instrumentation
counts attempted `proof_constructor_calls`; it does not claim that every
attempt minted a proof.

The bounded synthetic capture remains a test candidate. It is not physical
collector, deadline, custody, cleanup or crash-durability proof. No timestamp,
host/process identity, loaded-code identity or acquisition provenance is added
to existing Git result meanings or digest inputs.

Trusted in-process closures, controlled fixture values and temporary databases
exercise logical separation only. They cannot authenticate physical origin,
causal attribution, no-intervening-writer coverage, target custody, cleanup,
clock provenance or actual Git effect.

## Conformance and remaining gates

G01–G26 cover independent assembly, immutable lineage, exact attempts and
commitment domains, unlocked ports, current-binding drift, exact Git semantics,
uncertainty, durable histories, recording time, replay/conflict, transaction
uncertainty, terminal recovery, eligible recovery and production closure. These
groups passed in the narrow local run: 25 behavioral groups and one G26
structural production-closure group. Strict Clippy and Rustfmt passed, with
fresh source/test review pinned to the reviewed source and test fixtures. This
is fixture evidence only, not physical or professional-fuzzing qualification.

G27–G32 remain closed and require separately accepted production, native and
operator work: actual acquisition provenance; race and causal attribution;
physical limits and cleanup; crash durability; authenticated recovery access;
and supported runtime admission. Their completion cannot be inferred from
synthetic capture, matching Git fields, fixture hashes or controller timing.

Applicable OpenSSF engineering evidence remains scoped to ownership, design,
positive and negative checks, review, validation and explicit gaps. No badge,
certification, compliance, Phase 10 exit, Phase 11 runtime, release or support
claim follows.
