# SDK Migration Guide

Status: source-only migration guide. Current packages are unpublished
workspace packages, not published SDK packages. This guide explains how
future approved SDK package boundaries should be documented without renaming
packages, creating packages, installing packages, refreshing lockfiles,
rewriting consumers, publishing artifacts, running workflows, activating
runtime behavior, calling external services, or opening live side effects.

## Source Basis

- `docs/architecture/SDK_DOCUMENTATION_EXPANSION_PLAN.md`
- `docs/architecture/SDK_DOCUMENTATION_INVENTORY.md`
- `docs/architecture/SDK_INFORMATION_ARCHITECTURE.md`
- `docs/sdk/README.md`
- `docs/sdk/mcp.md`
- `docs/sdk/agent.md`
- `docs/sdk/extensions.md`
- `docs/sdk/conformance.md`
- `docs/sdk/examples.md`
- `docs/sdk/release.md`
- `docs/sdk/typescript-reference.md`
- `packages/mcp/src/index.ts`
- `packages/packets/src/index.ts`
- `packages/policy/src/index.ts`
- `packages/audit/src/index.ts`
- `packages/core/src/index.ts`
- `packages/cli/src/index.ts`
- `packages/*/package.json`

## Current Migration Posture

No migration is executable yet. All current `@lnsat/*` workspaces are
unpublished packages at version `0.1.0`. They are documentation source refs and
review inputs only. They are not installable, published, registry-backed,
marketplace-listed, release-ready, or stable public SDK packages.

Migration docs may describe future boundaries, required review evidence,
compatibility expectations, and fail-closed rules. They must not tell consumers
to change dependencies, rewrite imports, refresh lockfiles, run package-manager
commands, publish packages, run workflows, activate policy, dispatch runtime
adapters, call external services, or mutate live state.

## Boundary Model

Future SDK migration is allowed only after a later approved packet opens one
explicit package boundary. This guide records documentation requirements only.

| Boundary                      | Current source state                                      | Future documentation requirement                                | Closed until separately authorized                   |
| ----------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- |
| Package identity              | private `@lnsat/*` workspace names                        | approved public package name and owner                          | package rename, package creation, publication        |
| Import path                   | repo-local source imports and private workspace exports   | before/after mapping after approval                             | dependency rewrite, consumer migration               |
| Version                       | private `0.1.0` source version                            | semver policy, changelog scope, compatibility note              | version bump, release tag, registry metadata         |
| API stability                 | source export groups by audience                          | stable/experimental/deprecated classification                   | API guarantee, public SDK claim                      |
| Conformance                   | source-only positive checks and fail-closed probe docs    | package-bound conformance checklist                             | runner, workflow, live probe                         |
| Release evidence              | planned release lanes and approval gates                  | package/release review record before publication                | checksums, signatures, SBOM, provenance, release     |
| Authority and audit           | Gateway, human approval, and audit obligations documented | audit refs and approval roles for each future migration         | policy activation, agent self-approval, DB writes    |
| Runtime and integration scope | read-only MCP and source-only agent/extension docs        | no-live posture until explicit runtime/integration packet opens | adapter invocation, external calls, storage mutation |

## Source-To-Future Boundary Map

Each future migration note should start from current unpublished workspace
package and stop at an approved package boundary placeholder until approval
exists.

| Current unpublished workspace package | Current role                                                   | Future SDK boundary to define later        | Migration guidance now                                                                 |
| ------------------------------------- | -------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `@lnsat/mcp`                          | read-only MCP inspection contracts, registrations, local stdio | MCP SDK adapter package or module boundary | Map tool descriptors, response envelopes, and local stdio posture; no hosted listener. |
| `@lnsat/packets`                      | packet, policy-profile, startup, release, knowledge contracts  | shared packet/types package boundary       | Map stable data contracts by audience; no schema generation or package publication.    |
| `@lnsat/policy`                       | policy decision and approval preview helpers                   | policy/approval helper package boundary    | Keep human approval authority explicit; no policy activation.                          |
| `@lnsat/audit`                        | audit event, ledger, writer, and readiness preview contracts   | audit evidence package boundary            | Keep audit refs and persistence boundaries explicit; no DB or ledger write.            |
| `@lnsat/core`                         | product/version/build-phase constants                          | maintainer metadata boundary               | Keep constants review-only until package scope opens.                                  |
| `@lnsat/cli`                          | local packet validate/hash command source                      | CLI artifact or operator package boundary  | Keep source command docs separate from distribution or install instructions.           |

## Audience Migration Plans

### MCP Adapter Authors

Migration docs should map current `@lnsat/mcp` read-only tool contracts,
registrations, server wrappers, stdio posture, and response envelopes to a
future MCP SDK boundary only after approval. Required notes:

- Gateway remains authority.
- MCP remains adapter, not security boundary.
- `side_effects: []` remains required.
- Hosted listeners, tool mutation, adapter invocation, external calls, secret
  reads, DB writes, and runtime dispatch stay closed unless a later packet
  explicitly opens them.

### Agent Manager Authors

Migration docs should map policy-profile manifests, manager roles, skillsets,
policy rows, generated context snippets, and approval helper exports to a
future agent-manager SDK boundary only after approval. Required notes:

