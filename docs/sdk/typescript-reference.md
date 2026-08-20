# TypeScript Reference

Status: DOC-0020 source-only TypeScript reference refresh. Current packages are
unpublished workspace packages, not published SDK packages. This file groups current
exports by audience without changing package exports, dependency metadata,
lockfiles, runtime behavior, package availability, or publication state.

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
- `docs/sdk/migration.md`
- `packages/mcp/src/index.ts`
- `apps/api/src/index.ts`
- `packages/packets/src/index.ts`
- `packages/policy/src/index.ts`
- `packages/audit/src/index.ts`
- `packages/core/src/index.ts`
- `packages/cli/src/index.ts`
- `packages/*/package.json`

## Current Package State

All current source packages are marked `private: true` at version `0.1.0`. They
are source refs for documentation and review only. They are not installable,
published, marketplace-listed, release-ready, or stable public SDK packages.

| Package          | Export entry                    | Current role                                                                                                  | Primary audience                                    |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `@lnsat/mcp`     | `packages/mcp/src/index.ts`     | Read-only MCP inspection contracts, registrations, local stdio/server wrappers, adapter response envelopes.   | MCP adapter authors, conformance authors            |
| `@lnsat/api`     | `apps/api/src/index.ts`         | Gateway inspection contracts and read-only route handlers used by MCP adapters and API tests.                 | Gateway, MCP, conformance authors                   |
| `@lnsat/packets` | `packages/packets/src/index.ts` | Packet, policy-profile, startup-wizard, runtime-readiness, release, persistence, knowledge, conformance types | MCP, agent, extension, release, conformance authors |
| `@lnsat/policy`  | `packages/policy/src/index.ts`  | Policy decision, approval request, audit-ledger writer gate, migration approval preview helpers.              | Agent manager, policy, audit, conformance authors   |
| `@lnsat/audit`   | `packages/audit/src/index.ts`   | Audit event, ledger record, writer interface, persistence preflight, security/readiness preview contracts.    | Audit, release, policy, conformance authors         |
| `@lnsat/core`    | `packages/core/src/index.ts`    | Product/version/build-phase constants.                                                                        | Maintainers                                         |
| `@lnsat/cli`     | `packages/cli/src/index.ts`     | Local packet validate/hash command source.                                                                    | Maintainers, release reviewers                      |

## Audience Reference Map

### MCP Adapter Authors

Use these groups to understand existing read-only MCP inspection shape. They do
not authorize new tools, network listeners, hosted MCP service, adapter
invocation, external calls, DB writes, or secrets.

| Group                      | Source refs                                                  | Current exports to reference                                                                                                                           | Boundary                                                |
| -------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Tool contracts             | `packages/mcp/src/index.ts`                                  | `mcp*ToolContract` constants for packet, canonical and legacy project state, onboarding, audit ledger, platform, runtime adapter, and knowledge tools. | Contract docs only; all tools remain read-only.         |
| Tool registrations         | `packages/mcp/src/index.ts`                                  | `mcp*ToolRegistration` constants with read-only annotations, input schema posture, Gateway contract ids, authority, and `side_effects: []`.            | No tool mutation or registration change.                |
| Adapter response envelopes | `packages/mcp/src/index.ts`                                  | `Mcp*AdapterResponse`, including canonical `McpProjectStateAdapterResponse` and the separate legacy project-state response contract.                   | Response docs only; no live call path.                  |
| Local server wrappers      | `packages/mcp/src/index.ts`                                  | `createLnsatReadOnlyMcpServer`, `createLnsatOfficialMcpSdkServer`, `createLnsatOfficialStdioTransport`, `LnsatReadOnlyMcpServer`, `McpRegisteredTool`. | Local stdio posture only; no hosted listener or deploy. |
| Gateway request contracts  | `apps/api/src/index.ts`, `@lnsat/api` imports via MCP source | Imported `inspect*GatewayRequest` helpers and `*GatewayContract` constants, including `projectStateGatewayContract`.                                   | Gateway remains authority; MCP remains adapter.         |
| Status constants           | `packages/mcp/src/index.ts`                                  | `MCP_*_STATUS` constants for adapter, server, stdio, onboarding, audit, platform, runtime adapter, and knowledge inspection checkpoints.               | Build evidence only; no execution permission.           |

### Agent Manager Authors

