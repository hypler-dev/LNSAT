# Gateway v1 Session Issue

Status: accepted stable source contract. The implementation is pre-release and
unpublished; no supported product artifact exists.

## Contract

The local password-authenticated session surface is:

```text
POST /v1/session
LNSAT-Contract-Version: lnsat.contracts.v1_0
X-LNSAT-Session-Intent: lnsat.session.issue.v1
Origin: http://<exact-bound-loopback>
Sec-Fetch-Site: same-origin
Content-Type: application/json
```

Its response contract is `lnsat.gateway.session_issue.v1_0`. The route inherits
the API-wide exact-version gate after loopback peer and numeric bound-Host
validation and before credential, rate-limit, or SQLite work. Every routed
response repeats the accepted `LNSAT-Contract-Version`.

The exact closed request is:

```json
{
  "identity_ref": "identity:human:<local-subject>",
  "password": "<15-128 Unicode scalar values>",
  "lifetime_seconds": 300
}
```

Lifetime is an integer from 60 through 3,600 seconds. The body is capped at
4 KiB. Identity uses the stable opaque-reference grammar, exact
`identity:human:` prefix, nonempty remainder bounded to 240 characters, and 256
UTF-16 code units overall. `password` is transient secret input: it must not be
logged, persisted, reflected, included in evidence, or returned. A
caller-supplied idempotency key is forbidden.

The exact Origin, same-origin Fetch Metadata, JSON media type, and non-simple
intent header protect the pre-session request from login CSRF without
pretending that an anti-CSRF session secret already exists. `OPTIONS` remains
denied and no CORS permission is emitted.

## Success

HTTP `201` returns:

- exact contract and contract-version identities;
- `ok: true` and `status: "authenticated"`;
- public session id, identity reference, role, issue time, and expiry;
- fixed loopback, same-origin, no-CORS, and cookie-posture evidence;
- `replay_semantics: "fresh_session_per_success"`;
- exact success side effects:
  - `authentication_limiter_advanced`;
  - `session_evidence_appended`;
  - `session_security_event_appended`;
  - `session_cookies_set`;
- `session_state_changed: true`;
- `execution_authority: false` and `mutation_authority: false`.

The response sets a host-only, `HttpOnly`, `SameSite=Strict` bearer cookie and
an independent host-only, `SameSite=Strict` anti-CSRF cookie. The loopback HTTP
source contract does not claim a `Secure` cookie. Raw cookie values never
appear in the JSON body or durable evidence.

Session issue is intentionally non-idempotent. Repeating an accepted request
creates a fresh independent session and consumes another bounded
authentication attempt. The route does not accept or infer a replay key.

## Failure

Invalid transport, schema, identity, status, password, lifetime, rate limit,
clock, evidence, or persistence all return the same HTTP `403` contract:

```json
{
  "contract": "lnsat.gateway.session_issue.v1_0",
  "contract_version": "lnsat.contracts.v1_0",
  "ok": false,
  "session": null,
  "errors": [
    {
      "code": "gateway.session_issue.denied",
      "path": "/session",
      "message": "Session issue denied.",
      "severity": "error"
    }
  ],
  "side_effects": ["authentication_limiter_may_advance"],
  "session_state_changed": false,
  "execution_authority": false,
  "mutation_authority": false
}
```

The possible limiter side effect is explicit because sufficiently valid
attempts consume bounded process-local rate-limit state before credential
verification. A denial sets no cookies and creates no usable authenticated
state. Its public body does not reveal whether the limiter advanced.

Pre-route HTTP framing, size, version, route, and method failures retain their
own stable transport/version envelopes; they do not falsely claim session-issue
contract processing.

## Boundary

This promotion applies only to `POST /v1/session`. Current-session rotation and
family sign-out plus identity password rotation have separate stable contracts.
This contract opens no remote access, CORS, identity provisioning,
packet/action writer, approval signature, execution authorization, adapter
dispatch, recovery activation, or release support promise.
