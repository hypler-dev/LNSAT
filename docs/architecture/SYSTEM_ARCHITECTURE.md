# System Architecture

- Status: target architecture with bounded experimental source implementation
- Support effect: none

LNSAT target architecture is a policy-governed authority plane for inspecting
and authorizing AI-agent operations. Current source implements only bounded
parts of this flow. It does not yet expose a supported end-to-end product path.

## Target Control Flow

```text
human / agent / script
        |
        v
CLI / MCP / API / console
        |
        v
Gateway validation
        |
        v
policy decision ----> approval required ----> human decision
        |                        |
        +------------------------+
        v
audit evidence
        |
        v
capability broker -> adapter -> substrate
```

Gateway is the security boundary. Transports and clients may collect input, but
they cannot grant authority. Policy, approval, audit, and adapter contracts stay
behind Gateway-owned validation.

This diagram expresses required ordering, not current route availability. See
[project status](../PROJECT_STATUS.md) for merged implementation truth.

## Repository Layers

| Layer          | Source                   | Responsibility                                                  |
| -------------- | ------------------------ | --------------------------------------------------------------- |
| API            | `apps/api`               | Loopback control-plane routes and validated inspection surfaces |
| Console        | `apps/console`           | Fixture-backed, read-only management and reconciliation UI      |
| Gateway        | `packages/gateway`       | Transport-neutral inspection, recovery, and interop contracts   |
| CLI            | `packages/cli`           | Current packet inspection; future `lnsat` workflow client       |
| MCP            | `packages/mcp`           | Read-only dual-era stdio and stateless HTTP-handler contracts   |
| Core           | `packages/core`          | Product identity and shared source constants                    |
| Packets        | `packages/packets`       | Versioned packet and evidence contracts                         |
| Policy         | `packages/policy`        | Deterministic policy and approval decisions                     |
| Audit          | `packages/audit`         | Audit records, append semantics, and migration artifacts        |
| Rust contracts | `crates/lnsat-contracts` | Minimal cross-language contract model                           |
| Rust store     | `crates/lnsat-store`     | SQLite records, retention, integrity, backup, restore, recovery |
| Rust daemon    | `crates/lnsatd`          | Loopback-only source readiness over verified SQLite             |

Phase 10 plans OS interfaces as `lnsatd`, `lnsatctl`, and `lnsat`.
See [CLI and OS operator interface](CLI_AND_OS_OPERATOR_INTERFACE.md). Current
source does not provide stable operator, service, recovery, update, connector,
profile, or skill commands.

## Downstream Product Layers

Separate repositories may provide commercial management, certified connectors,
governed model packs, and official commercial composition. They consume public
contracts and exact core releases:

```text
commercial UI / connector / model assistant / third-party wrapper
                              |
                              v
                 versioned public interfaces
                              |
                              v
                  LNSAT Gateway authority
```

Downstream code cannot mint approval or execution authority, weaken fail-closed
behavior, replace core evidence, or maintain a different private authority
implementation. See [open core and product repositories](OPEN_CORE_AND_PRODUCT_REPOSITORIES.md).

## Trust Boundaries

- Secrets are references; packet bodies and audit evidence must not contain
  credential values.
- Agents request capabilities. They do not receive direct infrastructure
  control.
- MCP is an adapter, not an authority boundary.
- MCP/A2A protocol state, framework context, OAuth admission, workload
  identity, trace correlation, and registry discovery are inputs, not action
  authority.
- Unknown packet types, capabilities, policy profiles, and schema versions fail
  closed.
- State-changing work requires explicit policy, approval, audit, adapter,
  rollback, and test evidence.
- Source currently provides inspection and contract foundations. It does not
  enable unrestricted runtime dispatch or production integrations.

## Current Runtime Posture

`apps/api`, `packages/cli`, and `packages/mcp` call shared
`packages/gateway` contracts. MCP 2026-07-28 is canonical experimental source;
official v2 SDK modern stdio/HTTP handlers and explicit temporary legacy
negotiation are tested. FastMCP 3/4, A2A, OAuth admission, operation recovery,
OTel/SPIFFE evidence, Registry verification, and signer-provider interfaces
have bounded source implementations and negative coverage.
`apps/console` renders synthetic public fixtures, including operation
reconciliation readback, and performs no mutation.
PostgreSQL artifacts define local audit persistence contracts, but repository
source does not configure production infrastructure or credentials.

## Compatibility

Public contracts use explicit schema identifiers and versions. Additive fields
must preserve validation behavior for supported versions. Breaking changes need
a new contract version, migration guidance, fixture updates, TypeScript/Rust
conformance coverage, and changelog entry.

## Verification

Run `npm run source:check` from repository root. Package-specific tests live
beside their owning source. Cross-language fixtures live under `fixtures/`.