Use these groups to understand policy-profile and human approval contracts. They
do not authorize agent self-grant, policy activation, runtime execution, or
storage/network mutation.

| Group                     | Source refs                                                                              | Current exports to reference                                                                                                                                                   | Boundary                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Policy profile manifests  | `packages/packets/src/index.ts`, `packages/packets/src/startup-wizard-policy-profile.ts` | Policy profile, skillset manifest, manager role manifest, control levels, manager roles, skillsets, policy rows, generated views, context snippets                             | Source-only manifest docs; human approval remains required                   |
| Context working set       | `packages/packets/src/index.ts`                                                          | `createContextWorkingSet`, `contextWorkingSetContract`, `ContextWorkingSet*`, `ContextAtom*`.                                                                                  | Source context shaping only; no runtime memory store.                        |
| Coding-agent synthesis    | `packages/packets/src/index.ts`                                                          | `synthesizeCodingAgentContext`, `codingAgentContextSynthesisContract`, `CodingAgentContext*`.                                                                                  | Documentation/reference only; no autonomous authority.                       |
| Policy decisions          | `packages/policy/src/index.ts`                                                           | Stable `PolicyDecisionV1*`, `policyDecisionV1Contract`, `decidePacketEnvelopePolicyV1`; legacy `PolicyDecision`, `decideUniversalPacketPolicy`.                                | Deterministic local decision only; no approval or write.                     |
| Approval evidence         | `packages/policy/src/index.ts`                                                           | Stable `ApprovalRequestV1*`, `ApprovalDecisionV1*`, `approvalEvidenceV1Contract`, `createApprovalRequestV1`, `decideApprovalRequestV1`; legacy audit-ledger approval previews. | Deterministic evidence only; no authentication, execution, or live workflow. |
| Audit preview obligations | `packages/audit/src/index.ts`                                                            | `AuditPolicyDecisionEvidence`, `AuditPolicyRef`, `createOnboardingContextInspectionAuditPreview`.                                                                              | Audit preview only; no DB write.                                             |
| Stable audit events       | `packages/audit/src/audit-event-v1.ts`                                                   | `auditEventV1Contract`, `createAuditEventV1`, `AuditEventV1*`, and exact packet-policy-approval source inputs.                                                                 | Content-bound event evidence only; no auth, persistence, or execution.       |

### Extension Authors

Use these groups to document connector/client readiness and capability
descriptor shape. They do not authorize connector install, marketplace
publication, secret capture, live invocation, or external calls.

| Group                        | Source refs                                                                       | Current exports to reference                                                                                                          | Boundary                                               |
| ---------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Connector/client readiness   | `docs/sdk/extensions.md`, `packages/packets/src/startup-wizard-policy-profile.ts` | Startup wizard connector/client readiness rows, command-center handoff, `mcp_capability_descriptors`, `agent_context_snippets`.       | Manifest preview only; no connector install.           |
| Capability descriptors       | `packages/packets/src/index.ts`, `packages/mcp/src/index.ts`                      | MCP tool registration annotations, capability descriptor output, blocked capability flags from policy-profile source.                 | Descriptor docs only; no capability activation.        |
| Knowledge context            | `packages/packets/src/index.ts`                                                   | `createKnowledgeRecord`, `createKnowledgeContextBundle`, `compileKnowledgeContextBundle`, `searchLocalKnowledge`, `Knowledge*` types. | Local source evidence only; no hosted search/index.    |
| Substrate/runtime boundaries | `packages/packets/src/index.ts`, `packages/mcp/src/index.ts`                      | Runtime adapter readiness, implementation scope, plan, authorization request, approval gate, dry-run evidence contracts.              | Preflight/reference only; no adapter execution.        |
| Extension release handoff    | `docs/sdk/release.md`, `docs/sdk/migration.md`                                    | Package/release review lanes, future packet boundary, migration target placeholders.                                                  | Future approval map only; no publication or migration. |

### Conformance Authors

Use these groups to build documentation requirements for future checks. They do
not authorize conformance runners, workflows, live probes, external calls, or
generated artifacts.

