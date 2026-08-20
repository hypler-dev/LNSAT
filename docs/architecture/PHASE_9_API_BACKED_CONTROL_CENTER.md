# Phase 9 API-Backed Control Center

- Status: experimental read-only source implementation
- Gate: `P9_API_BACKED_CONTROL_CENTER_IMPLEMENTATION`
- Runtime effect: authenticated evidence reads plus optional immutable console assets
- Mutation effect: none
- Production support: no

Phase 9 connects the read-only Control Center to existing Phase 8 Gateway
evidence without adding operation discovery or action authority. Gateway remains
the security boundary. Browser code presents closed, authenticated evidence; it
does not authorize, execute, retry, reconcile, cancel, submit receipts, or infer
terminal truth from transport behavior.

## Same-Origin Topology

Console and Gateway API share the exact numeric-loopback `lnsatd` origin. Live
browser requests use relative paths only, `credentials: same-origin`,
`Cache-Control: no-store` request behavior, redirect rejection, no referrer, and
the exact stable header:

```text
LNSAT-Contract-Version: lnsat.contracts.v1_0
```

The browser supplies no bearer header. Existing host-only strict session cookies
carry the active local session. Existing daemon transport checks still require
numeric loopback peer/Host, same-origin Fetch Metadata, exact stable contract
version, active non-revoked/non-expired local session, and existing
`read_evidence` permission before store reads. Owner, operator, and auditor role
semantics are unchanged.

No CORS, proxy, forwarded-host trust, hostname alias, public listener, remote
access, direct database connection, or separate TypeScript auth proxy exists.
The Fastify route `/v1/local-beta/operations/reconciliation` remains
fixture-only and unchanged.

## Exact-ID Discovery

Phase 9 has no operation list, search, enumeration, ID history, clipboard
inspection, or persistence. Operator either pastes one exact lowercase
`opn_` plus 64-hex operation ID or opens:

```text
/operations#operation=<exact-operation-id>
```

Fragment parsing is client-only and does not load automatically. One explicit
Load/Refresh action selects manual input first, otherwise the exact fragment.
Mount, reconnect, visibility changes, and elapsed time trigger no request.

Request order is fixed:

1. `GET /v1/operations/{operation_id}`;
2. `GET /v1/execution-authorizations/{authorization_id}` using only the ID from
   validated operation evidence;
3. `GET /v1/operations/{operation_id}/attempts/{operation_attempt_id}` only when
   validated operation evidence supplies an attempt.

No client-provided authorization or attempt selector is trusted. Operation,
authorization, inline attempt, and exact attempt response must have equal
immutable operation, project, resource, attempt, adapter, and protocol identity
before any field renders. Attempt state may validly advance between the
operation and attempt reads; the exact attempt response is the newer snapshot.
Changing the operation input clears mismatched evidence, late results for a
different input are ignored, and failed refresh preserves stale evidence only
for the same exact operation ID.

## Closed Live Projection

Existing synthetic contract
`lnsat.control_center.operation_readback.v0_1` remains byte-equivalent and
unchanged. Phase 9 adds
`lnsat.control_center.operation_readback.v1_0`, discriminated by:

```text
source_kind: live_gateway | synthetic_fixture
```

Live projection includes:

- exact Gateway source contract and stable request contract version;
- visible authenticated-Gateway provenance;
- project/resource scope;
- bounded authorization evidence;
- bounded operation and optional attempt evidence;
- receipt and reconciliation evidence;
- local observation time;
- `fresh | stale | degraded | unavailable` observation status;
- explicit possible bounded session-activity evidence append;
- `read_only: true`;
- `runtime_authority: false`;
- `action_authority: false`;
- `retry_available: false`;
- success and non-execution claims fixed by evidence rules below.

Every HTTP envelope and nested value uses an exact closed key set. Unknown,
extra, missing, malformed, unsupported-contract, invalid-ID, and mismatched
values fail closed. Contract or scope mismatch becomes degraded with scope,
authorization, operation, attempt, receipt, and reconciliation hidden.

Synthetic projection wraps, but never changes, the v0.1 fixture. Console renders
live evidence and synthetic fixtures in separate labeled panels. Live failure
never reads, relabels, merges, overwrites, or substitutes fixture data.

## Evidence Mapping

