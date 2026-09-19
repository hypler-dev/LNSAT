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
> schemas may change. The Control Center remains an experimental read-only
> preview while the headless V1 control surface is completed.

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

### Local authentication posture

The pre-release numeric-loopback browser session uses one bearer header plus an
independent proof header held only in exact-origin volatile memory; it does not
use browser cookies. Missing, stale, revoked, expired, or mismatched pairs fail
through the same closed route denial. Authenticated health/status over the Unix
control socket is withdrawn and fails before secret input or transport work.
Login throttling is isolated per known identity, while protected mutations are
limited per verified session. Unknown-identity denials still perform fixed
dummy Argon2 work, so a hostile loopback-local peer can consume bounded
authentication worker capacity. See the
[browser session hardening record](docs/architecture/SECURITY_LOOPBACK_BROWSER_SESSION_HEADER_HARDENING.md)
and [local authentication availability record](docs/architecture/SECURITY_LOCAL_AUTH_AVAILABILITY_AND_UDS_WITHDRAWAL.md).
These source controls grant no merge, runtime, build, publication, deployment,
or release authority.

## LNSAT V1 Product Surface

LNSAT V1 is an embeddable authority runtime and package with a stable
integration API and complete headless `lnsatctl` configuration and operations.
The optional `lnsatd` reference host/sidecar provides a local service boundary
when a process boundary is useful. LNSAT independently validates, authorizes,
executes, and produces evidence.

The LNSAT product surface includes policy, approval, execution authorization,
evidence, recovery, configuration, status, and interoperability contracts. The
Control Center may present these contracts as read-only or mutation-capable
experiences only through the Gateway and its versioned interfaces.

The LNSAT headless configuration contract separates:

1. **LNSAT resource access:** which repositories, folders, services, and OS
   resources the installation may reach.
2. **Agent action authority:** what agents may request within that envelope,
   what requires human approval, and what is denied.

The Control Center may render observe-only, approval-required,
bounded-automation, and custom presets as a user experience. LNSAT validates
the resulting declarative configuration and computes effective authority;
presets cannot silently grant access, and an unverifiable OS restriction cannot
be advertised as enforced.

`lnsatctl` will expose permission changes, approvals, activity evidence,
emergency disablement, recovery, declarative configuration, validation, and
status through protected interfaces. The existing React console remains an
experimental read-only source preview; it is not an LNSAT V1 exit requirement.
See the [standalone V1 scope](docs/architecture/ADR-0008_LNSAT_STANDALONE_V1_SCOPE.md).

Docker/OCI is the first planned isolated execution profile. Platform and package
support will be claimed only for explicitly selected, tested combinations—not
inferred from a successful build. See the [build sequence](docs/PRODUCT_BUILD_SEQUENCE.md)
and [compatibility matrix](docs/architecture/COMPATIBILITY_AND_CONFORMANCE_MATRIX.md).

## Interoperability

LNSAT supplies authority, not a replacement for the rest of the agent stack:

- **MCP and other tool transports** connect clients and tools; a connection is
  not authorization for a concrete action.
- **Models and agent frameworks** propose and orchestrate work; they do not
  approve their own permissions.
- **Runtime isolation** constrains execution; it does not replace policy,
  approval, or consequence evidence.
  Gateway is the security boundary. Clients, connectors, and UIs cannot create an
  alternate authority path. LNSAT cannot control a bypass path that retains direct
  credentials or unmediated infrastructure access; that coverage must be constrained
  or explicitly identified as missing.

The core is Apache-2.0. See [extension boundaries](docs/architecture/OPEN_CORE_AND_EXTENSION_BOUNDARIES.md)
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

The preview does not enable agent execution.
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

The source now includes deterministic proof-plan, evidence-requirements, a
source-only execution-harness contract, a private run-manifest contract, and a
private served-driver admission evaluator. The evaluator structurally binds the
canonical run manifest to fields in a caller-supplied claim snapshot, the
canonical D3/D4A payload, the loaded profile, and the launch-contract digest. It
rejects replay, profile-derived D3 limit drift, state/receipt/reconciliation
ambiguity, and binding drift without writing to the store or performing route,
filesystem, process, Docker, receipt, evidence, selector, or runtime work. Its
output explicitly authenticates no claim snapshot, revalidates no durable claim
state, and grants no launch permission. A later runnable driver must perform an
authenticated durable-store re-read of the exact bound consumption, operation,
and attempt immediately before process creation, then revalidate created,
dispatching, no-receipt, and no-reconciliation state. These remain proposed design evidence only: none
grants a runtime result, receipt, execution, completion, or support claim. The
execution-harness contract has [independent source review](docs/reference/public-history-reviews/PHR-0005/review.json),
but it is not a runnable proof driver. The private run-manifest contract only
binds syntactically valid later declarations to a separately supplied expected
source-root/revision/build identity, rejects evidence beneath that source root
or disposable target root, and rejects declared source/target path overlap
lexically. JSON alone never grants permission or proves physical filesystem
identity or disjointness.
A later driver must resolve and authenticate the physical source and target
identities and revalidate their disjointness immediately before process creation.
It does not constitute real runtime evidence or complete Phase 11.
See the [proof-readiness plan](docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_READINESS.md)
and [execution evidence requirements](docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_EXECUTION_EVIDENCE_REQUIREMENTS.md).
The [operator run packet](docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md)
locks the merged public source revision and makes every later identity,
admission, case, limit, evidence, cleanup, and pass/fail requirement explicit.
It is source-only and not execution-ready: a later runnable driver must
authenticate the created-claim result and re-read the exact bound consumption,
operation, and attempt through the durable-store boundary immediately before
process creation. All live executable, image, profile, launch, and manifest
identities remain blocking until a separately reviewed and explicitly
authorized run.

</details>

LNSAT expands to Layered Network Substrate for Agent Telemetry. Licensed under
Apache License 2.0; see [LICENSE](LICENSE) and [NOTICE](NOTICE).
