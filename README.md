# LNSAT

[![Source verification](https://github.com/hypler-dev/LNSAT/actions/workflows/ci.yml/badge.svg)](https://github.com/hypler-dev/LNSAT/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-pre--release-orange.svg)](docs/PROJECT_STATUS.md)

**Execution authorization and evidence for consequential agent actions.**

LNSAT is being built as a policy-governed authority layer for AI-agent
actions. The intended product turns intent into versioned packets, evaluates
authority, requires scoped human approval when policy demands it, and preserves
evidence across the decision path.

MCP exposes tools. LNSAT's intended boundary determines whether a proposed
action may execute and records proof. Public product name is simply **LNSAT**;
an older telemetry-oriented expansion is retired.

Current repository contains experimental source and automated tests for
versioned contracts, local authority persistence, bounded loopback behavior,
read-only protocol adapters, and evidence inspection. Some deeper consequence
authorization and disposable Git-adapter behavior exists only as source-level
conformance and is not exposed as a supported product workflow. See
[project status](docs/PROJECT_STATUS.md) for exact merged truth.

> **Pre-release:** current `0.1.0` source is for evaluation and development.
> APIs and schemas may change. No package, binary, container, hosted service, or
> production endpoint is published from this repository.

## Useful Today

From a source checkout, contributors and evaluators can:

- inspect versioned packet, policy, approval, authorization, receipt, and audit
  contracts;
- run TypeScript/Rust conformance and fail-closed security tests;
- exercise experimental local loopback, read-only MCP, CLI inspection, and
  Control Center evidence surfaces;
- review threat, recovery, compatibility, and release-safety decisions;
- build integrations against explicitly experimental contracts while accepting
  breaking changes before first supported release.

Current source is not a production enforcement guarantee. It provides no
supported installer, packaged daemon, hosted control plane, fleet runtime,
certified connector, or stable compatibility promise.

## Why LNSAT

Agent systems need more than tool access. Consequential actions need a boundary
that can answer five questions before execution:

1. What is being requested?
2. Who or what requested it?
3. Which policy applies?
4. Is human approval required?
5. What evidence proves the decision?

LNSAT models that path explicitly:

```text
Intent -> Packet -> Gateway -> Policy -> Approval -> Authorization
       -> Adapter -> Receipt -> Audit
```

Packets describe intent; they never grant authority. Gateway owns validation
and authorization boundaries. MCP, CLI, API, and console surfaces remain
adapters over those contracts.

See [authority layer and reference workflow](docs/architecture/AUTHORITY_LAYER_AND_REFERENCE_WORKFLOW.md)
for LNSAT's relationship to MCP, A2A, identity, OPA, attestations, and evidence
export.

### Runtime integrations: Docker first

Docker Agent, Docker MCP Gateway, and Docker Sandboxes are adjacent systems,
not targets for LNSAT to rebuild. Docker already provides a substantial agent
runtime, MCP operations layer, catalog, and microVM isolation. LNSAT targets a
different boundary: runtime-neutral authorization and durable consequence
evidence above whichever agent, transport, or executor is selected.

Docker/OCI is now the accepted first v1 integration profile while core
authority contracts remain runtime-neutral. Current LNSAT source does not ship
that integration or any supported container, VM, remote, or bare-metal runtime.
See [ADR-0007](docs/architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)
and the
[dated technical comparison](docs/reference/DOCKER_AI_TECHNICAL_COMPARISON.md)
for exact reviewed revisions, Docker strengths, current gaps, and claim limits.

## Current Source Capabilities

| Area           | Current source                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Contracts      | Versioned packet, policy, approval, audit, knowledge, substrate, and evidence models                                                       |
| Policy         | Deterministic allow, deny, and approval-required decisions with fail-closed defaults                                                       |
| Audit          | Append-oriented evidence contracts, idempotency rules, and local PostgreSQL migration foundations                                          |
| Durability     | SQLite authority chain, recovery evidence, offline owner recovery, backup, and inert restore                                               |
| Local auth     | Same-origin sessions, identity lifecycle, CSRF, approval decisions, and identity/session event reads                                       |
| Interfaces     | Packet CLI, source-only operator diagnostics/recovery inspection, loopback routes, dual-era read-only MCP, authenticated read-only console |
| Interop        | Native MCP v2, bounded legacy, FastMCP 3/4, A2A, OAuth, OTel/SPIFFE, and Registry contracts                                                |
| Recovery       | Durable/test-only operation stores, ambiguity/reconciliation rules, receipt-gated completion                                               |
| Conformance    | Shared TS/Rust fixtures, security ledger, official SDK/framework checks, Rust `1.97.1`                                                     |
| Release safety | Documentation, license, metadata, secret-pattern, dependency, build, and public-readiness gates                                            |

Runtime dispatch, unrestricted infrastructure access, production data paths,
and published artifacts are not enabled. See [project status](docs/PROJECT_STATUS.md)
and [roadmap](docs/ROADMAP.md) for exact boundaries.

Current build position: Phase 8 bounded runtime composition and Phase 9
authenticated, exact-ID Control Center readback are implemented as experimental
source. Phase 10 P10-A1 target-neutral product-surface contract spine is
implemented; Phase 10 remains in progress. Required path is Phase 8 -> Phase 9
-> Phase 10 -> Phase 11 -> Phase 13 -> Phase 14. Supported
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

LNSAT source is Apache-2.0 authority core. Future management products,
certified connectors, governed model packs, and release composition remain
separate downstream work. Names and boundaries below describe ownership, not
available products. Downstream systems must not fork or replace Gateway
authority behavior.

| System              | Current state       | Role                                                                                                 |
| ------------------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| LNSAT core          | Experimental source | Authority contracts, local daemon/CLI foundations, Control Center source, conformance, release gates |
| Management plane    | Planned             | Visual configuration, shared libraries, collaboration, and organization operations                   |
| Connectors          | Contracts only      | Isolated product-specific adapters consuming one-time authorization and returning bound receipts     |
| Model profiles      | Planned             | Advisory delegation, overlays, provenance, evaluation, and compatibility evidence                    |
| Release composition | Planned             | Exact core/module digest assembly, promotion, update, rollback, and revocation policy                |

See [open core and product repositories](docs/architecture/OPEN_CORE_AND_PRODUCT_REPOSITORIES.md),
[agent configuration and skill management](docs/architecture/AGENT_CONFIGURATION_SKILL_AND_CONTEXT_MANAGEMENT.md),
and [CLI and OS operator interface](docs/architecture/CLI_AND_OS_OPERATOR_INTERFACE.md).
Repository creation does not claim any commercial or runtime feature exists.
The accepted decision is
[ADR-0003](docs/architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md);
[product-direction alignment](docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md)
maps that decision across public documentation.

## Getting Started

### Requirements

- Node.js 22
- npm `10.9.8` (declared by `packageManager`)
- Rust `1.97.1` with `rustfmt` and `clippy` for Rust checks
- PostgreSQL only for optional disposable local-beta integration tests

Repository scripts never install toolchains or start databases implicitly.

### Install and verify

```sh
npm ci
npm run typecheck:workspaces
npm run test:workspaces
npm run build
npm run mcp:official-conformance
npm run security:conformance:check
```

Run the read-only Control Center:

```sh
npm run dev -w @lnsat/console
```

Before opening a pull request:

```sh
npm run source:check
npm run audit:dependencies:check
```

`source:check` checks formatting, scans public-source boundaries, validates
migrations, typechecks, tests, runs Rust conformance, verifies metadata, and
builds every workspace. It does not publish, deploy, or approve a supported
release. `release:check` adds supported-release evidence and intentionally fails
current public-snapshot mode until public-history-native review evidence and a
dedicated exact release-source review gate exist.

## Documentation

| Need                        | Start here                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Understand system           | [Architecture and developer guide](docs/architecture/ARCHITECTURE_AND_DEVELOPER_GUIDE.md)                                |
| Set up workspace            | [Local development](docs/LOCAL_DEVELOPMENT.md)                                                                           |
| Find all docs               | [Documentation index](docs/DOCS_INDEX.md)                                                                                |
| Use source contracts        | [SDK documentation](docs/sdk/README.md)                                                                                  |
| MCP and interop status      | [MCP 2026-07-28 interoperability and recovery](docs/architecture/MCP_V2_FASTMCP_INTEROPERABILITY_AND_OUTAGE_RECOVERY.md) |
| Check maturity              | [Project status](docs/PROJECT_STATUS.md)                                                                                 |
| Interpret claims            | [Claims and maturity vocabulary](docs/CLAIMS_AND_MATURITY.md)                                                            |
| Compare with Docker AI      | [Docker AI technical comparison](docs/reference/DOCKER_AI_TECHNICAL_COMPARISON.md)                                       |
| Follow build order          | [Product build sequence](docs/PRODUCT_BUILD_SEQUENCE.md)                                                                 |
| Review release gates        | [Source release process](docs/RELEASING.md)                                                                              |
| Understand security policy  | [Security policy](SECURITY.md)                                                                                           |
| Understand product boundary | [Open core and product repositories](docs/architecture/OPEN_CORE_AND_PRODUCT_REPOSITORIES.md)                            |
| Plan OS automation          | [CLI and OS operator interface](docs/architecture/CLI_AND_OS_OPERATOR_INTERFACE.md)                                      |

## Design Principles

- Gateway is the security boundary; transports do not grant authority.
- Secrets are references only, never packet or audit values.
- Unknown contracts, capabilities, and evidence fail closed.
- Agents request capabilities; they do not receive direct infrastructure control.
- State-changing authority requires policy, approval, audit, rollback, and tests.
- Managed instructions, skills, profiles, context, and model overlays are
  versioned inputs, never authority.
- Gatekeeper models advise; deterministic policy and authenticated humans
  authorize.
- Synthetic fixtures and local-only defaults protect contributor environments.
- Compatibility changes are versioned, documented, and covered by conformance.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing changes. Pull requests
should state rationale, contract impact, security impact, compatibility impact,
and validation evidence. Use [GitHub issues](https://github.com/hypler-dev/LNSAT/issues)
for public bugs and feature requests without sensitive data.

Report vulnerabilities privately through instructions in
[SECURITY.md](SECURITY.md). Never place credentials, private data, or exploit
details in public issues.

## License

Licensed under Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
