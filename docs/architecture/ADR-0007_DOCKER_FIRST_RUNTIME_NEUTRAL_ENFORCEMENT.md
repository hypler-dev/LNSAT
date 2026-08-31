# ADR-0007: Docker-First Runtime-Neutral Enforcement

- Status: accepted architecture direction
- Date: 2026-08-20
- Decision owners: LNSAT maintainers
- Extends: ADR-0002 and ADR-0003 without changing the fourteen-phase release
  gate
- Implementation state: P11-D1 closed source-only profile/parser and digest
  binding, P11-D2 explicit configuration/redacted readback, and P11-D3 closed
  adapter-process protocol framing; P11-I1 adds authenticated atomic packet and
  policy intake; P11-D4A adds bounded canonical execution-payload, target, and
  Git tool-argument binding; P11-D4B1 adds a dormant source-only Docker supervisor
  with exact runtime/target revalidation, restricted launch arguments, bounded
  process observation, fail-closed ambiguity, and host-verified semantic results.
  P11-D4B2A adds atomic Docker-adapter attempt claiming, durable receipt binding,
  startup materialization of interrupted attempts, and inspection-only
  reconciliation. P11-D4B2B now passes experimental served fake-runtime
  integration over existing Phase 8 loopback routes with hermetic fake executable,
  disposable Unix socket, marked temporary Git target, and host Git verifier.
  Three adversarial served tests confirm: success/replay/idempotency drift
  rejection; post-consequence unknown survives restart and reconciles through host
  Git inspection only; unchanged-target unknown persists without receipt. No
  real Docker binary/daemon/socket, image pull/build/run, production repository,
  deployment, release, package, or support exists.

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

## P11-I1 Authenticated Action Intake Checkpoint

P11-I1 adds one same-origin loopback `POST /v1/packets` route under stable
`lnsat.gateway.action_intake.v1_0`. Input is one strict packet-envelope v1 JSON
object. Existing browser transport requires an active local owner/operator
session, matching CSRF proof, and `request_action` permission. Packet
`actor_ref` and `session_ref` must exactly match verified session evidence.

One immediate SQLite transaction verifies and touches session evidence,
persists immutable canonical packet evidence, evaluates deterministic policy at
server-owned time, and persists that policy evidence. Packet or idempotency
conflicts, expiry, invalid policy, multiple/missing replay decisions, identity
drift, and any persistence failure roll back the transaction. Exact replay
returns original packet and policy identities without reevaluating durable
policy evidence at a different time.

Response exposes only bounded packet identity/digest, policy decision/reasons,
scope, and time evidence. It withholds canonical packet bytes, intent,
constraints, action arguments, and authentication secrets. Intake creates no
approval request or decision, execution authorization or capability, adapter
dispatch, Docker operation, repository consequence, receipt, CLI/MCP/UI
mutation, package, deployment, or support claim. Real isolated Docker execution
remains P11-D4.

## P11-D4A Executable Payload Binding Checkpoint

P11-D3 intentionally carries control identities and digests only. A real
`git.commit` adapter also requires the exact approved action and target fields:
patch bytes and digest, base and expected tree, allowed paths, repository
identity, and commit metadata. P11-D4A closes that gap before process launch.

`lnsat.adapter_execution_payload.docker_local.v1` wraps one validated D3 control
request with the exact canonical approved execution request, its target digest,
and the existing Phase 7 Git tool-argument digest. Parsing reconstructs the
execution request and recomputes execution, action, target, configuration,
adapter-executable, adapter/version, audience, and tool-argument identities.
Every mismatch rejects. The single canonical UTF-8 JSON frame has one trailing
LF and an 8 MiB ceiling, sufficient for the existing one-MiB UTF-8 patch bound
after canonical JSON escaping plus bounded metadata and target fields.

The retained payload is intended only for a later isolated adapter stdin.
Errors remain closed codes and never reflect the patch, repository path, or
canonical request. This checkpoint selects no Docker executable or endpoint,
starts no process, inspects or operates on no image, mounts no repository,
dispatches no consequence, creates no result or receipt, adds no served route,
and grants no execution authority.

## P11-D4B1 Supervised Launch Boundary

