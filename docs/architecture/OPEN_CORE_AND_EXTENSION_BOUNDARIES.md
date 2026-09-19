# Open Core and Extension Boundaries

- Status: accepted product and repository direction
- Availability: source contracts and documentation only
- Supported runtime or release artifact: none

[ADR-0003](ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md) defines the
extension model. [ADR-0008](ADR-0008_LNSAT_STANDALONE_V1_SCOPE.md) defines the
standalone V1 runtime and package scope.

## Core Product

LNSAT is the canonical Apache-2.0 authority product in
[`hypler-dev/LNSAT`](https://github.com/hypler-dev/LNSAT). Current source is
public and pre-release. Source visibility does not imply a supported runtime,
package, or publication. See [public source readiness](../PUBLIC_READINESS.md).

The core owns packet, policy, approval, authorization, receipt, and audit
contracts; Gateway enforcement; local persistence; `lnsatd`; `lnsatctl`;
portable SDK and extension contracts; conformance fixtures; security model;
and release verification. The versioned API and complete headless CLI are V1
requirements. A protocol adapter, UI, runtime profile, or module cannot change
whether Gateway authorizes an action or how its evidence is bound.

LNSAT's selected core artifacts must be built and proved under Phase 14. Each
claimed target needs exact component identity, reproducibility, signatures,
provenance, SBOM, compatibility, lifecycle, rollback, and revocation evidence.
Unselected targets remain unsupported. No artifact is published today.

## Protocol and Extension Model

MCP and A2A expose interoperability surfaces over the same Gateway authority
contracts. Runtime adapters declare exact identities, resource envelopes,
isolation controls, and receipt semantics. Docker/OCI is the first planned
isolated runtime profile and requires separate Phase 11 proof. Protocol support
does not grant execution authority.

Versioned extension manifests declare identity, publisher, compatible core and
contract versions, capabilities, data access, egress, resources, audit events,
upgrade and rollback behavior, signature, SBOM, provenance, and revocation
state. Preferred forms are authenticated out-of-process services, sandboxed
WASM components, declarative packs, and signed static UI assets. Arbitrary
native plugins are not loaded into `lnsatd`.

Install, enable, authorize, execute, quarantine, and remove are separate
operations. Installation never starts a service, obtains credentials, or grants
capability. Extensions cannot access core storage, mint authorization,
self-approve, widen scope, or suppress evidence. Entitlement or feature
availability, if implemented, never grants action authority.

## Managed Configuration

Instructions, skills, profiles, context sources, and model overlays may be
managed as versioned inputs under ADR-0003. They remain untrusted inputs to
Gateway policy and never become authority. Effective configuration must be
computed by the core, with exact provenance, approval, rollback, and audit
semantics. The current Control Center is experimental read-only source and does
not satisfy the headless V1 configuration gate.

## Compatibility and Release

The public contracts and conformance fixtures define compatibility. Exact
version, digest, and source-identity binding prevent silent substitution.
Security corrections to core authority behavior belong in the canonical core.
A supported V1 release requires the accepted product/runtime phases, Phase 13
release-candidate source freeze, and Phase 14 proof on selected targets.
Publication is a separate decision after those gates pass.

The [release process](../RELEASING.md),
[distribution plan](DISTRIBUTION_AND_CLIENT_INSTALLERS.md), and
[compatibility matrix](COMPATIBILITY_AND_CONFORMANCE_MATRIX.md) provide the
current gates. None authorizes build, signing, installation, deployment,
Docker access, or production use.
