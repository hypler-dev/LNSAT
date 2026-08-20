# Authority Layer and Reference Workflow

- Status: accepted v1 architecture
- Availability: design and source contracts only
- Runtime effect: none

## Position in the Stack

> MCP exposes tools. LNSAT determines whether a proposed action may execute and
> records proof.

| Layer or system               | Role                                                               | LNSAT boundary                                        |
| ----------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| MCP                           | Agent-to-tool transport and discovery                              | Carries requests; never grants authority              |
| A2A                           | Agent-to-agent interoperability                                    | Carries delegated intent; never grants authority      |
| Agent SDKs                    | Orchestration, model loop, and tool selection                      | Propose packets; do not approve or execute            |
| Agent-content management      | Instructions, skills, profiles, context, graphs, and assignments   | Supplies immutable governed inputs; never authority   |
| Delegator/gatekeeper models   | Context classification, routing, explanation, and recommendation   | Untrusted policy input; never final allow or approval |
| OIDC and SPIFFE               | Human and workload identity                                        | Supply authenticated identity claims                  |
| OPA                           | External policy decision point                                     | May return a policy result over LNSAT input           |
| Hardware/runtime attestations | Time-bound environmental facts                                     | Become policy input; never become scheduler inventory |
| LNSAT                         | Packet, authority, approval, execution binding, receipt, and audit | Owns consequential-action lifecycle                   |
| OpenTelemetry and CloudEvents | Observability and export envelopes                                 | Export bounded evidence; are not authorization        |

LNSAT integrates beside these systems. Gateway validates transport-neutral
requests, authenticates actors, binds scope, evaluates policy, verifies
claimed attestations, records approvals, creates exact server-side
authorizations, atomically redeems one-time capabilities, and validates
receipts. Signed approval and hardware attestation are optional profile inputs,
not local-v1 prerequisites.

## Managed Agent Content and Advisory Models

Agent configuration is part of evidence binding because instructions, skills,
profiles, context, and model overlays can change behavior. Runtime resolves an
exact effective bundle digest before request authorization. Evidence preserves
origin, dependencies, overlay resolution, assignment, compatibility, expiry,
and revocation state.

Universal rules and prohibitions remain separate from provider/model-specific
rendering. Specific overlays cannot remove inherited constraints. Context
grouping and model classification remain reviewable evidence with classifier
identity and confidence; they cannot silently move requests across projects or
grant roles.

Delegator models may recommend role, approver, policy, or escalation. Gateway
enforces deterministic capability ceilings. Low confidence, unavailable model,
conflict, or drift fails to deny or human escalation for consequential work.

Commercial modules and connectors consume these public contracts through
isolated extension boundaries. Entitlement can enable a feature but cannot
grant action authority.

Relevant protocol boundaries:

