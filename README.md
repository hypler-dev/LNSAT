# LNSAT

[![Source verification](https://github.com/hypler-dev/LNSAT/actions/workflows/ci.yml/badge.svg)](https://github.com/hypler-dev/LNSAT/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-pre--release-orange.svg)](docs/PROJECT_STATUS.md)

**Give agents useful access without handing them unrestricted authority.**

LNSAT is an open-source authorization and evidence layer for AI-agent actions.
It connects a proposed action to deterministic policy, human approval when
required, narrowly scoped execution, and a record of what actually happened.

**Execution authorization and evidence for consequential agent actions.**

> **Available today: pre-release source for developers and evaluators.**
> LNSAT `0.1.0` contains experimental implementations and tests, not a supported
> production product. No supported installer, package, container, or hosted
> service is available. Real Docker runtime proof remains unfinished. APIs and
> schemas may change. Rangoon's graphical installer and management UI are
> separate downstream work.

[Evaluate from source](#evaluate-from-source) · [Project status](docs/PROJECT_STATUS.md) ·
[Documentation](docs/DOCS_INDEX.md) · [Contribute](CONTRIBUTING.md)

## Why LNSAT?

A tool connection answers **what an agent can reach**. It does not establish
whether a particular action should happen, who approved it, or whether it
actually succeeded.

LNSAT is being built for developers connecting agents to consequential tools,
operators who need explicit approval controls, and platform builders who need
an authority service independent of their models and orchestration framework.

Its authority model addresses four questions:

- **Should this action be allowed?** Deterministic policy evaluates the exact
  actor, action, target, and constraints. Model output is not permission.
- **Who must approve it?** An authenticated human decision binds to the exact
  request; approval is distinct from execution authorization.
- **What may execute?** A bounded adapter receives a short-lived, one-time
  authorization—not general access to infrastructure.
- **What happened?** Receipts, audit evidence, and reconciliation distinguish
  confirmed consequences from uncertain outcomes.

## A Concrete Workflow

Consider an agent proposing a change to a disposable Git repository—the
reference workflow exercised by current experimental source tests:

```text
Agent proposes an exact action
              ↓
Gateway checks identity, scope, and policy
              ↓
Human approves when required
              ↓
One-time authorization permits one bounded attempt
              ↓
Adapter acts on the approved target
              ↓
Evidence confirms the consequence—or outcome stays unknown
```

The requested, approved, authorized, and executed action must match. Changing
the target or arguments does not inherit the earlier approval.

If a response is lost, LNSAT must not assume the action failed and blindly retry.
An uncertain outcome remains `outcome_unknown` until appropriate evidence can
resolve it. A Git consequence receipt alone is not proof of container cleanup.

This is a tested development workflow, not permission to operate on production
or user repositories. Read the [authority model](docs/architecture/AUTHORITY_LAYER_AND_REFERENCE_WORKFLOW.md)
and [threat model](docs/architecture/THREAT_MODEL.md) for the boundaries.

## What You Can Evaluate Today

The repository contains experimental source for:

- **Identity and policy:** local identities, scoped roles, sessions, CSRF
  protection, deterministic decisions, and approval contracts.
- **Authorization and recovery:** one-time consumption, bounded Git adapter
  tests, durable attempt evidence, receipts, and restart/reconciliation cases.
- **Local service foundations:** a Rust loopback daemon, SQLite authority store,
  operator CLI diagnostics, offline backup, and recovery foundations.
- **Control Center:** read-only evidence views with an explicit authenticated
  operation lookup and separately labeled synthetic previews.
- **Integration contracts:** read-only MCP adapters, SDK/conformance fixtures,
  and transport-neutral authority interfaces.

These are not all enabled together as a supported runtime. Real Docker
execution, complete runtime cleanup proof, supported installation, and release
verification remain separate gates. [Project Status](docs/PROJECT_STATUS.md)
owns detailed implementation truth; [Claims and Maturity](docs/CLAIMS_AND_MATURITY.md)
explains the labels.

## The LNSAT Core and Rangoon Boundary

LNSAT V1 is planned as an embeddable authority kernel/library with a stable
integration API and complete headless `lnsatctl` configuration and operations.
The optional `lnsatd` reference host/sidecar provides a local service boundary
for consumers that need one. LNSAT remains fully usable without Rangoon.

Rangoon is a separate userland/distro that may provide the graphical installer,
setup wizard, presets, configuration pages, approvals, audit, recovery, graphs,
agents, fleets, and final packaging. It installs or bundles a pinned, verified
LNSAT version and submits requests through LNSAT's versioned interface.

Rangoon recovery surfaces are limited to online Gateway-authorized requests,
status, evidence, and host-owner instructions. They cannot invoke LNSAT's
offline backup, inert restore, owner recovery, or initial bootstrap operations,
which remain local `lnsatctl`-only procedures with no agent, API, MCP, or UI
route.

Rangoon never edits LNSAT storage, computes effective permissions, or executes
consequential work outside LNSAT. LNSAT independently validates, authorizes,
executes, and produces evidence.

The LNSAT headless configuration contract separates:

1. **LNSAT resource access:** which repositories, folders, services, and OS
   resources the installation may reach.
2. **Agent action authority:** what agents may request within that envelope,
   what requires human approval, and what is denied.

Rangoon may render observe-only, approval-required, bounded-automation, and
custom presets as a user experience. LNSAT validates the resulting declarative
configuration and computes effective authority; presets cannot silently grant
access, and an unverifiable OS restriction cannot be advertised as enforced.

`lnsatctl` will expose permission changes, approvals, activity evidence,
emergency disablement, recovery, declarative configuration, validation, and
status through protected interfaces. The existing React console remains an
experimental read-only source preview; it is not an LNSAT V1 exit requirement.
See the [kernel and Rangoon boundary](docs/architecture/ADR-0008_LNSAT_KERNEL_AND_RANGOON_USERLAND_BOUNDARY.md).

Docker/OCI is the first planned isolated execution profile. Platform and package
support will be claimed only for explicitly selected, tested combinations—not
inferred from a successful build. See the [build sequence](docs/PRODUCT_BUILD_SEQUENCE.md)
and [compatibility matrix](docs/architecture/COMPATIBILITY_AND_CONFORMANCE_MATRIX.md).

## Product Ecosystem

LNSAT supplies authority, not a replacement for the rest of the agent stack:

- **MCP and other tool transports** connect clients and tools; a connection is
  not authorization for a concrete action.
- **Models and agent frameworks** propose and orchestrate work; they do not
  approve their own permissions.
- **Runtime isolation** constrains execution; it does not replace policy,
  approval, or consequence evidence.
- **Rangoon and other downstream products** may provide policy intelligence or
  additional management experiences. They can use a compatible LNSAT service
  or install a pinned, verified release once available. LNSAT remains independent.

Gateway is the security boundary. Clients, connectors, and UIs cannot create an
alternate authority path. LNSAT cannot control a bypass path that retains direct
credentials or unmediated infrastructure access; that coverage must be constrained
or explicitly identified as missing.

The core is Apache-2.0. See [product boundaries](docs/architecture/OPEN_CORE_AND_PRODUCT_REPOSITORIES.md)
and [CLI and OS interfaces](docs/architecture/CLI_AND_OS_OPERATOR_INTERFACE.md).

## Evaluate From Source

Use a development checkout and disposable fixtures, not production data.
Requirements: Node.js 22, npm `10.9.8`, and Rust `1.97.1` with `rustfmt` and
`clippy` for the full source checks. PostgreSQL is needed only for optional
disposable local-beta integration tests. Scripts do not install toolchains or
start databases implicitly.

```sh
git clone https://github.com/hypler-dev/LNSAT.git
cd LNSAT
npm ci
npm run public:check
npm run typecheck:workspaces
npm run test:workspaces
```

Preview the experimental read-only Control Center:

```sh
npm run dev -w @lnsat/console
```

The preview is not Rangoon's planned setup wizard and does not enable agent
execution.
See [Local Development](docs/LOCAL_DEVELOPMENT.md) for configuration, focused
tests, and troubleshooting. Before proposing a source change, run:

```sh
npm run source:check
npm run audit:dependencies:check
```

Source checks are not supported-release approval. The separate
[release process](docs/RELEASING.md) requires runtime, security, and artifact
lifecycle evidence before publication.

## Learn More And Contribute

- [Architecture](docs/architecture/ARCHITECTURE_AND_DEVELOPER_GUIDE.md) and
  [SDK documentation](docs/sdk/README.md) explain the contracts and components.
- [Roadmap](docs/ROADMAP.md) tracks remaining work;
  [provenance](PROVENANCE.md) preserves project history and source lineage.
- [Documentation index](docs/DOCS_INDEX.md) links the complete reference material.
- [Contributing](CONTRIBUTING.md), [Governance](GOVERNANCE.md), and
  [Support](SUPPORT.md) describe how to participate.
- [Open an issue](https://github.com/hypler-dev/LNSAT/issues/new/choose) for a
  reproducible bug or source-evaluation question. Report vulnerabilities
  privately through [Security](SECURITY.md).

Do not put credentials, customer data, private infrastructure details, or
unpublished vulnerability information in public issues or pull requests.

<details>
<summary>Runtime proof status for contributors</summary>

Earlier checkpoint wording described the plan as: “The next source checkpoint adds a deterministic proof-plan contract”.
It remains design evidence only: the plan grants no runtime result, receipt, or support.
The source-only evidence-requirements contract and readiness tests are checked in;
they do not constitute real runtime evidence or complete Phase 11.
See the [proof-readiness plan](docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_READINESS.md)
and [execution evidence requirements](docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_EXECUTION_EVIDENCE_REQUIREMENTS.md).

</details>

LNSAT expands to Layered Network Substrate for Agent Telemetry. Licensed under
Apache License 2.0; see [LICENSE](LICENSE) and [NOTICE](NOTICE).
