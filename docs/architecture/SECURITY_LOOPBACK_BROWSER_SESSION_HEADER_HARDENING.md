# Loopback Browser Session Header Hardening

Status: accepted remediation intent; implementation is pre-release and requires
independent review plus a separately authorized merge.

## Authority

The owner accepted this remediation intent on 2026-09-10 in the active LNSAT
release task. That acceptance authorizes bounded source, test, contract, and
documentation work and creation of a reviewable pull request. It does not
authorize merge, deployment, artifact publication, or release.

The source finding is `loopback-cookie-port-replay` from Codex Security scan
`6f4b7dea-dea7-4540-9bd3-1d7a00a7f0d6`, run against public revision
`17f27b69a2d01e55585da586a803a77b5339a160`. Browser cookies are scoped to a
host rather than a TCP port. A hostile loopback service on another port could
therefore receive the browser session cookie and replay it to an authenticated
LNSAT route.

## Required Outcome

The numeric-loopback browser transport must use two non-ambient secrets:

- `X-LNSAT-Local-Session-Token` carries the bearer;
- `X-LNSAT-Local-Session-Proof` carries an independent session proof.

Session issue and rotation return both values once in those exact response
headers. The browser keeps them only in exact-origin volatile memory and sends
both on every authenticated read or mutation. Browser TCP routes never read,
set, clear, or authenticate from cookies. Missing, malformed, duplicate, stale,
revoked, expired, or mismatched header evidence fails through the existing
generic route denial.

Raw session secrets remain absent from JSON bodies, durable evidence, logs,
errors, fixtures, and CORS exposure. Successful sign-out and password rotation
return no session-secret headers and require the client to discard both values.

## Compatibility And Boundaries

No supported artifact or stable external consumer exists. Pre-release clients
must move atomically from the cookie contract to the header-pair contract. Old
browser cookie-only requests fail closed; no compatibility alias remains.

This packet does not alter the browser header-pair contract. The separately
accepted [local authentication availability and UDS withdrawal](SECURITY_LOCAL_AUTH_AVAILABILITY_AND_UDS_WITHDRAWAL.md)
withdraws the Unix bearer transport and corrects the global login limiter before
the first supported release. This packet adds no remote listener, CORS
permission, new mutation authority, database migration, secret persistence,
deployment, or publication authority.

## Acceptance Evidence

The implementation is ready for merge review only when all of the following
hold:

1. Browser session issue and rotation emit exactly one token header and one
   proof header, emit no `Set-Cookie`, and keep both values out of the body.
2. Every authenticated browser read and mutation requires both headers and
   verifies the pair against durable session evidence.
3. Cookie-only replay fails for reads and mutations, including a request that
   carries the former CSRF header.
4. Sign-out and password rotation invalidate the session family without
   returning any session-secret headers.
5. Rust behavior, TypeScript packet contracts, JSON schemas, and current docs
   agree on the exact transport.
6. Focused and repository-wide validators pass, local scanners are triaged, and
   a fresh read-only security reviewer finds no bypass of the reported attack.
7. The Control Center issues one bounded same-origin session, keeps both secrets
   only in an opaque volatile ref, uses `credentials: omit`, sends the pair on
   every evidence read, and discards the pair on local forget, page hide,
   unmount, or HTTP 403 without placing either value in storage or rendered UI.

Rollback is the ordinary reviewed revert of this isolated source packet before
any supported release. Merge and release remain separate owner decisions.
