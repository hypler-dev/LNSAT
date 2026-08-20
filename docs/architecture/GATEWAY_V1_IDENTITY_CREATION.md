# Gateway v1 Identity Creation

Status: accepted stable source contract. The implementation is pre-release and
unpublished; no supported product artifact exists.

## Contract

The owner-only identity-provisioning surface is:

```text
POST /v1/identities
LNSAT-Contract-Version: lnsat.contracts.v1_0
Origin: http://<exact-bound-loopback>
Sec-Fetch-Site: same-origin
Content-Type: application/json
Content-Length: <exact body length>
Cookie: lnsat_session_v1=<bearer>; lnsat_csrf_v1=<csrf>
X-LNSAT-CSRF: <same csrf>

{
  "identity_ref": "identity:human:<opaque>",
  "display_name": "<bounded local name>",
  "role": "operator|auditor",
  "password": "<secret>"
}
```

Its response contract is `lnsat.gateway.identity_creation.v1_0`. The route
inherits the API-wide exact-version gate after loopback peer and numeric
bound-Host validation and before authentication, limiter, secret parsing, or
SQLite work. Every routed response repeats the accepted
`LNSAT-Contract-Version`.

This stable response replaces experimental
`lnsat.gateway.local_identity_creation.v1_0`. Its fields are intentionally not
shape-compatible. Pre-release source consumers must migrate atomically; no
alias or implicit downgrade remains.

The request is one nonempty JSON body, at most 4 KiB, closed to
`identity_ref`, `display_name`, `role`, and `password`. Identity references use
the bounded stable reference grammar and must begin `identity:human:`.
Display names contain 1 through 128 Unicode scalar values, at most 512 UTF-8
bytes, no leading/trailing whitespace, and no control characters. Only
`operator` and `auditor` may be created. Passwords follow
`lnsat.argon2id.v1`: 15 through 128 Unicode scalar values, at most 512 UTF-8
bytes, and no NUL.

Transfer encoding, missing/zero/ambiguous content length, trailing bytes,
non-JSON media type, cross-site or missing Fetch Metadata, Origin drift,
missing/duplicate cookies, or missing/mismatched double-submit CSRF fail
closed. Only an active local owner session with `manage_identities` permission
may create an identity. Operator and auditor sessions receive the same denial
as invalid input or unknown identity state.

## Success

HTTP `201` returns:

- exact contract and contract-version identities;
- `ok: true`, `status: "created"`, and
  `scope: "new_non_owner_identity"`;
- secret-free active identity evidence and initial credential profile,
  version, and server-owned creation time;
- local-session, owner-role, `manage_identities`, actor-session-binding, and
  CSRF authorization evidence;
- `replay_semantics: "create_once_identity_ref"`;
- exact success side effects:
  - `authentication_limiter_advanced`;
  - `session_activity_evidence_may_append`;
  - `identity_evidence_appended`;
  - `password_credential_evidence_appended`;
  - `identity_security_event_appended`;
- `identity_state_changed: true`, `credential_state_changed: true`, and
  `session_authority_state_changed: false`; bounded activity evidence may append
  without changing bearer, expiry, revocation, role, or authority;
- `execution_authority: false` and `mutation_authority: false`.

A monotonic limiter admits at most five attempts per session and 30
authentication attempts process-wide per minute. One immediate SQLite
transaction verifies active bearer/CSRF/activity evidence and owner role,
appends one immutable non-owner identity, its initial Argon2id credential, and
one `identity_created` security event. That event binds the exact owner actor
session, credential source digest, and server-owned time.

Raw password, PHC verifier, bearer, and CSRF secrets never appear in the JSON
body or public durable evidence. Success sets no cookies and does not change
the owner session family.

## Replay and Failure

The immutable `identity_ref` is create-once scope. Caller-supplied idempotency
keys are forbidden. Repeating a request, reusing an existing reference, using
an expired/idle session, exhausting the limiter, or any role, schema, password,
CSRF, clock, evidence, or persistence failure returns the same HTTP `403`
contract:

```json
{
  "contract": "lnsat.gateway.identity_creation.v1_0",
  "contract_version": "lnsat.contracts.v1_0",
  "ok": false,
  "identity": null,
  "credential": null,
  "errors": [
    {
      "code": "gateway.identity_creation.denied",
      "path": "/identities",
      "message": "Identity creation denied.",
      "severity": "error"
    }
  ],
  "side_effects": ["authentication_limiter_may_advance"],
  "identity_state_changed": false,
  "credential_state_changed": false,
  "session_authority_state_changed": false,
  "execution_authority": false,
  "mutation_authority": false
}
```

Possible limiter advancement is explicit because a sufficiently valid request
consumes bounded process-local limiter state before body schema, role, and
durable-state checks finish. The response does not reveal whether limiter
state advanced, whether an identity exists, or why authorization failed.

Every failed SQLite transition rolls back activity, identity, credential, and
identity-event writes together. Malformed pre-route HTTP framing, size,
version, route, and method failures retain their transport/version envelopes.

## Boundary

This promotion applies only to `POST /v1/identities`. Stable owner-only
disablement is now `DELETE /v1/identities/{identity_ref}` with
`lnsat.gateway.identity_disablement.v1_0`. Authenticated approval-request
creation and approval-decision recording have separate stable contracts.
`mutation_authority: false` means no packet, action, adapter, provider, or
execution mutation authority; it does not deny the explicitly scoped local
identity/credential transition described above. The contract opens no owner
creation, identity re-enable, remote access, CORS, recovery activation, service
lifecycle, package, release, or production support promise.