- Human approval remains required for live capability.
- Agents cannot self-grant authority or activate policy.
- Audit duties must be named before future execution scope.
- Storage/network mutation, runtime execution, policy activation, and live
  side effects remain closed.

### Extension Authors

Migration docs should map connector/client readiness rows, capability
descriptors, manifest fields, and extension release handoff refs to a future
extension SDK boundary only after approval. Required notes:

- Manifest documentation remains no-secret and source-only.
- Connector install, marketplace/package publication, live invocation, external
  service calls, and secret capture remain closed.
- Future package docs must include conformance and release approval gates before
  any package boundary is described as usable.

### Release Reviewers

Migration docs should connect TypeScript reference groups to package/release
review gates. Required notes:

- Future public package names, semver, release lanes, build recipes,
  conformance checks, checksums, signatures, SBOM, provenance, publication
  targets, and rollback policy require later packet approval.
- This guide does not create release artifacts, GitHub releases, workflow inputs,
  registry payloads, package metadata changes, or stable/latest pointer changes.

### Maintainers

Migration docs should keep source and future boundaries distinct. Required
notes:

- Current package metadata remains private.
- Export barrels remain source refs.
- Future public SDK package names are placeholders until approved.
- Import rewrites and dependency changes are denied until a later package
  migration packet opens that exact scope.

## Compatibility Rules

Future package-bound migration docs must include these fields before any import
rewrite can be considered:

- current unpublished workspace package;
- current source refs;
- future approved package or module boundary;
- package owner and approval role;
- stable, experimental, or deprecated API classification;
- before/after import path mapping after approval;
- compatibility risk and breaking-change note;
- required positive conformance checks;
- required negative fail-closed probes;
- release/package approval gate;
- audit refs and rollback/revocation note;
- still-closed runtime, external-call, secret, and side-effect scope.

Until those fields exist in an approved later packet, migration language must
stay conditional and source-only.

## Source-Only Migration Envelope

Future migration examples should use a documentation envelope like:

```json
{
  "migration": "private_source_to_future_sdk_boundary",
  "status": "source_only_planned",
  "current_source_package": "@lnsat/mcp",
  "current_source_refs": [
    "packages/mcp/src/index.ts",
    "docs/sdk/mcp.md",
    "docs/sdk/typescript-reference.md"
  ],
  "future_sdk_boundary": "pending_later_packet_approval",
  "package_creation_allowed": false,
  "package_install_allowed": false,
  "dependency_rewrite_allowed": false,
  "lockfile_refresh_allowed": false,
  "package_publication_allowed": false,
  "workflow_execution_allowed": false,
  "runtime_live_behavior_allowed": false,
  "external_call_allowed": false,
  "required_future_gates": [
    "package_boundary_approval",
    "semver_compatibility_review",
    "conformance_review",
    "human_approval_review",
    "release_publication_review",
    "rollback_revocation_review"
  ],
  "side_effects": []
}
```

This envelope is documentation only. It is not package metadata, an install
recipe, a dependency rewrite plan, a generated schema, a registry payload, a
workflow input, a release draft, or runtime authorization.

## Fail-Closed Migration Examples

| Attempt                                                    | Expected result                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Add package-manager commands for future SDK package names. | Deny because package install/update and lockfile refresh remain closed.         |
| Rewrite imports from unpublished workspace packages.       | Deny because dependency rewrite and consumer migration scope remain closed.     |
| Mark current `@lnsat/*` packages as public SDK packages.   | Deny because packages remain unpublished workspace packages.                    |
| Create or rename package metadata for SDK boundaries.      | Deny because package creation and package mutation remain closed.               |
| Publish package or marketplace artifacts.                  | Deny because publication and marketplace scope remain closed.                   |
| Run workflows, conformance runners, or release jobs.       | Deny because workflow execution and generated artifacts remain closed.          |
| Treat migration docs as runtime or adapter activation.     | Deny because runtime dispatch, live invocation, and MCP mutation remain closed. |
| Include raw token, key, credential, or signing material.   | Deny because secrets are references only.                                       |
| Return nonempty `side_effects`.                            | Deny because migration docs must preserve `side_effects: []`.                   |

## Future Packet Boundary

Future migration execution may open only through a later explicit packet that
names one package boundary and one consumer/import surface. That packet must
define:

- exact source revision and package owner;
- future package or module name;
- API stability classification;
- before/after import path map;
- compatibility and semver review;
- conformance checks and fail-closed probes;
- release/package approval gates;
- audit refs and human approval authority;
- rollback or revocation plan;
- closed scopes that remain unavailable.

Until that packet exists and is approved, package creation, package
install/update, dependency rewrites, lockfile refresh, publication, workflows,
runtime, secrets, external calls, and live side effects remain closed.

## Boundary

This guide grants no package creation, package mutation/publication,
package install/update, lockfile refresh, connector install, marketplace
publication, release creation, GitHub mutation, workflow execution, generated
artifact, checksum, signature, SBOM, provenance, runtime behavior, DB, deploy,
Docker, SSH, node-agent, secrets, external calls, MCP mutation, auth provider
wiring, policy activation, storage/network mutation, Git push, or live side
effect was opened.
