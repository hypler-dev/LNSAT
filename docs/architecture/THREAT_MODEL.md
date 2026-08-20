# Threat Model

- Status: accepted v1 security plan plus expanded-product threat requirements
- Scope: local/self-hosted single-node authority lifecycle, distribution, and
  future managed-content/extension boundaries
- Current implementation: contract foundations, source-local Phase 5
  identity/session/approval authentication and offline owner recovery, plus
  experimental protocol/recovery/trust interfaces; execution authority remains
  closed

## Security Objective

LNSAT must prove that one authenticated, policy-valid request became one
properly approved authorization, one exact execution, and one bound receipt.
Unknown, stale, replayed, widened, substituted, or unauthenticated evidence
fails closed.

Gateway is the security boundary. Transports, agent SDKs, policy adapters,
attesters, installers, and execution adapters are untrusted inputs.

## Trust Assumptions

Initial local v1 trusts owner control of host, local LNSAT daemon, OS
administration, and local storage/session protection. It does not claim
protection from compromised kernel/root/firmware/hypervisor, malicious host
owner, or host-owner denial of service. Local-session approval evidence is
locally verifiable, not independently portable or nonrepudiable under host
compromise. LNSAT still protects product authority from untrusted requests,
browser input, agents, transport clients, imported policy results, adapter
responses, attestations, signer responses, and release artifacts.

Private signing keys are always outside LNSAT. User-controlled signer broker is
separate from Gateway core. Public-key and signed-evidence work is optional for
local v1 and cannot weaken local session, authorization, consumption, adapter,
receipt, or audit controls.

## Threats and Required Controls

Threats reachable through selected local-v1 authority, OS CLI, or claimed
distribution profile are release blockers. Optional signed-evidence,
attestation, enterprise, and unselected distribution threats become blockers
only when those profiles are claimed. Managed-content, gatekeeper-model,
module, and entitlement threats
become blockers for any later product that enables those surfaces; their
presence here does not add downstream runtime to v1.

