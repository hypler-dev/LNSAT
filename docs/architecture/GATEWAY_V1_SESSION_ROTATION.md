# Gateway v1 Session Rotation

Status: accepted stable source contract. The implementation is pre-release and
unpublished; no supported product artifact exists.

## Contract

The authenticated current-session rotation surface is:

```text
PATCH /v1/session
LNSAT-Contract-Version: lnsat.contracts.v1_0
Origin: http://<exact-bound-loopback>
Sec-Fetch-Site: same-origin
Content-Type: application/json
Content-Length: 0
Cookie: lnsat_session_v1=<bearer>; lnsat_csrf_v1=<csrf>
X-LNSAT-CSRF: <same csrf>
```

Its response contract is `lnsat.gateway.session_rotation.v1_0`. The route
inherits the API-wide exact-version gate after loopback peer and numeric
bound-Host validation and before authentication or SQLite work. Every routed
response repeats the accepted `LNSAT-Contract-Version`.

The request body is exactly empty. Transfer encoding, missing or nonzero
content length, trailing bytes, non-JSON media type, cross-site or missing
Fetch Metadata, Origin drift, missing/duplicate cookies, or missing/mismatched
double-submit CSRF all fail closed. Owner, operator, and auditor sessions may
rotate only the authenticated current session. No request field or path value
can select another identity or session.

## Success

HTTP `200` returns:

- exact contract and contract-version identities;
- `ok: true`, `status: "rotated"`, and `scope: "current_session_only"`;
- exact prior-session id and public replacement-session evidence;
- fixed loopback, same-origin, CSRF-verified, no-CORS, and cookie-posture
  evidence;
- `replay_semantics: "one_time_current_session"`;
- `absolute_expiry_preserved: true`;
- exact success side effects:
  - `session_activity_evidence_may_append`;
  - `prior_session_revocation_appended`;
  - `replacement_session_evidence_appended`;
  - `session_rotation_evidence_appended`;
  - `session_security_events_appended`;
  - `session_cookies_set`;
- `session_state_changed: true`;
- `execution_authority: false` and `mutation_authority: false`.

One SQLite transaction verifies the active bearer and CSRF evidence, enforces
idle and absolute expiry, optionally appends bounded activity, issues fresh
independent bearer/CSRF hashes, revokes the prior session, and appends immutable
rotation and security-event evidence. Replacement expiry exactly equals prior
absolute expiry and must retain at least 60 seconds.

The response sets fresh host-only, `SameSite=Strict` session and CSRF cookies.
Only the bearer cookie is `HttpOnly`. Raw prior or replacement secrets never
appear in the JSON body or durable evidence.

## Replay and Failure

The prior session is consumed exactly once. Repeating the request with prior
cookies, using expired/revoked/idle evidence, or any transport, CSRF, clock,
evidence, or persistence failure returns the same HTTP `403` contract:

```json
{
  "contract": "lnsat.gateway.session_rotation.v1_0",
  "contract_version": "lnsat.contracts.v1_0",
  "ok": false,
  "prior_session_id": null,
  "session": null,
  "errors": [
    {
      "code": "gateway.session_rotation.denied",
      "path": "/session",
      "message": "Session rotation denied.",
      "severity": "error"
    }
  ],
  "side_effects": [],
  "session_state_changed": false,
  "execution_authority": false,
  "mutation_authority": false
}
```

A denial sets no cookies and reveals no identity, session, credential, expiry,
CSRF, evidence, or internal failure reason. Atomic SQLite rollback makes every
in-contract denial zero-side-effect. Malformed pre-route HTTP framing, size,
version, route, and method failures retain their transport/version envelopes.

## Boundary

This promotion applies only to `PATCH /v1/session`. Family sign-out has its own
stable contract, as do identity password rotation and owner-only identity
creation. Stable owner-only `DELETE /v1/identities/{identity_ref}` disablement
uses `lnsat.gateway.identity_disablement.v1_0`. Authenticated approval-request
creation and approval-decision recording have separate stable contracts.
`mutation_authority: false` means no packet, action, adapter, provider, or
execution mutation authority; it does not deny the explicitly scoped
authentication-state rotation described above. The contract opens no remote
access, CORS, recovery activation, service lifecycle, package, release, or
production support promise.
