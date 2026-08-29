# LNSAT

[![Source verification](https://github.com/hypler-dev/LNSAT/actions/workflows/ci.yml/badge.svg)](https://github.com/hypler-dev/LNSAT/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-pre--release-orange.svg)](docs/PROJECT_STATUS.md)

```text
 _      _   _  ____    _  _____
| |    | \ | |/ ___|  / \|_   _|
| |    |  \| |\___ \ / _ \ | |
| |___ | |\  | ___) / ___ \| |
|_____||_| \_||____/_/   \_\_|

       INTENT -> AUTHORITY -> EVIDENCE
```

**LNSAT** means **Layered Network Substrate for Agent Telemetry**.

**Execution authorization and evidence for consequential agent actions.**

LNSAT's authority model binds an agent's exact intended action to policy,
approval, one-time authorization, execution, receipt, and
reconciliation—independently of the model, protocol, or runtime that performs
it.

```text
Intent -> Policy -> Approval -> Authorization
       -> Execution -> Receipt -> Audit -> Reconciliation
```

LNSAT is an open-source authority layer for AI agents. It sits between agents
and systems capable of real consequences, turning a proposed action into a
policy decision, a scoped human approval when required, a narrow execution
authorization, and evidence of what happened.

Existing systems keep doing the jobs they already do well. MCP exposes tools.
A2A connects agents. Agent frameworks orchestrate model loops. Docker provides
runtime and isolation. Identity systems authenticate people and workloads. OPA
can evaluate policy. LNSAT adds a consistent authority boundary across those
systems: should this exact action be allowed, under what conditions, and what
evidence will prove the result?

> **Project status:** LNSAT `0.1.0` is pre-release source for evaluation and
> contribution. The repository contains experimental contracts, local and
> loopback foundations, read-only interfaces, bounded execution tests, and
> automated conformance and security checks. APIs may change. No supported
> package, container, installer, hosted service, or production deployment is
> available yet.

See the [provenance timeline](PROVENANCE.md) and
[why LNSAT became public now](docs/WHY_PUBLIC_NOW.md) for the pre-public
chronology and August 20 cutover record.

## Why LNSAT

Giving an agent access to a tool does not answer whether a particular use of
that tool should be authorized. Consequential actions need a boundary that can
answer:

1. What action is being requested?
2. Who requested it, and in which project and environment?
3. Which policy applies?
4. Is approval from a distinct authenticated human required?
5. What exact authorization reaches the executor?
6. What receipt or evidence proves the outcome?

Packets and Gateway make that lifecycle explicit. A packet describes intent;
it never grants authority. Gateway validates the
request, binds identity and scope, evaluates deterministic policy, and creates
a narrow authorization only when every required condition is satisfied. An
adapter may redeem that authorization for one exact operation and must return a
bound receipt or an explicit ambiguous outcome.

LNSAT's version of agent governance is this complete chain. The requested,
approved, authorized, and executed action must match. If the outcome cannot be
proven, it remains `outcome_unknown` and must be reconciled instead of being
reported as success or silently retried.

## How LNSAT Approaches Authority

- **Transport-neutral:** MCP, A2A, REST, CLI, browser, and framework adapters
  map into the same authority contract.
- **Least-authority:** authorization is bound to the exact action, arguments,
  target, adapter, attempt, expiry, and idempotency identity.
- **Fail-closed:** unknown contracts, capabilities, evidence, and outcomes do
  not become permission or success.
- **Human-authorized:** models may recommend or explain; deterministic policy
  and authenticated humans authorize consequential work.
- **Evidence-first:** approvals, authorizations, receipts, recovery, and
  reconciliation remain reviewable.
- **Secret-safe:** packets and evidence carry secret references, not secret
  values.

See the [authority layer and reference workflow](docs/architecture/AUTHORITY_LAYER_AND_REFERENCE_WORKFLOW.md)
for the complete contract model.

## What Works In Source Today

Current experimental source includes:

- versioned packet, policy, approval, authorization, receipt, audit, and
  evidence contracts;
- deterministic allow, deny, and approval-required policy decisions;
- local identity, role, session, CSRF, approval, and credential-lifecycle
  foundations;
- an embedded SQLite authority chain with integrity checks, transactions,
  backup, inert restore, recovery inspection, and append-oriented audit
  evidence;
- a Rust loopback daemon with bounded local routes, strict host and origin
  handling, session-protected identity and session operations, and graceful
  shutdown;
- authenticated owner/operator packet intake that atomically persists exact
  packet and server-time deterministic policy evidence without granting
  approval or execution authority;
- atomic one-time authorization consumption, bounded adapter dispatch, bound
  receipts, `outcome_unknown`, and reconciliation tests against disposable
  local Git targets;
- packet inspection, source diagnostics, and read-only recovery inspection
  through CLI source;
- authenticated, exact-ID, read-only Control Center evidence views with live
  and synthetic data kept separate;
- read-only MCP stdio and HTTP-handler adapters, modern and temporary legacy
  negotiation, and official SDK conformance tests;
- shared TypeScript and Rust fixtures plus fail-closed security,
  compatibility, recovery, dependency, and release-readiness gates.

Some pieces run together as bounded local experimental flows; others remain
source-level contracts and conformance tests. [Project Status](docs/PROJECT_STATUS.md)
tracks the exact implementation state.

## What We Are Building For v1

The first supported release is planned as an owner-controlled, local or
self-hosted, single-node authority product:

- Rust security core, daemon, and operator CLI;
- SQLite as the embedded authority store;
- TypeScript and React Control Center;
- local identities, deterministic policy, distinct-human approval, one-time
  authorization, bounded execution, receipts, reconciliation, and audit in one
  end-to-end loop;
- non-root operation with loopback-default interfaces and explicit startup;
- one isolated local Docker/OCI runtime profile for the first real adapter;
- selected installation artifacts only after their install, update, rollback,
  uninstall, provenance, and compatibility evidence passes.

Work is ordered around four practical milestones:

1. finish operational configuration, visible precedence, authenticated status,
   recovery commands, output formats, and non-root product behavior;
2. prove one complete consequential workflow through an isolated Docker/OCI
   adapter and disposable target;
3. harden recovery, limits, updates, rollback, revocation, dependencies, and
   release-candidate source;
4. build and verify a small set of selected packages and images from the same
   canonical components.

The [Product Build Sequence](docs/PRODUCT_BUILD_SEQUENCE.md) and
[Roadmap](docs/ROADMAP.md) track that work in detail.

## Docker And Other Runtimes

Docker/OCI is the first planned v1 runtime integration because it provides a
widely available local execution boundary and an existing MCP operations
layer. LNSAT plans to use Docker's strengths rather than rebuild them:

- Docker Agent can orchestrate agents and act as a client;
- Docker MCP Gateway can provide MCP catalogs, routing, OAuth, and server
  lifecycle;
- Docker Sandboxes can provide a microVM isolation boundary;
- bounded OCI workloads can execute authorized actions;
- LNSAT independently owns policy, approval, one-time authorization, receipt
  binding, and consequence evidence.

The intended first path is:

```text
agent or MCP client
  -> LNSAT Gateway
  -> identity + policy + approval + one-time authorization
  -> isolated Docker adapter
  -> Docker MCP Gateway or bounded OCI workload
  -> receipt + audit + reconciliation
```

Agents do not receive direct Docker-socket access or ambient infrastructure
credentials. The adapter receives only a narrow, expiring authorization bound
to the exact operation and returns a bound result. Docker governance may add
defense in depth, but an upstream allow does not replace LNSAT authorization.

Docker is the first profile, not the product identity or the only future
runtime. The same authority contract is intended to support:

- independently managed secure VMs and microVMs;
- constrained native-host services with appropriately weaker isolation claims;
- authenticated remote connectors and product-specific adapters.

Bare-metal operation remains a valid future profile, but LNSAT will not claim
that one binary can harden an arbitrary operating system. Native deployments
will need OS accounts, mandatory access controls, network policy, process
isolation, or other controls appropriate to their threat model. Containers and
VMs remain the preferred high-assurance boundaries.

See the accepted [Docker-first runtime-neutral decision](docs/architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)
and the [Docker AI technical comparison](docs/reference/DOCKER_AI_TECHNICAL_COMPARISON.md).

## How LNSAT Relates To The Agent Stack

LNSAT is designed to work beside existing protocols and runtimes rather than
replace them.

| System             | Relationship to LNSAT                                                                      | Current source evidence                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| MCP                | Carries tool discovery and requests; never grants action authority                         | Experimental read-only modern stdio/HTTP handlers, temporary legacy compatibility, and official SDK tests |
| A2A                | Carries delegated agent intent; never grants authority                                     | A2A 1.0 mapping and Gateway contract tests                                                                |
| OPA                | May evaluate a bounded, versioned policy input                                             | OPA-compatible input contracts; no live OPA runtime connection yet                                        |
| Identity           | OIDC, OAuth, and SPIFFE may supply human or workload identity claims                       | Local identity/session source plus experimental OAuth and SPIFFE contract tests                           |
| Telemetry          | OpenTelemetry and CloudEvents carry correlation or evidence-export data, not authorization | OTel correlation contracts and Gateway tests                                                              |
| Agent frameworks   | Orchestrate models and tools, then propose actions through adapters                        | FastMCP 3.4.5 and FastMCP 4.0.0b1 interoperability harnesses                                              |
| REST, CLI, browser | Alternative interfaces over the same Gateway semantics                                     | Shared contract and read-only evidence tests                                                              |

Transport, framework, runtime, and policy metadata may inform a decision, but
none can grant approval or widen authority by itself.

Current build position: Phase 8 bounded runtime composition and Phase 9
authenticated, exact-ID Control Center readback are implemented as experimental
source. Phase 10 P10-A1 product-surface spine, P10-A2 explicit configuration,
and P10-A3 authenticated local health/status transport plus stable operator
output formats are implemented. P10-A4 adds non-root offline recovery and
closed API/MCP/UI parity; P10-X1 completes Phase 10 source conformance. Phase 11
now has one experimental served reference proof over the existing eight Phase 8
loopback routes and a marked disposable Git fixture. The client discards the
execute response, restarts the daemon, then resolves the unknown outcome only
through authenticated evidence readback and reconciliation. It opens no new
route, production target, or support claim. P11-D1 adds a closed source-only
`lnsat.runtime_profile.docker_local.v1` profile, strict file/parser validation,
canonical profile/configuration digests, and an exact pre-dispatch
execution-request binding check. It does not select or open a Docker endpoint,
invoke Docker, provide an adapter or image, add a route, or grant execution
authority. P11-D2 lets one explicit daemon configuration select and validate
that profile file, retains its closed evidence for later packets, and adds
public-safe `lnsatctl config inspect` readback of profile identity plus profile
and authority-configuration digests. It opens no Docker endpoint, socket,
process, image operation, mount, route, dispatch, receipt, or execution
authority. P11-D3 adds the closed source-only
`lnsat.adapter_process_protocol.docker_local.v1` single-frame canonical JSON
request/result contract. It binds operation, approved action, authorization,
idempotency, attempt, profile, configuration, adapter, executable, image, and
audience identities; caps stdin/stdout/stderr observations and deadlines; and
rejects malformed, duplicate, truncated, oversized, substituted, timed-out,
or ambiguous results without reflecting paths or source bytes. It launches no
process, opens no Docker surface, and creates no consequence or receipt.
P11-I1 adds authenticated same-origin `POST /v1/packets` intake for active
owner/operator sessions with CSRF and exact actor/session binding. One atomic
transaction persists immutable packet evidence plus its server-time
deterministic policy decision; exact replay returns original evidence. It
creates no approval, execution authorization, adapter dispatch, Docker action,
repository consequence, or receipt. P11-D4A closes the executable-payload gap
left by the digest-only D3 control frame. One bounded canonical wrapper now
carries the exact approved execution request and cross-binds execution,
action, target, configuration, adapter executable, audience, and shared Git
tool-argument digests. Payload drift, duplicate/unknown fields, noncanonical
framing, and oversize input fail with code-only errors. It launches no process,
opens no Docker endpoint, and creates no consequence or receipt. Phase 11
remains incomplete and separately gated; P11-D4B supervised isolated Docker
execution is next.
Required path is Phase 8 -> Phase 9 -> Phase 10 -> Phase 11 -> Phase 13 -> Phase 14. Supported
binaries and packages come only after required product/runtime work and
release-candidate source freeze. See
[product build sequence](docs/PRODUCT_BUILD_SEQUENCE.md).

## Repository Map

```text
apps/api               Gateway inspection and loopback control-plane source
apps/console           Read-only live Gateway evidence plus separate synthetic fixtures
packages/gateway       Transport-neutral inspection, recovery, identity, and interop contracts
packages/packets       Versioned packet and governance contracts
packages/policy        Policy decisions and approval gates
packages/audit         Audit contracts and PostgreSQL writer foundation
packages/mcp           Read-only dual-era MCP stdio and stateless HTTP-handler source
packages/cli           Current lnsat dispatcher and packet CLI source
packages/core          Product identity and shared source constants
crates/lnsat-contracts Minimal Rust contract crate
crates/lnsat-auth      Versioned local credential foundation
crates/lnsat-store     Embedded SQLite durability foundation
crates/lnsatd          Loopback-only Rust lnsatd plus sibling source-only lnsatctl diagnostics
fixtures               Synthetic public and cross-language fixtures
interop                Pinned third-party compatibility harnesses
docs                   Architecture, SDK, development, and project guidance
```

Website and management-product source live outside this repository. This
repository contains LNSAT product source only.

## Product Ecosystem

This repository contains the Apache-2.0 authority core. Future management
applications, certified connector packs, governed model profiles, and release
composition will build on the same public contracts. They may improve how
people configure, operate, and extend LNSAT, but they cannot create an alternate
authority path or weaken Gateway decisions.

Portable formats, security behavior, compatibility tests, and operator
conventions remain public-core concerns. See [Open Core and Product Repositories](docs/architecture/OPEN_CORE_AND_PRODUCT_REPOSITORIES.md)
and the [CLI and OS Operator Interface](docs/architecture/CLI_AND_OS_OPERATOR_INTERFACE.md)
for those boundaries.

## Evaluate From Source

### Requirements

- Node.js 22
- npm `10.9.8` (declared by `packageManager`)
- Rust `1.97.1` with `rustfmt` and `clippy`
- PostgreSQL only for optional disposable local-beta integration tests

Repository scripts never install toolchains or start databases implicitly.

```sh
npm ci
npm run public:check
npm run typecheck:workspaces
npm run test:workspaces
```

Run the complete source and dependency gates before proposing a pull request:

```sh
npm run source:check
npm run audit:dependencies:check
```

Run the experimental, read-only Control Center from the checkout:

```sh
npm run dev -w @lnsat/console
```

See [Local Development](docs/LOCAL_DEVELOPMENT.md) for focused commands and
troubleshooting.

## Documentation

| Need                       | Start here                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| Understand the system      | [Architecture and Developer Guide](docs/architecture/ARCHITECTURE_AND_DEVELOPER_GUIDE.md) |
| Check implementation truth | [Project Status](docs/PROJECT_STATUS.md)                                                  |
| Follow the v1 build order  | [Product Build Sequence](docs/PRODUCT_BUILD_SEQUENCE.md)                                  |
| Understand maturity claims | [Claims and Maturity](docs/CLAIMS_AND_MATURITY.md)                                        |
| Use source contracts       | [SDK Documentation](docs/sdk/README.md)                                                   |
| Review release gates       | [Source Release Process](docs/RELEASING.md)                                               |
| Find every document        | [Documentation Index](docs/DOCS_INDEX.md)                                                 |

## Community

- Report reproducible bugs through the [issue chooser](https://github.com/hypler-dev/LNSAT/issues/new/choose).
- Ask source-evaluation, documentation, build, or compatibility questions
  through the [community support form](https://github.com/hypler-dev/LNSAT/issues/new?template=community_support.yml).
- Read [Contributing](CONTRIBUTING.md), [Governance](GOVERNANCE.md), and
  [Support](SUPPORT.md) before proposing larger changes.
- Report vulnerabilities privately through [Security](SECURITY.md).

Public issues and pull requests must not contain secrets, credentials, customer
data, private topology, or vulnerability details.

<details>
<summary>Repository layout</summary>

```text
apps/api               Gateway inspection and loopback control-plane source
apps/console           Read-only live Gateway evidence plus synthetic fixtures
packages/gateway       Transport-neutral authority and interop contracts
packages/packets       Versioned packet and governance contracts
packages/policy        Deterministic policy and approval gates
packages/audit         Audit contracts and PostgreSQL writer foundation
packages/mcp           Read-only MCP stdio and HTTP-handler source
packages/cli           Dispatcher and packet CLI source
packages/core          Product identity and shared source constants
crates/lnsat-contracts Rust contract primitives
crates/lnsat-auth      Local authentication primitives
crates/lnsat-store     Embedded SQLite authority and durability foundation
crates/lnsatd          Loopback daemon and operator CLI source
fixtures               Public and cross-language conformance fixtures
interop                Pinned third-party compatibility harnesses
docs                   Architecture, SDK, development, and project guidance
```

</details>

## License

Licensed under Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
