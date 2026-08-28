# ADR-0007: Docker-First Runtime-Neutral Enforcement

- Status: accepted architecture direction
- Date: 2026-08-20
- Decision owners: LNSAT maintainers
- Extends: ADR-0002 and ADR-0003 without changing the fourteen-phase release
  gate
- Implementation state: P11-D1 closed source-only profile/parser and digest
  binding, P11-D2 explicit configuration/redacted readback, and P11-D3 closed
  adapter-process protocol framing; no Docker endpoint, process launch,
  adapter execution, image operation, package, route, dispatch, or supported
  runtime exists

## Context

LNSAT must become usable soon without rebuilding agent runtimes, MCP lifecycle
management, container isolation, or VM orchestration. Docker Agent, Docker MCP
Gateway, and Docker Sandboxes already cover substantial parts of those adjacent
problems. LNSAT should integrate with them while retaining its distinct
boundary: deterministic authorization and durable evidence for consequential
actions.

Docker is a practical first integration because it provides a widely available
OCI execution boundary and an existing MCP operations layer. Docker must not
become the source of LNSAT authority, a required paid governance dependency, or
the only future execution substrate.

Current LNSAT source remains one local loopback authority cell with SQLite and
bounded local foundations. Runtime-target contracts and adapter manifests are
declarative today; they do not grant invocation or execution authority.

## Decision

### Docker Is the First Runtime Profile

First v1 integration target is one local, single-node Docker/OCI profile. Its
intended vertical path is:

```text
agent or MCP client
  -> LNSAT Gateway authority facade
  -> identity + policy + distinct approval + one-time authorization
  -> isolated Docker adapter
  -> Docker MCP Gateway or bounded OCI workload
  -> bound receipt + audit + reconciliation
```

Docker Agent may act as a client. Docker MCP Gateway may provide upstream MCP
catalog, routing, OAuth, and server lifecycle. Docker Sandboxes may provide a
microVM boundary. Each remains replaceable. Possession of a Docker socket,
container endpoint, MCP session, runtime process, or governance decision never
grants LNSAT action authority.

Agents do not receive direct Docker-socket access, upstream infrastructure
credentials, or unrestricted tools. Only the adapter receives a narrow,
expiring authorization bound to exact operation, action, arguments, target,
runtime profile, adapter, attempt, and idempotency identities. It returns a
verifiable receipt or an explicit ambiguous outcome. Transport loss never
means success or confirmed non-execution.

### Runtime-Neutral Core

Public core owns one closed, versioned runtime-target contract and conformance
suite. Planned profile families are:

- `docker_local`: first v1 integration target;
- `secure_vm`: later integration with an independently managed VM or microVM;
- `native_host`: later constrained host-service integration with weaker
  isolation claims;
- `remote_connector`: later authenticated out-of-process adapter integration.

Names above are architecture identifiers, not current schema values or support
claims. Adding a profile requires explicit design, threat-model, compatibility,
artifact, lifecycle, and conformance proof. Authority semantics cannot fork by
runtime, package, edition, or connector.

Deployment, transport, and execution are separate choices. `lnsatd` may run on
a host while an adapter uses Docker; a future VM may contain both; a remote
adapter may use neither. LNSAT does not become a container orchestrator, VM
manager, operating-system hardener, or general agent runtime.

Docker governance controls are optional defense in depth. LNSAT cannot require
commercial Docker policy services for core security behavior. Any upstream
allow remains untrusted input until LNSAT independently authorizes exact action.

### Monotonic Configuration Inheritance

Operational and managed configuration resolves through explicit, versioned
layers:

1. compiled safety floor;
2. managed organization baseline, when present;
3. deployment or project configuration;
4. runtime-profile and connector configuration;
5. local operator narrowing;
6. request-scoped narrowing.

Resolution is visible in redacted diagnostics and evidence. Later layers may
narrow authority, lower limits, or require stronger approval. They cannot
silently remove inherited denies, approval requirements, evidence obligations,
runtime restrictions, or emergency stops.

Normative merge rules are fail-closed:

- deny sets combine by union;
- allow sets combine by intersection;
- numeric and time limits choose most restrictive bound;
- approval chooses strongest applicable requirement;
- unknown, malformed, ambiguous, conflicting, or unsafe values deny startup or
  action admission;
