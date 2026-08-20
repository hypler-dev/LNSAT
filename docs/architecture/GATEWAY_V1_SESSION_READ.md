# Gateway v1 Session Read

Status: accepted stable source contract. The implementation is pre-release and
unpublished; no supported product artifact exists.

## Contract

The authenticated current-session read surface is:

```text
GET|HEAD /v1/session
LNSAT-Contract-Version: lnsat.contracts.v1_0
```

Its response contract is `lnsat.gateway.session_read.v1_0`. The route inherits
the API-wide exact-version gate after loopback peer and numeric bound-Host
validation and before authentication or SQLite access. Every routed response
repeats the accepted `LNSAT-Contract-Version`.

The caller must present an active host-only local session cookie from a
same-origin browser context. Read-only requests do not require an anti-CSRF
header. Owner, operator, and auditor sessions may read only their own current
public session evidence. No route parameter or request field can select another
identity or session.

## Success

HTTP `200` returns:

- exact contract and contract-version identities;
- `ok: true` and `status: "authenticated"`;
- public session id, identity reference, role, issue time, and expiry;
- fixed loopback, same-origin, and no-CORS transport evidence;
- `side_effects: ["session_activity_evidence_may_append"]`;
- `mutation_authority: false`.

Authorization verifies durable session, revocation, absolute-expiry, idle, and
activity evidence. A successful read may append one bounded session-activity
observation under the existing 60-second touch policy. This authentication
security-state write is explicit; it grants no packet, action, adapter, or
execution mutation authority.

`HEAD` performs the same authentication and activity handling as `GET`, returns
the same representation length, and sends no body.

## Failure

Cross-site context, missing or invalid authentication, revoked, expired, idle,
or otherwise unusable sessions all return the same HTTP `403` contract:

```json
{
  "contract": "lnsat.gateway.session_read.v1_0",
  "contract_version": "lnsat.contracts.v1_0",
  "ok": false,
  "session": null,
  "errors": [
    {
      "code": "gateway.session_read.denied",
      "path": "/session",
      "message": "Session read denied.",
      "severity": "error"
    }
  ],
  "side_effects": [],
  "mutation_authority": false
}
```

The failure is one public-safe oracle. It never reflects cookies, anti-CSRF
values, rejected input, identity existence, session state, or internal reason.
A denied `HEAD` is bodyless with the same representation length as the denial
body.

## Boundary

This promotion applies only to `GET|HEAD /v1/session`. Session issue,
current-session rotation, family sign-out, and identity password rotation have
separate stable contracts. This contract opens no remote access, CORS, session
selection, identity mutation, packet/action writer, approval signature,
execution authorization, adapter dispatch, recovery activation, or release
support promise.
