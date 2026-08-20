# SDK Information Architecture

Status: source-only information architecture. No SDK package, package
mutation, package publication, runtime adapter, MCP mutation, external call,
auth provider wiring, policy activation, storage/network mutation, workflow
execution, release creation, package install/update, lockfile refresh, or side
effect is opened by this document.

## Purpose

The SDK documentation surface now has a stable navigation model before any SDK
package or runtime scope opens. Navigation starts from the source inventory
in `docs/architecture/SDK_DOCUMENTATION_INVENTORY.md` and the expansion plan in
`docs/architecture/SDK_DOCUMENTATION_EXPANSION_PLAN.md`.

## Navigation Root

Root: `docs/sdk/README.md`

Primary sections:

| Section              | File                               | Source basis                                                                           | Boundary                                                                                                                      |
| -------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| MCP SDK              | `docs/sdk/mcp.md`                  | `packages/mcp/src/index.ts` read-only tool contracts and registrations                 | Local stdio inspection only; no tool mutation, listener, dispatch, DB, secret, or external call scope.                        |
| Agent SDK            | `docs/sdk/agent.md`                | Startup wizard policy profile, manager roles, skillsets, policy rows, context snippets | Human approval remains authority; agents cannot self-grant capability or activate policy.                                     |
| Extension SDK        | `docs/sdk/extensions.md`           | Connector/client readiness rows, capability descriptors, manifest previews             | Manifest documentation only; no package creation, marketplace publication, connector install, or invocation.                  |
| Examples             | `docs/sdk/examples.md`             | Source-only read-only inspection and policy-profile outputs                            | Copy-ready examples stay non-executable documentation until later packets explicitly open code fixtures.                      |
| Conformance          | `docs/sdk/conformance.md`          | Negative probe requirements from inventory gaps                                        | Fail-closed docs only; no conformance runner, workflow execution, network call, or live probe.                                |
| Release              | `docs/sdk/release.md`              | Release/source archive/provenance planning docs                                        | Approval map only; no release creation, package publication, binaries, checksums, signatures, SBOM, or provenance generation. |
| Migration            | `docs/sdk/migration.md`            | Source-first package and route history, future SDK package boundary                    | Migration guidance only; no dependency rewrite, package rename, install/update, or lockfile refresh.                          |
| TypeScript Reference | `docs/sdk/typescript-reference.md` | Current unpublished workspace package export barrels                                   | Reference navigation only; packages remain unpublished workspace packages, not published SDK packages.                        |

## Audience Flow

1. New readers start at `docs/sdk/README.md`.
2. MCP adapter authors read MCP SDK first, then conformance, then examples.
3. Agent manager authors read Agent SDK first, then conformance, then examples.
4. Connector and client extension authors read Extension SDK first, then release
   and migration.
5. Profile, skill, instruction, context, graph, and model-overlay authors read
   Agent SDK, Extension SDK, product-direction alignment, then conformance.
6. Release/package maintainers read TypeScript reference, conformance, release,
   and migration only after an explicit later packet opens package/release work.

## Cross-Cutting Requirements

Every SDK doc must name:

- Gateway authority.
- Policy gates and human approval boundary.
- Audit obligations.
- Source refs used by the documentation.
- Read-only/source-only examples.
- Blocked live behavior.
- Closed package/publication/runtime scope.
- Effective configuration identity and overlay-resolution rules when agent
  behavior depends on managed content.
- Advisory-model boundary and deterministic deny/escalate fallback.
- Open-core versus downstream implementation ownership.

## Maintenance Boundary

MCP and Agent SDK docs describe existing read-only behavior only. Extension
package creation, publication, MCP mutation, runtime dispatch, database access,
deployment, release creation, secrets, external calls, workflow execution,
package installation, lockfile refresh, and live side effects remain separately
gated.

ADR-0003 expands intended portable contract families without publishing them.
Public SDKs eventually own interoperability and conformance; commercial
registries, certified packs, collaborative editors, and supported compositions
may remain downstream.
