# Gateway v1 Session-Event Read

Status: accepted stable source contract. This is a pre-release source
implementation, not a published or supported product API.

## Contract

The authenticated session-event evidence surface is:

```text
GET|HEAD /v1/sessions/{session_id}/events
LNSAT-Contract-Version: lnsat.contracts.v1_0
```

Its response contract is `lnsat.gateway.session_event_read.v1_0`. The route
inherits the API-wide gate after operating-system loopback peer and exact
numeric bound-`Host` validation, then exact version negotiation, then route and
method selection, and only then authentication, authorization, and SQLite
evidence validation. Every routed response repeats the accepted
`LNSAT-Contract-Version`.

The caller must present an active same-origin local browser session. Owner,
operator, and auditor roles retain the fixed `ReadEvidence` permission. This
promotion adds no self-only or owner-only restriction. The target session
comes only from the exact validated path.

## Request and Route Rules

- only `GET` and `HEAD` are accepted;
- query strings and request bodies are forbidden;
- `{session_id}` is exactly `ses_` plus 32 lowercase hexadecimal characters;
- empty, unknown, uppercase, short, nested, duplicate, percent-encoded,
  fragmented, or otherwise ambiguous route shapes fail closed;
- caller idempotency keys are forbidden and have no meaning for this read;
- `OPTIONS` and every mutation method are denied without CORS permission;
- bearer authentication remains host-only cookie input and is never reflected.

Fragments are rejected by strict HTTP origin-form parsing before route or
version handling. Other in-contract malformed target shapes use the stable
session-event denial.

## Success

HTTP `200` returns:

- exact contract and contract-version identities;
- `ok: true`, `status: "evidence_read"`, and `scope: "target_session"`;
- the validated target `session_id`;
- closed session-event objects in ascending `event_sequence` order;
- `event_order: "event_sequence_ascending"`;
- `side_effects: ["session_activity_evidence_may_append"]`;
- false identity-state, session-authority-state, packet-state, action-state,
  signing, nonce, consumption, execution, and mutation authority flags.

Each event contains only existing validated `LocalSessionEventV1` evidence:

- `event_id`, `session_id`, `event_sequence`, and exact `issued`, `revoked`, or
  `rotated` kind;
- nullable `actor_session_id`, `related_session_id`, and `revocation_reason`;
- `source_evidence_digest`, `occurred_at`, and `event_evidence_digest`.

Existing store semantics remain exact: issue events have no actor, related
session, or revocation reason; non-recovery revocation events bind an actor and
reason but no related session; rotation events bind actor and replacement
session with no revocation reason. Recovery-only actorless revocation remains
valid only under the existing offline owner-recovery contract. No actor is
invented.

The response contains no identity display name, password, PHC verifier, bearer
token, CSRF value, private material, raw hostile input, or unvalidated store
row.

`HEAD` performs the same authentication, permission, target, and evidence
checks as `GET`. It returns identical status and representation headers,
including `Content-Length`, with zero response-body bytes.

## Generic Denial

Missing authentication or unknown, malformed, unauthorized, tampered, or
unreadable target evidence returns the same HTTP `403` contract:

```json
{
  "contract": "lnsat.gateway.session_event_read.v1_0",
  "contract_version": "lnsat.contracts.v1_0",
  "ok": false,
  "session_id": null,
  "events": null,
  "errors": [
    {
      "code": "gateway.session_event_read.denied",
      "path": "/sessions/{session_id}/events",
      "message": "Session event read denied.",
      "severity": "error"
    }
  ],
  "side_effects": ["session_activity_evidence_may_append"],
  "identity_state_changed": false,
  "session_authority_state_changed": false,
  "packet_state_changed": false,
  "action_state_changed": false,
  "signing_authority": false,
  "nonce_authority": false,
  "consumption_authority": false,
  "execution_authority": false,
  "mutation_authority": false
}
```

The constant possible activity side effect is honest and oracle-neutral:
successful authentication may append one bounded observation before later
target validation fails. It never implies authentication success or session
existence. Raw target input and internal failure reason are absent. Malformed
pre-route framing and version failures retain their transport or version
envelopes.

## Boundary

This packet opens only `GET|HEAD /v1/sessions/{session_id}/events`. The
current-session-only `/v1/session` contract remains distinct. This route
performs no identity, credential, session-authority, packet/action, approval,
signing, nonce, consumption, execution, adapter, provider, recovery,
deployment, or publication mutation.
