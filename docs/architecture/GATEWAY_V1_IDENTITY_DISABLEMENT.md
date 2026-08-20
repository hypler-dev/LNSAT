# Gateway v1 Identity Disablement

Status: accepted stable source contract. This is a pre-release source
implementation, not a published or supported product API.

## Contract

The owner-only permanent identity-disablement surface is:

```text
DELETE /v1/identities/{identity_ref}
LNSAT-Contract-Version: lnsat.contracts.v1_0
Origin: http://<exact-bound-loopback>
Sec-Fetch-Site: same-origin
Content-Type: application/json
Content-Length: 0
Cookie: lnsat_session_v1=<bearer>; lnsat_csrf_v1=<csrf>
X-LNSAT-CSRF: <same csrf>
```

Its response contract is `lnsat.gateway.identity_disablement.v1_0`. The route
inherits the API-wide exact-version gate after loopback peer and numeric
bound-`Host` validation and before route selection, authentication,
authorization, or persisted-state work. Every routed response repeats the accepted
`LNSAT-Contract-Version`.

The request uses exact empty JSON framing, no request body fields, and one
`{identity_ref}` path parameter. Target selection comes only from that validated
route identity reference.

## Route Semantics

- scope: `active_non_owner_identity`;
- actor roles: `owner`;
- target roles: `operator`, `auditor`;
- authentication: active owner session and required double-submit CSRF;
- replay semantics: `one_time_active_target_identity`;
- target source: validated route identity reference;
- caller-supplied idempotency key: forbidden;
- failure oracle: one generic denial with `gateway.identity_disablement.denied`.

## Success

HTTP `200` returns:

- exact contract and contract-version identities;
- `ok: true`, `status: "disabled"`, and `scope: "non_owner_identity"`;
- target identity reference, `disabled_at` timestamp, and revoked session count;
- authorization evidence with `source: "local_session"`, `actor_role: "owner"`,
  `permission: "manage_identities"`, `actor_session_bound: true`, and
  `csrf_verified: true`;
- `replay_semantics: "one_time_active_target_identity"`;
- exact success side effects:
  - `session_activity_evidence_may_append`;
  - `identity_status_evidence_appended`;
  - `identity_security_event_appended`;
  - `target_session_revocations_may_append`;
  - `target_session_security_events_may_append`;
- `permanent: true`, `target_session_family_closed: true`,
  `reenable_authority: false`;
- `identity_state_changed: true`, `session_authority_state_changed: true`,
  `execution_authority: false`, and `mutation_authority: false`.

Identity disablement permanently disables one non-owner identity, appends
immutable status and security evidence, and atomically closes that target
identity's session family. Owner actor-session proof, identity lifecycle
evidence, target-session revocations, and target-session security events are
bound in the same SQLite transaction. A zero-session target returns
`revoked_session_count: 0`; the permanent family closure still applies. Success
sets no cookies and exposes no credential, bearer, CSRF, hash, display-name, or
role state. A disabled identity consumes the dummy Argon2id path on future
login attempts.

## Replay and Failure

Replaying disablement after the target leaves active state, targeting an owner,
or any in-contract route-reference, authentication, authorization, CSRF,
evidence, clock, or persistence failure returns the same HTTP `403` contract:

```json
{
  "contract": "lnsat.gateway.identity_disablement.v1_0",
  "contract_version": "lnsat.contracts.v1_0",
  "ok": false,
  "identity_ref": null,
  "disabled_at": null,
  "revoked_session_count": null,
  "errors": [
    {
      "code": "gateway.identity_disablement.denied",
      "path": "/identities/{identity_ref}",
      "message": "Identity disablement denied.",
      "severity": "error"
    }
  ],
  "side_effects": [],
  "identity_state_changed": false,
  "session_authority_state_changed": false,
  "execution_authority": false,
  "mutation_authority": false
}
```

Failure reveals only the denied result and preserves `side_effects: []`.
Failed SQLite work rolls back owner-session activity, identity status,
identity-event, target-revocation, and target-session-event writes together.
Malformed pre-route HTTP framing, size, version, route, and method failures
retain their transport/version envelopes.

## Boundary

Only active operator or auditor identities may be disabled. An owner cannot
disable self or another owner. This route is stable in this phase and does not
imply identity re-enable, owner deletion, role mutation, approval signing,
production remote access, packet/action mutation, identity recovery, service
lifecycle, package, release, or runtime authority.

`mutation_authority: false` means no packet, action, adapter, provider, or
execution mutation authority; it does not deny the explicitly scoped non-owner
identity disablement described above.