- secrets remain references and never appear in resolved output.

Phase 10 owns explicit operational schema, source selection, precedence, and
redacted resolution evidence. Broader organization policy distribution remains
later work.

### Authority-Managed Emergency Stop

Every runtime profile must support a monotonic stop state scoped to one or more
of operation, capability, connector, project, tenant, runtime profile, or local
authority cell. Stop state carries immutable event identity, authority actor,
reason class, activation time, scope, and generation or epoch.

An active stop:

- denies new matching authorizations and dispatches;
- revokes or expires matching pending authority where contractually safe;
- requests cancellation only through an adapter's bounded cancellation
  contract;
- preserves `outcome_unknown` and reconciliation for attempts that may already
  have crossed consequence boundary;
- cannot erase receipts, evidence, or audit history.

Stop must be easy for authorized operators to activate. Resume requires
separate, equal-or-stronger authority and explicit evidence; process restart,
configuration reload, adapter reconnect, or Docker restart cannot clear it.

This decision defines required semantics only. It does not open served stop,
resume, cancellation, or recovery mutation routes.

### Data and Transport

LNSAT continues using versioned JSON contracts and canonical byte/digest rules.
A custom file format is not required. JSON is not a security boundary: local
transports require strict origin/peer checks, remote transports require a
separately approved authenticated and confidential profile, and every
consequential message requires schema validation, exact identity binding,
authorization, replay protection, size limits, and secret-safe logging.

Current SQLite remains initial single-node authority store. Large datasets,
artifacts, logs, and customer payloads stay outside it; LNSAT stores identities,
digests, decisions, authorization state, receipts, and bounded evidence.

## Initial v1 Scope

Docker-first v1 remains deliberately small:

- one owner-controlled, local/self-hosted, single-node authority cell;
- one explicit Docker/OCI runtime profile;
- one isolated adapter and one bounded disposable consequence;
- existing MCP/CLI/UI surfaces over same Gateway decisions;
- exact configuration resolution, emergency-stop semantics, receipt binding,
  ambiguity handling, reconciliation, recovery, and release proof;
- non-root and least-privilege operation, with no automatic host lockdown or
  service start.

Multi-tenant service operation, fleet/HA, hosted control planes, certified
product connectors, custom secure-VM images, native-host support, and broad
provider actions remain later lanes. External management and commerce products
may connect after public contracts stabilize; they are not v1 dependencies.

## P11-D1 Source Checkpoint

P11-D1 defines one exact `lnsat.runtime_profile.docker_local.v1` JSON contract
and explicit absolute-file loader. Unknown or duplicate fields, symlinks,
non-regular or changed files, non-UTF-8 input, floats, widened isolation,
unsafe container paths, and out-of-bound resource values fail closed. The
profile fixes network isolation, non-root identity, read-only root filesystem,
one writable disposable target mount, dropped capabilities, no new privileges,
default seccomp, no host namespaces or devices, no Docker-socket mount, no
ambient environment or credentials, and no shell.

Canonical JSON produces a domain-separated profile digest. A second domain-
separated digest binds that profile to the compiled Phase 7 Git-adapter
configuration identity. A side-effect-free validator requires a verified
derived execution request to match that combined configuration digest, exact
adapter reference/version, adapter-executable digest, and Gateway audience.
The separately pinned OCI image digest is part of the profile digest and
therefore cannot drift without changing approved configuration identity.

This checkpoint does not discover or select a Docker endpoint, inspect or pull
an image, open a socket, start a process, mount a repository, dispatch work,
emit a receipt, add a served route, or grant authority. It is contract and
binding foundation only; later Phase 11 packets remain separately gated.

## P11-D2 Configuration And Readback Checkpoint

P11-D2 extends existing explicit `lnsat.daemon.config.v1` file with one
optional closed `runtime_profile` selection containing exact family
`docker_local` and one absolute profile path. Selection requires paired
disposable Phase 8 Git runtime paths. Configuration loading passes selected
file through complete P11-D1 path, file-identity, schema, isolation, limit,
canonicalization, and digest validation boundary, then retains validated
loaded profile in daemon configuration.

