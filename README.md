# LNSAT

[![Source verification](https://github.com/hypler-dev/LNSAT/actions/workflows/ci.yml/badge.svg)](https://github.com/hypler-dev/LNSAT/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-pre--release-orange.svg)](docs/PROJECT_STATUS.md)

**Execution authorization and evidence for consequential agent actions.**

LNSAT is an open-source, pre-release authority-layer project for AI agents. It
models consequential requests as versioned packets, evaluates deterministic
policy, records scoped human decisions, and preserves evidence across the
decision path. MCP, A2A, REST, CLI, and browser surfaces are adapters; LNSAT
remains runtime-neutral.

Current repository is experimental source for evaluation and contribution. It
does not yet implement the complete end-to-end lifecycle. It includes contracts,
local and loopback foundations, read-only MCP adapter source, and conformance and
security tests.

> **Pre-release source:** current `0.1.0` source is for evaluation and
> development. APIs and schemas may change. No supported package, binary,
> container, installer, hosted service, production endpoint, or stable
> compatibility promise exists.

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

## Evaluate From Source

### Requirements

- Node.js 22
- npm `10.9.8` (declared by `packageManager`)
- Rust `1.97.1` with `rustfmt` and `clippy` for Rust checks
- PostgreSQL only for optional disposable local-beta integration tests

Repository scripts never install toolchains or start databases implicitly.

### Install and verify

```sh
npm ci
npm run public:check
npm run typecheck:workspaces
npm run test:workspaces
```

Run the complete source gate before proposing a pull request:

```sh
npm run source:check
npm run audit:dependencies:check
```

`source:check` checks formatting, public-source boundaries, migrations, types,
tests, Rust conformance, metadata, and workspace builds. The separate dependency
gate checks current advisories. Neither command publishes, deploys, or approves
a supported release.

Run the experimental, read-only Control Center from the checkout:

```sh
npm run dev -w @lnsat/console
```

See [local development](docs/LOCAL_DEVELOPMENT.md) for focused commands and
troubleshooting.

## Current Source And Limits

From a source checkout, contributors and evaluators can:

- inspect versioned packet, policy, approval, authorization, receipt, and audit
  contracts;
- run TypeScript/Rust conformance and fail-closed security tests;
- exercise experimental local loopback, read-only MCP, CLI inspection, and
  Control Center evidence surfaces;
- review threat, recovery, compatibility, and release-safety decisions;
- prototype against explicitly experimental contracts while accepting breaking
  changes before the first supported release.

Current source is not a production enforcement guarantee. It provides no
supported installer, packaged daemon, hosted control plane, fleet runtime,
certified connector, or stable compatibility promise. Unrestricted or production
runtime dispatch, infrastructure access, production data paths, and published
artifacts are not enabled.

| Area           | Current experimental source                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Contracts      | Versioned packet, policy, approval, audit, knowledge, substrate, and evidence models                              |
| Policy         | Deterministic allow, deny, and approval-required decisions with fail-closed defaults                              |
| Audit          | Append-oriented evidence contracts, idempotency rules, and local PostgreSQL migration foundations                 |
| Durability     | SQLite authority chain, recovery evidence, offline owner recovery, backup, and inert restore                      |
| Local auth     | Same-origin sessions, identity lifecycle, CSRF, approval decisions, and identity/session event reads              |
| Interfaces     | Packet CLI, source-only diagnostics, loopback routes, read-only MCP adapters, and authenticated read-only console |
| Interop        | Experimental MCP v2, bounded legacy, FastMCP 3/4, A2A, OAuth, OTel/SPIFFE, and Registry contracts                 |
| Recovery       | Durable/test-only operation stores, ambiguity and reconciliation rules, and receipt-gated completion              |
| Conformance    | Shared TypeScript/Rust fixtures, security ledger, official SDK/framework checks, and pinned Rust `1.97.1`         |
| Release safety | Documentation, license, metadata, secret-pattern, dependency, build, and public-readiness gates                   |

Exact implementation maturity and required future build order live in
[project status](docs/PROJECT_STATUS.md) and the
[product build sequence](docs/PRODUCT_BUILD_SEQUENCE.md).

## Architecture And Interoperability

LNSAT targets runtime-neutral authorization and durable consequence evidence
above whichever agent, transport, or executor is selected. Read-only MCP stdio
and stateless HTTP-handler adapter source exists; it grants no mutation or
execution authority.

Docker/OCI is planned as the first v1 runtime integration profile. No Docker
adapter, image, installation path, runtime dispatch, or supported deployment
ships today. See
[ADR-0007](docs/architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)
and the
[dated technical comparison](docs/reference/DOCKER_AI_TECHNICAL_COMPARISON.md)
for exact reviewed revisions, current gaps, and claim limits.

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
crates/lnsatd          Loopback-only Rust lnsatd plus source-only lnsatctl diagnostics
fixtures               Synthetic public and cross-language fixtures
interop                Pinned third-party compatibility harnesses
docs                   Architecture, SDK, development, and project guidance
```

Website and management-product source live outside this repository. This
repository contains the open authority-core source.

## Documentation

| Need                       | Start here                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| Understand the system      | [Architecture and developer guide](docs/architecture/ARCHITECTURE_AND_DEVELOPER_GUIDE.md) |
| Set up the workspace       | [Local development](docs/LOCAL_DEVELOPMENT.md)                                            |
| Find all documentation     | [Documentation index](docs/DOCS_INDEX.md)                                                 |
| Use source contracts       | [SDK documentation](docs/sdk/README.md)                                                   |
| Check implementation truth | [Project status](docs/PROJECT_STATUS.md)                                                  |
| Interpret maturity claims  | [Claims and maturity vocabulary](docs/CLAIMS_AND_MATURITY.md)                             |
| Follow future build order  | [Product build sequence](docs/PRODUCT_BUILD_SEQUENCE.md)                                  |
| Review release gates       | [Source release process](docs/RELEASING.md)                                               |

## Community

| Need                                                                               | Channel                                                                                                 |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Report a reproducible bug                                                          | [GitHub issue chooser](https://github.com/hypler-dev/LNSAT/issues/new/choose)                           |
| Ask about source evaluation or report a documentation, build, or compatibility gap | [Community support form](https://github.com/hypler-dev/LNSAT/issues/new?template=community_support.yml) |
| Propose a contribution                                                             | [Contributing guide](CONTRIBUTING.md)                                                                   |
| Understand support scope                                                           | [Support policy](SUPPORT.md)                                                                            |
| Report a vulnerability privately                                                   | [Security policy](SECURITY.md)                                                                          |
| Understand project decisions                                                       | [Governance](GOVERNANCE.md)                                                                             |
| Review participation expectations                                                  | [Code of Conduct](CODE_OF_CONDUCT.md)                                                                   |

Public issues and pull requests must not contain secrets, credentials, customer
data, private topology, or vulnerability details. Community support is
best-effort while LNSAT remains pre-release.

## Design Principles

- Gateway is the security boundary; transports do not grant authority.
- Secrets are references only, never packet or audit values.
- Unknown contracts, capabilities, and evidence fail closed.
- Agents request capabilities; they do not receive direct infrastructure control.
- State-changing authority requires policy, approval, audit, rollback, and tests.
- Gatekeeper models advise; deterministic policy and authenticated humans
  authorize.
- Synthetic fixtures and local-only defaults protect contributor environments.
- Compatibility changes are versioned, documented, and covered by conformance.

## Product Ecosystem

LNSAT is the Apache-2.0 open authority core. Future management products,
certified connectors, governed model packs, and release composition are separate
downstream work, not available products. Portable formats, Gateway authority,
essential security, OS CLI conventions, and conformance remain public-core
concerns.

See [open core and product repositories](docs/architecture/OPEN_CORE_AND_PRODUCT_REPOSITORIES.md),
[CLI and OS operator interface](docs/architecture/CLI_AND_OS_OPERATOR_INTERFACE.md),
and [product-direction alignment](docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md).
These ownership boundaries grant no runtime, connector, package, publication,
or support claim.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing changes. Pull requests
should state rationale, contract impact, security impact, compatibility impact,
and validation evidence. Use public issues only for reports without sensitive
data.

Report vulnerabilities privately through [SECURITY.md](SECURITY.md). Never place
credentials, private data, or exploit details in public issues.

## License

Licensed under Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
