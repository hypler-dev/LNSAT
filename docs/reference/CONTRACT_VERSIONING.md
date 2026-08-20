# Contract Versioning And Negotiation

Status: accepted v1 contract policy. Source implementation is pre-release and
unpublished; this document does not claim a supported artifact exists.

## Version Layers

LNSAT uses separate version layers:

| Layer           | Format                                                        | Meaning                                                 |
| --------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| Product release | SemVer, for example `1.0.0`                                   | Compatibility and support of released product artifacts |
| Wire contract   | namespaced major/minor id, for example `lnsat.contracts.v1_0` | Request, response, error, and semantic contract         |
| Family schema   | family-owned version, for example `audit_events.v0_1`         | Serialized shape or persistence migration contract      |
| Evidence        | immutable contract/schema id plus digest and timestamps       | Exact interpretation of a decision or audit record      |

Changing one layer does not silently change another. Every serialized value
names the version needed to interpret it.

## Canonical Contract Versions

`lnsat.contracts.v1_0` is the stable v1 target.
`lnsat.contracts.v0_1` remains accepted only as deprecated pre-v1 compatibility.
Its removal is not allowed before product `2.0.0` and one supported-release
deprecation window.

The canonical grammar is:

```text
lnsat.contracts.v<major>_<minor>
```

Major and minor are canonical nonnegative decimal integers: `0` is valid, but
leading zeros, signs, whitespace, alternate separators, missing components, and
extra components are malformed.

## Exact-Match Negotiation

v1 negotiates one exact contract version:

1. caller sends the exact version required by the request;
2. Gateway validates canonical syntax and exact support;
3. the response repeats the exact accepted contract/schema identity;
4. unsupported or malformed versions fail before policy or mutation work;
5. no version range, wildcard, closest-match, or automatic fallback exists.

New v1 callers use `lnsat.contracts.v1_0`. Deprecated `v0_1` is reachable only
through an explicitly documented compatibility surface. A caller cannot omit
`v1_0`, fail it, and receive an implicit `v0_1` downgrade.

The stable Gateway bootstrap surface uses:

```text
GET|HEAD /v1
LNSAT-Contract-Version: lnsat.contracts.v1_0
```

HTTP header-name matching is case-insensitive, the header must occur exactly
once, and the response repeats the accepted version in the same header.
Missing, malformed, unsupported, and deprecated values return HTTP `400`
through the shared version-family error envelope. The stable Gateway root is
not a deprecated `v0_1` compatibility surface. See
[Gateway v1 contract negotiation](../architecture/GATEWAY_V1_CONTRACT_NEGOTIATION.md).

The same exact header gates every `/v1/` subroute after loopback peer and
numeric bound-Host validation but before route dispatch, authentication,
policy, persistence, or mutation. Every routed response after acceptance
repeats the accepted version, including route, method, and generic
authentication denials. Pre-version transport failures and version failures
do not claim acceptance. `/healthz` remains separate and unversioned.

The first stable authenticated subroute is `GET|HEAD /v1/session`, with
response contract `lnsat.gateway.session_read.v1_0`. It inherits the exact
version gate and returns the accepted header on both success and its one generic
authentication denial. See
[Gateway v1 session read](../architecture/GATEWAY_V1_SESSION_READ.md).

The stable local login subroute is `POST /v1/session`, with response contract
`lnsat.gateway.session_issue.v1_0`. It inherits the exact version gate, uses
one generic credential/transport denial, and explicitly identifies
fresh-session replay plus limiter, evidence, event, and cookie side effects.
See [Gateway v1 session issue](../architecture/GATEWAY_V1_SESSION_ISSUE.md).

The stable authenticated rotation subroute is `PATCH /v1/session`, with
response contract `lnsat.gateway.session_rotation.v1_0`. It inherits the exact
version gate, requires empty JSON framing plus same-origin double-submit CSRF,
consumes the current session once, preserves absolute expiry, and binds the
prior session to one fresh replacement. Every in-contract failure uses one
zero-side-effect denial. See
[Gateway v1 session rotation](../architecture/GATEWAY_V1_SESSION_ROTATION.md).