| Threat                                   | Required controls                                                                                                                                          | Required negative evidence                                                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Approval bypass                          | Gateway-only mutation path; deny-by-default state machine; approval-required policy cannot issue execution directly                                        | Direct adapter/API/MCP/CLI invocation denied                                                                                  |
| Unauthenticated approval                 | Authenticated, revocable local session and durable human approver evidence; requester/approver separation; external signature only when policy requires it | Anonymous, expired, revoked, workload, self-approval, and proof-mode downgrade denied                                         |
| Replay                                   | Nonce, expiry, idempotency, revocation, one-time authorization consumption, durable replay record                                                          | Reused approval, authorization, receipt, or nonce denied                                                                      |
| Confused deputy                          | Exact requester, project, environment, resource, target, adapter, capability, and audience binding                                                         | Cross-project, cross-adapter, or widened-scope reuse denied                                                                   |
| Approval-signature forgery/confusion     | Literal Ed25519 profile, exact domain-separated canonical preimage, strict point/scalar and encoding checks                                                | Alternate algorithm/profile/prehash, malformed signature, small-order point, or mobile-profile substitution denied            |
| Approval-signing key substitution        | Signed key lineage/version/material ref, immutable SPKI, one active signer, monotonic status, fail-closed freshness                                        | Unknown, stale, future, retired-for-signing, downgraded, revoked, or replaced key denied                                      |
| Blind signer oracle or false human claim | Canonical request only; isolated broker; independent rendering/user presence or explicit automation policy; private keys never enter core                  | Arbitrary bytes, hidden action, provider credential leak, metadata-only trust, and KMS service signature labeled human denied |
| Approval-chain substitution              | Full packet-policy-request-decision rederivation and exact canonical equality; no parallel unbound scope fields                                            | Packet, policy, request, decision, identity/session, project, resource, capability, source, or constraint drift denied        |
| Prompt injection                         | Agent content remains untrusted data; closed action schemas; allowlisted capabilities; no instruction text becomes authority                               | Embedded approval/provider/shell instructions cannot change action                                                            |
| Instruction/profile/skill substitution   | Content-addressed immutable objects; signed/attested origin; exact dependency and effective-bundle binding; policy-controlled assignment                   | Altered, unsigned, wrong-origin, wrong-scope, or unassigned content denied                                                    |
| Overlay downgrade                        | Deterministic inheritance; universal prohibitions cannot be removed by provider/model/task overlay; resolution trace and compatibility checks              | Constraint removal, stale overlay, incompatible model, or hidden override denied                                              |
| Shared-library poisoning                 | Trust levels, quarantine, dependency/cycle validation, malware/secret/license checks, immutable lock manifest, rollback and revocation                     | Poisoned dependency, mutable tag, cycle, origin forgery, or revoked digest denied                                             |
| Context misclassification                | Explicit work-context object; deterministic scope signals first; classifier identity/confidence; operator correction and cross-project policy              | Low-confidence grouping, cross-project move, tenant leakage, or conflicting scope denied/escalated                            |
| Gatekeeper-model false allow             | Model output treated as untrusted fact; deterministic capability/role ceilings; deny/escalate fallback; versioned evaluation and drift controls            | Model-only approval, capability widening, low-confidence allow, drift, or unavailable-model bypass denied                     |
| Identity delegation                      | Explicit delegation chain, audience, scope, expiry, depth, and revocation; no implicit identity inheritance                                                | Missing, widened, cyclic, stale, or wrong-audience delegation denied                                                          |
| CSRF                                     | Host-only `SameSite=Strict` sessions, session-bound anti-CSRF token, strict Origin/Host checks, mutation content type, no state change by GET              | Missing/mismatched token or hostile origin denied                                                                             |
| Login CSRF/session fixation              | Non-simple custom intent header, exact Origin/Host/Fetch Metadata, no CORS preflight, fresh random session after password proof                            | Cross-site, missing-intent, stale-cookie reuse, and credential-oracle paths denied                                            |
| Owner recovery bypass                    | Offline host authority, exact database/owner confirmation, daemon-held exclusive lease, append-only credential, full session revocation                    | Live-daemon, wrong-database, wrong-owner, password-reuse, symlink, and partial-write attempts denied                          |
| Execution substitution                   | Canonical digests bind action, target, executable, artifact, config, constraints, adapter, and receipt                                                     | Any requested/approved/executed digest mismatch denied                                                                        |
| Adapter compromise                       | Least privilege; sandbox; one authorization per action; bounded output; receipt verification; emergency disable and rollback                               | Extra action, target, network, filesystem, or credential access denied/rejected                                               |
| Module/extension compromise              | Out-of-process or sandbox isolation; signed manifest; declared capability/data/egress/resource bounds; no core DB or signing access; quarantine            | Native injection, undeclared capability, ambient credential, authority minting, or audit suppression denied                   |
| Entitlement/authority confusion          | Feature entitlement evaluated separately from Gateway action policy; entitlement cannot mint roles, approvals, or authorization                            | Paid tier, license token, marketplace install, or support state cannot bypass policy                                          |
| CLI or local IPC abuse                   | Authenticated client, owner-controlled socket/loopback binding, peer/path checks, no ambient sudo, no secret args/env, stable closed schemas               | Socket spoofing, wrong user, path substitution, shell-history secret, ambiguous target, or direct-adapter bypass denied       |
| Stale hardware facts                     | Post-local-v1 unless claimed; signed attester identity, nonce, measurement, target, issue/expiry, freshness policy, revocation                             | Stale, replayed, unsigned, downgraded, mismatched, or unimplemented attestation claim denied                                  |
| Release artifact substitution            | Canonical digest map; SHA-256; signature bundle; SPDX SBOM; SLSA provenance; wrapper digest parity                                                         | Altered binary, wrapper, manifest, signature, or provenance denied                                                            |
| Protocol downgrade/confusion             | Explicit MCP era/version selection; configured fallback only; capability intersection; Gateway revalidation                                                | Timeout/parse-error downgrade, unsupported version, modern-only capability through legacy lane denied                         |
| Transport outcome ambiguity              | Durable operation identity before dispatch; idempotency; attempt state; reconciliation; receipt-gated completion                                           | Timeout, disconnect, lost task ID, duplicate retry, stale status, cancel request, redelivery cannot invent outcome            |
| Framework authority confusion            | FastMCP/native/A2A adapters remain thin; task/session/context never authority; cross-adapter equality                                                      | Framework middleware, task completion, session, or A2A artifact cannot approve, execute, or mint receipt                      |
| OAuth/workload identity confusion        | Exact issuer/resource/audience and distinct human/workload/adapter/server identities; Gateway action policy                                                | Valid token, scope, or SPIFFE ID alone cannot authorize action                                                                |
| Observability authority confusion        | OTel correlation kept separate from durable audit/receipt evidence; sensitive attributes prohibited                                                        | Span status, baggage, collector output, or missing telemetry cannot create authority or terminal outcome                      |
| Registry/supply-chain substitution       | Exact package/repo/version/integrity/license/provenance pin; preview registry treated as discovery only                                                    | Mutable tag, digest drift, namespace transfer, typosquat, yanked/unsupported version, outage, or license failure denied       |
| Signer-interface widening                | Provider-neutral closed contracts; test doubles only until separate key/trust authorization                                                                | Unknown/revoked key or algorithm, issuer/audience/purpose/digest drift, HSM/KMS metadata-only trust denied                    |

## Approval Evidence

