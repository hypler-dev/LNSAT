<!-- intent-driven-delivery:spec:v1 -->

# Specification: HCFG-4A exact approval and audit evidence readback

Status: proposed
Intent: [HCFG-4A exact evidence-readback intent](intent.md)
Owner: LNSAT maintainers
Last updated: 2026-09-24

## Behavior

HCFG-4A adds three read-only, exact-object routes to canonical `lnsatd`:

```text
GET|HEAD /v1/approval-requests/{approval_request_id}
GET|HEAD /v1/approval-decisions/{approval_decision_id}
GET|HEAD /v1/audit-events/{audit_event_id}
LNSAT-Contract-Version: lnsat.contracts.v1_0
```

The routes use the existing API-wide numeric-loopback peer, exact bound `Host`,
exact contract-version, same-origin, two-header session authentication,
session-validity, and fixed `ReadEvidence` gates. Both
`X-LNSAT-Local-Session-Token` and independent
`X-LNSAT-Local-Session-Proof` are required; browser cookies grant no
authentication. Owner, operator, and auditor roles may read.
The permission is installation-wide because the current local role model has no
project-scoped sessions or grants.

Each route selects only one exact content-bound identifier. There is no list,
search, prefix, project query, resource query, or caller-provided scope. The
store finds the one identifier, recovers its persisted project scope, and then
reuses the existing project-scoped decoder/rederivation path. The selected row's
complete content must rederive exactly, including its identifier and linked
packet, policy, request, or decision evidence. Missing or mismatched source
evidence denies the read.

Successful authentication may append the existing bounded session activity
observation. The evidence record, approvals, audit chain, permissions, session
authority, execution state, and runtime remain unchanged.

## Interfaces and contracts

### Request and route rules

- `approval_request_id` is exactly `apr_` plus 64 lowercase hexadecimal bytes.
- `approval_decision_id` is exactly `apd_` plus 64 lowercase hexadecimal bytes.
- `audit_event_id` is exactly `aud_` plus 64 lowercase hexadecimal bytes.
- Only one identifier segment is accepted. Empty, short, uppercase, nested,
  duplicate-separator, percent-encoded, fragmented, query-bearing, trailing, or
  otherwise ambiguous targets fail closed.
- Only `GET` and `HEAD` are accepted. Other methods return `405` with
  `Allow: GET, HEAD` after exact route recognition.
- Bodies, transfer encoding, nonzero or ambiguous content length, content type,
  CSRF headers, caller idempotency keys, forwarded headers, and product-surface
  selectors are forbidden.
- No response emits CORS permission, `WWW-Authenticate`, or `Set-Cookie`.

### Response contracts

The response contracts are additive and exact:

| Route             | Response contract                           | Object key          | Success scope             |
| ----------------- | ------------------------------------------- | ------------------- | ------------------------- |
| approval request  | `lnsat.gateway.approval_request_read.v1_0`  | `approval_request`  | `exact_approval_request`  |
| approval decision | `lnsat.gateway.approval_decision_read.v1_0` | `approval_decision` | `exact_approval_decision` |
| audit event       | `lnsat.gateway.audit_event_read.v1_0`       | `audit_event`       | `exact_audit_event`       |

HTTP `200` returns exact contract and contract-version identities, `ok: true`,
`status: "evidence_read"`, the fixed scope, and one fully rederived stable
domain object. The envelope also contains:

```json
{
  "authorization": {
    "source": "local_session",
    "permission": "read_evidence",
    "actor_session_bound": true
  },
  "side_effects": ["session_activity_evidence_may_append"],
  "approval_request_state_changed": false,
  "approval_decision_state_changed": false,
  "audit_state_changed": false,
  "session_authority_state_changed": false,
  "execution_authorized": false,
  "mutation_authority": false
}
```

All three state-change keys remain present in all success envelopes so generic
monitoring consumers cannot infer route family from authority metadata alone.
Only the route-specific object key is present; other evidence object keys are
absent.

The approval-request object uses the existing stable domain fields:
`contract_version`, `schema_id`, `approval_request_id`, `status`,
`policy_decision_ref`, `requester_ref`, `session_ref`, `project_ref`, sorted
`resource_refs`, sorted `requested_capabilities`, ordered
`policy_reason_codes`, `requested_at`, `expires_at`, and empty `side_effects`.

The approval-decision object uses `contract_version`, `schema_id`,
`approval_decision_id`, `approval_request_ref`, `approver_ref`,
`approver_session_ref`, `decision`, `reason_code`, `decided_at`, `expires_at`,
`approval_gate_satisfied`, `execution_authorized: false`, and empty
`side_effects`.

The audit-event object uses `contract_version`, `schema_id`, `event_id`,
`event_type`, `result_status`, `actor_ref`, `session_ref`, `project_ref`, sorted
`resource_refs`, `packet_ref`, `policy_ref`, nullable `approval_request_ref`,
nullable `approval_decision_ref`, ordered `reason_codes`,
`source_evidence_hash`, `idempotency_key`, `event_at`, `observed_at`,
`retention_class`, the existing closed `redaction` object,
`authenticated_provenance`, `persistence_requested: false`,
`execution_authorized: false`, and empty `side_effects`.

Objects preserve stable domain field meaning. The read envelope does not reuse
the mutation contracts, their `recorded`/`replayed` status, CSRF claims, limiter
claims, or evidence-appended side effects.

`HEAD` performs the same authentication, permission, identifier, source-chain,
and drift checks as `GET`. It returns identical status and representation
headers, including `Content-Length`, with zero response-body bytes.