P11-D4B1 adds a dormant source API for supervising one schema-2 `docker_local`
launch. Schema 2 binds exact SHA-256 identities for the Docker CLI and the host
Git verifier plus one absolute `unix://` endpoint. Schema 1 remains readable but
cannot launch. Before process creation, the supervisor reconstructs the D4A and
D3 contracts, verifies every profile and authority binding, hashes both
executables, validates the socket and marked disposable Git target, constructs
the complete argument vector, then repeats runtime and target identity checks.

The child receives no ambient environment. A fresh private Docker config contains
only `{}`. `docker run` uses `--pull=never`, `--rm`, `--network=none`,
`--ipc=none`, `--read-only`, `--log-driver=none`, a non-root UID/GID,
`--cap-drop=ALL`, `no-new-privileges`, PID, memory, no-swap and CPU limits, one
read-write bind mount for the exact disposable target, and profile-pinned
workdir, entrypoint, and image digest. Stdin, stdout, stderr, and elapsed time are
bounded. Any anomaly after spawn returns only `outcome_unknown`; the supervisor
kills the client and requests forced removal only when the private Docker client
directory contains a valid Docker-written container ID, and only after rehashing
the Docker CLI and revalidating the endpoint. Missing or malformed CID evidence
disables cleanup rather than risking an unrelated container. Success requires
independent host Git inspection of commit, tree, paths, patch and metadata plus
an exact semantic result-digest match.

Hermetic tests use a fake Docker executable and disposable Unix socket. They
prove argument construction, identity drift rejection, timeout/cleanup behavior,
bounded output handling, secret-free errors, and unknown-outcome semantics. They
do not prove a real daemon, image, kernel isolation, or supported runtime. No
served route calls this API and no package, deploy, or production path exists.

## P11-D4B2A Durable Dispatch Evidence Boundary

P11-D4B2A adds store-owned lifecycle APIs without connecting the supervisor to
transport. One immediate SQLite transaction consumes the exact capability and
claims one Docker-adapter attempt. The attempt binds operation, authorization,
adapter, D3 protocol, and shared Git tool-argument identity before any future
caller may invoke the supervisor. Competing exact claims converge on one creator
and one metadata-only replay; neither may create a second attempt.

Only an independently host-verified semantic Git result may create a receipt.
`dispatching` completes with one receipt. An attempt found `dispatching` after
store reopen materializes to `outcome_unknown`; it can become `completed` only
when inspection proves the exact approved consequence and an additional
reconciliation record is committed. An unchanged target stays unknown and
creates no receipt. Reconciliation never launches an adapter, invokes Docker, or
retries a consequence.

Five hermetic store tests cover concurrent claim, single-attempt and
single-receipt invariants, metadata replay, durable reopen, interrupted-dispatch
materialization, host-only reconciliation, unchanged-target behavior, and the
closed contract fixture. No served route or Docker configuration consumes these
APIs.

## P11-D4B2B Served Fake-Runtime Checkpoint

P11-D4B2B now passes experimental served fake-runtime integration over existing
Phase 8 loopback routes. The chain is D2 schema2 loaded profile -> D4B2A atomic
claim -> D3/D4A payload -> D4B1 supervisor using hermetic fake executable,
disposable Unix socket, marked temporary Git target, and host Git verifier ->
D4B2A receipt/unknown.

Three adversarial served tests confirm:

- success/replay/idempotency drift rejection with metadata-only replay and no
  redispatch;
- post-consequence unknown survives daemon restart and reconciles through host Git
  inspection only, never launching runtime or retries;
- unchanged-target unknown persists without receipt.

Exact replay is metadata-only; concurrent exact claims converge on one creator.
Unknown survives restart. Reconcile inspects host Git only, never launches
runtime/retries.

No real Docker binary/daemon/socket, image pull/build/run, production repository,
deployment, release, package, or support exists. The fake-runtime selector is
internal crate-test-only; daemon arguments, configuration, and public callers
cannot select it.

Phase 11 remains incomplete. Real disposable Docker proof requires a later
separately authorized gate.

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
  and redacted readback; P11-D3 adds closed process-protocol framing; P11-I1
  adds authenticated packet/policy intake; P11-D4A adds executable-payload,
  target, and shared Git tool-argument binding only.
- Phase 11 should prove existing bounded consequence through selected Docker
  profile without opening production repositories or unrestricted
  infrastructure.
- No code, Dockerfile, image, package, connector, route, credential, release,
  publication, deployment, or production authority is created by this ADR.
