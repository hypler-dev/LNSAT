# ADR-0008: LNSAT Kernel and Rangoon Userland Boundary

- Status: accepted for LNSAT V1 planning
- Date: 2026-09-05
- Decision owners: LNSAT maintainers
- Supersedes: conflicting LNSAT-owned UI, wizard, and installer wording in
  earlier planning documents

## Decision

LNSAT V1 is an embeddable authority kernel/library. It owns policy
enforcement, atomic claims, bounded execution, receipts, reconciliation,
audit, recovery, OS-security evidence, and a versioned local integration API.
`lnsatctl` is the complete headless configuration and operator surface,
including declarative configuration, validation, apply, status, approvals,
audit, recovery, and emergency controls. `lnsatd` is an optional thin
reference host or sidecar for consumers that need a local service boundary.

Rangoon is a separate userland/distro. It may provide graphical installation,
setup, presets, configuration and permission pages, approvals, audit, recovery,
graphs, agents, fleets, and final packaging. Rangoon installs or bundles a
verified, pinned LNSAT version and submits requests through LNSAT's versioned
interface.

Here, graphical recovery is limited to online Gateway-authorized recovery
requests plus status, evidence, and host-owner instructions. Rangoon cannot
invoke LNSAT's offline backup, inert restore, owner recovery, or initial
bootstrap operations; those remain local `lnsatctl`-only procedures with no
agent, API, MCP, or UI route.

Rangoon never edits LNSAT storage, reimplements policy, computes effective
permissions, or executes agent-requested or managed-resource consequences
outside LNSAT's authority path. Rangoon's own installer, package, and service
lifecycle actions are separate owner-controlled distro operations; they grant
no agent authority and require their own evidence and authorization. UI state
is never authorization. LNSAT independently validates, authorizes, executes,
and produces evidence for every consequential request.

## V1 Exit

LNSAT V1 is complete when the embeddable core, stable integration API, and
full `lnsatctl` configuration/operations surface are functional and covered by
required tests and evidence. LNSAT remains usable without Rangoon for servers,
air-gapped systems, automation, and recovery. A React console, graphical
wizard, rich installer, fleet UI, and final distro package are not LNSAT V1
exit requirements; the existing console remains experimental read-only source.
Selected OS/architecture core targets still require compatibility evidence so
Rangoon and other hosts can pin and verify the exact authority implementation.

## Consequences and non-goals

This split reduces duplicated policy and UI work and gives Rangoon a stable
authority contract. It does not claim a supported runtime, package, installer,
platform, Docker execution, or release. LNSAT may publish pin-verifiable core
identity and prove selected core targets, but final distro breadth and
installer/wrapper ecosystems remain Rangoon work and do not block LNSAT V1.
Those claims require separate evidence and authorization. No current source
packet opens runtime or production authority.