### Generic denial

Each in-contract route family returns one HTTP `403` envelope with its response
contract, `ok: false`, the route-specific object key set to `null`, one fixed
error, and the same false authority/state fields as success. Error identities:

| Contract               | Code                                    | Path                                         | Message                          |
| ---------------------- | --------------------------------------- | -------------------------------------------- | -------------------------------- |
| approval request read  | `gateway.approval_request_read.denied`  | `/approval-requests/{approval_request_id}`   | `Approval request read denied.`  |
| approval decision read | `gateway.approval_decision_read.denied` | `/approval-decisions/{approval_decision_id}` | `Approval decision read denied.` |
| audit event read       | `gateway.audit_event_read.denied`       | `/audit-events/{audit_event_id}`             | `Audit event read denied.`       |

Denied responses always declare
`side_effects: ["session_activity_evidence_may_append"]`. This is honest after
session verification and does not reveal whether authentication succeeded or a
record existed. Missing authentication, inactive session, denied permission,
unknown ID, row mismatch, linked-evidence drift, decode failure, and persistence
failure are indistinguishable. Raw target bytes, identifier values, database
details, and internal error codes are absent.

Malformed pre-route framing, bound-Host failure, exact-version failure, unknown
route, and unrecognized method behavior retain shared transport, version,
routing, and `405` envelopes.

## States and failure handling

- **Read:** one authenticated request returns one fully rederived immutable
  evidence record.
- **Head:** identical checks and headers, with no body bytes.
- **Absent or denied:** one contract-specific generic `403`; no record state
  changes.
- **Drift or storage failure:** same generic `403`; no partial body or raw row.
- **Client disconnect:** the server may fail to deliver the response; durable
  evidence remains unchanged. A disconnect never implies record absence,
  corruption, approval outcome, or action outcome.
- **Retry:** callers may repeat an exact read. Each request independently
  authenticates and may append bounded session activity. No caller idempotency
  key exists.
- **Empty/list:** unavailable. Collection routes and query parameters remain
  closed.

## Data, privacy, and permissions

The returned records contain operational metadata: human/agent references,
session references, project/resource references, capabilities, policy and
approval decisions, timestamps, reason codes, and content digests. Access is
restricted to the existing active local owner/operator/auditor roles through
`ReadEvidence`.

No password, PHC verifier, bearer token, CSRF token, capability wire, private
key, raw rejected command/value/payload, environment value, or unvalidated row
may be serialized. Audit redaction fields must retain their stable explicit
`not_present` values. Tests seed secret-like canaries outside allowed output and
prove byte absence in success and denial responses.

The packet creates no evidence retention rule and deletes no evidence. Existing
durable retention and rederivation rules remain authoritative. Session activity
is the only possible write and follows the existing authenticated-read policy.

## Compatibility and migration

The three routes and contracts are additive under
`lnsat.contracts.v1_0`. Existing approval POST routes, operation GET routes,
identity/session event routes, status/health routes, product-surface manifests,
daemon configuration, store schema, and frozen v1 bytes remain unchanged.

No database migration is required. The new exact-ID lookup seam must end in the
existing project-scoped rederivation logic after reading the stored project
scope; it must not expose raw row access to callers. Removing the new route
classifiers, response variants/serializers, and exact-ID lookup seam reverts the
packet without stored-state cleanup.

This packet does not supersede Phase 9's prohibition on operation listing,
polling, reconnect refresh, history, or Control Center mutation. It adds later
HCFG-4 source under a separate contract and leaves the existing Phase 9 route
unchanged.

## Acceptance mapping

- Store tests: valid exact IDs return fully rederived records; malformed IDs
  never query; missing and foreign-family IDs return absence; linked evidence
  tampering fails closed; no list/prefix API exists.
- Route parser tests: exact three shapes; lowercase length/prefix; query,
  encoding, fragment, slash, suffix, and family-confusion negatives.
- Authentication tests: owner/operator/auditor success; missing, malformed,
  expired, revoked, wrong-origin, remote-peer, Host drift, Fetch-Metadata drift,
  cookie-only replay, duplicate or mismatched session headers, and
  forbidden-CSRF negatives.
- Response tests: closed fields, stable domain values, sorted collections,
  nullable audit links, false authority fields, no mutation/replay claims,
  `GET`/`HEAD` status and `Content-Length` parity, and bodyless `HEAD`.
- Oracle/redaction tests: unknown, drifted, and storage failure produce identical
  denials; hostile path and secret canaries never appear.
- Regression tests: approval POST and operation GET response bytes and behavior
  remain unchanged; Phase 7/8/9/10/11, product-surface, source inventory, and
  legacy identifier gates pass.
- Repository validation: focused Rust tests, pinned format/clippy/workspace
  tests, `npm run source:check`, `npm run public:check`, installed Semgrep and
  Gitleaks checks, dependency audit when applicable, and `git diff --check`.
- Fresh independent security/correctness review must report no unresolved
  P1/P2/P3 finding against the exact diff.

## Non-goals and open questions

HCFG-4A does not add CLI transport, snapshots, list/history queries, a durable
monitor event journal, total event ordering, cursors, retention windows,
streaming, backpressure, JSONL event output, or watch disconnect/resume. These
remain closed until separately accepted HCFG-4B/HCFG-4C contracts define them.

No product question remains inside HCFG-4A after owner acceptance. Acceptance
specifically confirms installation-wide exact-known-ID access for existing
`ReadEvidence` roles. If the owner requires project-scoped read grants, this
proposal must be revised before source implementation because the current role
model cannot enforce that boundary.