The stable authenticated family sign-out subroute is `DELETE /v1/session`, with
response contract `lnsat.gateway.session_family_sign_out.v1_0`. It inherits
the exact version gate, requires empty JSON framing plus same-origin
double-submit CSRF, atomically revokes every active same-identity session, and
clears both host-only cookies. Every in-contract failure uses one
zero-side-effect denial. See
[Gateway v1 session-family sign-out](../architecture/GATEWAY_V1_SESSION_FAMILY_SIGN_OUT.md).

The stable authenticated identity password-rotation subroute is
`PATCH /v1/identity/password`, with response contract
`lnsat.gateway.identity_password_rotation.v1_0`. It inherits the exact version
gate, requires a closed current/new-password body plus same-origin
double-submit CSRF, appends one credential generation, atomically revokes the
same-identity session family, clears both host-only cookies, and forces
reauthentication. Its generic denial declares possible process-limiter
advancement while durable credential/session state remains unchanged. See
[Gateway v1 identity password rotation](../architecture/GATEWAY_V1_IDENTITY_PASSWORD_ROTATION.md).

The stable owner-only identity-creation subroute is `POST /v1/identities`,
with response contract `lnsat.gateway.identity_creation.v1_0`. It inherits the
exact version gate, requires a closed identity/name/role/password body plus
same-origin double-submit CSRF, permits only operator/auditor creation, and
atomically binds identity, credential, and identity-event evidence to the
authenticated owner session. Identity references are create-once; its generic
denial declares possible process-limiter advancement while durable
session/identity/credential/event state remains unchanged. See
[Gateway v1 identity creation](../architecture/GATEWAY_V1_IDENTITY_CREATION.md).
This stable response replaces experimental
`lnsat.gateway.local_identity_creation.v1_0` without an alias because its
oracle, replay, and side-effect shape changed.

The stable owner-only identity-disablement subroute is `DELETE /v1/identities/{identity_ref}`
with response contract `lnsat.gateway.identity_disablement.v1_0`. It inherits
the exact version gate, requires active owner-session authentication, active
double-submit CSRF, exact empty framing, and a validated non-owner target.
Generic denial keeps `side_effects: []`. See
[Gateway v1 identity disablement](../architecture/GATEWAY_V1_IDENTITY_DISABLEMENT.md).
This stable response replaces experimental
`lnsat.gateway.local_identity_disablement.v1_0`; no compatibility alias
remains.

The stable authenticated approval-request subroute is
`POST /v1/approval-requests`, with response contract
`lnsat.gateway.approval_request.v1_0`. It inherits the exact version gate,
accepts only project and persisted-policy references, requires an active
owner/operator session plus same-origin double-submit CSRF, binds the policy
actor and local session exactly, and supplies server-owned request time.
Created and replayed success have distinct closed outer side-effect/state
shapes while the nested stable domain request remains unchanged and
side-effect-free. One generic denial exposes only possible process-limiter
advancement. See
[Gateway v1 approval request](../architecture/GATEWAY_V1_APPROVAL_REQUEST.md).
This stable response replaces experimental
`lnsat.gateway.local_approval_request.v1_0`; no compatibility alias remains
because success, failure, replay, and side-effect shapes changed.

The stable authenticated approval-decision subroute is
`POST /v1/approval-requests/{approval_request_id}/decision`, with response
contract `lnsat.gateway.approval_decision.v1_0`. It inherits exact version
gate, accepts only project/outcome/reason in a closed body, derives request id
from validated path, requires distinct active owner/operator approval, and
records or exactly replays one immutable terminal decision. Recorded and
replayed success have distinct closed outer side-effect/state shapes while
nested `lnsat.approval_decision.v1_0` evidence remains unchanged and
side-effect-free. One generic denial exposes only possible process-limiter
advancement. See
[Gateway v1 approval decision](../architecture/GATEWAY_V1_APPROVAL_DECISION.md).
This stable response replaces experimental
`lnsat.gateway.local_approval_decision.v1_0`; no compatibility alias remains
because success, failure, replay, field naming, and side-effect shapes changed.