Approval proof uses one policy-selected variant from ADR-0006:
`local_session`, `external_signature`, or
`local_session_and_external_signature`. Gateway validates exact request,
policy, requester session, distinct approver session, scope, action, target,
artifacts/configuration, constraints, nonce, issue time, and expiry. Local
session proof is recorded durably and is locally verifiable. Signed proof adds
portable verification through user-owned keys; it is not local-v1 default.

Approval alone sets no execution capability. Approver UI, MCP, CLI, agent, and
adapter cannot mint or widen it. Denial, expiry, session revocation, policy
revocation, required-key revocation, proof-mode downgrade, or content drift
makes it unusable.

[ADR-0004](ADR-0004_PHASE_7_SIGNED_APPROVAL_EVIDENCE.md) retains exact wrapper,
canonical-byte, Ed25519, domain-separation, strict encoding, public-material,
rotation/revocation, and fixed-false execution-authority controls for optional
signed proof. [ADR-0006](ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
controls user-owned custody, hybrid signer transport, human-presence
classification, and proof optionality. Provider-neutral interfaces and test
doubles exist, but active signing, operational verification, and key enrollment
do not.

## Owner Recovery

Owner recovery is offline and local. The daemon holds an owner-only exclusive
database-sidecar lease for its lifetime; the recovery core must acquire that
same lease, bind the exact canonical database and expected owner, append a new
credential generation, revoke every active owner session, and atomically record
actorless recovery-only audit evidence. Ordinary sessions, browser routes,
agents, and adapters cannot derive this authority.

Stable command and secret-file handling remain later-phase gates. Raw recovery
passwords must never be supplied through process arguments, environment
variables, logs, or evidence.

## Execution Authorization

Gateway creates a short-lived server-side execution-authorization record only
after all required evidence validates. It binds exact actor, approval proof,
policy decision, project/resource, action digest, target, adapter,
executable/artifact/configuration digests, constraints, audience, nonce,
operation, issue/expiry, cancellation, and revocation state. Gateway creates a
cryptographically random one-time capability and stores only its
domain-separated digest.

Adapter receives authorization reference, bounded inputs, and raw capability
only for redemption; raw capability never enters logs, audit, receipts, read
APIs, command arguments, environment, or backups. Atomic durable redemption
and consumption occurs through Gateway before adapter work. Failure after
consumption cannot reuse authority; ambiguity reconciles rather than inventing
success/non-execution or blindly retrying. Adapter never receives general
infrastructure credentials or unrestricted shell/SSH authority.

Portable self-contained signed execution authorization is a later disconnected
adapter profile, not an initial local-v1 requirement.

## Receipt and Audit Binding

Receipt must repeat authorization identity, consumption identity, operation and
attempt identities, adapter and sandbox identities,
requested/approved/executed digests, result class, time window, reconciliation,
and rollback evidence. Gateway authenticates local receipt through isolated
adapter channel and exact bindings before recording completion. Portable
receipt signature is separate and optional unless policy or remote-adapter
profile requires it.

Audit chain records each transition and rejection without copying secret values
or raw hostile input. Append/idempotency rules reject altered replay. Export
envelopes are observability evidence, never authority.

Transport timeout, disconnect, cancellation request, external task status, or
trace status cannot prove execution or non-execution. Future consequential
dispatch must persist operation identity before crossing side-effect boundary
and reconcile against Gateway result/receipt evidence before retry or terminal
state.

## Distribution Boundary

Canonical product components are built once per target. Every package wrapper
must map embedded component digests to canonical release manifest. Installer or
package-manager rebuilds of product behavior are forbidden.

Installers verify checksum, signature bundle, provenance, expected target, and
component map before replacement. Lifecycle tests prove no automatic service
start, non-root runtime, config/data preservation, rollback, uninstall, and
explicit purge semantics.

## Managed Content and Extension Boundary

Publishing content and assigning content are separate transitions. Active
agents resolve only exact approved non-expired digests. Mid-task configuration
changes create new context boundary or explicit restart; they cannot silently
alter an already authorized action.

Module install, enable, capability grant, execution, quarantine, and removal are
separate. No extension receives ambient credentials, direct LNSAT database
access, approval-signing keys, or unrestricted host/network authority.

## Release Blockers

v1 is no-go while any threat reachable in v1 scope lacks:

- an implemented control at its owning phase;
- positive and negative automated tests;
- compatibility-matrix evidence for every selected and claimed target;
- recovery, rollback, and revocation procedure;
- security review with no unresolved critical/high release blocker.

Each downstream product is independently no-go while its managed-content,
model, module, connector, entitlement, tenant, or hosted threats lack equivalent
control and evidence.

This document grants no runtime, signing, build, publication, deployment, or
live mutation authority.
