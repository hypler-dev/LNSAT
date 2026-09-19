# Architecture and Developer Guide

- Status: current source guide; product remains pre-release and unsupported

LNSAT is being built to provide execution authorization and evidence for
consequential AI-agent actions. This guide maps target product concepts to
current repository source and explains how to make safe, reviewable changes.

## Mental Model

```text
Intent -> Packet -> Gateway -> Policy -> Approval -> Authorization
       -> Adapter -> Receipt -> Audit
```

Intent is untrusted. A packet gives it a versioned shape. Gateway validates and
owns the security boundary. Policy decides authority. Approval supplies scoped
human evidence when required. Gateway issues one-time authorization only after
every required gate is proven. Adapter returns exact receipt; audit preserves
requested, approved, authorized, executed, rejected, and recovery evidence.

Current repository scope emphasizes contracts, deterministic evaluation,
inspection surfaces, local audit persistence artifacts, and a fixture-backed
console. It does not claim unrestricted runtime or production integration.

## Workspace Map

```text
apps/api                 loopback API and Gateway inspection routes
apps/console             read-only product console
packages/gateway         transport-neutral Gateway inspection handlers
packages/core            product identity and shared source constants
packages/packets         versioned packet and evidence contracts
packages/policy          policy and approval evaluation
packages/audit           audit contracts and migration artifacts
packages/mcp             read-only MCP adapter
packages/cli             current packet CLI; future lnsat/lnsatctl clients
crates/lnsat-contracts   minimal Rust contract crate
crates/lnsat-store       embedded SQLite durability foundation
crates/lnsatd            loopback-only Rust daemon foundation
fixtures                  synthetic public and conformance examples
docs                      public architecture and contributor guidance
```

Tests live beside owning source under workspace `test` directories. Shared
cross-language vectors live under `fixtures/contracts`.

## Product Planes

LNSAT owns authority semantics, portable contracts, OS interfaces, protocol
adapters, conformance, and canonical artifact rules in one product boundary.
Its runtime may be embedded, operated as a local service, or integrated through
its supported interfaces. Managed instructions, skills, profiles, context,
graphs, and model overlays remain versioned inputs; they never become
authority.

Clients and integrations call versioned Gateway contracts and cannot fork
policy, approval, authorization, receipt, or audit behavior. MCP, A2A, REST,
CLI, browser, and Docker/OCI integration are protocol or execution surfaces;
each remains subject to the same Gateway boundary and fail-closed checks.

## Current Maturity

Checked-in contracts and local interfaces are experimental. They have automated
coverage but no stable compatibility or support commitment. Distribution,
hosted runtime, production integrations, and unrestricted dispatch are not
available. See [project status](../PROJECT_STATUS.md) for evidence and known
cleanup work.

## Develop Locally

Requirements are Node.js 22, npm 10.9.8, and Rust version pinned in
`rust-toolchain.toml` for Rust checks.

```sh
npm ci
npm run typecheck:workspaces
npm run test:workspaces
npm run build
```

Before proposing a source release:

```sh
npm run audit:dependencies:check
npm run source:check
```

Toolchain installation is an explicit operator action. Repository scripts do
not install Rust, database servers, or deployment tooling.

## Change a Contract

1. Identify the package that owns the concept.
2. Update types and fail-closed validation together.
3. Add positive, boundary, malformed, and unknown-version fixtures.
4. Update TypeScript/Rust conformance when the shared contract changes.
5. Preserve existing versions or document a versioned migration.
6. Update architecture docs and `CHANGELOG.md`.
7. Run focused tests, then root release checks.

## Add an Interface

CLI, MCP, API, and console layers remain thin. They translate input and present
output; they do not duplicate authorization logic. New state-changing behavior
must define policy, approval, audit, adapter, rollback, and test evidence before
interface wiring.

Current REST, CLI, MCP 2026-07-28 and temporary legacy MCP, FastMCP 3/4, A2A,
OAuth admission, recovery, identity, observability, Registry verification, and
signer-provider source preserve the transport-neutral Gateway boundary. These
lanes are experimental, read-only or verification-only, and must pass Phase 8
conformance before production-support claims.

Phase 10 makes `lnsat`, `lnsatctl`, and `lnsatd` first-class OS interfaces.
Extension commands remain namespaced and call versioned Gateway APIs; they do
not load arbitrary native code or accept ambient authority.

## Security Rules

- Keep secret values out of source, fixtures, logs, packets, and audit records.
- Use synthetic public fixtures.
- Fail closed on unknown input and unavailable evidence.
- Do not expose generic shell, filesystem, database, or network authority.
- Keep generated output, local state, and operator notes untracked.
- Report vulnerabilities through GitHub private vulnerability reporting; see
  `SECURITY.md`.

## Documentation Map

- [Architecture catalog](README.md)
- [System architecture](SYSTEM_ARCHITECTURE.md)
- [Packet model](PACKET_MODEL.md)
- [Policy and audit](POLICY_AND_AUDIT.md)
- [Data model](DATA_MODEL.md)
- [MCP adapter](MCP_ADAPTER_DESIGN.md)
- [MCP interoperability and outage recovery](MCP_V2_FASTMCP_INTEROPERABILITY_AND_OUTAGE_RECOVERY.md)
- [Phase 8 adapter authority conformance](PHASE_8_ADAPTER_AUTHORITY_CONFORMANCE.md)
- [Substrates and nodes](SUBSTRATES_AND_NODES.md)
- [Console information architecture](MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md)
- [Agent configuration and skill management](AGENT_CONFIGURATION_SKILL_AND_CONTEXT_MANAGEMENT.md)
- [CLI and OS operator interface](CLI_AND_OS_OPERATOR_INTERFACE.md)
- [Standalone v1 scope](ADR-0008_LNSAT_STANDALONE_V1_SCOPE.md)
- [Release process](../RELEASING.md)
- [SDK guide](../sdk/README.md)
- [Product direction alignment](../reference/PRODUCT_DIRECTION_ALIGNMENT.md)
