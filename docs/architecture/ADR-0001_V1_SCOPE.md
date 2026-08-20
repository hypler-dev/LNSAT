# ADR-0001: v1 Product Scope

- Status: superseded in part by ADR-0002
- Date: 2026-07-22
- Decision owners: LNSAT maintainers
- Implementation state: not shipped; evidence gates remain open

> Historical decision. [ADR-0002](ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md)
> supersedes this record where platform, architecture, package, installer,
> service-manager, container, Cargo-bootstrap, and Phase 14 requirements
> conflict. Local-first single-node, SQLite, local-auth, non-root, fail-closed,
> API, support-window, and no-live boundaries remain in force.
> [ADR-0003](ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md) governs
> later open-core, downstream extension, managed-agent-content, advisory-model,
> visual-management, and OS CLI direction without reopening this historical
> v1 scope.

## Context

LNSAT `0.1.0` is private, source-only, and pre-release. It has experimental
TypeScript contracts, loopback persistence foundations, read-only Gateway and
MCP surfaces, a fixture-backed Control Center, and a minimal Rust conformance
crate. It has no supported runtime, authentication system, installer, package,
hosted service, or production-data path.

Earlier proposals intentionally describe many artifact families, deployment
tiers, platforms, databases, auth providers, clients, workers, and hosted
options. Implementing all of them before a first supported release would make
the security, compatibility, recovery, and clean-machine evidence unbounded.

This decision freezes a narrow owner-controlled v1 product. It selects targets
that can receive automated build/test coverage and clean-machine proof. Selection
does not claim current support: every row remains unsupported until its release
criteria pass.

## Decision

### Product Form

The v1 target is a supported local/self-hosted single-node product:

- one owner-controlled `lnsatd` process;
- one durable local database;
- one packaged Control Center served by the local core;
- one `lnsatctl` operator CLI;
- one read-only local-stdio MCP adapter;
- no hosted LNSAT control plane;
- no provider or infrastructure dispatch.

`lnsatd` binds loopback by default. Non-loopback exposure is disabled by default
and is not a distinct supported deployment mode. Any future remote-access
profile requires explicit configuration, authenticated APIs, documented
TLS/reverse-proxy posture, origin policy, and its own evidence.

Developer source checkout remains the contribution and review path, not the
supported operator install path.

### v1 Deployment Mode

The selected v1 deployment mode is `self_hosted_single_node`.

The source-contract terms `local_dev`, `self_hosted_container`, `hybrid`,
`future_saas`, and `isolated` remain valid planning vocabulary but are not
separate supported v1 deployment modes:

- `local_dev` is contributor-only;
- container packaging is deferred;
- hybrid and SaaS are non-goals;
- offline operation is a property of the single-node product, not a separate
  runtime topology.

No managed fleet, cluster, HA, remote worker, node agent, or multi-tenant hosted
topology is included.

### Platforms And Architectures

The v1 release targets are:

| Target                                                 | Intended bundle                                                                                      | Support gate                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Ubuntu 24.04 LTS `x86_64` (`x86_64-unknown-linux-gnu`) | non-root compressed bundle containing `lnsatd`, `lnsatctl`, Control Center assets, docs, and notices | pinned CI build/test plus clean install, upgrade, backup/restore, rollback, and uninstall proof |
| macOS 26 `arm64` (`aarch64-apple-darwin`)              | user-local compressed bundle containing the same product components                                  | pinned build/test plus clean install, upgrade, backup/restore, rollback, and uninstall proof    |

The existing source workflow runs on Ubuntu 24.04, and the current maintainer
host is macOS 26 `arm64`. Those facts make the targets achievable but do not
constitute release evidence. The release cannot call either target supported
until its complete clean-machine gate passes.

Linux `arm64`, macOS `x86_64`, Windows, mobile OSes, and other targets are
explicitly unsupported in v1. They may be reconsidered through a later ADR after
build, install, security, and maintenance evidence exists.

No system package, service-manager integration, root helper, notarized app,
container image, or mobile package is required for v1. Those artifact families
remain proposals.

### Storage

v1 uses embedded SQLite owned by `lnsatd`:

- one database per deployment;
- WAL and transaction posture documented and tested;
- foreign-key and integrity checks enabled;
- ordered, versioned, forward migrations;
- project/resource scope on every durable row;
- append and idempotency invariants for audit/evidence;
- bounded retention with operator-visible policy;
- online-consistent backup or documented quiesced backup;
- tested restore, corruption detection, interrupted migration recovery, and
  rollback/forward-recovery procedure.