`lnsatctl config inspect` may open that explicitly selected profile file. Its
public-safe response adds profile contract, id, family, profile digest,
authority-configuration digest, applied-layer evidence, and exact disclosure
that profile file was opened. It reflects no daemon/profile path, profile
source bytes, image digest, adapter-executable digest, container path, or
runtime argument.

This checkpoint does not discover or select a Docker endpoint, inspect or pull
an image, open a Docker socket, start a process, mount a repository, invoke an
adapter, add a served route, dispatch work, emit a receipt, or grant execution
authority. Invalid, missing, relative, symlinked, changed, or unknown-family
profile selection fails before storage or listener startup without path or
source-byte reflection.

## P11-D3 Adapter Process Protocol Checkpoint

P11-D3 defines exact `lnsat.adapter_process_protocol.docker_local.v1`
canonical UTF-8 JSON request and result frames. Each message is one canonical
object followed by one LF; missing, duplicate, multiple, noncanonical,
malformed, truncated, or oversized framing fails closed. Request construction
first revalidates the complete D1 profile-to-approved-request binding.

The request and result bind operation ID, execution-request and action digests,
authorization ID, idempotency key, attempt sequence, profile identity and
digest, authority-configuration digest, adapter identity/version,
adapter-executable digest, image digest, and Gateway audience. The request also
binds a 64 KiB stdin ceiling, a profile-narrowed stdout ceiling no larger than
64 KiB, zero accepted stderr bytes, and the profile-selected monotonic deadline
no larger than 30 seconds. A later supervisor may retain at most 16 KiB of
stderr only to detect overflow; protocol success requires stderr to be empty.

`completed` carries one opaque result digest for later D4 semantic binding.
`outcome_unknown` carries no result digest and is always rejected as success.
Elapsed time at or beyond the deadline also returns the same stable
`outcome_unknown` error. Every error is a closed code-only enum with no path,
profile bytes, source bytes, stderr content, or secret-bearing payload.

This checkpoint constructs and validates bytes only. It does not select or
launch an executable, open Docker, inspect or operate on an image, mount a
repository, dispatch an approved action, create a receipt, add a served route,
or authorize execution. Real isolated Docker execution and result/receipt
semantics remain P11-D4.

## Security Boundaries

- Gateway remains sole action-authority boundary.
- Executor or adapter compromise cannot mint, widen, approve, or replay
  authority.
- Runtime selection and immutable artifact/runtime digests bind before
  approval and cannot drift before dispatch.
- Claim, dispatch, receipt, and reconciliation preserve one-time consumption
  and fencing across crashes and retries.
- No blind retry follows an ambiguous consequence boundary.
- Secrets are references only; no credentials or tokens appear in packets,
  arguments, diagnostics, receipts, or source control.
- Native-host enforcement cannot be described as tamper-resistant when agent
  or workload retains root or equivalent administrator authority.

## Required Proof Before Support

Docker support cannot be claimed until checked-in evidence proves:

1. closed runtime-profile schema and fail-closed parser behavior;
2. exact configuration inheritance and redacted resolved-source diagnostics;
3. adapter isolation with no agent Docker-socket or ambient-credential access;
4. authorization-to-runtime and receipt cross-binding;
5. one-time consumption under concurrency, crash, reconnect, and replay;
6. stop/resume authorization, persistence, restart, and reconciliation
   behavior;
7. OCI image provenance, SBOM, signature verification, reproducibility, and
   lifecycle behavior for every selected support row;
8. compatibility and conformance across selected Docker versions and hosts;
9. anonymous clean-install and explicit-start proof in disposable environments;
10. Phase 13 and Phase 14 release gates plus separate publication authority.

## Consequences

- Docker becomes build priority, not product identity.
- LNSAT reuses Docker runtime and MCP strengths instead of duplicating them.
- Secure VM, native-host, and remote connectors reuse one authority contract
  later, with profile-specific isolation claims.
- Phase 10 source conformance remains prerequisite to runtime work. P11-D1
  follows it with contract/binding foundation; P11-D2 adds explicit selection
  and redacted readback; P11-D3 adds closed process-protocol framing only.
- Phase 11 should prove existing bounded consequence through selected Docker
  profile without opening production repositories or unrestricted
  infrastructure.
- No code, Dockerfile, image, package, connector, route, credential, release,
  publication, deployment, or production authority is created by this ADR.