Phase 7a accepts `lnsat.signed_approval_evidence.v1_0` as a new parallel
immutable wrapper in
[ADR-0004](../architecture/ADR-0004_PHASE_7_SIGNED_APPROVAL_EVIDENCE.md).
It does not mutate, alias, upgrade, or downgrade
`lnsat.approval_decision.v1_0` or the Gateway response. Phase 7b now implements
pre-release source schemas/models for wrapper, public material, and closed
verification results plus dependency-free canonicalization/digest helpers and
shared TypeScript/Rust wrapper vectors. Phase 7c adds a separate public-only
pure Ed25519 primitive and a 28-case strict conformance fixture. Generic
TypeScript remains behind an explicit provider boundary; Rust pins
`ed25519-dalek` `3.0.0` with default features disabled. The primitive does not
upgrade wrapper evidence to verified status. These contracts remain
unpublished and expose no runtime signer or operational verifier. Unknown
profiles fail closed; no implicit unsigned upgrade, signed downgrade, or
mobile-profile alias exists.

Unknown future minor or major versions fail with
`contract.version.unsupported`. This is deliberate: an older implementation
cannot infer the semantics of a newer contract.

## Stable Validation Errors

| Code                            | Meaning                                               |
| ------------------------------- | ----------------------------------------------------- |
| `contract.version.invalid_type` | Transport value is not a string                       |
| `contract.version.required`     | Version string is empty                               |
| `contract.version.malformed`    | Value does not use canonical grammar                  |
| `contract.version.unsupported`  | Value is canonical but not in the exact supported set |

Errors never reflect the rejected raw value and always preserve
`side_effects: []`.

## Compatibility Rules

Within stable wire-contract major `v1`:

- optional additive response fields may be introduced by a compatible minor
  contract only when old clients safely ignore them;
- required fields, field meaning, defaults, authorization, error identity,
  canonicalization, hashing, and fail-closed behavior cannot change in place;
- removals, renames, narrowed or widened authority, weakened validation, or
  incompatible defaults require a parallel versioned contract;
- unknown fields are rejected wherever a family declares a closed schema;
- a deprecated stable surface receives at least 90 days notice and one
  supported minor release before removal;
- a compatibility alias must have tests, owner, replacement, removal floor, and
  rollback plan.

Product SemVer follows the same compatibility direction: incompatible supported
surface changes require a product major release.

## Schema And Evidence Rules

Each contract family owns its schema id and migration rules. Family schema
changes must state:

- reader and writer compatibility;
- positive, boundary, malformed, unsupported-version, and downgrade fixtures;
- canonicalization/hash impact;
- stored evidence interpretation;
- migration, rollback, and forward-recovery behavior;
- stale-evidence, replay, and idempotency behavior.

Evidence records retain the contract/schema version used at creation. Readers
must not reinterpret old evidence using a newer schema without an explicit,
audited migration. Unknown evidence versions, stale approval evidence, and
replayed idempotency claims fail closed.

## Stable Error Envelope

`lnsat.error_envelope.v1_0` freezes the common failure shape for contract
version, packet, policy decision, approval request, approval decision, and audit
event operations:

- `ok` is always `false`;
- exactly one documented family result field is present and `null`;
- `errors` contains at least one closed error item;
- each item contains `code`, RFC 6901 `path`, public-safe `message`, and
  `severity: "error"`;
- `side_effects` is always empty.

Namespaced code plus path form compatibility identity. Human-readable messages
may improve without changing the code/path meaning and must never reflect a
rejected raw value. Unknown fields, missing errors, multiple family result
fields, non-null failure results, and nonempty side effects fail the envelope.
The error envelope grants no retry, downgrade, approval, execution, or mutation
authority.

## Shared Executable Evidence

Authoritative source:

- `packages/packets/src/contract-version.ts`
- `packages/packets/src/contract-error-envelope-v1.ts`
- `packages/packets/src/contract-compatibility-matrix-v1.ts`
- `packages/packets/src/packet-envelope-v1.ts`
- `packages/policy/src/policy-decision-v1.ts`
- `packages/policy/src/approval-evidence-v1.ts`
- `packages/audit/src/audit-event-v1.ts`
- `crates/lnsat-contracts/src/lib.rs`
- `fixtures/contracts/contract-version-v1_0.tsv`
- `fixtures/contracts/compatibility-matrix-v1_0.json`
- `fixtures/contracts/error-envelope-v1_0.json`
- `fixtures/contracts/packet-envelope-v1_0.json`
- `fixtures/contracts/policy-decision-v1_0.json`
- `fixtures/contracts/approval-evidence-v1_0.json`
- `fixtures/contracts/audit-event-v1_0.json`
- `fixtures/contracts/stable-evidence-digests-v1_0.tsv`
- `packages/packets/schemas/contract-error-envelope-v1.schema.json`
- `scripts/rust-contract-conformance.mjs`

