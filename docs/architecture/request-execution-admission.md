# Request-Bound One-Use Execution Admission

- Status: experimental private source prerequisite
- Acceptance: direct human acceptance on 2026-10-18 authorized source
  implementation, bounded fake-adapter tests, documentation, and independent
  review
- Product effect: none; no public route or supported operation
- Runtime effect: none; no real dispatch, process, host, or consequence

This source milestone closes the seam between a durable action-request root and
one existing execution attempt. It combines final authenticated admission and
durable launch reservation in one immediate SQLite transaction. The transaction
reuses existing capability-consumption, operation, attempt, audit, and startup
ambiguity machinery; it does not create a second permission store or authority
path.

## Admission contract

The private entry point accepts an immutable request ID, an exact derived
execution request, the existing capability-redemption input and secret, and the
authenticated local session proof. It first verifies the derived request and
the closed source-only adapter identity. In the write transaction it then
revalidates:

- the request root and its unique recorded policy evaluation;
- the requester and approver identities and active sessions, including their
  distinct identities and required role permissions;
- the approval, authorization, nonce, request, scope, audience, and validity
  lineage;
- server time after acquiring the write lock and again immediately before the
  reservation writes, rejecting backwards time or expired authorization,
  operation, nonce, attempt, or session windows;
- the consumed capability and the prepared operation; and
- the exact action, target, configuration, executable, adapter, audience, and
  derived-request digests, including the shared tool-arguments digest.

The root's policy decision is the transaction's uniqueness guard. A different
approval or authorization cannot retry the same immutable request through this
seam. SQLite write-lock serialization and the existing operation-attempt row
make the capability consumption and attempt reservation one use.

Only a fresh committed transaction constructs `RequestLaunchReservationV1`.
The value is intentionally neither `Clone` nor serializable. It carries the
request, operation, attempt, launch digest, and authorization expiry needed by
the later private integration seam. It is not a receipt and does not authorize
any real adapter by itself.

## Guarded fake dispatch

The guarded follow-on adds a private fresh `IMMEDIATE` transaction before any
fake handoff. Each reservation carries an in-memory marker for its originating
`SqliteStore`; a retained value is rejected if it reaches another connection or
store reopen. The guard revalidates the durable request root, unique policy
lineage, prepared operation and attempt, reservation and tool-argument digest,
and the live exact requester bearer/CSRF proof, approver session, role
permissions, nonce, expiry windows, and final clock sample. Historical
integrity verification stays separate and does not require sessions to remain
active.

Only `cfg(test)` exposes the fake dispatcher. Its callback is trusted test code,
not arbitrary containment or a production adapter interface. The guard and
callback handoff remain neither `Clone` nor serializable. Callback error or
unwinding panic consumes the handoff and attempts a best-effort transition for the exact
source protocol to `outcome_unknown`; a failed unknown write or corrupt
evidence cannot restore consumed authority. Fake success leaves the operation
`dispatching` and writes no receipt, reconciliation, or completion. Restart
inspection remains no-retry. The `adapter_executed` source-unknown label used by
older adapter evidence remains a compatible historical label only and does not
prove execution here. The new source-protocol unknown event carries no
consequence source (`none`).

## Closed adapter and failure behavior

The source-only adapter identity is
`adapter:source-only:request-admission@v1`, with protocol
`lnsat.request-execution-admission.source.v1`. Its persistence helper writes an
existing operation-attempt record and state event; it launches no executable,
opens no endpoint, inspects no repository, and performs no consequence.

Denied, pending, expired, revoked, invalid-session, altered-root, changed
request, changed target or configuration, changed adapter, changed executable,
changed audience, and invalid-capability evidence returns no reservation. A
transaction rollback returns no reservation and does not leave a usable
attempt. A replay does not mint a replacement token. The same holds after a
lost response, a dropped reservation, or process restart: inspection may find
the committed attempt, and existing startup reconciliation may record
`outcome_unknown`, but the seam does not retry or fabricate success.

Fourteen grouped tests passed on 2026-10-18 using existing controller tools
and an offline dependency cache: eight guarded-dispatch groups and six
admission regression groups. Coverage includes exact one-call success, wrong
proof and actor, revoked sessions, disabled approver, cancelled nonce, expiry
and clock failure, another store or reopen, callback error and unwinding panic,
corrupt binding, failed unknown persistence, and legacy unknown-audit labels.
Earlier reservation receipts remain separate dated evidence. These tests do
not prove a physical deadline, process containment, cleanup,
consequence, receipt, runtime support, or any specific supported operation.

Schema/open/readback verification rederives the stored launch binding from the
root, canonical packet and policy, authorization attempt, consumption, and
authorization expiry. The closed protocol permits only `dispatching` or
`outcome_unknown` history, exactly one attempt for that root's policy, and no
consequence receipt or reconciliation row. Historical verification does not
require sessions to remain active; admission does.

## Separate request-bound Git-result protocol

The unmerged request-bound Git-result source candidate is a distinct adapter
and protocol, not an extension of this receipt-free admission protocol:
`adapter:local:request-bound-git-commit@v1` and
`lnsat.request-bound-git.protocol.v1`. It reuses schema 18 rows only after
mandatory immutable root, parent, and protocol rederivation. Its launch
commitment joins the full request and the separate Git tool-arguments digest;
the two digests retain distinct meanings.

That candidate accepts only a private verifier-owned, non-cloneable,
non-serializable proof. The sole constructor is test-only and models an
independent synthetic observation; it is separate from this protocol's trusted
fake callback. Its immediate result transaction treats an exact existing result
as read-only, rejects a conflict, and requires one matched reconciliation when
an unknown attempt is resolved. It permits neither a retry nor re-execution.
It adds no production observer or dispatch, real Git/host/native evidence, or
public result-submission route. Its 13 result groups and 35 affected Rust regressions passed locally. Independent
source and test reviews passed. See [request-bound Git result persistence](request-bound-git-result.md).

## Schema and later gates

No schema migration is introduced. Store schema 18 remains current, and the
future headless-installation schema 19 proposal remains unchanged. The seam
uses existing operation and attempt rows and existing ambiguity/reconciliation
states.

Production consequence observation and receipt evidence, a production adapter,
supervisor integration, runtime/process evidence, and release qualification
remain later separately authorized gates. A later integration must preserve the
exact root, authorization, attempt, adapter, and digest bindings and must treat
any post-commit uncertainty as an inspection and reconciliation problem.

No public API, HTTP route, CLI, SDK, MCP tool, real adapter, host operation,
deployment, package, or support claim follows from this source milestone.
