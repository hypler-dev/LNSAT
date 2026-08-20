# Extension SDK Guide

Status: source-only Extension SDK guide. This guide
describes connector and client extension manifests, capability descriptors, and
readiness review posture only. It does not create SDK packages, publish
packages, install connectors, invoke adapters, capture secrets, call external
services, mutate MCP tools, wire auth providers, activate policy, write
storage/network state, refresh lockfiles, or open live side effects.

## Source Basis

- `apps/console/src/lib/console-model.ts`
- `packages/packets/src/startup-wizard-policy-profile.ts`
- `docs/sdk/mcp.md`
- `docs/sdk/agent.md`
- `docs/sdk/examples.md`
- `docs/sdk/conformance.md`
- `docs/architecture/SDK_INFORMATION_ARCHITECTURE.md`
- `docs/architecture/SDK_DOCUMENTATION_EXPANSION_PLAN.md`
- `docs/architecture/OPEN_CORE_AND_PRODUCT_REPOSITORIES.md`
- `docs/architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md`

## Authority Model

Extension manifests are source evidence. They can describe intended connector
or client posture, but they do not grant runtime authority. LNSAT Gateway
remains the security boundary; human approval remains authority for policy
activation and live capability. MCP descriptors and agent context snippets are
preview outputs until later explicit packets open package, runtime, or
publication scope.

Current startup wizard sources expose connector/client readiness as
`source_only_preview`. The control-panel shell maps that row to the Clients and
Connectors shell areas and states:

| Readiness row                | Shell area        | Wizard source step           | Current status        | Documentation meaning                                               |
| ---------------------------- | ----------------- | ---------------------------- | --------------------- | ------------------------------------------------------------------- |
| `Connector/client readiness` | Connectors        | `Connector/Client Readiness` | `source_only_preview` | Planned clients and connectors, no secrets.                         |
| `Connector/client readiness` | Clients           | `Connector/Client Readiness` | `preview_ready`       | Shell navigation can point at the preview but cannot install.       |
| `Review and export`          | Advanced Evidence | `Review And Export`          | `source_only_preview` | JSON manifest, schema, descriptors, and snippets are review output. |
| `Command-center handoff`     | Overview          | `Start Control Panel`        | `source_only_preview` | Handoff lands on command-center preview, not live controls.         |

## Open-Core and Downstream Boundary

Public LNSAT owns portable extension identity, capability, authority, receipt,
audit, compatibility, signature, provenance, quarantine, and conformance
contracts. Private downstream repositories may implement certified
product-specific connectors, commercial modules, model packs, and official
composition.

Extensions cannot fork Gateway authority or load arbitrary native code into
`lnsatd`. Preferred forms are authenticated out-of-process services, sandboxed
WASM components, declarative packs, or signed static UI assets.

Manifest direction requires:

- publisher, version, digest, signature, SBOM, provenance, license, and
  revocation identity;
- compatible LNSAT contract/core versions;
- declared capability, action, data class, egress, resource, and secret
  reference needs;
- exact authorization audience and receipt mapping;
- install/enable/grant/execute/quarantine/remove lifecycle;
- upgrade, rollback, disablement, support, and compatibility evidence.

Entitlement may expose feature. It cannot create identity, grant role, approve,
mint authorization, or widen connector capability.

## Connector Manifest Field Map

Connector manifest examples must stay manifest-only documentation. Use this
field map when describing future connector modules:

| Field                    | Required posture                                                                 | Forbidden posture                                                              |
| ------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `manifest_id`            | Stable source id such as `connector_manifest:github_issues_readonly`.            | Package name, marketplace id, or install command.                              |
| `manifest_contract`      | Source-only contract id for review docs.                                         | Runtime adapter contract or live broker authority.                             |
| `connector_kind`         | Human-readable connector class.                                                  | Secret value, OAuth credential, endpoint token, or hosted callback activation. |
| `capability_descriptors` | Derived from reviewed skillsets and policy rows.                                 | New capability grants outside Gateway policy review.                           |
| `allowed_resources`      | Evidence refs such as `connector_manifests`, `repo_files`, or docs refs.         | Direct filesystem, DB, queue, DNS, SSH, or service mutation handles.           |
| `blocked_resources`      | Must include secret capture and external service call when scope is not opened.  | Empty blocked list for connectors that mention live integration.               |
| `approval_needs`         | Human review or later approval gate reference.                                   | Agent final approval or self-grant authority.                                  |
| `audit_obligations`      | Access, policy decision, denial, and review evidence obligations.                | Persisted audit write claim before audit persistence scope opens.              |
| `source_refs`            | Repo-local docs/source paths backing the manifest.                               | External URLs used as authority without source review.                         |
| `no_live_posture`        | Explicit false flags for install, invocation, secrets, network, storage, policy. | Any true live flag before later packet approval.                               |
| `side_effects`           | `[]`                                                                             | Any mutation or side-effect claim.                                             |

## Client Extension Manifest Field Map

Client extension manifests describe UI/client intent, not deployment or hosted
client availability.

