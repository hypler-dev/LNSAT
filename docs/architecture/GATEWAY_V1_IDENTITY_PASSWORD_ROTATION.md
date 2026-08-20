# Gateway v1 Identity Password Rotation

Status: accepted stable source contract. The implementation is pre-release and
unpublished; no supported product artifact exists.

## Contract

The authenticated self-service password-rotation surface is:

```text
PATCH /v1/identity/password
LNSAT-Contract-Version: lnsat.contracts.v1_0
Origin: http://<exact-bound-loopback>
Sec-Fetch-Site: same-origin
Content-Type: application/json
Content-Length: <exact body length>
Cookie: lnsat_session_v1=<bearer>; lnsat_csrf_v1=<csrf>
X-LNSAT-CSRF: <same csrf>

{"current_password":"<secret>","new_password":"<secret>"}
```

Its response contract is
`lnsat.gateway.identity_password_rotation.v1_0`. The route inherits the
API-wide exact-version gate after loopback peer and numeric bound-Host
validation and before authentication, limiter, secret parsing, or SQLite work.
Every routed response repeats the accepted `LNSAT-Contract-Version`.

The request is one nonempty JSON body, at most 4 KiB, closed to
`current_password` and `new_password`. Both values follow the
`lnsat.argon2id.v1` password profile: 15 through 128 Unicode scalar values, at
most 512 UTF-8 bytes, no NUL, no trimming, and no normalization. New password
must differ exactly from current password.

Transfer encoding, missing/zero/ambiguous content length, trailing bytes,
non-JSON media type, cross-site or missing Fetch Metadata, Origin drift,
missing/duplicate cookies, or missing/mismatched double-submit CSRF all fail
closed. Owner, operator, and auditor sessions may rotate only their
authenticated identity's latest credential. No request field or path value can
select another identity.

## Success

HTTP `200` returns:

- exact contract and contract-version identities;
- `ok: true`, `status: "password_rotated"`, and
  `scope: "authenticated_identity"`;
- authenticated identity reference, new credential version, server-owned
  rotation time, and newly revoked family-session count;
- fixed loopback, same-origin, CSRF-verified, no-CORS, and cleared-cookie
  posture evidence;
- `replay_semantics: "one_time_active_session_family"`;
- exact success side effects:
  - `authentication_limiter_advanced`;
  - `session_activity_evidence_may_append`;
  - `password_credential_evidence_appended`;
  - `identity_security_event_appended`;
  - `session_family_revocations_appended`;
  - `session_security_events_appended`;
  - `session_cookies_cleared`;
- `credential_state_changed: true`, `session_state_changed: true`, and
  `reauthentication_required: true`;
- `execution_authority: false` and `mutation_authority: false`.

A monotonic limiter admits at most five attempts per session and 30
authentication attempts process-wide per minute. One immediate SQLite
transaction verifies active bearer/CSRF/activity evidence, derives the target
identity from that session, reverifies the latest Argon2id credential, appends
one immutable credential generation, revokes every active session for the same
identity with reason `credential_revoke`, and appends exact identity and
session security events. Other identities and their sessions remain
untouched.

The response expires both host-only, `SameSite=Strict` session and CSRF
cookies. No replacement session is issued. Raw old/new passwords, PHC verifier,
bearer, and CSRF secrets never appear in the JSON body or public durable
evidence. Reauthentication with the new password is required after success.

## Replay and Failure

The active session family is consumed exactly once. Repeating the request with
revoked family cookies, using an expired/idle session, exhausting the limiter,
or any schema, password, CSRF, clock, evidence, or persistence failure returns
the same HTTP `403` contract:

```json
{
  "contract": "lnsat.gateway.identity_password_rotation.v1_0",
  "contract_version": "lnsat.contracts.v1_0",
  "ok": false,
  "identity_ref": null,
  "credential_version": null,
  "rotated_at": null,
  "revoked_session_count": null,
  "errors": [
    {
      "code": "gateway.identity_password_rotation.denied",
      "path": "/identity/password",
      "message": "Password rotation denied.",
      "severity": "error"
    }
  ],
  "side_effects": ["authentication_limiter_may_advance"],
  "credential_state_changed": false,
  "session_state_changed": false,
  "execution_authority": false,
  "mutation_authority": false
}
```

The possible limiter side effect is explicit because a sufficiently valid
request consumes bounded process-local limiter state before body schema,
credential, and durable-state checks finish. The response does not reveal
whether limiter state advanced. It clears no cookies and reveals no identity,
credential, session, password, expiry, CSRF, evidence, or internal failure
reason.

Every failed SQLite transition rolls back activity, credential, revocation,
identity-event, and session-event writes together. Thus
`credential_state_changed` and `session_state_changed` remain false even when
process-local limiter state advanced. Malformed pre-route HTTP framing, size,
version, route, and method failures retain their transport/version envelopes.

## Boundary

This promotion applies only to `PATCH /v1/identity/password`. Session issue,
current-session read/rotation, and family sign-out have separate stable
contracts, as do owner-only identity creation and stable owner-only
`DELETE /v1/identities/{identity_ref}` disablement with
`lnsat.gateway.identity_disablement.v1_0`. Authenticated approval-request
creation and approval-decision recording have separate stable contracts.
`mutation_authority: false` means no packet, action, adapter, provider, or
execution mutation authority; it does not deny the explicitly scoped
credential/session-state transition described above. The contract opens no
remote access, CORS, recovery activation, identity selection, service
lifecycle, package, release, or production support promise.
