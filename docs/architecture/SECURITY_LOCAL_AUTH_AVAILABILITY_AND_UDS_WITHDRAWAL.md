# Local Authentication Availability And UDS Withdrawal

Status: accepted for source remediation on 2026-09-10. Merge, runtime use,
candidate build, publication, and release remain separately gated.

## Authority

The canonical work record is the validated 2026-09-10 repository security scan.
The owner authorized continued remediation of its remaining release blockers.
This packet closes only the same-UID control-socket substitution finding and the
global login-limiter lockout finding. The loopback browser header-pair repair is
owned by its preceding review packet and remains unchanged here.

## Required Outcome

1. No supported `lnsatctl` path sends a reusable session bearer to a Unix peer
   whose identity is proved only by pathname metadata and effective UID.
2. Configuring the withdrawn authenticated Unix control socket fails before a
   listener is bound. Health and status clients fail before reading protected
   stdin, connecting, or writing request bytes.
3. Unauthenticated, malformed, or unverifiable session traffic cannot consume
   the limiter budget used by authenticated identities or sessions.
4. Attacker-selected unknown identity references cannot exhaust the budget
   reserved for active local identities. Missing and invalid identities retain
   the same public response, bounded input, and password-verification profile.
5. Exact known-identity and authenticated-session limits remain bounded and use
   monotonic process time. Existing sessions, browser header-pair transport,
   execution capabilities, storage schema, and audit evidence stay unchanged.

## Compatibility Decision

Authenticated health and status over the Unix control socket are withdrawn for
the first supported release. Existing CLI options and library entry points may
remain parse-compatible only if they return one stable withdrawn error before
secret input or transport work. Product manifests, fixtures, help, completions,
manual text, architecture docs, and status records must state the withdrawal.

A future Unix transport requires a separately accepted mutual-authentication
design. Peer UID, socket inode, PID files, or same-UID readable identity files do
not authenticate the live daemon instance.

## Non-Goals

- No database migration or persisted daemon key.
- No bearer or browser proof on the withdrawn Unix transport.
- No Docker access, production repository action, deployment, package, tag,
  signing, publication, or supported-release claim.
- No change to browser exact-origin session header semantics.

## Acceptance Evidence

- A stable same-UID replacement listener receives no connection or bearer bytes
  from health or status commands.
- A configured control socket is rejected before bind.
- A flood of syntactically valid forged token/proof requests cannot block a
  valid owner login or a valid authenticated mutation.
- Unknown identity churn cannot consume the active-identity budget; known and
  unknown attempts still return the same public denial on failure.
- Focused CLI, daemon, product-surface, and Phase 10 checks pass, followed by
  `npm run check`, `npm run public:check`, scanner checks, and fresh independent
  security review.

## Rollback

Revert this packet as one unit. Do not partially restore Unix bearer transport.
Any replacement must first provide accepted, tested live-daemon authentication.
