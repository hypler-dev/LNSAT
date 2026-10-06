# LNSAT

[![Source verification](https://github.com/hypler-dev/LNSAT/actions/workflows/ci.yml/badge.svg)](https://github.com/hypler-dev/LNSAT/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-pre--release-orange.svg)](docs/PROJECT_STATUS.md)

**Execution authorization and evidence for consequential agent actions.**

LNSAT is an open-source authority engine that binds an agent's proposed action
to deterministic policy, authenticated human approval where required, a bounded
execution attempt, and durable evidence of the consequence. Its security boundary
is the Gateway. Models, applications, protocol adapters, and user interfaces
submit requests through that boundary; they cannot manufacture approval or
execution authority.

> **Pre-release source, version `0.1.0`.** This repository contains experimental
> implementations, private source candidates, conformance fixtures, and design
> contracts. It does not yet provide a supported end-to-end V1 product, installer,
> package, container, or hosted service. Real Docker runtime proof remains
> unfinished. The Control Center is an experimental read-only preview.

[Architecture](#architecture-and-trust-boundaries) ·
[Authority flow](#from-proposal-to-consequence) ·
[CLI](#current-cli-and-service-interfaces) ·
[Integration](#application-sdk-and-agent-integration) ·
[Evaluate from source](#evaluate-from-source) ·
[Documentation index](docs/DOCS_INDEX.md)

[Project Status](docs/PROJECT_STATUS.md) owns implementation and acceptance
truth. [Claims and Maturity](docs/CLAIMS_AND_MATURITY.md) defines the maturity
labels. This README explains the system and links the exact contracts; its
examples and diagrams do not open runtime or release gates.

## Architecture And Trust Boundaries

LNSAT separates the actor asking for a consequence from the authority deciding
whether that exact consequence may occur. A tool connection, authenticated
session, policy recommendation, or successful parser result is insufficient on
its own. The selected operation must satisfy its complete authority chain.

```text
agent / human / application
          |
          | versioned request; no ambient infrastructure authority
          v
CLI / API / MCP / application adapter / optional UI
          |
          v
Gateway: validate identity, contract, scope, policy and current state
          |
          +---- approval required ----> authenticated human decision
          |                                      |
          +<-------------------------------------+
          |
          v
durable authorization consumption + operation/attempt record
          |
          v
bounded execution adapter ----> selected isolated substrate/target
          |
          v
consequence evidence ----> receipt or outcome_unknown ----> reconciliation
```

The diagram describes required ordering. Route availability and runtime proof
vary by interface. The Rust daemon and TypeScript Gateway packages contain
different source layers; the directory named `packages/gateway` is not, by
itself, the whole enforcement system.

| Layer                          | Source                                                                                     | Technical responsibility                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Contract model                 | [`packages/packets`](packages/packets), [`crates/lnsat-contracts`](crates/lnsat-contracts) | Versioned packet, approval, execution and evidence representations; deterministic validation and canonicalization          |
| Policy                         | [`packages/policy`](packages/policy)                                                       | Deterministic decisions, approval verification and bounded signer-provider source contracts                                |
| Gateway and API                | [`packages/gateway`](packages/gateway), [`apps/api`](apps/api)                             | Transport-neutral inspection, recovery and interoperability contracts; validated API surfaces                              |
| Durable authority              | [`crates/lnsat-store`](crates/lnsat-store)                                                 | SQLite identity/session state, authority records, one-time consumption, attempts, receipts, integrity, backup and recovery |
| Authentication                 | [`crates/lnsat-auth`](crates/lnsat-auth)                                                   | Local authentication primitives, including Argon2id password handling and protected secret representations                 |
| Local service and operator CLI | [`crates/lnsatd`](crates/lnsatd)                                                           | Experimental numeric-loopback host, configuration diagnostics, `lnsatctl` and private enforcement prerequisites            |
| Packet CLI                     | [`packages/cli`](packages/cli)                                                             | `lnsat` packet validation, hashing and inspection source                                                                   |
| Audit                          | [`packages/audit`](packages/audit)                                                         | Audit contracts, append semantics and persistence/migration artifacts                                                      |
| Protocol adapter               | [`packages/mcp`](packages/mcp)                                                             | Read-only MCP inspection and transport contracts; no independent permission system                                         |
| Optional management UI         | [`apps/console`](apps/console)                                                             | Read-only evidence views, synthetic previews and authenticated operation lookup                                            |
| Shared identity and fixtures   | [`packages/core`](packages/core), [`fixtures/contracts`](fixtures/contracts)               | Product constants and deterministic cross-language conformance vectors                                                     |

The engine must control every path included in an enforcement claim. An agent
that still holds a direct infrastructure credential or an unrestricted shell
can bypass a mediated tool path. A connector therefore cannot claim complete
coverage merely because its own requests pass through LNSAT. The
[threat model](docs/architecture/THREAT_MODEL.md) and
[authority architecture](docs/architecture/AUTHORITY_LAYER_AND_REFERENCE_WORKFLOW.md)
define the larger trust boundary.

## From Proposal To Consequence

The reference development workflow is a bounded change to a disposable Git
repository. It exercises the difference between requesting an action,
authorizing it, starting it, and proving its result. It is not an unrestricted
Git or shell executor.

### 1. Bind the proposal to exact content

A versioned packet carries the declared actor, scope, resources and constraints.
The execution proposal is represented inside the packet's
`constraints.execution_proposal`. Its closed structure names the action kind
and arguments, target resource and identity, configuration digest, adapter
reference/version, executable digest and audience. The target resource must
also belong to the packet's resource references.

The Rust contract entry points are
[`parse_execution_proposal_v1`, `derive_execution_request_v1`, and
`verify_derived_execution_request_v1`](crates/lnsat-contracts/src/execution.rs).
Derivation binds the packet hash to the exact policy-decision,
approval-request and approval-decision identities, requester and approver
identities/sessions, project/resource, action/target, adapter, configuration,
executable, audience, preparation time and expiry. A changed target, patch,
adapter or configuration must not inherit authority for the earlier request.

For the bounded Git workflow, the material action includes the repository
identity, base commit, head reference, permitted paths, patch digest and bytes,
commit metadata and expected resulting tree. A natural-language description
such as “fix the repository” cannot substitute for these bindings.

### 2. Evaluate policy and obtain the required approval

Policy determines whether the proposed action is denied, permitted under the
selected policy, or requires human approval. Where approval is required, its
proof must bind to the exact request and relevant policy state. A successful
login establishes a session; it does not approve every future action.

The existing local-session approval design binds packet, policy and approval
snapshots, scope, constraints, identities, timing, nonce and lifecycle. The
reference distinct-human flow separates requester and approver. Enterprise
identity aliases and federation require explicit identity-linking and
revocation contracts before they can preserve that separation.

The human must receive the material facts required by the selected approval
presentation contract. An application's summary, button click, or model-written
explanation is not automatically trusted approval evidence. The accepted V1
integration requirements still include a selected complete presentation path
and authenticated client transport/origin.

### 3. Consume authorization once and record the attempt

Execution authorization is narrower than approval. It binds the accepted
request to a permitted adapter, audience, validity interval and bounded
attempt. The durable store owns consumption and operation/attempt state so
that replay and concurrent claim attempts cannot create an additional dispatch.

For the prepared Phase 11 path, source includes a private store-owned
pre-supervisor verifier. It authenticates the created-claim result and freshly
re-reads the exact bound consumption, operation and attempt in a store
transaction before producing a bound, non-replayable guard. A caller-supplied
snapshot or a matching digest cannot replace that durable-state check.

This verifier is a source prerequisite. A separately reviewed runnable proof
driver and real runtime evidence are still required before the prepared path
can establish an execution result.

### 4. Prove the consequence or preserve uncertainty

Dispatch acceptance is not completion. Adapter exit status is not sufficient
proof of the intended consequence. A consequence receipt must bind to the
correct operation, attempt, target and result under its exact contract.

If the response disappears after an action may have occurred, the outcome
remains `outcome_unknown` until authorized readback and reconciliation can
resolve it. A timeout must not cause an SDK or agent to mint a fresh request and
repeat the action. One-time authorization consumption prevents a particular
replay; it is not a general promise of exactly-once external effects.

Consequence, isolation, cleanup and recovery are separate evidence dimensions.
A valid Git receipt does not establish container cleanup. A stop
acknowledgement does not establish that an in-flight action never executed or
was rolled back.

## Versioning, Canonical Bytes And Conformance

Several identities coexist and must not be substituted for one another:

| Identity                              | Current source value       | Meaning                                                           |
| ------------------------------------- | -------------------------- | ----------------------------------------------------------------- |
| Product/source SemVer                 | Unpublished `0.1.0`        | Repository package version; no supported artifact implied         |
| Gateway wire target                   | `lnsat.contracts.v1_0`     | Exact contract family/version negotiation                         |
| Default product-surface diagnostic    | `lnsat.product_surface.v1` | Current default manifest/status contract                          |
| Explicit headless diagnostic selector | `lnsat.product_surface.v2` | Opt-in source diagnostics; no version range or automatic fallback |
| Local SQLite schema                   | `17`                       | Durable store layout, independent of API and product versions     |

Contract identity includes the selected schema and validation behavior.
Unsupported versions, wrong-route selectors, malformed selectors and duplicate
selectors fail closed. A JSON document that parses successfully is not thereby
a valid contract object; closed maps, required fields, bounds and semantic
bindings remain necessary.

Digests are commitments to precisely defined bytes. For example, the execution
target digest in the Rust contract hashes the domain
`lnsat.execution-request.target.v1`, a NUL separator, a four-byte big-endian
length and the canonical JSON target object containing `identity` and
`resource_ref`. Other contracts use different domains and encodings. The
private startup message commitments use their own domain and canonical array
layout. Do not implement a generic “sort JSON and hash it” replacement.

Use the owning implementation and golden vectors when porting a contract.
Cross-language comparisons verify the selected representations; they do not
authenticate a live target, caller or running executable. A correct digest
proves byte agreement, while provenance, freshness and permission require
additional evidence. See
[contract versioning](docs/reference/CONTRACT_VERSIONING.md) and
[SDK conformance](docs/sdk/conformance.md).

## Durable Store And Recovery Semantics

The local authority store uses an explicit file-backed SQLite database. Source
checks reject a symlink at the selected final database path and require the
containing directory to exist; new Unix database files use mode `0600`.
The store verifies WAL mode, foreign keys, `FULL` synchronous behavior, a bounded
busy timeout and disabled trusted-schema behavior. These are specific source
controls, not a claim that all filesystem ancestry and host custody are proven.

The daemon's exclusive selected-store lease excludes concurrent offline owner
recovery. Transactions bind durable authority transitions; restart and
reconciliation tests cover bounded source workflows. Read-only inspection must
not consume authorization, resolve an unknown outcome, or silently repair
authority state.

Offline backup and restore source exists under the lease contract. Restore
creates a fresh, verified, inert destination. It does not silently activate
restored authority. Existing offline owner recovery is distinct from the
unfinished initial headless bootstrap and activation transaction.

The current schema remains `17`; proposed schema-18 and headless initializer
work are not implemented by the private preparation codecs. Persistent storage,
temporary files, journals and backups also need the selected encryption and
key-custody lifecycle before an encrypted installation can be claimed.
SQLite transaction tests alone cannot establish that property.

Read the [store contract](crates/lnsat-store/README.md),
[headless requirements](docs/PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control)
and [current command gates](docs/PROJECT_STATUS.md#v1-command-and-contract-completion-gates)
before building a management or recovery client.

## LNSAT V1 Product Surface

The accepted V1 target is an embeddable authority runtime with a stable
integration API and complete headless `lnsatctl` configuration and operations.
The optional `lnsatd` reference host/sidecar supplies a local service boundary.
An installation must be usable without Rangoon or a graphical management app.
The existing React console is not a V1 exit requirement.

Configuration separates two questions:

1. **Resource access:** which repositories, folders, services and OS resources
   may this LNSAT installation reach?
2. **Action authority:** which actions may a caller request inside that access
   envelope, under which limits and approval requirements?

Layered declarations must compose without silently widening constraints.
Declared settings, selected settings and verified effective enforcement are
different states. A successful configuration parser, an “observe-only” preset,
or a diagnostic named `effective` must not be presented as an active OS
restriction. Protected apply requires the exact owner confirmation, generation,
audit, concurrency, rollback and revocation semantics in the accepted contract.

### Current CLI and service interfaces

The following is an orientation to the current source, not a second completion
ledger. [Project Status's per-command gates](docs/PROJECT_STATUS.md#v1-command-and-contract-completion-gates)
own exact positive, negative, race and remaining acceptance evidence.

| Interface                                                                        | Source behavior and boundary                                                                                                       |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `lnsat packet validate`, `hash`, `inspect`                                       | Local packet validation, canonical hashing and inspection; no execution authority                                                  |
| `lnsat`, `lnsatctl`, `lnsatd` help/version/manifests/completion/manual surfaces  | Source-implemented product diagnostics; availability does not imply installation or service lifecycle support                      |
| `lnsatd --config`                                                                | Explicit configuration-file startup source for the numeric-loopback, file-backed local host; no installer or production host proof |
| `lnsatctl config inspect --config`                                               | Config/profile digests and applied-layer diagnostics                                                                               |
| `lnsatctl config schema`, `validate`, `show`, `diff` with exact v2 selector      | Schema, file validation and redacted declaration diagnostics; no protected apply                                                   |
| `lnsatctl config effective`, `export` with exact v2 selector                     | Composed declared ceiling and non-applicable, non-reimportable diagnostic export; no activation                                    |
| `lnsatctl doctor`, recovery inspection, offline backup/restore                   | Bounded source diagnostics and offline lifecycle foundations; selected-artifact lifecycle proof remains open                       |
| Authenticated exact-object `GET`/`HEAD` readback                                 | Approval-request, approval-decision and audit-event source reads; no complete snapshot/watch interface                             |
| Authenticated Unix-socket health/status                                          | Withdrawn; requests fail before secret intake or transport work                                                                    |
| `lnsatctl config apply`, complete initial bootstrap/activation, monitoring/watch | Missing accepted V1 behavior; prerequisite contracts do not implement these commands                                               |
| Installation-wide emergency disablement and generation/epoch revocation          | Remaining integration work; existing local-session and authorization cancellation behavior is narrower                             |

The diagnostic selector is exactly
`--product-surface-contract lnsat.product_surface.v2`. It is not the Gateway
wire-version selector. Consult the selected command's help and the
[CLI and OS interface contract](docs/architecture/CLI_AND_OS_OPERATOR_INTERFACE.md)
for argument and output-format applicability. JSONL output from a one-object
diagnostic is not a live event stream. Reserved command names do not promise an
implemented operation.

### Local authentication, setup and protection

The current numeric-loopback browser session uses a bearer header and an
independent proof header retained in exact-origin volatile memory. It does not
use browser cookies. Missing, stale, revoked, expired or mismatched pairs fail
through the closed route denial. Login throttling is isolated per known
identity; protected mutations are limited per verified session. Unknown
identities still perform fixed dummy Argon2 work, so hostile local peers can
consume bounded authentication worker capacity.

Accepted standalone setup direction requires protected local CLI bootstrap and
offline recovery. OS-mediated authentication should verify the local operator
without giving LNSAT the OS password. Installation/service keys require
protected custody and the selected encrypted-storage lifecycle. Unlocking a
key or authenticating locally does not authorize a consequential action.

These OS-authentication and encryption providers are not selected or
implemented as a complete installation. Existing application-local password
authentication is not evidence of OS login integration, full-disk encryption,
application-data encryption or hardware-backed key protection. See
[browser session hardening](docs/architecture/SECURITY_LOOPBACK_BROWSER_SESSION_HEADER_HARDENING.md),
[local authentication availability](docs/architecture/SECURITY_LOCAL_AUTH_AVAILABILITY_AND_UDS_WITHDRAWAL.md)
and the [accepted build sequence](docs/PRODUCT_BUILD_SEQUENCE.md).

## Native Enforcement And Runtime Proof

Docker/OCI is the first planned isolated execution profile. Its authority
cannot be derived solely from caller-supplied Docker JSON, declared mounts,
process IDs or a successful source build. Native observations must establish
their origin, descriptor binding, identity, freshness and selected enforcement
coverage before they can participate in a trusted startup decision.

The private Stage-A source chain includes preparation-journal codecs and Linux
file-custody candidates; POSIX ACL and mountinfo parsing; a self-process procfs
reader candidate; Version/Info decoding; profile/context/challenge binding; and
startup observation, release and result codecs. These pieces are deliberately
private prerequisites. They do not expose an operator entrypoint or complete
the coherent native, daemon, store and revocation integration freeze.

The startup message decoders accept supplied bytes. They validate bounded
framing, closed typed maps, family/context identities, native representations,
Git request bindings and canonical commitments. Observation/result frames have
a 65,536-byte LF-inclusive limit; release frames have an 8,388,608-byte limit,
with a separately bounded 1 MiB patch at its exact selected field. Their sealed
outputs remain unverified data. Parsing a native observation does not make it a
kernel observation, and decoding a release does not release an execution barrier.

The genuine reader source candidate is distinct from actual Linux proof. Held
roots/descriptors, no-follow lookup, procfs origin, drift checks, mount and
namespace relationships, ACLs, SQLite/socket custody and kernel/LSM facts have
specific evidence requirements. An `ENODATA` observation is not silently
reclassified as an empty ACL, effective access or authority. Host-source tests
and synthetic vectors cannot close those Linux evidence gates.

The [startup wire contract](docs/architecture/headless-resource-enforcement/startup-wire-source-spec.md),
[golden vectors](docs/architecture/headless-resource-enforcement/startup-golden-vectors.md)
and [enforcement plan](docs/architecture/headless-resource-enforcement/plan.md)
define these prerequisites. Project Status records which private candidates
exist and which evidence is still missing.

Phase 11 has deterministic proof planning, evidence requirements, private
admission contracts and the store-owned pre-supervisor verifier described
above. The
[operator run packet](docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md)
remains `PREPARED_SOURCE_ONLY_NOT_EXECUTION_READY`. Live executable, image,
profile, launch and manifest identities remain blocking. A runnable proof
driver, authenticated physical source/target identities, authorized disposable
execution and consequence/cleanup evidence remain separate work. No current
source result constitutes Docker support or runtime certification.

## Application, SDK And Agent Integration

Begin with the [developer and agent integration pack](docs/sdk/developer-pack.md).
It maps current source contracts, required feedback behavior and the remaining
V1 SDK/API deliverables. The [SDK index](docs/sdk/README.md),
[TypeScript reference](docs/sdk/typescript-reference.md),
[MCP guide](docs/sdk/mcp.md), [examples](docs/sdk/examples.md) and
[conformance guide](docs/sdk/conformance.md) provide repository-local material.
Workspace packages are `private: true`; a stable published client SDK and
complete executable management tutorials are not yet available.

### Engine and application responsibilities

LNSAT owns policy enforcement, approval validation, execution authorization,
durable state, evidence and recovery semantics. Applications own presentation,
workflow organization and adapters to their chosen enterprise systems.
Rangoon can make setup, policy editing, approval and activity understandable,
but it consumes the same versioned engine contracts as other clients. LNSAT
has no Rangoon dependency or alternate Rangoon authority path.

Enterprise identity, workload identity, policy services, key providers and
audit destinations may supply authenticated inputs through separately scoped
adapters. Identity admission is not action approval; an external policy result
is not an execution grant; telemetry export is not the authoritative receipt.
No named identity provider or management platform is required by the engine.
Each selected integration still needs its own trust, availability, revocation,
privacy and conformance contract.

MCP remains a tool/inspection transport adapter. A2A and framework adapters
convey intent and state; they cannot widen authority. An execution adapter has
additional target-binding, isolation, consequence and cleanup duties that a
read-only transport adapter does not. See
[extension boundaries](docs/architecture/OPEN_CORE_AND_EXTENSION_BOUNDARIES.md).

### Machine errors and actionable feedback

The current deterministic-core `lnsat.error_envelope.v1_0` covers six families:
version, packet, policy decision, approval request, approval decision and audit
event. A failure contains `ok: false`, an error list, `side_effects: []` and
exactly one documented family result field set to `null`. Each error contains
a stable namespaced `code`, RFC 6901 `path`, public-safe `message` and
`severity: "error"`.

For example, the checked-in
[golden error vectors](fixtures/contracts/error-envelope-v1_0.json) bind
unsupported contract negotiation to:

```json
{
  "code": "contract.version.unsupported",
  "path": "/version",
  "severity": "error"
}
```

This is the vector's stable error identity, not a complete response body.
Clients branch on the code and permitted field path; human wording is not
compatibility identity. Rejected raw input must not be reflected into errors.
Protected denials may intentionally stay generic to avoid leaking identity,
resource or policy information.

This envelope describes deterministic contract failures. It is not a universal
post-dispatch error format, and its empty `side_effects` cannot be copied onto
a network timeout as proof that an action never happened. The
[error-envelope source](packages/packets/src/contract-error-envelope-v1.ts)
and selected operation contract define the applicable behavior.

The complete V1 feedback loop remains a delivery requirement. Clients need
authoritative configuration revisions and enforcement state, exact approval
identities, operation/attempt identities, freshness, retry semantics, readback
and reconciliation. The integration pack requires these distinctions:

| Engine state or event                         | Required application behavior                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Unsupported version or capability             | Explain the supported choice; never silently fall back                                         |
| Authentication or policy denial               | Show only authorized guidance; never turn an explanation into permission                       |
| Declared, validated or active configuration   | Display the actual state and revision; parsing does not mean applied                           |
| Approval required or preview stale            | Present the exact authoritative request; obtain a fresh view before confirming changed content |
| Accepted/dispatched operation                 | Preserve durable operation and attempt identity                                                |
| Timeout or disconnect after possible dispatch | Report uncertainty and reconcile; do not blindly resubmit                                      |
| Stop/revocation                               | Distinguish new-admission closure, in-flight consequence, cleanup and final outcome            |
| Event gap or expired view                     | Refresh from the authorized source; missing events do not prove current permission             |

These rows specify accepted behavior, not invented endpoint names or newly
implemented wire fields. Retry policy must be documented per operation. SDKs
must not automatically retry consequential operations by default.

### Building an agent integration

The [agent-facing brief](docs/sdk/developer-pack.md#agent-facing-integration-brief)
belongs beside the exact selected contract in a development task. It requires
the implementation to name the interface/version, caller, resource scope,
action, limits and evidence; preserve operation identity; and test denial,
staleness, replay, revocation and uncertain outcomes as well as success.

Agent prompts, skills, tool descriptions and imported instructions remain
untrusted behavioral input. They cannot enforce OS restrictions, acquire
ambient infrastructure credentials, self-approve, widen policy or suppress
audit. Secrets belong only in their explicitly protected protocol channels;
general action payloads, examples and logs use permitted references.

## Evaluate From Source

Use a development checkout and disposable fixtures. The pinned source tools
are Node.js `22.22.3`, npm `10.9.8`, and Rust `1.97.1` with `rustfmt` and `clippy`.
PostgreSQL is needed only for optional disposable local-beta integration tests.
Scripts do not install toolchains or start databases implicitly.

```sh
git clone https://github.com/hypler-dev/LNSAT.git
cd LNSAT
npm ci
npm run public:check
npm run typecheck:workspaces
npm run test:workspaces
```

To preview the experimental read-only Control Center:

```sh
npm run dev -w @lnsat/console
```

The preview does not enable execution. Follow
[Local Development](docs/LOCAL_DEVELOPMENT.md) for source configuration,
focused tests and troubleshooting. Rust checks reject external Cargo
configuration and named native overrides before tool invocation; they require
a trusted developer host and the existing pinned toolchain. See
[Pinned Rust Toolchain](docs/RUST_TOOLCHAIN.md).

Before proposing a meaningful source change, run the relevant focused checks,
then the repository gates:

```sh
npm run check
npm run public:check
npm run legacy:inventory:check
npm run public-history:review:check
git diff --check
```

`npm run source:check` and `npm run audit:dependencies:check` provide the
documented source and dependency-audit entry points. Use the selected packet's
validation requirements; do not replace a required runtime test with a source
test. Fresh independent review and exact source/direct-child history evidence
remain separate from the command results. The
[contributor workflow](CONTRIBUTING.md#review-workflow) explains the gates.

## Remaining Work Before A Supported V1

The [build sequence](docs/PRODUCT_BUILD_SEQUENCE.md) orders the work; the
[standalone V1 scope](docs/architecture/ADR-0008_LNSAT_STANDALONE_V1_SCOPE.md)
sets the product boundary. The remaining outcome is an owner setting up the
engine, configuring protected access, submitting a request, obtaining the
required distinct-human approval, executing one bounded action, reading its
durable receipt and recovering correctly after restart through the headless
interfaces.

That outcome still requires coherent native enforcement and source freeze,
protected setup/apply and management feedback, complete API/CLI integration,
actual disposable workflow and cleanup proof, selected SDK/developer
conformance, and release-candidate security/recovery/update/rollback evidence.
Packaging follows those gates for an explicitly selected platform/artifact.
A successful build does not select a supported platform.

Design acceptance, source review, merge authorization, runtime execution,
support and release are distinct decisions. Consult the
[compatibility matrix](docs/architecture/COMPATIBILITY_AND_CONFORMANCE_MATRIX.md)
and [release process](docs/RELEASING.md) before making an integration or
distribution claim.

## Learn More And Contribute

- [Architecture and developer guide](docs/architecture/ARCHITECTURE_AND_DEVELOPER_GUIDE.md)
  and [documentation index](docs/DOCS_INDEX.md) provide deeper navigation.
- [Project Status](docs/PROJECT_STATUS.md), [roadmap](docs/ROADMAP.md) and
  [provenance](PROVENANCE.md) record implementation, remaining work and lineage.
- [Contributing](CONTRIBUTING.md), [Governance](GOVERNANCE.md) and
  [Support](SUPPORT.md) describe participation and support boundaries.
- [Open an issue](https://github.com/hypler-dev/LNSAT/issues/new/choose) for a
  reproducible bug or source-evaluation question. Report vulnerabilities
  privately through [Security](SECURITY.md).

Do not put credentials, customer data, private infrastructure details or
unpublished vulnerability information in public issues or pull requests.

LNSAT expands to Layered Network Substrate for Agent Telemetry. Licensed under
Apache License 2.0; see [LICENSE](LICENSE) and [NOTICE](NOTICE).