- [MCP 2026-07-28 authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [A2A overview](https://a2a-protocol.org/latest/)
- [OPA documentation](https://www.openpolicyagent.org/docs)
- [NIST AI Agent Standards Initiative](https://www.nist.gov/artificial-intelligence/ai-agent-standards-initiative)

## Transport-Neutral Authority Contract

Every transport maps into the same canonical action proposal:

- authenticated requester identity and session;
- project, environment, resource, and target scope;
- versioned action type and bounded parameters;
- exact artifact and configuration digests;
- effective instruction, skill, profile, context, and model-overlay digests;
- explicit work-context/group identity and correction history when applicable;
- declared capabilities and risk;
- time bounds, nonce, and idempotency key;
- referenced secrets only;
- required rollback and evidence obligations.

MCP, A2A, REST, CLI, browser, and future adapters cannot weaken or add fields
after canonicalization. Unknown transport fields, identities, actions, targets,
capabilities, attestations, or versions fail closed.

MCP protocol era, FastMCP framework context, A2A task state, OAuth admission,
SPIFFE workload identity, OTel correlation, and registry discovery remain
separate evidence classes. None grants action authority. Required cross-adapter
equality and downgrade-denial tests are defined in
[Phase 8 adapter authority conformance](PHASE_8_ADAPTER_AUTHORITY_CONFORMANCE.md).

## Complete Synthetic Reference Flow

```text
agent deployment proposal
  -> versioned action packet
  -> authenticated Gateway
  -> OPA-compatible policy input
  -> scoped human approval
  -> local_session approval proof
  -> server authorization record + one-time capability
  -> atomic Gateway redemption
  -> bounded disposable Git commit adapter
  -> receipt or outcome_unknown
  -> reconciliation
  -> audit proof: requested = approved = executed
```

Reference action creates one bounded commit in a disposable local Git
repository. It binds repository identity, base commit, allowed paths, patch
digest, commit metadata, and expected tree. It disables push, fetch, hooks,
network, unrestricted shell, production repositories, provider credentials,
infrastructure mutation, and customer data.

### Evidence Bindings

Local-session approval proof binds:

- complete validated v1 packet, policy decision, approval request, and
  unchanged approval decision snapshots;
- packet identity/hash, requester and distinct authenticated human approver
  identities/sessions, project, resources, profile, intent, policy capability
  decisions, source references, constraints, result, reason, issue time,
  inherited expiry, and nonce;
- local session and identity lifecycle evidence. It is locally verifiable, not
  portable or nonrepudiable under host compromise.

Optional `external_signature` or `local_session_and_external_signature` proof
adds canonical signing-request identity, signing nonce, user-owned public-key
lineage/version, and returned signature. Private keys never enter LNSAT. KMS
signatures without independent user presence are service/automation evidence,
not distinct-human approval.

Current v1 has no separate action, target, environment, or artifact field.
Those concepts remain bound through the exact packet snapshot (`packet_type`,
`intent`, `project_ref`, `resource_refs`, `source_refs`,
`policy_profile_ref`, `permission_envelope`, and `constraints`) rather than
unbound duplicate labels. Optional exact wrapper, canonical signature
preimage, Ed25519 profile, key lifecycle, and revocation rules are in
[ADR-0004](ADR-0004_PHASE_7_SIGNED_APPROVAL_EVIDENCE.md).
Trust, proof variants, signer transport, and key custody are controlled by
[ADR-0006](ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md).

One-time execution authorization additionally binds:

- exact approval-proof and policy-decision digests;
- exact adapter identity and sandbox target;
- exact executable, artifact, configuration, and action digests;
- issue time, expiry, revocation/cancellation, operation identity, and
  consumption state.

Authorization is server-side. Gateway creates a random one-time capability,
stores only its domain-separated digest, and atomically consumes it before
consequence. Raw capability never enters audit, logs, receipts, command
arguments, environment, backups, or read APIs.

Execution receipt binds:

- execution authorization and consumption identities;
- requested, approved, and executed digests;
- adapter and sandbox identities;
- start/end times, bounded result, exit classification, and rollback evidence;
- authenticated local-channel verification and reconciliation outcome.

Success requires exact digest equality. Any substitution, replay, expiry,
revocation, scope widening, missing receipt field, or signature failure denies
execution or rejects the receipt.

## OPA-Compatible Policy Input

LNSAT may serialize a bounded, versioned policy input for OPA. Input includes
authenticated identity, canonical action digest, scope, capability/risk,
approval requirements, fresh attestation facts, and deny-by-default defaults.
OPA output is a policy decision input to LNSAT. OPA never issues approval,
execution authorization, or a receipt.

LNSAT retains an internal deterministic policy path so OPA is optional. LNSAT
does not create a competing general-purpose policy language.

## Hardware Attestation Profiles

Profiles prove hardware facts can affect policy without turning LNSAT into a
scheduler.

### Profile A: Apple Silicon Local Sandbox

- signed attester identity;
- `arm64` architecture;
- OS family/version and secure-boot state;
- declared Metal-capable device fact;
- sandbox runtime identity and measurement;
- issued-at, expires-at, nonce, and evidence digest.

Example policy permits only the synthetic local workload while evidence is
fresh, device fact matches, target is disposable, and action digest is exact.
It denies stale, unsigned, x86_64, substituted-runtime, or production targets.

### Profile B: Linux Accelerator Sandbox

- signed attester identity;
- `x86_64` architecture;
- kernel/runtime measurement;
- declared accelerator and driver-major facts;
- sandbox isolation profile;
- issued-at, expires-at, nonce, and evidence digest.

Example policy permits only the synthetic test profile when minimum accelerator
facts and isolation measurement match. It denies absent, stale, downgraded,
replayed, or mismatched facts.

Post-local-v1 optional profiles make facts available to policy only when an
approved support profile claims them. They do not discover inventory, place
workloads, reserve capacity, manage drivers, or claim general hardware support.

## Explicit Non-Goals

- no MCP or A2A replacement;
- no generic agent framework;
- no proprietary general policy language;
- no Kubernetes or Nomad replacement;
- no generic scheduler;
- no unrestricted shell, SSH, provider, database, network, or host control.

## Current Boundary

No authenticated approval signer, signing key custody, signed-evidence
verification implementation, nonce issuer, one-time execution issuer, sandbox
adapter, receipt validator, OPA runtime connection, or hardware attester is
currently available. ADR-0004 and ADR-0006 are design only. Source contracts and fixtures
must preserve `side_effects: []` until their ordered roadmap phases deliberately
open implementation.
