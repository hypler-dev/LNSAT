# Open Core and Product Repositories

- Status: accepted product and repository direction
- Availability: documentation and repository boundaries only
- Runtime or commercial artifacts: none

Accepted by
[ADR-0003](ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md).
Earlier LNSAT-owned graphical UI, wizard, and installer wording is superseded
and clarified by
[ADR-0008](ADR-0008_LNSAT_KERNEL_AND_RANGOON_USERLAND_BOUNDARY.md).

## Decision

LNSAT authority core, portable contracts, conformance tests, security model,
and future self-hosted base product are designated Apache-2.0 public-core scope
in [`hypler-dev/LNSAT`](https://github.com/hypler-dev/LNSAT). Current source is
pre-release; self-hosted product support does not yet exist.

Current repository is public pre-release source from an audited fresh-history
snapshot. Source visibility remains separate from supported artifact release.
See [public source readiness](../PUBLIC_READINESS.md).

Future proprietary implementations must live outside public core. Private
branches inside public LNSAT are not a visibility, access-control, release, or
licensing boundary. Naming a downstream boundary does not claim its repository,
implementation, product, or support channel exists.

| Boundary            | Current state                                  | Responsibility                                                                                                       |
| ------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| LNSAT core          | Experimental source                            | Authority lifecycle, contracts, daemon/CLI foundations, Control Center source, SDK/conformance, release verification |
| Management product  | Planned outside this repository                | Visual management, shared profiles/skills/instructions, collaboration, and organization operations                   |
| Connector packs     | Public contracts; implementations not included | Product-specific adapters and compatibility evidence                                                                 |
| Model packs         | Planned outside this repository                | Advisory profiles, adapters, evaluations, and governed model packaging                                               |
| Release composition | Planned outside this repository                | Exact component composition, promotion policy, trust automation, update, and revocation orchestration                |

Customer-specific adapters should use dedicated private repositories only when
real customer isolation, contractual access, or independent lifecycle requires
them. Empty placeholder customer repositories add risk and maintenance without
value.

## Upstream Rule

Standalone LNSAT includes its required V1 headless API and `lnsatctl`
configuration/control surface; it does not depend on Rangoon or proprietary
management software.
The [pending headless configuration gate](../PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control)
defines the public baseline. Downstream visual management owns graphical setup,
presets, organization, collaboration, and policy-intelligence features, not
LNSAT authority or effective-permission computation. Rangoon remains a separate project that may
install a pinned verified release or use compatible protected APIs. No reverse
dependency, shared release requirement, or authority bypass is introduced.

LNSAT core is universal authority point:

```text
agent / human / automation
          |
          v
public LNSAT contracts and Gateway
          |
          +---- public/community extension
          |
          +---- official commercial module
          |
          +---- third-party distribution or wrapper
```

Every implementation uses same authority lifecycle. No edition may privately
change whether packets validate, policy fails closed, approvals bind, one-time
authorization is consumed, receipts verify, or audit evidence chains.

Changes required for security, interoperability, portable formats, or
conformance belong upstream. Paid implementations may improve management,
scale, integration depth, support, certification, enterprise identity,
collaboration, or operational convenience.

## Open and Commercial Boundary

Must remain public:

- packet, policy, approval, authorization, receipt, and audit contracts;
- core cryptographic and canonicalization behavior;
- fail-closed Gateway enforcement;
- local self-hosted daemon and operator CLI;
- portable extension, connector, profile, skill, and instruction manifest
  formats once stabilized;
- SDKs, synthetic fixtures, conformance tests, threat model, and release trust
  verification;
- community reference adapters needed to prove interoperability;
- security fixes and vulnerability guidance.

May be commercial:

- visual graph authoring and organization-wide management;
- shared libraries, review workflows, environment promotion, and fleet views;
- advanced identity federation, separation-of-duties workflows, evidence
  export, retention, and compliance operations;
- certified vendor connector packs and support matrices;
- model profile/evaluation packs and governed registries;
- official enterprise composition, long-term support, migration, certification,
  and support services;
- hosted or hybrid products after separate architecture and release gates.

Entitlement may enable a commercial feature. It never grants action authority
or bypasses policy.

## Module Contract

Preferred module forms:

- authenticated out-of-process service;
- sandboxed WASM component with declared host capabilities;
- declarative policy, schema, profile, instruction, skill, UI, or evidence
  pack;
- signed static UI assets using versioned Gateway APIs.

Arbitrary native plugins are not loaded into `lnsatd`. Module manifest declares
identity, version, publisher, capabilities, data access, egress, resources,
compatible core versions, upgrade/rollback, audit events, signature, SBOM,
provenance, and revocation state.

Install, enable, authorize, execute, quarantine, and remove are distinct
operations. Installation never starts a service, obtains credentials, or
grants capability.

## Distribution Model

Community and vendors may create LNSAT distributions under license terms,
similar to Linux distributions around a shared upstream. Official editions
differentiate through tested composition, support, certification, lifecycle,
and modules—not a secret authority core.

Phase 14 canonical-artifact invariant still applies to official packages:
build core product components once per target, then wrap exact digests.
Commercial edition manifests pin public core and module digests. They do not
rebuild different core behavior per package manager or edition.

Suggested trust labels:

- `upstream` — unmodified canonical LNSAT release;
- `compatible` — passes public conformance for exact versions;
- `certified` — additionally passes reviewed security, lifecycle, and support
  evidence;
- `derived` — documented modifications with independent support;
- `fork` — incompatible authority behavior or contract lineage.

Trademark and compatibility claims need a separate public policy before third
parties can imply official endorsement.

## Release and Dependency Flow

Downstream work pins immutable upstream revisions and contract versions:

```text
LNSAT contract/core release
  -> connector/module/model compatibility
  -> edition manifest
  -> cross-component security and lifecycle tests
  -> separate commercial publication approval
```

Public core artifact release and downstream publication remain independently
gated. Downstream products cannot delay an upstream critical security fix.

## Scope Control

Repository creation does not expand v1 core into hosted, multi-tenant, fleet, or
model-training product. Core v1 still follows fourteen accepted phases.
Downstream work may incubate documentation and prototypes, but cannot claim
support until required public contracts, compatibility rows, security review,
and release evidence exist.
