# Self-Deploy Packaging Plan

> Boundary status: [ADR-0008](ADR-0008_LNSAT_KERNEL_AND_RANGOON_USERLAND_BOUNDARY.md)
> supersedes earlier wording that made server installers, graphical setup, or
> final distro packaging mandatory LNSAT V1 work. LNSAT owns core artifacts,
> versioned APIs, and complete headless `lnsatctl`; Rangoon owns those downstream
> installer and userland concerns.

## Purpose

LNSAT is an independent open source authority core. Deployment owners choose
where it runs, which integrations are enabled, where credential references live,
which auth mode is active, and which authorization levels apply. Rangoon may
provide downstream graphical management and distro composition.

This document defines only source contracts for future packaging. It
does not create packages, installers, service files, Docker images, node-agent
artifacts, deploy pipelines, runtime adapters, auth wiring, integration setup,
database connections, or host mutations.

## Canonical Ownership

This proposal preserves source-only deployment vocabulary and distinguishes
LNSAT core artifacts from downstream distribution. The vocabulary is broader
than supported V1 scope. ADR-0008 owns the current split.
[ADR-0002](ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md) retains
`self_hosted_single_node` as historical architecture input but does not make
graphical installation or final distro packaging an LNSAT V1 requirement;
[the roadmap](../ROADMAP.md) controls when core implementation may begin.

## Contract

```text
contract_id: lnsat.platform.self_deploy_packaging_plan.v0_1
source_stage: design_only
mode: source_contract_only
side_effects: []
```

The contract is implemented in:

- `packages/packets/src/self-deploy-packaging-plan-contract.ts`
- `packages/packets/test/self-deploy-packaging-plan-contract.test.ts`

## Deployment Modes

These are source refs only until later packets open package, install, or deploy
scope:

- `local_dev`
- `self_hosted_single_node`
- `self_hosted_container`
- `hybrid`
- `future_saas`
- `isolated`

Each mode remains deployment-owner controlled. None of these refs authorizes a
service mutation, host install, Docker runner, node-agent, VM launch, DNS change,
hosting mutation, or live deploy.

## Future Artifact Refs

The plan names expected core and downstream artifact references without
building them:

- `web_app_ref`
- `gateway_api_ref`
- `packet_contracts_package_ref`
- `mcp_inspection_package_ref`
- `docs_bundle_ref`
- `env_template_ref`
- `optional_adapter_package_ref`
- `optional_node_agent_package_ref`

All artifact refs stay `future_artifact_source_ref_only`. `web_app_ref`,
installer, wrapper, client, and helper refs are downstream Rangoon/extension
concerns. Package creation, publication, installers, binary builds, Docker
images, service files, launchd/systemd units, and node-agent packages are
blocked.

## Distribution And Client Installer Follow-Up

Future source-only planning must split LNSAT core artifacts from downstream
Rangoon/extension families:

- LNSAT source releases and selected core-target bundles containing canonical
  `lnsatd`, `lnsatctl`, contracts, manifests, and docs;
- Rangoon server installers and final distro wrappers;
- downstream supported-system clients and helpers;
- optional downstream MCP and connector extension packages.

Rangoon server installers may set up a pinned, verified LNSAT core on supported
systems. Clients remain operator or host-side extensions. MCP packages remain
adapters and stay separate from LNSAT core artifacts.

This split does not change the boundary: no binary build, package
publish, installer execution, service install, client enrollment, MCP extension
installation, auth provider wiring, integration setup write, runtime/live
behavior, DNS/Cloudflare mutation, secret value, Python core requirement, or
OS-specific binary core requirement is opened.

## Auth And Integration Posture

Packaging must preserve deployment-owner choice:

- local auth is allowed as future source-reviewed scope;
- third-party auth is allowed as future source-reviewed scope;
- isolated auth is allowed as future source-reviewed scope;
- user-selected authorization levels are separate from provider choice;
- integrations are user-owned and configured by the deployment owner;
- credentials are references only, never raw values;
- integration descriptors must be reviewable and disableable.

This plan does not wire an auth provider, create a session database, store
credentials, create users, mutate permissions, write integration config, activate
live connectors, or call external services.

## Runtime And Python Posture

Current MVP evidence is implemented in TypeScript source contracts,
Gateway/read-only surfaces, and experimental console routes. Production core
targets Rust `lnsatd`, `lnsatctl`, and shared packet/policy/audit/evidence crates;
TypeScript remains experimental console and generated-client source. Rangoon
owns graphical userland and final distro packaging. No Rust artifact is built
yet.

Python can appear later only as an optional adapter/helper package. Supported
Rust binaries and optional OS-specific helpers require separate policy,
approval, audit, rollback, validation, packaging, and disablement evidence before
they can be built or used.

## Required Future Gates

Any later packet that creates packages, installers, binaries, services, deploys,
node-agents, auth runtime, integration runtime, or OS-level connections must name
the relevant:

- policy prerequisite;
- explicit approval prerequisite;
- audit obligation;
- rollback path;
- validation command;
- source refs;
- no-live-to-live scope transition.

## Blocked Scope

- package creation or publication;
- installer, binary, Docker image, service file, launchd/systemd unit, or root
  helper;
- deploy path, hosting mutation, DNS/Cloudflare mutation, GitHub Actions deploy,
  SSH, VM launch, Docker runner, or raw shell automation;
- database connection/write, SQL/DDL execution, migration execution, query
  runner, writer implementation, queue mutation, persisted audit writer, or
  approval mutation;
- runtime dispatcher, live broker dispatch, live adapter invocation, or live
  execution;
- auth provider wiring, session DB, credential storage, integration setup write,
  live connector activation, external service call, or secret value;
- Python core requirement or OS-specific binary core requirement;
- nonempty `side_effects`.

## Rollback

Rollback is source-only: revert source contracts, tests, exports, and this
architecture note. No runtime, host, package, deployment, database, auth,
integration, or service state should exist.