| Gateway evidence                                        | Presentation       | Observation   |
| ------------------------------------------------------- | ------------------ | ------------- |
| `prepared` plus active authorization                    | `prepared`         | `fresh`       |
| `prepared` plus expired authorization                   | `expired`          | `fresh`       |
| `dispatching` plus exact attempt and no receipt         | `receipt_pending`  | `fresh`       |
| `outcome_unknown`                                       | `unknown`          | `fresh`       |
| explicit in-progress reconciliation evidence only       | `reconciling`      | `fresh`       |
| `completed` plus canonical Gateway receipt              | `completed`        | `fresh`       |
| `completed` without receipt                             | `unknown`          | `degraded`    |
| `failed` plus durable Gateway state evidence            | `failed`           | `fresh`       |
| fetch/auth/source failure with no prior valid snapshot  | `unknown`          | `unavailable` |
| contract/scope mismatch with no prior valid snapshot    | `unknown`          | `degraded`    |
| failed explicit refresh after one prior valid live load | prior presentation | `stale`       |

Current Phase 8 reconciliation storage emits terminal `matched` evidence only;
it is never projected as `reconciling`. The presentation model reserves
`reconciling` for explicit in-progress reconciliation evidence and does not map
generic transport/task states into live Phase 8 evidence.

`success_confirmed` becomes true only for `completed` with canonical receipt.
`non_execution_confirmed` is always false. `failed` does not mean confirmed
non-execution. Timeout, abort, cancellation, missing response, invalid JSON,
HTTP 403/503, daemon failure, missing receipt, and transport loss never imply
success, safe retry, or confirmed non-execution.

One prior valid live snapshot may remain in React memory after a failed explicit
refresh. It is marked stale and carries the refresh failure code. No live
evidence enters local/session storage, cookies, URLs, fixture files, history, or
another persistence surface.

## Optional Static Console Delivery

`DaemonConfigV1::with_internal_console_root` is an experimental source-local
configuration seam. It accepts one absolute console root and exact
request-path-to-relative-file manifest. It is disabled by default and has no
CLI flag or stable Phase 10 configuration contract.

At daemon bind, it:

- rejects empty or oversized manifests and reserved `/v1`/`/healthz` paths;
- rejects ambiguous, encoded, traversal, absolute, backslash, dot-segment, and
  unsupported-extension entries;
- rejects missing files, directories, symlinks, escapes, and assets above the
  bounded size limit;
- loads verified bytes into memory before listener use.

After bind, filesystem changes cannot change served bytes. Requests must match
one manifest path exactly and use GET or HEAD on the exact bound numeric-loopback
Host. Cross-site metadata, mismatched Origin, hostname/port drift, forwarded
headers, content framing, OPTIONS, arbitrary paths, traversal, encoded aliases,
and directory requests fail closed. Responses expose no CORS headers and use
self-only CSP/connect policy. No directory listing or filesystem fallback
exists.

Phase 8 data routes and request-body limits remain exactly unchanged. Static
assets add presentation delivery only; they grant no session, evidence,
execution, receipt, retry, reconciliation, or configuration authority.

## Evidence and Validation

Contract fixture:
`fixtures/contracts/phase9-control-center-readback-v1.json`.

Focused proof covers:

- live projection mappings for prepared, expired, dispatching,
  `outcome_unknown`, reconciling, completed-with-receipt,
  completed-without-receipt, and failed;
- exact source/version/header/relative-request behavior;
- manual and exact-fragment selection;
- operation -> authorization -> optional-attempt fetch order;
- exact immutable project/resource/operation/attempt/adapter/protocol identity
  while allowing a newer mutable attempt state;
- same-operation-only stale retention, input-divergence clearing, and late-load
  identity rejection;
- closed response shapes and malformed/extra/unknown rejection;
- timeout, abort, missing response, invalid JSON, 403, and 503;
- in-memory stale overlay and no fixture substitution;
- absence of polling, storage, retry, reconcile, cancel, execute, receipt
  submission, list, and search calls;
- immutable manifest GET/HEAD serving and Host/origin/forwarding/CORS/path,
  directory, traversal, encoding, and symlink negatives;
- unchanged Phase 8 route inventory and store prerequisites.

Repository-wide `npm run check` and `npm run public:check` remain required before
delivery.

## Hard Stops

Phase 9 does not authorize:

- operation list/search/enumeration, automatic polling, reconnect refresh, ID
  history, clipboard access, or live evidence persistence;
- retry, execute, cancel, revoke, reconcile, receipt submission, capability,
  nonce, adapter selection, or any other mutation/control call;
- new roles, sessions, permissions, policy, schema, migration, OS-user/process
  trust, owner bypass, project-isolated ACL claim, or direct database access;
- CORS, proxying, forwarded-host trust, hostname aliases, public/non-loopback
  listeners, remote access, arbitrary file serving, directory listing, or
  symlink/traversal fallback;
- stable Phase 10 daemon/CLI/config contracts;
- package, installer, container, binary, tag, release, signing, provider, key,
  publication, deployment, production write, or production-support claim;
- Phase 10 or later implementation or automatic promotion to another phase.
