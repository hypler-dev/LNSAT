# Distribution Reality And Secure Installer Plan

> Boundary status: [ADR-0008](ADR-0008_LNSAT_KERNEL_AND_RANGOON_USERLAND_BOUNDARY.md)
> supersedes this plan wherever earlier wording assigned graphical installation,
> setup UI, management UI, or final distro/package families to LNSAT. LNSAT owns
> verified core artifacts, its versioned API, and complete headless `lnsatctl`;
> Rangoon owns those downstream userland and distribution concerns.

## Purpose

LNSAT must ship as a usable headless authority core, not only a source contract
collection. Rangoon may compose that verified core into a graphical,
self-deploying management distro. This plan preserves practical downstream
install, UI, permission-tier, service-boundary, and packaging requirements
without making them LNSAT V1 exit requirements.

This accepted Phase 14 subsidiary plan is source-only. It does not build binaries, publish packages, execute
installers, register services, enroll clients, wire auth, store credentials,
connect integrations, mutate hosts, start services, create databases, call
external services, or open runtime/live scope.

## Canonical Ownership

ADR-0008 is canonical for ownership. LNSAT owns core-target artifacts, authority
semantics, protected APIs, and headless configuration. Rangoon owns install
tiers, setup UX, graphical management, final package families, and any future
privileged-helper rules. [ADR-0002](ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md)
remains historical architecture input; it does not select Rangoon package rows.
[Phase 14 distribution](DISTRIBUTION_AND_CLIENT_INSTALLERS.md) owns LNSAT core
artifact requirements and provides a downstream wrapper reference;
[the roadmap](../ROADMAP.md) controls order.
[Product build sequence](../PRODUCT_BUILD_SEQUENCE.md) makes required Phases 8,
9, 10, 11, and 13 prerequisites for Phase 14 candidate builds.
[ADR-0006](ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
requires one later packet to select one or two exact initial support rows;
unselected package breadth is nonblocking. Any older family or startup language
below is subordinate to those documents.

## Product Distribution Model

LNSAT core artifacts and Rangoon/downstream packages remain separate,
permissioned families.

| Family                          | Ships to user as                        | Runs where                         | Security posture                                      |
| ------------------------------- | --------------------------------------- | ---------------------------------- | ----------------------------------------------------- |
| LNSAT source release            | GitHub source archive, signed tag later | Build/review machine               | canonical audit source, no data, no credentials       |
| LNSAT core bundle               | Rust binary or core archive             | deployment-owner server            | unprivileged service, Gateway boundary                |
| Rangoon server installer        | OS package or guided setup wrapper      | deployment-owner server            | thin installer, no root unless unavoidable            |
| Rangoon setup UI                | local web UI started by setup           | browser against local/server setup | guided onboarding, verbose install log, no secrets    |
| Rangoon management UI           | web app                                 | Rangoon userland                   | role/policy/approval requests through LNSAT           |
| LNSAT operator CLI              | Rust `lnsatctl`                         | operator workstation               | scoped token, no host mutation by default             |
| Rangoon/extension client helper | per-OS service or app                   | managed host                       | least-privilege capabilities, no arbitrary shell      |
| Rangoon desktop/tray client     | optional per-OS app                     | operator or managed host           | UX wrapper over Gateway/client helper                 |
| Downstream mobile policy SDK    | embedded iOS/iPadOS or Android library  | owner-approved application         | local policy verification, no independent authority   |
| Downstream mobile edge worker   | explicit opt-in mobile application      | owner-bound phone or tablet        | signed bounded leases, OS lifecycle and consent       |
| Downstream MCP extension        | separate extension artifact             | agent/MCP runtime boundary         | adapter only; Gateway remains security boundary       |
| Downstream connector SDK        | generated TypeScript client first       | developer workspace                | manifest, schema, tests, simulator, no secret values  |
| Optional downstream adapters    | Python package later                    | user-selected adapter runtime      | optional ecosystem bridge, never base server required |

Production core server targets Rust `lnsatd`; Control Center remains
experimental TypeScript/React source and is not a required core artifact.
Rangoon may ship its own graphical assets beside a pinned daemon. Current
Node/TypeScript server code is transitional conformance evidence, not final
runtime ownership. Python remains optional downstream adapter scope only.

## Installed Product Topology

A Rangoon-composed installation may have one owner-controlled LNSAT server plus
Rangoon management UI. LNSAT owns identity, policy, approvals, authorization,
revocation, consequence evidence, and effective authority. Rangoon may present
inventory and proposals through protected LNSAT interfaces. Separate downstream
clients/workers may run on servers, workstations, accelerator nodes, and opt-in
mobile devices. They advertise capability and accept only Gateway-authorized
work; they never become policy or approval authority.

LNSAT core support begins only with exact OS/architecture core-target rows
selected by a future release packet; no row is selected yet. Rangoon separately
owns any final installer/package rows. Runtime eligibility is dynamic:
capability manifests describe OS,
architecture/SoC, CPU/GPU/NPU, runtime/model compatibility, memory, storage,
power, thermal, network, trust, and current availability. Rangoon's downstream
management UI only renders LNSAT-produced capability facts and effective
authority; it never owns, recomputes, or substitutes policy. Unsupported or
stale capability fails closed.

Current repo proves source contracts, isolated loopback beta persistence, and
read-only management previews. It does not yet provide installable server,
Control Center, host worker, mobile app, enrollment, networking, or inference.

## Install Tiers

Tier 0 and verified LNSAT core artifacts are public-core concerns. Tiers 1-4
below are downstream Rangoon composition examples, not LNSAT V1 requirements.

### Tier 0: Source Review

Audience: builders, auditors, open source users.

Includes:

- source checkout;
- docs bundle;
- example config templates;
- release manifest later;
- local checks.

Does not include:

- service install;
- DB creation;
- credentials;
- integrations;
- host clients;
- runtime dispatch.

### Tier 1: Local Single-Node Server

Audience: small teams, lab, IT evaluation.

Includes:

- guided setup UI;
- local server bundle;
- local config;
- local auth option;
- local file or SQLite/Postgres choice later;
- no preconnected systems.

Security:

- runs as non-root user;
- binds localhost by default;
- explicit network exposure step;
- service registration optional and approval-gated;
- secrets stored only through chosen local secret provider later.

### Tier 2: Self-Hosted Team Server

Audience: IT managers and team deployments.

Includes:

- Linux/macOS server installer;
- container install option;
- reverse proxy/TLS guidance;
- third-party auth option;
- Postgres option later;
- scoped operator/client enrollment;
- audit retention policy.

Security:

- deny-by-default policy;
- role-based access;
- approval-required actions;
- signed package verification before install;
- no root helper by default;
- privileged operations isolated into tiny optional helpers later.

### Tier 3: Managed Fleet

Audience: multi-host IT operations.

Includes:

- host/client helper packages;
- capability manifests;
- relationship graph;
- permission matrix;
- approval workflows;
- audit export;
- rollback/disablement paths.

Security:

- least-privilege client service account;
- no arbitrary shell;
- no SSH wrapper;
- host actions must map to named capabilities;
- each capability declares platform, permission, risk, approval, audit,
  rollback, and disablement.

### Tier 4: Hybrid / SaaS Later

Audience: hosted control plane users.

Includes:

- hosted Gateway/control panel;
- customer-owned clients/connectors;
- organization auth;
- tenant isolation;
- remote update channels later.

Security:

- tenant isolation mandatory;
- customer secrets remain customer-owned references;
- hosted service never bypasses Gateway policy;
- remote client actions remain approval/audit gated.

## Rangoon Setup UI Requirements

The installer should feel like a professional IT setup app, not a build log.
Style direction: modern, clean, soft color system, light shadows, high contrast,
accessible typography, dense professional layouts, and clear progress states.

First-run flow:

1. Welcome / deployment mode.
2. System check.
3. Install target and service user.
4. Storage choice.
5. Auth choice.
6. Network exposure choice.
7. Admin account.
8. Connector/client manifest intake.
9. Permission review.
10. Readiness check.
11. Start control panel.

UI surfaces:

- left step rail with completed/current/blocked states;
- verbose installation console behind expandable detail;
- system requirement cards with pass/warn/fail state;
- permission summary before any privileged step;
- manifest drop zone for clients, connectors, MCP extensions, and SDK packages;
- relationship preview for systems, clients, connectors, policies, approvals,
  audit obligations, rollback paths, and secret refs;
- permission matrix by actor, tenant, project, environment, integration,
  capability, risk, and action state;
- no secret values shown in UI logs;
- clear rollback/uninstall summary.

Accessibility:

- keyboard-first navigation;
- visible focus states;
- contrast safe soft palette;
- no color-only status;
- readable logs with copy/export later;
- responsive desktop/tablet layout;
- screen-reader labels for progress, warnings, blocked steps, and approvals.

## Rangoon Management Information Architecture

Rangoon's installed management UI should put operational workflow first.

Primary navigation:

1. Overview
2. Setup
3. Systems
4. Clients
5. Connectors
6. Relationship Graph
7. Permissions
8. Approvals
9. Audit
10. Settings
11. Advanced Evidence
12. Fleet And Workers

Advanced Evidence contains packet/build/source diagnostics. It should not be
the first product experience for IT managers.

Overview should show:

- setup completion;
- server health;
- connected systems count;
- enrolled clients count;
- connector status;
- pending approvals;
- blocked privileged actions;
- recent audit events;
- next recommended setup step.
- worker capacity and eligibility by platform, architecture, accelerator,
  trust, power, thermal, and network posture;
- active, expired, cancelled, revoked, or quarantined workload authority.

## Permission Tiers

LNSAT should separate identity, role, capability, approval, and execution.

Suggested roles:

| Role             | Purpose                         | Default capability level                      |
| ---------------- | ------------------------------- | --------------------------------------------- |
| Deployment Owner | owns install and security model | full policy authority, still approval-audited |
| Security Admin   | manages policy and approvals    | no raw host control                           |
| System Admin     | manages systems and clients     | capability-bound actions                      |
| Connector Admin  | manages connector manifests     | no secret value read                          |
| Operator         | runs approved workflows         | approval-required for risky actions           |
| Auditor          | views evidence and logs         | read-only                                     |
| Developer        | builds/test extensions          | simulator and manifest validation only        |
| Agent Seat       | agent-facing scoped identity    | Gateway-approved tools only                   |

Action states:

- allowed;
- approval required;
- blocked;
- disabled;
- unsupported on platform;
- unavailable until client enrolled;
- unavailable until connector validated.

Risk levels:

- read-only;
- local state read;
- sensitive metadata read;
- service status read;
- diagnostic collection;
- service restart request;
- deploy request;
- credential-reference use;
- policy mutation;
- destructive or privileged action.

No action should map to raw shell. Every action maps to a named capability with
declared risk, inputs, outputs, policy, audit, rollback, and disablement.

## Service Boundary

Server process:

- runs unprivileged;
- owns Gateway, policy checks, and audit APIs; no graphical UI is required;
- cannot mutate host directly;
- talks to DB only through scoped roles later;
- treats clients/connectors as untrusted callers.

Rangoon installer:

- verifies package and platform;
- places files;
- creates config from templates;
- may register service only after explicit approval;
- never stores customer secrets in logs;
- exposes rollback/uninstall;
- root/admin escalation only for OS-required install steps.

Host/client helper:

- runs least-privilege by default;
- exposes only declared capabilities;
- can be disabled centrally and locally;
- no unrestricted filesystem access;
- no arbitrary command execution;
- no hidden persistence beyond service registration and config.

Privileged helper later:

- separate binary;
- tiny API surface;
- signed;
- disabled by default;
- approval and audit required;
- only for operations impossible without elevation.

## Package Security Requirements

Every package family eventually needs:

- source commit;
- version;
- target platform and architecture;
- build recipe;
- checksum;
- signature or explicit unsigned status;
- SBOM;
- provenance;
- license files;
- config template refs;
- required permissions;
- service user expectation;
- network ports;
- data paths;
- secret storage posture;
- rollback/uninstall path;
- disablement path;
- audit obligations;
- approval prerequisites.

Install must verify:

- package integrity;
- platform/architecture match;
- downgrade policy;
- service user permissions;
- writable paths;
- port availability;
- dependency versions;
- existing install state;
- rollback availability;
- no bundled customer data;
- no bundled credentials;
- no preconnected systems.

## Component Build Order

This is downstream Rangoon dependency order, not LNSAT product roadmap. Items
remain deferred until Rangoon accepts and authorizes them.

Possible downstream sequence after compatible LNSAT core artifacts exist:

1. Package-family and server/worker capability manifests.
2. Permission tiers, installer UX flow, and setup UI prototype.
3. Read-only Rangoon management UI package, fleet, and permission previews.
4. Deterministic worker/fleet simulators using synthetic fixtures.
5. Connector SDK and MCP extension manifest contracts.
6. Local unsigned server/Rangoon management UI package rehearsal in container.
7. OS-specific installer wrappers and host/client helper MVP.
8. Mobile simulator and read-only fleet views before native worker packages.
9. Signed package pipeline.
10. Privileged helper review, only if unavoidable.

## Blocked Until Explicit Scope Opens

- binary build;
- package publish;
- signing/notarization;
- installer execution;
- service install/restart;
- root helper;
- host mutation;
- client enrollment;
- connector activation;
- MCP extension installation;
- auth provider wiring;
- credential storage;
- integration setup write;
- database creation/write;
- migration execution;
- queue mutation;
- runtime dispatcher;
- live adapter invocation;
- live execution;
- DNS/Cloudflare mutation;
- SSH;
- Docker runner;
- node-agent;
- external service calls;
- secret values;
- nonempty side effects.

## Current Conclusion

Earlier distribution planning remains design foundation, not release authority.
Source now includes mobile-edge capability, policy, lease, and result contracts,
plus local-beta control-plane proof. LNSAT distribution work remains limited to
core-target identity, trust, compatibility, and headless operation. Rangoon may
later begin downstream package-family manifests, secure setup UX, and
deterministic simulation before its distro binaries.

No documentation claim opens binary build, installer execution, service
registration, client enrollment, native mobile app, network session, model
transfer, inference, runtime dispatch, signing, publication, or production/live
authority.
