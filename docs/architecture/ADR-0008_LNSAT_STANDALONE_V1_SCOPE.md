# ADR-0008: Standalone V1 Runtime and Package Scope

- Status: accepted for LNSAT V1 planning
- Date: 2026-09-05
- Clarified: 2026-09-19
- Decision owners: LNSAT maintainers
- Supersedes: conflicting LNSAT-owned UI, wizard, and installer requirements in
  earlier planning documents

## Decision

LNSAT V1 is a standalone, embeddable authority runtime and library. It owns
policy enforcement, atomic claims, bounded execution, receipts, reconciliation,
audit, recovery, OS-security evidence, and a versioned local integration API.
`lnsatctl` provides complete headless configuration and operator control,
including declarative configuration, validation, apply, status, approvals,
audit, recovery, and emergency controls. `lnsatd` provides the local service
boundary where a daemon is needed.

The runtime remains non-root, loopback-default, explicitly started, and
fail-closed. Gateway is the sole execution-authorization boundary. Resource
access and agent action authority are separate decisions. No UI state,
configuration file, protocol adapter, or installed component grants authority
by itself. LNSAT validates, authorizes, executes, and records evidence for each
consequential request.

LNSAT exposes versioned APIs and portable contracts for clients and adapters.
MCP and A2A are interoperability surfaces, not alternate authority paths.
Docker/OCI is the first planned isolated runtime profile; its support requires
the separate Phase 11 proof. New runtime profiles require explicit capability,
identity, isolation, receipt, and reconciliation evidence.

Offline backup, inert restore, owner recovery, and initial bootstrap remain
local `lnsatctl`-only procedures with explicit host-owner proof. They have no
agent, API, MCP, or UI route.

## V1 Exit

LNSAT V1 requires a functional embeddable core, stable integration API, complete
headless configuration and operations, an end-to-end approved-action loop, and
selected canonical core artifacts. Each selected OS and architecture target
must pass compatibility, reproducibility, identity, trust, lifecycle, and
security proof. The artifact must be pin-verifiable and support safe update,
rollback, and revocation.

A graphical wizard, rich management UI, fleet control, hosted service, and
unselected installer formats are outside initial V1. The existing React
console remains experimental read-only source. Its presence does not substitute
for the headless API, CLI, runtime proof, or package evidence.

## Current State and Gates

Current source is pre-release. No supported runtime, package, installer,
Docker execution, or published release exists. The accepted build sequence
requires headless configuration and control, Phase 11 real disposable runtime
proof, Phase 13 release-candidate source freeze, and Phase 14 proof for each
selected core target. Candidate build, signing, publication, deployment, and
production use remain separately authorized. This decision grants none of those
actions.
