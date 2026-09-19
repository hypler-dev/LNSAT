# ADR-0008: LNSAT Kernel and Downstream Userland Boundary

- Status: accepted for LNSAT V1 planning
- Date: 2026-09-05
- Clarified: 2026-09-19
- Decision owners: LNSAT maintainers
- Supersedes: conflicting LNSAT-owned UI, wizard, and installer wording in
  earlier planning documents

## Decision

LNSAT V1 is a neutral, embeddable authority runtime and library. It owns policy
enforcement, atomic claims, bounded execution, receipts, reconciliation,
audit, recovery, OS-security evidence, and a versioned local integration API.
`lnsatctl` is the complete headless configuration and operator surface,
including declarative configuration, validation, apply, status, approvals,
audit, recovery, and emergency controls. `lnsatd` is an optional thin
reference host or sidecar for consumers that need a local service boundary.

A downstream product or distribution may provide graphical installation,
setup, presets, configuration and permission pages, approvals, audit, recovery,
graphs, agents, fleets, and final packaging. It may install or bundle a
verified, pinned LNSAT artifact and submit requests through LNSAT's versioned
interface. LNSAT remains independently usable without such a product.

Graphical recovery is limited to online Gateway-authorized recovery requests
plus status, evidence, and host-owner instructions. A downstream client cannot
invoke LNSAT's offline backup, inert restore, owner recovery, or initial
bootstrap operations; those remain local `lnsatctl`-only procedures with no
agent, API, MCP, or UI route.

Downstream software never edits LNSAT storage, reimplements policy, computes
effective permissions, or executes agent-requested or managed-resource consequences
outside LNSAT's authority path. Its own installer, package, and service
lifecycle actions are separate owner-controlled operations; they grant no agent
authority and require their own evidence and authorization. UI state
is never authorization. LNSAT independently validates, authorizes, executes,
and produces evidence for every consequential request.

## V1 Exit

LNSAT V1 is complete when the embeddable core, stable integration API, full
`lnsatctl` configuration and operations surface, and selected canonical core
artifacts are functional and covered by required tests and release evidence.
It must work for servers, air-gapped systems, automation, and recovery without
a downstream userland. A React console, graphical wizard, rich installer,
fleet UI, and downstream distribution package are not LNSAT V1 exit
requirements; the existing console remains experimental read-only source.
Selected OS and architecture core targets require compatibility and immutable
artifact identity so any host can pin and verify the exact authority
implementation.

## Consequences and non-goals

This split preserves one authority implementation and a stable integration
contract for independent consumers. It does not claim that a supported
runtime, package, installer, platform, Docker execution, or release exists
today. LNSAT may publish pin-verifiable core artifacts only after its product,
runtime, release-candidate, and selected-target proof gates pass. Downstream
installer and wrapper breadth has separate acceptance and does not block LNSAT
V1. Those claims require separate evidence and authorization. No current
source packet opens runtime or production authority.
