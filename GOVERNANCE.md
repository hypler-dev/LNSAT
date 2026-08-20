# Governance

## Project Model

LNSAT is maintained as an Apache-2.0 core intended for public development, with
possible future downstream products. Public core must keep enough source,
policy, audit, release, and governance evidence for independent evaluation
without trusting a hosted service.

Repository is public pre-release source. Fresh-history cutover evidence is
recorded in `docs/PUBLIC_READINESS.md`. Public visibility does not imply a
supported release.

## Decision Process

Architectural and security-sensitive changes should use:

- tracked issues or pull requests for implementation scope and rationale;
- ADRs or RFCs for protocol, Gateway, module, release, and compatibility
  changes;
- explicit review for live infrastructure, secrets, deployment, artifact
  publishing, and runtime authority.

Accepted product topology and upstream/downstream ownership are defined by
[ADR-0003](docs/architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md).

## Maintainer Duties

Maintainers are responsible for:

- release integrity;
- review quality;
- security report handling;
- compatibility and deprecation decisions;
- roadmap clarity;
- open-source and commercial boundary clarity.

## Open Source And Commercial Boundary

Open-source should include core Gateway contracts, policy/audit model,
self-hosting docs, OS CLI conventions, portable module/connector/profile/skill/
instruction/context/model-overlay contracts, conformance, and verification
scaffolds. Future hosted cloud, enterprise support, visual management,
certified implementations, managed operations, and commercial packaging can
add paid value without weakening core inspectability.

Private branches inside public core are not a commercial boundary. Proprietary
implementation uses separate repositories. Essential security fixes and
interoperability requirements remain upstream. Entitlement controls feature
availability, never identity, approval, or action authority.

Pre-cutover private history remains archival input, not publishable source.
Normal core development occurs through public issues and pull requests;
embargoed vulnerability work remains private until coordinated disclosure.

## Changes Requiring Extra Review

- Gateway policy enforcement;
- approval and audit behavior;
- connector/client capabilities;
- installer privilege model;
- release signing or promotion;
- telemetry defaults;
- managed instruction/skill/profile/context trust and assignment;
- gatekeeper-model role or capability ceilings;
- extension isolation and entitlement boundaries;
- hosted-cloud auth/data boundaries;
- license or governance model changes.