| Field                     | Required posture                                                             | Forbidden posture                                                            |
| ------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `client_extension_id`     | Stable source id such as `client_extension:policy_review_panel`.             | Published package id or app marketplace listing.                             |
| `surface`                 | Source UI or docs surface where the client would appear.                     | Hosted endpoint, installed binary, browser extension install, or live route. |
| `supported_flows`         | Inspect, review, draft, export, or preview flows.                            | Execute, dispatch, mutate, deploy, sync, or persist flows.                   |
| `policy_profile_refs`     | `lnsat.policy_profile.v0_1` or source policy profile refs.                   | Runtime policy activation state.                                             |
| `human_approval_boundary` | Human role required for future activation or execution.                      | Agent final approval or hidden auto-approval.                                |
| `secret_refs`             | Empty list or symbolic references only when later scope opens.               | Raw secret, token, key, password, credential, DSN, or OAuth code.            |
| `evidence_exports`        | Markdown, JSON Schema, MCP descriptors, and agent snippets as source output. | Workflow artifacts, package artifacts, or persisted audit rows.              |
| `side_effects`            | `[]`                                                                         | Any package install, network call, storage write, or live control.           |

## Capability Descriptor Requirements

Current connector capability posture is derived from the startup-wizard
`connector-setup` skillset:

| Skillset          | Capabilities                                          | Allowed resources     | Blocked resources                                   |
| ----------------- | ----------------------------------------------------- | --------------------- | --------------------------------------------------- |
| `connector-setup` | `connector.manifest.inspect`, `policy.proposal.draft` | `connector_manifests` | `connector_secret_capture`, `external_service_call` |

Extension capability descriptors must also preserve the Agent SDK rule that
unknown capabilities deny by default. Descriptor docs must include:

- `descriptor_id`, derived from a reviewed skillset or manifest id.
- `capabilities`, using known inspect/proposal/read patterns only.
- `allowed_resources`, limited to source evidence and manifest refs.
- `blocked_resources`, including secrets, external service calls, connector
  install, package mutation, and live invocation until later packets open scope.
- `approval_needs`, with human approval for staging, execution, package
  publication, policy activation, or live capability.
- `audit_obligations`, including manifest review, policy decision review, denial
  evidence, and future rollback evidence.
- `side_effects: []`.

## Source-Only Manifest Example

Use this shape when documenting future connector manifest review. It is a
documentation example, not an executable fixture or install file.

```json
{
  "manifest_id": "connector_manifest:ticket_source_readonly",
  "manifest_contract": "lnsat.extension.connector_manifest.source_preview.v0_1",
  "connector_kind": "ticket_source",
  "capability_descriptors": [
    {
      "descriptor_id": "mcp_descriptor:connector-setup",
      "skillset_id": "connector-setup",
      "capabilities": ["connector.manifest.inspect", "policy.proposal.draft"],
      "allowed_resources": ["connector_manifests"],
      "blocked_resources": [
        "connector_secret_capture",
        "external_service_call",
        "connector_install",
        "package_mutation",
        "live_invocation"
      ],
      "approval_needs": ["human_manager_for_staging_or_execution"]
    }
  ],
  "source_refs": [
    "apps/console/src/lib/console-model.ts",
    "packages/packets/src/startup-wizard-policy-profile.ts",
    "docs/sdk/extensions.md"
  ],
  "no_live_posture": {
    "connector_install_allowed": false,
    "package_publication_allowed": false,
    "marketplace_publication_allowed": false,
    "secret_capture_allowed": false,
    "external_service_call_allowed": false,
    "adapter_invocation_allowed": false,
    "policy_activation_allowed": false,
    "storage_write_allowed": false,
    "network_mutation_allowed": false
  },
  "side_effects": []
}
```

Example notes:

| Requirement          | Value                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Source refs          | `apps/console/src/lib/console-model.ts`, `packages/packets/src/startup-wizard-policy-profile.ts`                          |
| Gateway authority    | Manifest review is source evidence; Gateway remains authority for future enforcement.                                     |
| Policy gate          | Human managers approve future activation; agent managers cannot self-grant or activate policy.                            |
| Audit obligation     | Manifest review, denial, and future approval evidence must be carried as review evidence before persistence opens.        |
| Closed live behavior | No connector install, package publication, marketplace listing, secret capture, external call, adapter invocation, or DB. |
| Side effects         | `[]`                                                                                                                      |

## Fail-Closed Extension Examples

Extension docs must classify these as denied examples until later packets open
scope:

| Invalid example                                             | Expected fail-closed result                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Manifest includes raw token or password                     | Deny as `startup_wizard.secret_value_forbidden`; raw input stays withheld.        |
| Connector says `secret_capture_allowed: true`               | Deny as no-live posture drift; secret capture remains closed.                     |
| Descriptor grants `external_service_call`                   | Deny because external calls are blocked until explicit scope opens.               |
| Client manifest includes install command                    | Deny because package install/update and lockfile refresh are closed.              |
| Marketplace publication metadata claims public availability | Deny because marketplace/package publication remains approval-gated and closed.   |
| Side effects include network or storage mutation            | Deny as `startup_wizard.side_effects_forbidden`; expected side effects stay `[]`. |

## Marketplace And Package Gates

Extension docs may describe future approval gates, but cannot declare packages
available. Any later marketplace or package work needs a new packet that
separately opens scope for:

- package name and version review
- changelog and semver review
- provenance, SBOM, checksum, and signing plan
- human approval for publication
- rollback and disablement plan
- secret-reference and credential handling review
- Gateway policy review and audit obligations

Until then, docs must say package creation, package mutation, connector install,
marketplace publication, package publication, and live invocation remain closed.

## Boundary

Extension docs are source-only documentation. They do not approve SDK
package creation, package mutation/publication, connector install, marketplace
publication, live invocation, adapter execution, executable examples,
conformance runners, runtime behavior, DB, deploy, release creation, Docker,
SSH, node-agent, secrets, external calls, MCP mutation, auth provider wiring,
policy activation, storage/network mutation, GitHub mutation, workflow
execution, package install/update, lockfile refresh, Git push, or live side
effects.