| Group                     | Source refs                                                     | Current exports to reference                                                                                                                     | Boundary                                                                       |
| ------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Contract version policy   | `packages/packets/src/contract-version.ts`                      | `contractVersionPolicy`, `validateContractVersion`, stable/deprecated version and fail-closed error types.                                       | Exact-match local validation only.                                             |
| Stable error envelope     | `packages/packets/src/contract-error-envelope-v1.ts`            | `contractErrorEnvelopeV1Contract`, `ContractErrorEnvelopeV1`, `ContractErrorV1`, and `createContractErrorV1`; Rust mirrors six-family mapping.   | Common local failure shape only; no retry or authority.                        |
| Stable compatibility map  | `packages/packets/src/contract-compatibility-matrix-v1.ts`      | `contractCompatibilityMatrixV1` and `ContractCompatibilityMatrixV1`.                                                                             | Executable compatibility evidence only; no migration or runtime authority.     |
| Stable packet envelope    | `packages/packets/src/packet-envelope-v1.ts`                    | `packetEnvelopeV1Contract`, `parsePacketEnvelopeV1Json`, `validatePacketEnvelopeV1`, canonicalization/hash helpers, and v1 envelope/error types. | Local deterministic parse/validation/hash; Rust now matches bytes and digests. |
| Stable policy decision    | `packages/policy/src/policy-decision-v1.ts`                     | `policyDecisionV1Contract`, `decidePacketEnvelopePolicyV1`, and v1 decision/capability/reason/error types.                                       | Pure local decision evidence; Rust mirrors deterministic evaluation.           |
| Stable approval evidence  | `packages/policy/src/approval-evidence-v1.ts`                   | `approvalEvidenceV1Contract`, `createApprovalRequestV1`, `decideApprovalRequestV1`, and v1 request/decision/error types.                         | Content-bound local evidence; Rust mirrors validation and identities.          |
| Stable audit events       | `packages/audit/src/audit-event-v1.ts`                          | `auditEventV1Contract`, `createAuditEventV1`, and v1 event/input/result/error types; Rust mirrors chain validation and identities.               | Rebuilt-chain evidence only; no authentication, persistence, or execution.     |
| Packet validation/hash    | `packages/packets/src/index.ts`                                 | `validateUniversalPacket`, `validateUniversalPacketShape`, `hashUniversalPacket`, `canonicalizeUniversalPacket`, `diffUniversalPackets`.         | Local deterministic reference only.                                            |
| MCP fail-closed envelopes | `packages/mcp/src/index.ts`, `docs/sdk/conformance.md`          | `McpServerErrorCode`, `McpServerError`, `McpToolCallResponse`, unknown-tool and invalid-call response shapes.                                    | Negative probe docs only.                                                      |
| Agent fail-closed rows    | `packages/packets/src/index.ts`, `packages/policy/src/index.ts` | Unknown capability, approval-manager, forbidden capability, policy activation, secret-like value, no-live posture, side-effect failure shapes.   | Documentation fixture shape only.                                              |
| Audit evidence            | `packages/audit/src/index.ts`                                   | `AuditLedgerRecord`, `validateAuditLedgerRecord`, `createAuditLedgerRecordFromOnboardingContextPreview`, `AuditLedger*ErrorCode`.                | Audit evidence docs only; no persistence write.                                |
| Policy gates              | `packages/policy/src/index.ts`                                  | `decideAuditLedgerWriterPolicyGate`, `AuditLedgerWriterPolicyGate*`, `AuditLedgerMigrationApprovalPreview*`.                                     | Approval-preview only; no live policy activation.                              |
| Gateway inspection        | `apps/api/src/index.ts`                                         | `inspect*GatewayRequest` helpers, route contracts, and fail-closed inspection handlers consumed by API/MCP tests.                                | Read-only inspection only; no runtime mutation.                                |
| Side-effect invariants    | all source packages                                             | `side_effects: []` contracts and fail-closed denial codes across MCP, policy, audit, startup-wizard, runtime adapter, package/release docs.      | Nonempty side effects deny the reference envelope.                             |

### Release Reviewers

Use these groups for future package/release review docs only. They do not
authorize package creation, install/update commands, lockfile refresh,
workflows, release creation, checksums, signatures, SBOM, provenance,
publication, GitHub mutation, or live side effects.

