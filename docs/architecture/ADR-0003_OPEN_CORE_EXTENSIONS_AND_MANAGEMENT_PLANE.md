# ADR-0003: Open Core, Extensions, and Management Plane

- Status: accepted
- Date: 2026-07-25
- Clarified: 2026-09-19
- Decision owners: LNSAT maintainers
- Extends: ADR-0002 without changing its fourteen-phase V1 release gate
- Implementation state: source contracts and documentation exist; expanded
  runtime features remain unimplemented

## Context

LNSAT must preserve one authority path while interoperating with agent systems,
protocol clients, runtime adapters, and managed agent configuration. Instructions,
skills, roles, profiles, context, model-specific adaptations, connectors, and
workflows can change agent behavior. Their provenance, assignment, approval,
rollback, and evidence need explicit contracts.

LNSAT remains an authority product. It does not become a generic agent framework,
model loop, scheduler, or language package manager.

## Decision

### Core Authority

LNSAT owns Gateway enforcement; packet, policy, approval, authorization, receipt,
and audit contracts; local `lnsatd` and `lnsatctl`; portable extension contracts;
SDK and conformance fixtures; threat model; compatibility evidence; and release
verification. No protocol adapter, module, connector, model, UI, or installation
mode may replace or fork Gateway authority semantics.

### Managed Agent Content

Instructions, skills, profiles, rules, context sources, graphs, role mappings,
and model overlays may become immutable, content-addressed managed objects.
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

More specific layers may add restrictions or implementation details. They cannot
silently remove inherited prohibitions, approval requirements, or evidence
obligations. Language package managers remain responsible for code dependencies;
LNSAT may deduplicate immutable agent assets by digest without treating
cross-project symlinks as a trust model.

### Advisory Models

Delegator or gatekeeper models may classify context, recommend routes, detect
missing evidence, explain policy, and suggest escalation. Model output is
untrusted policy input. It cannot make final allow decisions, approve requests,
sign evidence, issue authorization, access ambient credentials, or suppress
audit. Low confidence, conflict, drift, or model unavailability chooses deny or
human escalation for consequential actions.

### Interfaces and Extensions

The versioned API and `lnsatctl` are the complete V1 headless control surface.
Control Center remains experimental read-only source until separately accepted
management behavior is implemented and proved. A visual change, when supported,
creates a proposal and immutable diff; Gateway policy and required human
approval precede activation.

Preferred extension forms are authenticated out-of-process services, sandboxed
WASM components, declarative packs, and signed static UI assets. Install,
enable, capability grant, execution, quarantine, and removal are separate.
Arbitrary native plugins are not loaded into `lnsatd`. Extensions receive
narrow, expiring capability grants and cannot access core storage, mint
authority, self-approve, widen scope, or suppress evidence.

MCP and A2A adapters use the same versioned authority contracts. Docker/OCI is
an isolated runtime profile subject to the separate Phase 11 proof. Protocol
or runtime compatibility never grants action authority.

## Consequences

- Expanded managed-content and interface work remains behind explicit product
  packets, security review, and conformance.
- Initial V1 follows ADR-0002 and ADR-0006: required local phases and selected
  Phase 14 target rows block release; optional attestation, enterprise,
  signed-evidence, and unselected target lanes do not.
- Hosted, fleet, multi-tenant, training, billing, and customer-data systems
  require later decisions and evidence.

## Security Requirements

Expanded surfaces must cover instruction/profile substitution, overlay
downgrade, shared-library poisoning, context misclassification, cross-project
leakage, delegated-role escalation, model false allow, module compromise,
local IPC spoofing, CLI secret exposure, and supply-chain substitution.

Required controls include immutable digests, origin/provenance, closed schemas,
dependency/cycle validation, trust levels, sandboxing, separation of duties,
exact effective-bundle evidence, policy-controlled assignment, compatibility
tests, quarantine, expiry, revocation, rollback, and conformance.

## Current Hard Stops

This ADR sets product direction only. It does not authorize module execution,
connector invocation, model deployment, customer-data handling, hosted runtime,
production signing, artifact publication, deployment, or service start.
