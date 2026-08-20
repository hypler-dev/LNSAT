# ADR-0003: Open Core, Extensions, and Management Plane

- Status: accepted
- Date: 2026-07-25
- Decision owners: LNSAT maintainers
- Extends: ADR-0002 without changing its fourteen-phase v1 release gate
- Implementation state: repository and documentation boundaries exist; expanded
  runtime features remain unimplemented

## Context

LNSAT needs more than one executable authority path to remain useful across
current agent systems. Operators also need governed management of agent
instructions, skills, roles, profiles, context, model-specific adaptations,
connectors, and reusable workflows. These inputs can change agent behavior and
therefore need provenance, policy, approval, assignment, history, rollback, and
evidence.

That management problem is adjacent to execution authorization, but it must not
turn LNSAT core into a generic agent framework, model loop, package manager,
scheduler, or private enterprise-only authority implementation.

Commercial and customer-specific work also needs stronger isolation than Git
branches inside an intended public repository provide.

## Decision

### Public Core

`hypler-dev/LNSAT` remains canonical open authority core. It owns:

- Gateway enforcement and deterministic authority lifecycle;
- packet, policy, approval, execution-authorization, receipt, and audit
  contracts;
- local `lnsatd`, `lnsatctl`, and `lnsat` product interfaces;
- portable module, connector, profile, skill, instruction, context, and model
  overlay contracts when those formats become stable;
- public SDKs, conformance fixtures, threat model, compatibility evidence, and
  release verification;
- essential security fixes.

No edition, module, connector, model, wrapper, entitlement, or hosted service
may replace or privately fork core authority semantics.

### Downstream Repositories

Initial private downstream repositories are:

- `LNSAT-Commercial` for Studio, Team, Enterprise, visual management, shared
  libraries, collaboration, and official commercial composition;
- `LNSAT-Connectors` for proprietary and certified product adapters;
- `LNSAT-Models` for advisory delegator profiles, model overlays, evaluations,
  and governed model packaging;
- `LNSAT-Release` for commercial composition, promotion, update, rollback, and
  revocation orchestration.

Customer-specific repositories are created only when real access isolation,
contractual scope, or independent lifecycle requires them.

### Managed Agent Content

Instructions, skills, profiles, rules, context sources, graphs, role mappings,
and model overlays become immutable, content-addressed managed objects.
Assignments reference exact digests and carry scope, compatibility, provenance,
review, approval, activation, expiry, revocation, and rollback evidence.

Resolution order is deterministic:

1. organization baseline;
2. workspace or project;
3. role profile;
4. universal rules, instructions, and skills;
5. provider-family overlay;
6. model-specific overlay;
7. task-scoped temporary context.

More specific layers may add restrictions or implementation details. They
cannot silently remove inherited prohibitions, approval requirements, or
evidence obligations.

Package-manager caches remain responsible for language dependencies. LNSAT may
deduplicate immutable agent assets by digest, but arbitrary cross-project
symlinks are not the dependency or trust model.

### Gatekeeper Models

Delegator or gatekeeper models may classify context, recommend routes, detect
missing evidence, explain policy, and suggest escalation. Model output is
untrusted policy input. It cannot make final allow decisions, approve requests,
sign evidence, issue authorization, access ambient credentials, or suppress
audit.

Deterministic policy sets capability and role ceilings. Low confidence,
conflict, drift, or model unavailability chooses deny or human escalation for
consequential actions.

### Management Interfaces

Control Center uses different views for different relationships:

- dense inventory/tree/table views for systems, agents, owners, health, and
  status;
- node graphs for delegation, instruction inheritance, context, policy, and
  connector relationships;
- material-editor-style graphs for profile and workflow composition;
- structured forms for common safe configuration;
- source editor and diff review for granular files and uncommon rules;
- timelines for versions, assignments, approvals, incidents, and rollback.

Visual changes create proposals and immutable diffs. They do not mutate active
assignments until Gateway policy and required approval complete.

OS CLI remains equally capable for headless, automated, recovery, air-gapped,
and wrapper use. Commercial extensions use namespaced commands over versioned
APIs; they do not inject arbitrary native code into core binaries.

### Module and Connector Isolation

Preferred extensions are authenticated out-of-process services, sandboxed WASM
components, declarative packs, or signed static UI assets. Install, enable,
capability grant, execution, quarantine, and removal are separate.

Arbitrary native plugins are not loaded into `lnsatd`. Extensions receive
narrow, expiring capability grants and cannot access core storage, mint
authority, self-approve, widen scope, or suppress evidence.

### Commercialization

Paid value may include management depth, collaboration, certified integrations,
enterprise identity and evidence operations, tested compositions, lifecycle
support, and hosted services after separate gates. Essential security,
portable formats, authority semantics, and conformance remain public.

Entitlement controls feature availability, never action authority.

## Consequences

- Expanded management work is a related product plane, not a replacement for
  execution authorization.
- Full management, connector, and model products may develop downstream while
  interoperable contracts and security behavior remain upstream.
- Core v1 follows ADR-0002 as revised by ADR-0006: required local phases and
  selected Phase 14 support rows block release; explicitly optional
  attestation, enterprise, signed-evidence, and unselected package lanes do not.
- Phase 10 must deliver first-class OS CLI contracts.
- Downstream products do not become v1 blockers unless a public v1 contract
  explicitly depends on them.
- Hosted, fleet, multi-tenant, training, billing, and customer-data systems
  require later ADRs and evidence.

## Security Requirements

Expanded surfaces must cover instruction/profile substitution, overlay
downgrade, shared-library poisoning, context misclassification, cross-project
leakage, delegated-role escalation, model false allow, module compromise,
entitlement/authority confusion, local IPC spoofing, CLI secret exposure, and
supply-chain substitution.

Required controls include immutable digests, origin/provenance, closed schemas,
dependency/cycle validation, trust levels, sandboxing, separation of duties,
exact effective-bundle evidence, policy-controlled assignment, compatibility
tests, quarantine, expiry, revocation, rollback, and public conformance.

## Current Hard Stops

This ADR authorizes product direction and repository-local documentation only.
It does not authorize module execution, connector invocation, model deployment,
customer-data handling, hosted runtime, entitlement issuance, billing,
production signing, artifact publication, deployment, service start, or public
visibility.
