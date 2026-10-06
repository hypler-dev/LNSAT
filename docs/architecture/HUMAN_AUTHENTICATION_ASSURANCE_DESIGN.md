# Human Authentication Assurance Design

Status: proposed design; owner acceptance, exact source contracts and
implementation pending. The canonical work record is
[Project Status](../PROJECT_STATUS.md#proposed-human-authentication-assurance-design).
This supports the accepted enterprise/government security direction. It selects
no identity provider, authenticator, browser origin, transport, dependency,
assurance level or deployment. It adds no route, credential, schema or authority.

## Intent and current boundary

We need to establish the human behind a consequential decision, the strength
and freshness of their authentication, and the exact decision they confirmed.
Those are separate facts. A successful login cannot approve an action, and a
valid approval cannot create execution authority.

I inspected the local password/session foundations, approval and recovery
contracts, and protocol identity adapters at public source
`a7739bfdde8d25168cde90af433966c0ef424e86`. Local Rust authentication uses
Argon2id credentials and independent random session/proof secrets. The browser
header pair protects request authentication and CSRF; it is not two human
authentication factors. Approval recording rechecks the active human session
and requires a different requester and approver identity. See
[`lnsat-auth`](../../crates/lnsat-auth/README.md),
[approval decisions](GATEWAY_V1_APPROVAL_DECISION.md) and
[authentication posture](AUTH_AND_INTEGRATION_POSTURE.md).

Existing MCP OAuth access admission uses an injected bearer verifier; workload
identity is a separate adapter boundary. Neither establishes a deployed human
OIDC login, authenticator assurance or a distinct person across linked accounts.
[Offline owner recovery](LOCAL_OWNER_RECOVERY.md) uses trusted local host
authority and revokes owner sessions. This design preserves that trust
assumption; MFA does not protect LNSAT from a malicious host owner or kernel.

## Assurance is evidence, not a label

The proposed selected enterprise/government profile requires phishing-resistant
human authentication and fresh confirmation for consequential approval and
privilege increase. Its exact applicability, time bounds and deployment control
matrix need acceptance before integration. Existing local password behavior
remains experimental source behavior and gains no stronger assurance label.

[NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b/aal/)
distinguishes authentication factors, phishing resistance, verifier requirements
and reauthentication. AAL3 requires non-exportable keys and excludes syncable
authenticators. We cannot infer an AAL from a WebAuthn success flag or an IdP's
marketing. Identity proofing, authentication and
[federation assurance](https://pages.nist.gov/800-63-4/sp800-63c/fal/)
remain separate evidence domains; no IAL, AAL, FAL or government approval is
claimed here.

## Common Gateway-owned boundary

Both candidate paths below use one private, durable assurance boundary. A
request may supply raw bounded protocol input or an evidence reference, never
an authoritative `mfa_passed`, `acr`, human-kind, hardware or presence boolean.
A production verifier must authenticate the actual protocol evidence under the
selected trust contract. Test doubles prove source behavior only.

| Binding       | Required proposed behavior                                                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human subject | Bind an installation-local human subject to exact credential or issuer/subject enrollment. Workloads, agents, adapters and client credentials cannot become human approvers.                             |
| Enrollment    | Existing owner/host proof authorizes only the exact enrollment transition. A login, email match, group claim or possession of a new key cannot enroll itself or acquire a role.                          |
| Assurance     | Record verified method, selected policy/version, trust/provider revision, credential generation, authentication time and bounded expiry. Unknown or weaker evidence denies the affected operation.       |
| Session       | Bind evidence to the exact local session family, credential generation and current identity state. Rotation, disablement, trust change and recovery invalidate affected evidence.                        |
| Challenge     | Use unpredictable, bounded, one-use server state tied to purpose, installation, session, human subject and expiry. A login challenge cannot satisfy enrollment, recovery or approval.                    |
| Confirmation  | Bind fresh proof to the full authoritative approval request or configuration change view, its version/digest, project, target, constraints, outcome and current generation/epoch.                        |
| Final use     | In the existing serialized authority transition, recheck role, distinct human, assurance, configuration, policy, stop/revocation and exact attempt before release. Assurance creates no parallel permit. |
| Persistence   | Consume a challenge and append its evidence atomically with the intended transition. Replay returns only the original bounded result or denies; it cannot authorize another change.                      |

The human must see the complete authoritative change before confirming it.
Authenticator user verification proves a ceremony, not comprehension of an
action. The server binds the ceremony challenge to that displayed change; no
claim is made that a generic authenticator independently displays or signs its
meaning. Any changed view requires a new challenge and confirmation.

For distinct-human approval, external and local accounts need an explicitly
reviewed mapping to one installation-local human subject. Aliases for the same
person cannot satisfy separation of duties. Email/display-name equality is not
identity proof, and different issuer/subject pairs are not proof of different
people. Unresolved subject linking denies the affected approval. The accepted
local identity contract is unchanged until a reviewed versioned extension exists.

## Option 1: Local WebAuthn at a controlled origin

We can keep human credential verification under the local installation and
store credential public material, leaving private authenticator keys outside
LNSAT. Enrollment and assertion verification would use the same Gateway-owned
subject, challenge and revocation boundary. This avoids an IdP dependency on
each authentication ceremony, while making the installation responsible for
authenticator enrollment, loss, trust policy and recovery.

There is a material compatibility prerequisite. WebAuthn's effective domain
must be a domain, not an IP address. Its browser API requires a secure context;
our current numeric-loopback origin is not an eligible domain origin. A new
explicit origin/RP identity and authenticated channel/browser-daemon binding
need their own accepted transport and privacy contract. We do not rename the
host, enable hostname fallback, add a proxy or open remote listening here.
[W3C WebAuthn](https://www.w3.org/TR/webauthn-3/)
defines registration and assertion verification; actual browser/OS/authenticator
compatibility must be proven for each selected row.

The exact source contract must close credential/user-handle ownership,
challenge and ceremony type, origin/RP binding, signature and allowed algorithm,
presence and required user verification, bounded parsing/extensions, backup
flags, attestation policy and counter behavior. A counter anomaly is a risk
signal, not proof of cloning; zero counters are not universal replay proof.
LNSAT still enforces its own one-use challenge. Hardware/non-exportable claims
require trusted evidence under the selected policy, not a client hint or absent
backup flag.

The ceremony adds signature verification and bounded credential/challenge state;
latency includes user interaction. Those costs are unmeasured. We must measure
verification CPU/memory, pending-challenge exhaustion and browser interoperability
before choosing limits. The attractive property is local availability after
enrollment. The difficult work is safe origin custody and lifecycle, especially
lost-authenticator recovery. Rollback cannot turn a selected strong profile
into password-only authority; it withdraws affected operations until proof is
restored. Existing denial/CSRF/session safeguards remain required.

## Option 2: Selected OIDC federation

We can delegate human authentication to an explicitly selected IdP and verify
its assertion before creating a local session binding. That fits deployments
with managed identity, phishing-resistant authentication and credential
revocation already operated outside LNSAT. It moves part of the trust and
availability boundary to the IdP; it does not move Gateway roles, policy,
distinct-human approval or action authority there.

The proposed first federated flow is authorization code with transaction-bound
state, nonce and PKCE S256, an exact redirect contract and authenticated
provider channel. No implicit flow, password grant, token passthrough or dynamic
provider discovery from request input is proposed.
[RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)
describes code-injection/PKCE protections. Network access, provider registration,
redirect handling and secrets custody remain separately reviewed and closed.

The selected verifier must check the actual ID-token signature and algorithm,
issuer, audience/authorized party, time validity, nonce and transaction binding.
An access token is not a human ID token. Exact issuer/subject identifies the
federated account; local enrollment determines its human subject and role.
`acr`, `amr` and authentication time need a reviewed issuer-specific trust and
freshness mapping; requested assurance or a signed arbitrary string is
insufficient. See
[OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation).

We must bound provider metadata/key caching, rotation, fetch destinations,
timeouts, replay state and concurrent callbacks. An outage, unknown key,
unprovable revocation freshness or missing required assurance denies the affected
session/decision; stale cache or local passwords cannot silently substitute.
The exact freshness mechanism and finite values must be selected before source
implementation. We have not chosen introspection, logout/event delivery or
offline assertion use. No assertion can outlive the shorter local session and
selected evidence window.

Federation adds external latency, failures and retained account mappings. It
can reduce local authenticator operations when an eligible IdP already exists,
but the operator must own trust updates, mapping review and privacy notices.
Measure callback/verification cost, bounded cache pressure and outage behavior;
no benchmark is claimed. Introducing federation requires a versioned source
contract and reversible enrollment migration. Withdrawal invalidates dependent
sessions/challenges; it cannot reactivate weaker or revoked credentials.

## Recommendation and enrollment/recovery

I recommend the common evidence boundary and local WebAuthn path first for the
owner-controlled package, conditional on an accepted, demonstrably safe origin
and channel contract. Selected OIDC becomes preferable when the deployment
already has an eligible managed IdP and its network/privacy/freshness obligations
are accepted. This is a recommendation, not provider selection or acceptance.
Neither option is an implementation shortcut around the unresolved prerequisites.

Enrollment must authenticate the current authority and exact subject, prove
possession/verification of the new credential, prevent cross-account replacement,
and atomically append credential/trust generation and audit evidence. Additional
credential enrollment or removal needs fresh selected assurance; an existing
low-assurance session cannot weaken an enabled profile. Initial enrollment must
reuse the accepted local bootstrap/owner proof and remain inert until the full
selected profile is proven. No temporary password-only activation is proposed.

Lost authenticators, IdP loss and owner recovery need distinct, explicit
procedures. Recovery revokes affected sessions/challenges/evidence, preserves
installation stop and consumed/unknown attempts, and leaves strong-profile
authority inert until reviewed reenrollment and complete proof. Existing
offline password recovery remains its current source contract; extending it
requires accepted versioned behavior and schema reconciliation. Recovery codes,
email resets or helpdesk assertions cannot inherit stronger assurance merely
because they restore access. We do not add a remote recovery channel.

## Privacy and acceptance proof

Keep private keys and biometric samples outside LNSAT. Never persist or export
raw bearer/ID/access tokens, authorization codes, PKCE verifiers, challenge
secrets, authenticator response blobs or unnecessary identity-provider claims.
Public evidence uses bounded references and approved summaries. Exact retention,
private diagnostic custody and export policy belong to the separate audit/privacy
contract; absence of that contract blocks affected integration. Durability needs
the minimum validated credential/trust and challenge-state data, with precise
field schemas and bounds decided in the accepted source contract.

Future acceptance must cover these cases, including a real selected positive
ceremony and complete Gateway integration, not only synthetic denials:

- wrong origin/RP/issuer/audience/key/algorithm, invalid signature, missing user
  verification/assurance, wrong subject or workload-to-human substitution;
- challenge/nonce/state/code replay, callback mix-up, purpose/view/session drift,
  expiry, clock failure, concurrent consumption and bounded input exhaustion;
- aliases of one person requesting and approving, forged linking, email/group
  auto-enrollment and privilege changes without fresh exact confirmation;
- credential/IdP/trust revocation racing decision/release, session rotation,
  outage/cache expiry, crash/rollback and recovery without restored authority;
- no weaker fallback, no audit-unavailable release, no replayed attempt,
  preserved unknown outcome and secret/PII canaries across responses/export;
- actual selected authenticator, origin/channel, verifier crypto and enrollment/
  recovery proof. Source fixtures alone prove none of those deployment facts.

## Delivery gates

Before implementation, accept this design and select the exact authenticator
or IdP, subject/linking/enrollment policy, transport/origin, crypto boundary,
protocol/library versions, public compatibility changes, schema/migration,
finite input/time/cache/concurrency limits, revocation semantics and privacy
fields. Review precise source contracts and their positive/negative test plan.
Then implement bounded real verification and serialized integration. Capture
actual selected-target/provider evidence only under separate authorization;
actual artifact identities follow reviewed source and authorized capture.

The [strict crypto proposal](STRICT_CRYPTO_ADMISSION_DESIGN.md), HCFG-6
source-order amendment, headless control and complete Phase 11 runtime remain
separate gates. This document opens no Stage-A/native/store implementation,
candidate SQL, Docker, host mutation, provider/key call, candidate artifact,
merge, signing, release, deployment or production. Full V1 remains incomplete.