| Group                     | Source refs                                                                   | Current exports to reference                                                                                                   | Boundary                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Package export inventory  | `apps/api/package.json`, `packages/*/package.json`, `packages/*/src/index.ts` | Unpublished package names, version `0.1.0`, `private: true`, package export entries.                                           | Inventory only; no package availability claim.                                                    |
| Release/package contracts | `packages/packets/src/index.ts`, `docs/sdk/release.md`                        | Release readiness, package/release review envelope, source refs, required gates, fail-closed package/release examples.         | Review docs only; no artifact generation.                                                         |
| CLI source                | `packages/cli/src/index.ts`                                                   | `CLI_STATUS`, `runCli`, packet validate/hash result shapes.                                                                    | Current local source commands only; future `lnsat`/`lnsatctl` direction is documented separately. |
| Core constants            | `packages/core/src/index.ts`                                                  | `LNSAT_CORE_VERSION`, `LNSAT_PRODUCT_NAME`, `ProductLifecycleStatus`, `currentProductLifecycleStatus`.                         | Maintainer metadata only.                                                                         |
| Audit/release evidence    | `packages/audit/src/index.ts`, `packages/policy/src/index.ts`                 | Audit ledger writer preflight, database security preflight, persistence readiness, migration approval preview, approval gates. | Approval evidence docs only; no DB/release mutation.                                              |

### Maintainers

Use these groups to keep reference docs stable while packages remain unpublished.

| Group                | Source refs                                                  | Current exports to reference                                  | Boundary                                      |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- | --------------------------------------------- |
| Source package index | `packages/*/src/index.ts`                                    | Export barrels and status constants for unpublished packages. | No export rewrite in DOC-0020.                |
| Gateway source index | `apps/api/src/index.ts`                                      | Gateway inspection exports and route handlers.                | No runtime mutation or route behavior change. |
| Package metadata     | `packages/*/package.json`                                    | `name`, `version`, `private` flags.                           | No package metadata mutation.                 |
| SDK docs navigation  | `docs/sdk/README.md`, `docs/sdk/*.md`                        | Audience paths, shared rules, release/migration posture.      | Docs navigation only.                         |
| Project state        | `apps/api/src/project-state.ts`, `fixtures/project-state/**` | Neutral item state, selected item, and validation evidence.   | Read-only synthetic inspection only.          |

## Source-Only Reference Envelope

Future examples in this reference should use a documentation envelope like:

```json
{
  "reference": "typescript_export_group",
  "package_state": "private_source_package",
  "audience": "mcp_adapter_author",
  "source_package": "@lnsat/mcp",
  "source_refs": [
    "packages/mcp/src/index.ts",
    "docs/sdk/mcp.md",
    "docs/sdk/conformance.md"
  ],
  "package_install_allowed": false,
  "lockfile_refresh_allowed": false,
  "package_publication_allowed": false,
  "workflow_execution_allowed": false,
  "runtime_live_behavior_allowed": false,
  "external_call_allowed": false,
  "side_effects": []
}
```

This envelope is documentation only. It is not a package manifest, generated
schema, build recipe, package manager command, registry payload, runtime
authorization, or conformance runner input.

## Fail-Closed Reference Examples

| Attempt                                                 | Expected result                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Add package manager install commands for `@lnsat/*`.    | Deny because package install/update and lockfile refresh remain closed.  |
| Mark `@lnsat/mcp` or `@lnsat/packets` as public SDKs.   | Deny because packages remain unpublished workspace packages.             |
| Rewrite imports to a future package name.               | Deny because migration and dependency rewrite scope is closed.           |
| Generate schemas, checksums, SBOM, signatures, or docs. | Deny because generated artifacts remain closed.                          |
| Run conformance workflows from the reference.           | Deny because workflow execution and conformance runners remain closed.   |
| Treat MCP tool registration docs as live tool mutation. | Deny because MCP mutation and live dispatch remain closed.               |
| Treat agent policy docs as policy activation.           | Deny because agents cannot activate policy or self-grant live authority. |
| Return nonempty `side_effects`.                         | Deny because TypeScript reference docs must preserve `side_effects: []`. |

## Boundary

This reference grants no package creation, package mutation/publication,
package install/update, lockfile refresh, connector install, marketplace
publication, release creation, GitHub mutation, workflow execution, generated
artifact, checksum, signature, SBOM, provenance, runtime behavior, DB, deploy,
Docker, SSH, node-agent, secrets, external calls, MCP mutation, auth provider
wiring, policy activation, storage/network mutation, Git push, or live side
effect was opened.