The database path is explicit and user-owned. No secret value may be stored in
packet, audit, fixture, log, or exported evidence fields.

Existing PostgreSQL source and disposable tests remain experimental reference
evidence. PostgreSQL, pgvector, hosted databases, and multi-database operation
are unsupported in v1 and must not become required dependencies.

### Authentication And Authorization

v1 uses local authentication only:

- explicit deployment-owner bootstrap on first run;
- password verifiers produced by Argon2id with versioned, reviewed parameters;
- secure, expiring, revocable server-side sessions;
- CSRF defense for browser mutations;
- strict origin/CORS policy;
- bounded authentication rate limits;
- audited sign-in, sign-out, failure, recovery, role, and revocation events;
- no credential, token, or secret value in logs or evidence.

v1 roles are:

- `owner`: deployment and security authority;
- `operator`: bounded product operation, with approval required where policy
  says so;
- `auditor`: read-only evidence access.

Unknown roles, capabilities, projects, resources, or session states fail closed.
OIDC, SAML, SCIM, social login, hosted identity, device enrollment, and recovery
through an external provider are non-goals.

Account recovery is owner-controlled and local. Its exact mechanism must be
threat-modeled and tested before release; absence of a safe recovery design is
a release blocker.

### Gateway And API Stability

Gateway is the security boundary. MCP, CLI, browser UI, and future clients are
adapters and cannot bypass it.

The supported HTTP contract is JSON under `/v1`:

- explicit request and response schema versions where the contract requires
  independent evolution;
- stable field meaning, error identity, and authorization behavior throughout
  the v1 major line;
- additive optional fields are allowed in compatible minor releases;
- removal, rename, changed meaning, weakened validation, or changed default
  requires a new major contract or a parallel versioned replacement;
- unknown version, capability, field where closed schemas apply, route, actor,
  project, resource, or evidence state fails closed;
- rejected raw input and secret-like values are never reflected;
- mutations require actor/project/resource scope, policy, approval rule, audit,
  idempotency, and recovery semantics.

The deprecated legacy project-state compatibility API is not part of the new
stable v1 vocabulary. If it ships in v1, it remains deprecated and cannot be
removed before `2.0.0` and one supported-release deprecation window.

### Package Families

Required v1 release outputs:

- signed source archive from the protected release revision;
- Ubuntu 24.04 LTS `x86_64` product bundle;
- macOS 26 `arm64` product bundle;
- checksums and detached signatures;
- SBOM and provenance for every bundle;
- license and notice material;
- install, configuration, first-run, backup/restore, upgrade, rollback,
  uninstall, revocation, diagnostics, and support documentation;
- versioned update and revocation metadata for operator-triggered verification.

The product bundle contains `lnsatd`, `lnsatctl`, Control Center static assets,
empty configuration templates, and documentation. It contains no customer data,
credential, preconnected integration, hidden seed state, service registration,
or auto-start mutation.

Not required and not publishable as v1 supported artifacts:

- npm packages or published Rust crates;
- deb/rpm/pkg/MSI installers;
- container images;
- launchd/systemd/Windows service packages;
- desktop/tray clients;
- host helpers or node agents;
- MCP extension or connector marketplace packages;
- Python adapters;
- mobile apps or SDKs.

### Support And Deprecation Window

The v1 support clock begins only when `v1.0.0` artifacts are published:

- `v1.0.x` receives security and release-blocking correctness fixes for 12
  months after `v1.0.0`;
- only the latest patch in the supported line is supported;
- critical revocation, uninstall, and recovery information remains available
  for the full window;
- a deprecated stable v1 API receives at least 90 days notice and one supported
  minor release before removal, and removal cannot occur within v1 if it would
  violate the v1 compatibility promise;
- end-of-support date and replacement guidance must appear in release and
  support documentation before publication.

This is a source/project commitment, not a hosted uptime SLA or paid support
promise.

## Threat Model Boundary

v1 protects against:

- untrusted packets, API bodies, MCP calls, browser input, imported config, and
  update metadata;
- unauthorized or cross-project access;
- stolen, expired, fixed, replayed, or revoked sessions;
- stale approval/evidence and idempotency replay;
- tampered release/update artifacts and downgrade attempts;
- corrupt or interrupted local durable state;
- accidental network exposure and overly broad default permissions;
- secret leakage through packets, audit evidence, logs, fixtures, docs, or
  error reflection;
- compromised optional adapters gaining direct product authority.

v1 assumes the deployment owner controls and maintains the host. It does not
claim protection from a compromised kernel, root/admin account, physical host,
firmware, malicious hypervisor, or denial of service by a host administrator.
Those limitations must be visible in security documentation.

