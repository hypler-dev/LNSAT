# MCP Adapter Design

LNSAT's MCP package is a read-only adapter over validated Gateway contracts.
It makes inspection evidence available to MCP clients without moving security
authority into the protocol layer.

## Current Boundary

```text
MCP client -> stdio adapter -> Gateway handler -> validator/policy -> evidence
```

MCP input is untrusted. Tool handlers validate names, versions, identifiers,
bounds, and request shapes before delegation. Errors are bounded and must not
echo raw rejected values or secret material.

MCP does not:

- grant capabilities or approval;
- expose a generic shell, filesystem, database, or network tool;
- invoke substrate adapters;
- start a listener or remote service;
- create production credentials or configuration.

## Current Tool Surface

Registered tools in `packages/mcp/src/index.ts` expose inspection for packet,
onboarding, audit persistence, hardware, telemetry, platform readiness,
knowledge, and agent-context contracts. The exported registration list is the
source of truth; documentation does not duplicate a fixed tool count.

New tool names use the `lnsat.<domain>.<operation>.inspect` pattern. Existing
packet inspection and legacy project-state compatibility names predate that
convention. New tools must be narrow, version-aware, deterministic, and backed
by Gateway-owned handlers.

## Current Transport

The package provides dual-era local stdio support through official MCP SDK
entrypoints and an in-process stateless HTTP-handler contract for modern tests.
Transport framing does not weaken validation, policy, or audit requirements. A
network listener or hosted transport remains outside current source scope.

## Current Error Contract

- Unknown tools and unsupported operations fail closed.
- Invalid requests return structured, bounded errors.
- Secret-like values and raw payloads are not reflected.
- Internal stack traces and absolute local paths are not protocol output.
- A transport failure cannot be interpreted as approval or success.

## Adding an Inspection Tool

1. Define or reuse a versioned contract in its owning package.
2. Add positive and negative validation fixtures.
3. Implement a Gateway handler with explicit evidence output.
4. Register a thin MCP adapter.
5. Test direct, SDK, and built stdio behavior.
6. Update public documentation and changelog.

State-changing tools require a separate architecture and authorization review;
they are not an extension of this read-only surface.

## MCP 2026-07-28 and Framework Direction

MCP 2026-07-28 is canonical experimental source protocol. Official TypeScript
v2 split packages back modern read-only stdio and stateless HTTP-handler tests;
explicit negotiation retains 2025-11-25 as temporary legacy compatibility.
FastMCP `3.4.5` passes a legacy-profile interop harness and FastMCP `4.0.0b1`
passes an experimental modern-profile harness from isolated temporary Python
environments. Neither framework is a core dependency or authority source.

Protocol access authentication, FastMCP middleware, task objects, and
`request_state` never substitute for LNSAT action authorization. LNSAT browser
sessions, local sessions, and domain `session_id` fields remain separate from
MCP protocol session behavior.

Stateless protocol requests do not make side effects retry-safe. Checked-in
operation-recovery contracts model durable operation identity, same-operation
idempotent replay, reconciliation, receipt readback, expiry, and orphaning.
They are read-only evidence: timeout, disconnect, or cancellation
acknowledgement still cannot prove execution or non-execution, and no mutation
path is enabled.

MCP Tasks is an optional extension, not core durability. A2A carries delegated
intent, OAuth admits protected-resource callers, OTel correlates operations,
SPIFFE identifies workloads, and Registry metadata supports discovery. None is
approval, action authorization, execution proof, or receipt evidence.

See [MCP 2026-07-28, framework interoperability, and outage recovery](MCP_V2_FASTMCP_INTEROPERABILITY_AND_OUTAGE_RECOVERY.md)
and [Phase 8 adapter authority conformance](PHASE_8_ADAPTER_AUTHORITY_CONFORMANCE.md).
Modern MCP, FastMCP, A2A, OAuth admission, recovery, OTel correlation, SPIFFE
workload identity, Registry verification, signer-provider interfaces, and
Control Center reconciliation are implemented only as experimental source with
automated proof. No hosted listener, live provider, real key/trust material,
signing, runtime mutation, or production support is claimed.
