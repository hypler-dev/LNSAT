# Gateway v1 Session-Family Sign-Out

Status: accepted stable source contract. The implementation is pre-release and
unpublished; no supported product artifact exists.

## Contract

The authenticated same-identity family sign-out surface is:

```text
DELETE /v1/session
LNSAT-Contract-Version: lnsat.contracts.v1_0
Origin: http://<exact-bound-loopback>
Sec-Fetch-Site: same-origin
Content-Type: application/json
Content-Length: 0
X-LNSAT-Local-Session-Token: <bearer>
X-LNSAT-Local-Session-Proof: <independent proof>
```

Its response contract is
`lnsat.gateway.session_family_sign_out.v1_0`. The route inherits the API-wide
exact-version gate after loopback peer and numeric bound-Host validation and
before authentication or SQLite work. Every routed response repeats the
accepted `LNSAT-Contract-Version`.

The request body is exactly empty. Transfer encoding, missing or nonzero
content length, trailing bytes, non-JSON media type, cross-site or missing
Fetch Metadata, Origin drift, missing/duplicate session-secret headers, or
missing/invalid independent session proof all fail closed. Owner, operator, and
auditor sessions may revoke only the authenticated identity's session family.
No request field or path value can select another identity or session.

## Success

HTTP `200` returns:

- exact contract and contract-version identities;
- `ok: true`, `status: "signed_out"`, and
  `scope: "identity_session_family"`;
- authenticated identity reference, durable family-session count, newly
  revoked count, and server-owned revocation time;
- fixed loopback, same-origin, CSRF-verified, no-CORS, and discard-required session-header posture evidence;
- `replay_semantics: "one_time_active_session_family"`;
- exact success side effects:
  - `session_activity_evidence_may_append`;
  - `session_family_revocations_appended`;
  - `session_security_events_appended`;
  - `session_secret_headers_invalidated`;
- `session_state_changed: true` and `reauthentication_required: true`;
- `execution_authority: false` and `mutation_authority: false`.

One immediate SQLite transaction verifies active bearer and CSRF evidence,
enforces idle and absolute expiry, optionally appends bounded activity, revokes
every active session for that exact identity, and appends immutable security
events. Other identities and their sessions remain untouched. At least one
active family session must be newly revoked or transaction rolls back.

The response returns no session-secret headers. The browser must discard both
volatile values. Raw bearer or proof secrets never appear in the JSON body or
durable evidence. Reauthentication is required after success.

## Replay and Failure

Active session family is consumed exactly once. Repeating a request with any
revoked family token/proof pair, using expired/idle evidence, or any transport,
clock, evidence, or persistence failure returns same HTTP `403` contract:

```json
{
  "contract": "lnsat.gateway.session_family_sign_out.v1_0",
  "contract_version": "lnsat.contracts.v1_0",
  "ok": false,
  "identity_ref": null,
  "family_session_count": null,
  "newly_revoked_session_count": null,
  "revoked_at": null,
  "errors": [
    {
      "code": "gateway.session_family_sign_out.denied",
      "path": "/session",
      "message": "Session family sign-out denied.",
      "severity": "error"
    }
  ],
  "side_effects": [],
  "session_state_changed": false,
  "execution_authority": false,
  "mutation_authority": false
}
```

Denial returns no session-secret headers and reveals no identity, family size, session,
credential, expiry, CSRF, evidence, or internal failure reason. Atomic SQLite
rollback makes every in-contract denial zero-side-effect. Malformed pre-route
HTTP framing, size, version, route, and method failures retain their
transport/version envelopes.

## Boundary

This promotion applies only to `DELETE /v1/session`. Session issue,
current-session read, and current-session rotation have separate stable
contracts, as do identity password rotation and owner-only identity creation.
Stable owner-only `DELETE /v1/identities/{identity_ref}` disablement uses
`lnsat.gateway.identity_disablement.v1_0`. Authenticated approval-request
creation and approval-decision recording have separate stable contracts.
`mutation_authority: false` means no packet, action, adapter, provider, or
execution mutation authority; it does not deny explicitly scoped
authentication-state revocation described above. Contract opens no remote
access, CORS, recovery activation, service lifecycle,
package, release, or production support promise.