Every authority path remains deny-by-default. Gateway policy, scoped
authorization, approval rules, audit, and recovery evidence are required for
state changes. No arbitrary shell, SSH, filesystem, database, network, provider,
or infrastructure control exists.

## v1 Non-Goals

- Hosted LNSAT Cloud, SaaS, hybrid control plane, or public endpoint service.
- Multi-node, HA, managed fleet, tenant hosting, or customer production-data
  path.
- Provider execution, unrestricted adapters, arbitrary code, shell, SSH, host,
  database, network, DNS, Cloudflare, or infrastructure mutation.
- Windows, Linux `arm64`, macOS `x86_64`, mobile, embedded, or accelerator
  runtime support.
- PostgreSQL as a required runtime, pgvector, external managed storage, or
  remote queue.
- OIDC, SAML, SCIM, enterprise directory, MDM, or hosted account recovery.
- Marketplace, connector activation, MCP mutation tools, node agents, mobile
  workers, or model execution.
- Enterprise compliance certification, paid SLA, or availability guarantee.

## v1 Acceptance Checklist

`v1.0.0` is a no-go until all are true:

- [ ] Stable v1 contracts, semver, schema, compatibility, and deprecation rules are
      documented and tested;
- [ ] Rust owns deterministic validation, canonicalization, hashing, policy,
      approval, audit/evidence, idempotency, and error mapping with TypeScript
      parity;
- [ ] SQLite fresh install, migrations, transactions, restart, corruption handling,
      backup, restore, retention, and recovery pass;
- [ ] `lnsatd` is loopback-default, explicit-config, bounded, recoverable, and
      fail-closed;
- [ ] Local auth and owner/operator/auditor authorization pass bypass, fixation,
      replay, expiry, revocation, escalation, and cross-project tests;
- [ ] Authenticated `/v1` APIs, nine-route Control Center, `lnsatctl`, and read-only
      MCP work against the local core;
- [ ] Every mutation is policy/approval/audit/idempotency/recovery governed;
- [ ] Ubuntu 24.04 LTS `x86_64` and macOS 26 `arm64` target rows have pinned
      build, clean-machine install, upgrade, rollback, uninstall, backup/restore,
      and smoke evidence;
- [ ] Factory-clean bundles reproduce from the protected revision and verify
      checksums, signatures, SBOM, provenance, licenses, and source;
- [ ] Signed update, downgrade denial, revocation, emergency-disable metadata,
      offline verification, and rollback pass;
- [ ] Failure-mode, security, supply-chain, current-tree and approved full-history
      scans have no unresolved critical/high release blocker;
- [ ] User, operator, recovery, security, support, compatibility, migration,
      maintainer, and release docs pass link/public-source checks;
- [ ] Alpha, authorized non-production beta, and release-candidate evidence is
      complete;
- [ ] Explicit go authorization names the revision and publication targets.

Passing source builds is necessary but insufficient.

## Consequences

Benefits:

- bounded platform, storage, auth, artifact, and compatibility obligations;
- embedded storage and local auth reduce external dependencies;
- two target bundles cover common server and owner-workstation environments
  without implying broad platform support;
- security and recovery evidence can be complete before scope expands.

Costs:

- existing PostgreSQL foundations do not become the v1 runtime;
- container, system service, Windows, Linux `arm64`, Intel Mac, hosted, and
  enterprise identity users must wait;
- multi-user remote exposure remains deliberately constrained;
- platform expansion requires a new decision and full evidence row.

## Precedence And Change Control

For retained v1 scope, this ADR takes precedence over proposal documents.
[ADR-0002](ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md) takes precedence
for authority-layer positioning, approval/execution/receipt binding, platform
and architecture targets, artifact families, installers, service metadata,
compatibility evidence, and distribution release gates.
[Roadmap](../ROADMAP.md) controls implementation order.
[Project status](../PROJECT_STATUS.md) controls shipped/maturity claims.
[Architecture catalog](README.md) controls document classification.

Changing a selected platform, architecture, storage engine, auth mode, API
promise, package family, support window, non-goal, threat boundary, or release
criterion requires:

1. a superseding ADR;
2. compatibility, security, migration, operational, and support impact;
3. achievable CI and clean-machine evidence plan;
4. updated roadmap, project status, release docs, and changelog;
5. explicit review before implementation expands.

This decision authorizes planning and bounded repo-local implementation only. It
does not authorize package publication, signing with real keys, tag or GitHub
Release creation, repository visibility change, deployment, hosted service,
production data, provider credentials, or live infrastructure mutation.
