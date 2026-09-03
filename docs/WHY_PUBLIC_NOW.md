# Why LNSAT Is Public

- Status: maintainer public-core purpose
- Public cutover: 2026-08-20
- Product status: pre-release source only
- Runtime, artifact, and support effect: none

LNSAT is public because an authority boundary governing consequential agent
actions must be inspectable, portable, independently testable, and shared
across runtimes rather than hidden inside one product or provider.

## 1. Public Core Purpose

LNSAT defines how one exact proposed action becomes a policy decision, an
approval when policy requires one, a narrow execution authorization, and
durable evidence of the result. Those semantics belong in public source because
operators, integrators, reviewers, and runtime providers must be able to verify
what grants authority, what cannot grant it, and how uncertainty is preserved.

The Apache-2.0 core keeps canonical contracts, Gateway authority behavior,
security boundaries, conformance fixtures, and negative cases readable and
forkable. Optional downstream management products may improve configuration,
visualization, connector management, or release composition, but they cannot
create an alternate authority path or weaken a Gateway decision.

## 2. Consequential-Action Problem

Tool access is not action authorization. A model, MCP client, browser, CLI, or
runtime may be able to describe or transport an operation without being allowed
to cause it. LNSAT separates those concerns and binds the complete lifecycle:

1. exact action intent, arguments, target, scope, and idempotency identity are
   validated and represented by canonical bytes and digests;
2. deterministic policy produces replayable allow, deny, or approval-required
   evidence;
3. a distinct authenticated human supplies approval when policy requires it;
4. Gateway issues a narrow, expiring, one-time authorization for the approved
   action only;
5. capability consumption and one execution-attempt claim commit atomically
   before consequence;
6. bounded adapter execution returns independently checked result evidence;
7. a receipt binds the authorization, attempt, action, target consequence, and
   reconciliation result.

Requested, approved, authorized, and executed identities must agree. A protocol
session, runtime process, container endpoint, policy-engine response, or model
recommendation cannot widen that authority.

## 3. What LNSAT Makes Inspectable

LNSAT makes both successful execution and uncertainty reviewable. Exact replay
is metadata-only after an attempt is claimed; it does not redispatch the
consequence. A receipt is accepted only when its action and consequence
evidence match the authoritative request. Missing, malformed, substituted,
timed-out, or ambiguous result evidence does not become success.

When execution may have crossed the consequence boundary but no valid result is
available, the state is explicitly `outcome_unknown`. That ambiguity survives
restart. Reconciliation inspects existing consequence evidence without blindly
retrying the adapter or launching the runtime again. An unchanged target remains
unknown without a fabricated receipt. These rules make crash, disconnect,
timeout, replay, and partial-failure behavior available for threat-model review
and conformance testing.

Gateway is the sole action-authority boundary. Policy evidence, human approval,
one-time authorization, atomic consumption, attempt claiming, bounded dispatch,
receipt binding, audit evidence, and reconciliation remain distinct, inspectable
steps rather than one opaque tool call.

## 4. Current Implemented Source

Current experimental, source-only implementation includes versioned packet,
policy, approval, authorization, receipt, audit, and error contracts;
deterministic TypeScript and Rust behavior; shared cross-language fixtures;
embedded SQLite authority evidence; loopback Gateway routes; local identity and
session foundations; read-only API, MCP, CLI, and Control Center evidence
surfaces; and bounded disposable Git consequence tests.

P11-D4B2B exercises the Docker-local supervisor and durability chain through the
existing eight Phase 8 loopback routes only under an internal crate-test-only
fake-runtime selector. No route or public-response field changed. The hermetic
proof uses a fake Docker executable, disposable Unix socket, marked temporary
Git target, and host Git verifier. Its chain is D2 schema-2 profile -> D4B2A
atomic claim -> D3/D4A payload -> D4B1 supervisor -> D4B2A receipt or
`outcome_unknown`. Tests cover metadata-only replay without redispatch,
restart-safe ambiguity, host-Git-only reconciliation, and an unchanged target
that remains unknown without a receipt.

P11-D4C1 adds a source-only `lnsat-git-reference` executable and hermetic
host-process tests for exact executable binding, D4A-bound host/container target
remapping, disabled Git lazy fetch and Trace2 targets, bounded Git execution,
canonical result framing, silent failure, oversized input rejection, and
temporary-index cleanup on success and failure. It adds no image or Docker
invocation.

These proofs do not use a real Docker binary, daemon, or socket and do not prove
image isolation or a supported runtime. Phase 11 remains incomplete; real
disposable Docker image/runtime proof is a separate, still-closed gate.

## 5. Runtime and Ecosystem Role

MCP, A2A, REST, CLI, and browser interfaces are replaceable transports over the
same authority semantics. Docker, OCI workloads, independently managed VMs and
microVMs, constrained native services, and authenticated remote connectors are
replaceable execution profiles. Agent frameworks can orchestrate work, identity
systems can supply claims, and bounded policy engines can evaluate inputs, but
none of those systems becomes the source of LNSAT authority.

Docker/OCI is the first technical integration choice, not the reason the core
is public. LNSAT uses runtime isolation and execution capabilities while keeping
policy, approval, one-time authorization, receipt binding, and ambiguity
handling independently inspectable. See the
[Docker-first runtime decision](architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)
and [Docker AI technical comparison](reference/DOCKER_AI_TECHNICAL_COMPARISON.md)
for that relationship.

## 6. What Contributors Can Evaluate and Extend

Public source lets reviewers inspect implementation, tests, schemas, threat
models, and fail-closed negative cases together. Integrators can build against
versioned contracts and shared fixtures. Contributors can challenge unsafe
assumptions, add adversarial evidence, improve interoperability, and propose
runtime adapters without taking ownership of authorization semantics.

Runtime and connector providers can implement bounded adapters while Gateway
continues to decide whether one exact action is authorized. Public conformance
work can compare those implementations against the same replay, substitution,
ambiguity, and receipt rules. Exact public-history CI and review evidence may
later support release gates, but source verification by itself does not create
a release or support commitment.

## 7. Maturity and Support Boundary

LNSAT `0.1.0` remains pre-release source for evaluation and contribution. APIs
and contracts may change. No supported package, binary, container, image,
installer, hosted service, deployment, production connector, or production-use
guarantee exists. Public visibility and passing source checks do not imply
artifact publication, stable compatibility, operational support, or production
suitability. [Claims and Maturity](CLAIMS_AND_MATURITY.md) defines the exact
vocabulary.

## 8. Provenance

Exact cutover chronology, private/public revision identifiers, tracked-tree
mapping, and verification limits remain in the root
[provenance timeline](../PROVENANCE.md) and
[public source launch record](PUBLIC_READINESS.md). Those records preserve
factual history; this document explains why the authority core and its
conformance evidence belong in public source.