The shared version fixture contains stable, deprecated, required, malformed, and
unsupported cases. TypeScript and Rust must produce the same accepted version,
stability state, or stable error code for every row.

The error-envelope fixture freezes one failure from each stable family,
including its family result field, namespaced code, JSON Pointer path, severity,
and zero-side-effect posture. Cross-family TypeScript conformance proves the
same closed shape and rejects raw-input reflection. Rust maps all deterministic
failure variants to public-safe items and matches the six shared vectors,
including exact null result fields and empty side effects. Audit idempotency
retains its separate closed result contract instead of widening the frozen
six-family envelope.

The compatibility-matrix fixture is authoritative for all seven stable
families. It freezes exact-match negotiation, closed-shape and unknown-field
posture, exact reader/writer schema selection, deprecated `v0_1` entry/removal
rules, evidence identity, exact replay/idempotency behavior, stale-evidence
handling, and the requirement for a parallel contract plus explicit audited
migration. The matrix is evidence only and grants no migration or runtime
authority.

The packet-envelope vector fixes the v1 schema identity, exact canonical UTF-8
JSON, and SHA-256 digest. TypeScript and Rust now share twenty
positive/negative JSON parsing and closed-schema cases plus two canonical-byte
cases. Rust recursively applies UTF-16 object-key order, preserves arrays and
Unicode, rejects fractional, unsafe, and negative-zero numbers, and requires
sorted unique non-overlapping permission sets, real UTC instants, and a positive
validity window. TypeScript and Rust hashing plus independent Rust preimage
verification must match the committed digests exactly. The legacy
`version: "0.1"` packet parser stays separate and receives no implicit
conversion.

The policy-decision vector fixes the policy schema, packet hash, evaluation
instant, decision id, deny-first precedence, and zero-side-effect posture.
Thirteen shared TypeScript/Rust cases cover supported and unsupported profiles,
allowed, forbidden, unknown, absent, and approval-gated capabilities, explicit
and risk approval gates, denial precedence, malformed time, packet expiry, and
invalid packet evidence. Exact replay must produce the same decision.

The approval vector fixes one approval-required packet/policy chain, its
content-bound request id, and a distinct human identity/session decision id.
Approval hashes are deterministic evidence identities, not signatures. Exact
replay is stable; field tampering, stale evidence, self-approval, and
outcome/reason mismatches fail closed without granting execution authority. One
golden chain and fourteen positive/negative TypeScript/Rust cases require exact
request/decision semantics and stable error identities.

The audit vector fixes policy, approval-request, and approval-decision event
ids over the same verified chain. Source digests cover full source evidence;
event ids cover bounded event bodies. Exact replay is stable. A changed
observation time keeps the terminal-source idempotency key but changes the event
id, which an append store must reject as an idempotency collision. Nine shared
TypeScript/Rust cases cover all three event families, malformed or early
observation, and packet, policy, request, or decision drift.

The shared stable-evidence digest fixture freezes the exact UTF-8 preimages and
expected identities for five linked values: packet hash, policy decision id,
approval request id, approval decision id, and terminal audit event id.
TypeScript rebuilds the complete source chain and proves each committed
preimage/output pair. Rust independently hashes the same bytes and must produce
the same five outputs. Rust also rebuilds the full packet-policy-approval chain
before emitting any audit event and matches the three committed golden event
and source identities.

## Change Gate

Changing grammar, supported versions, stability, error identity, downgrade
behavior, or removal policy requires:

1. a new or superseding contract policy;
2. TypeScript and Rust implementation parity;
3. updated shared golden vectors;
4. compatibility and migration notes;
5. project status, SDK reference, changelog, and release impact updates;
6. full source gate.

This policy does not authorize package publication, release creation, provider
execution, storage mutation, deployment, or any live side effect.
