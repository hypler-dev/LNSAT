# Gateway v1 Identity-Event Read

Status: accepted stable source contract. This is a pre-release source
implementation, not a published or supported product API.

## Contract

The authenticated identity-event evidence surface is:

```text
GET|HEAD /v1/identities/{identity_ref}/events
LNSAT-Contract-Version: lnsat.contracts.v1_0
```

Its response contract is `lnsat.gateway.identity_event_read.v1_0`. The route
inherits the API-wide gate after operating-system loopback peer and exact
numeric bound-`Host` validation, then exact version negotiation, then route and
method selection, and only then authentication, authorization, and SQLite
evidence validation. Every routed response repeats the accepted
`LNSAT-Contract-Version`.

The caller must present an active same-origin local browser session. Owner,
operator, and auditor roles retain the fixed `ReadEvidence` permission. This
promotion does not add self-only, owner-only, or cross-role restrictions. The
target identity comes only from the exact validated path.

## Request and Route Rules

- only `GET` and `HEAD` are accepted;
- query strings and request bodies are forbidden;
- the route contains one literal `identity:human:*` reference followed by the
  exact `/events` suffix;
- empty or malformed references, nested or duplicate separators, extra path
  segments, percent encoding, fragments, and ambiguous route shapes fail
  closed;
- caller idempotency keys are forbidden and have no meaning for this read;
- `OPTIONS` and every mutation method are denied without CORS permission;
- bearer authentication remains host-only cookie input and is never reflected.

## Success

HTTP `200` returns:

- exact contract and contract-version identities;
- `ok: true`, `status: "evidence_read"`, and `scope: "target_identity"`;
- the validated target `identity_ref`;
- closed identity-event objects in ascending `event_sequence` order;
- `event_order: "event_sequence_ascending"`;
- `side_effects: ["session_activity_evidence_may_append"]`;
- false identity-state, session-authority-state, execution-authority, and
  mutation-authority flags.

Each event contains only existing validated `LocalIdentityEventV1` evidence:

- `event_id`, `identity_ref`, `event_sequence`, and the closed event kind;
- nullable `actor_session_id` and `credential_version` using existing store
  semantics;
- `source_evidence_digest`, `occurred_at`, and `event_evidence_digest`.

Owner bootstrap and offline owner recovery retain their valid actorless
semantics. No actor is invented. Other event kinds retain their exact
actor-session binding. The response contains no display name, password, PHC
verifier, bearer token, CSRF value, private material, raw hostile input, or
unvalidated store row.

`HEAD` performs the same authentication, permission, target, and evidence
checks as `GET`. It returns identical status and representation headers,
including `Content-Length`, with zero response-body bytes.

## Generic Denial

Missing, malformed, unauthorized, unknown, tampered, or unreadable target
evidence returns the same HTTP `403` contract:

```json
{
  "contract": "lnsat.gateway.identity_event_read.v1_0",
  "contract_version": "lnsat.contracts.v1_0",
  "ok": false,
  "identity_ref": null,
  "events": null,
  "errors": [
    {
      "code": "gateway.identity_event_read.denied",
      "path": "/identities/{identity_ref}/events",
      "message": "Identity event read denied.",
      "severity": "error"
    }
  ],
  "side_effects": ["session_activity_evidence_may_append"],
  "identity_state_changed": false,
  "session_authority_state_changed": false,
  "execution_authority": false,
  "mutation_authority": false
}
```

The constant possible activity side effect is honest and oracle-neutral:
successful authentication may append one bounded observation before later
target validation fails. It never implies that authentication succeeded or an
identity exists. Raw target input and internal failure reason are absent.
Malformed pre-route framing and version failures retain their transport or
version envelopes.

## Boundary

This packet opens only `GET|HEAD /v1/identities/{identity_ref}/events`. The
separate session-event route has its own stable contract and does not widen
identity-event scope. This route performs no identity, credential, session-authority,
packet/action, approval, signing, nonce, consumption, execution, adapter,
provider, recovery, deployment, or publication mutation.
