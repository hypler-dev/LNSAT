# LNSAT SDK Documentation

These docs describe current repository-local source contracts. They do not
represent published packages, stable public APIs, hosted services, or enabled
runtime authority.

For system overview and developer workflow, start with
[Architecture and developer guide](../architecture/ARCHITECTURE_AND_DEVELOPER_GUIDE.md).

## Current SDK Boundary

Current SDK is a source-contract and documentation surface. Workspace packages
are marked `private: true`; they are not published, installable,
marketplace-listed, or stable public SDK packages.

| Package          | Current role                                                                             | Boundary                      |
| ---------------- | ---------------------------------------------------------------------------------------- | ----------------------------- |
| `@lnsat/packets` | Packet, runtime, release, trust, knowledge, and agent-management contracts               | Unpublished workspace package |
| `@lnsat/api`     | Gateway inspection contracts and read-only route handlers                                | Unpublished workspace package |
| `@lnsat/gateway` | Transport-neutral inspection, recovery, A2A, identity, telemetry, and Registry contracts | Unpublished workspace package |
| `@lnsat/mcp`     | Read-only dual-era MCP, stdio/HTTP-handler, OAuth, and schema-security source            | Unpublished workspace package |
| `@lnsat/policy`  | Policy, approval, verification, and signer-provider test interfaces                      | Unpublished workspace package |
| `@lnsat/audit`   | Audit event, ledger, writer, persistence, and migration preflight contracts              | Unpublished workspace package |
| `@lnsat/core`    | Product/version/build-phase constants                                                    | Unpublished workspace package |
| `@lnsat/cli`     | Local packet validate/hash command source                                                | Unpublished workspace package |

## Product Expansion Contracts

ADR-0003 reserves public SDK responsibility for portable module, connector,
profile, skill, instruction, context, graph, assignment, and model-overlay
contracts plus conformance. Rich registry, visual authoring, certified packs,
enterprise collaboration, and commercial composition may live downstream.

These formats are planned unless current source reference names them. No
planned format is stable or installable because it appears here.

All transports and extensions follow same rules:

- effective agent configuration resolves to immutable digest and trace;
- universal constraints cannot be removed by model/provider overlays;
- gatekeeper models recommend but never authorize;
- extension entitlement never becomes action permission;
- install, enable, capability grant, execution, quarantine, and removal remain
  separate;
- CLI, UI, MCP, REST, A2A, and framework adapters map to Gateway authority.

## Start Here

Read the sections by audience:

| Audience             | Start                              | Then read                                                     |
| -------------------- | ---------------------------------- | ------------------------------------------------------------- |
| MCP adapter author   | `docs/sdk/mcp.md`                  | `docs/sdk/conformance.md`, `docs/sdk/examples.md`             |
| Agent manager author | `docs/sdk/agent.md`                | `docs/sdk/conformance.md`, `docs/sdk/examples.md`             |
| Extension author     | `docs/sdk/extensions.md`           | `docs/sdk/examples.md`, `docs/sdk/migration.md`               |
| SDK maintainer       | `docs/sdk/typescript-reference.md` | `docs/sdk/release.md`, `docs/sdk/migration.md`                |
| Release reviewer     | `docs/sdk/release.md`              | `docs/sdk/conformance.md`, `docs/sdk/typescript-reference.md` |

## Navigation

- [MCP](mcp.md): read-only MCP descriptor and local stdio inspection guide.
- [Agent](agent.md): manager role, skillset, policy profile, and human
  approval guide.
- [Extensions](extensions.md): connector/client manifest and capability descriptor
  guide.
- [Examples](examples.md): source-only examples for read-only MCP
  inspection and Agent policy-profile output.
- [Conformance](conformance.md): expected positive checks and negative fail-closed
  probes.
- [Release](release.md): package/release approval navigation and blocked scope.
- [Migration](migration.md): future migration map from unpublished workspace packages to
  approved SDK packages.
- [TypeScript reference](typescript-reference.md): source-only reference groupings
  for current unpublished workspace packages by audience.

## Shared Rules

- Gateway remains the security boundary.
- MCP is an adapter, not authority.
- Human approval remains required for live capability.
- Model or agent recommendation never substitutes for deterministic policy or
  authenticated human approval.
- Managed instructions, skills, profiles, context, and overlays are versioned
  evidence, not authority.
- Audit duties must be named before any future execution path opens.
- Examples remain source-only, synthetic, and read-only.
- Secrets are references only; docs must not include secret values.
- Package creation, package publication, runtime dispatch, DB, deploy, release
  creation, external calls, workflow execution, package install/update, lockfile
  refresh, and side effects remain closed.
- Do not add package-manager install commands or public SDK availability claims
  until approved artifacts exist.
