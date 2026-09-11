<!-- intent-driven-delivery:intent:v1 -->

# Intent: HCFG-4A exact approval and audit evidence readback

Status: proposed
Authority: this file
Owner: LNSAT maintainers
Accepted by: pending
Last updated: 2026-09-10

## Problem and evidence

The accepted V1 headless gate requires authenticated operations,
approval/audit readback, and a later versioned watch surface. The canonical
`lnsatd` Gateway already serves exact operation and operation-attempt reads, but
it serves approval requests and decisions only through mutation routes and does
not serve audit-event reads. The SQLite store already has exact, rederiving
approval-request, approval-decision, and audit-event reads.

This missing readback blocks a safe monitoring snapshot and makes it premature
to define watch replay over those evidence families. The current store has no
global event sequence, cursor, bounded watch retention, or slow-consumer
contract, so those concerns stay in later HCFG-4 packets.

## Desired outcome

An authenticated local owner, operator, or auditor with the existing
`ReadEvidence` permission can retrieve one exact known approval request,
approval decision, or audit event from canonical `lnsatd` source truth. The
Gateway rederives the complete stored record, returns a closed secret-free
response, and makes missing, malformed, cross-record, tampered, and unreadable
evidence indistinguishable.

The packet adds no list, search, history, cursor, watch, mutation, execution,
or runtime authority. Existing operation routes and every frozen product-surface
v1 byte remain unchanged.

## Users and systems

- Local installation owners and operators inspecting consequential-action
  evidence.
- Local auditors performing read-only evidence inspection.
- Canonical Rust `lnsatd`, `lnsat-store`, and their source tests.
- Later `lnsatctl` snapshot and watch packets, which may consume these contracts
  only after separate transport and output decisions.

## Constraints

- Gateway remains the only served authority boundary. No direct database,
  Fastify local-beta fixture, console fixture, or alternate API becomes truth.
- All successful reads require an active same-origin local browser session and
  the existing fixed `ReadEvidence` permission.
- Exact content-bound identifiers are the only selectors. There is no list,
  prefix, query, pagination, or search surface.
- Only `GET` and `HEAD` are accepted. Request bodies, query strings, CSRF input,
  and caller idempotency keys are forbidden.
- `HEAD` performs the same authentication and evidence checks as `GET`, reports
  the same representation length, and emits no body bytes.
- One generic contract-specific `403` covers missing authentication, inactive
  sessions, denied role, unknown identifier, evidence drift, and persistence
  failure. Raw identifiers and internal reasons are never reflected.
- Responses contain only rederived stable domain evidence plus fixed public-safe
  metadata. Passwords, session bearer tokens, CSRF values, private material,
  execution capabilities, and raw stored rows never appear.
- Existing session activity evidence may append during authentication; no other
  durable state changes.
- No schema migration, dependency change, package, runtime proof, release,
  publication, or deployment belongs to this packet.

## Non-goals

- Operation or operation-attempt contract changes.
- `lnsatctl operations`, `approvals`, `audit`, or `watch` commands.
- Lists, histories, global ordering, event journals, cursor/resume, retention,
  backpressure, streaming, polling, or JSONL event framing.
- Approval creation/decision changes, reconciliation, retry, cancel, revoke,
  execution, configuration control, emergency control, or bootstrap.
- Project-scoped roles or new permissions. Current local roles retain their
  existing installation-wide `ReadEvidence` meaning.
- Fastify API or Control Center changes.

## Assumptions and verified facts

- Verified: `docs/PRODUCT_BUILD_SEQUENCE.md` orders HCFG-4 as authenticated-read
  inventory, operations plus approval/audit readback, then versioned watch.
- Verified: `GET /v1/operations/{operation_id}` and its exact attempt route are
  already served by canonical `lnsatd`.
- Verified: `lnsat-store` rederives approval request, approval decision, and
  audit evidence through exact project-scoped reads and collapses missing or
  cross-project records to `None`.
- Verified: approval-request, approval-decision, and audit identifiers are
  exact lowercase content-bound digests with `apr_`, `apd_`, and `aud_`
  prefixes.
- Verified: owner, operator, and auditor roles have the existing fixed
  `ReadEvidence` permission; there is no project-scoped local role model.
- Assumption: an authenticated installation-wide evidence reader who already
  knows an exact content-bound identifier may retrieve that record without an
  additional project selector. Owner acceptance of this intent accepts that
  scope; rejecting it keeps implementation closed.

## Risks

- Exact-ID readback exposes actor, session, project, resource, capability, and
  decision references already present in durable evidence. These are sensitive
  operational metadata even though they are not bearer secrets.
- A future project-scoped session model would need a new contract or additional
  authorization layer; this packet must not imply project tenancy.
- A by-ID store lookup could accidentally become an enumeration seam. It must
  accept only exact 64-hex content identifiers, expose no list primitive, and
  return the same denial for unknown, cross-record, drifted, and unreadable data.
- Reusing mutation response serializers could misstate side effects or
  authority. Read responses require separate closed contracts and explicit
  false authority fields.
- Watch design over independent evidence tables has no safe total order today.
  HCFG-4A must not invent a cursor or synthesize ordering from timestamps.

## Acceptance evidence

- Owner accepts this exact intent and the linked specification before source
  implementation.
- Focused store tests prove exact-ID validation, complete rederivation, generic
  absence, and no prefix/list behavior.
- Served `lnsatd` tests prove all three roles, `GET`/`HEAD` parity, exact route
  shapes, same-origin authentication, fixed version negotiation, closed success
  fields, redaction canaries, and generic denials.
- Negative tests cover malformed, uppercase, short, percent-encoded, nested,
  query-bearing, unknown, cross-record, tampered, unauthenticated, inactive,
  remote/Host/origin/Fetch-Metadata, method, body, and duplicate-header cases.
- Existing operation, approval mutation, identity/session event, product
  surface, and Phase 7/8/9/10/11 tests remain green.
- `npm run source:check`, `npm run public:check`, installed local security scans,
  `git diff --check`, and fresh independent review pass on the exact source diff.
- Merge remains a separate owner decision after exact-head CI and review gates.

## Source-of-truth links

- Authority and acceptance for HCFG-4A: this file.
- Observable contract: [HCFG-4A specification](spec.md).
- Execution and evidence plan: [HCFG-4A plan](plan.md).
- Product ordering: [Product build sequence](../../PRODUCT_BUILD_SEQUENCE.md#headless-source-packet-order).
- Merged source status: [Project status](../../PROJECT_STATUS.md).
- Existing security boundary: [Threat model](../THREAT_MODEL.md).
