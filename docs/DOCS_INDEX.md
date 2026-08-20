# Documentation

- Status: current documentation index

LNSAT documentation separates current source truth from future design work.
Start with current guides; use architecture catalog when researching a specific
subsystem or proposal.

## New Contributors

1. [README](../README.md) — project purpose, source-evaluation quick start, and
   current limitations.
2. [Project status](PROJECT_STATUS.md) — implemented, experimental, planned, and
   unsupported scope.
3. [Claims and maturity vocabulary](CLAIMS_AND_MATURITY.md) — meaning of
   implemented, experimental, planned, public-source, and supported claims.
4. [Architecture and developer guide](architecture/ARCHITECTURE_AND_DEVELOPER_GUIDE.md)
   — mental model, repository ownership, and safe change workflow.
5. [Local development](LOCAL_DEVELOPMENT.md) — prerequisites, commands, focused
   tests, and troubleshooting.
6. [Contributing](../CONTRIBUTING.md) — first-contribution, pull-request, DCO,
   security, and review requirements.

## Community

- [Support](../SUPPORT.md) — public issue scope and pre-release support limits.
- [Governance](../GOVERNANCE.md) — roles, decisions, review, and conflicts.
- [Code of Conduct](../CODE_OF_CONDUCT.md) — participation and reporting rules.
- [Security policy](../SECURITY.md) — private vulnerability reporting and tested
  security scope.

## Core Architecture

- [System architecture](architecture/SYSTEM_ARCHITECTURE.md)
- [Authority layer and reference workflow](architecture/AUTHORITY_LAYER_AND_REFERENCE_WORKFLOW.md)
- [Threat model](architecture/THREAT_MODEL.md)
- [Packet model](architecture/PACKET_MODEL.md)
- [Policy and audit](architecture/POLICY_AND_AUDIT.md)
- [Data model](architecture/DATA_MODEL.md)
- [`lnsatd` loopback foundation](architecture/LNSATD_LOOPBACK_FOUNDATION.md)
- [Gateway v1 contract negotiation](architecture/GATEWAY_V1_CONTRACT_NEGOTIATION.md)
- [Gateway v1 local session issue](architecture/GATEWAY_V1_SESSION_ISSUE.md)
- [Gateway v1 authenticated session read](architecture/GATEWAY_V1_SESSION_READ.md)
- [Gateway v1 authenticated session rotation](architecture/GATEWAY_V1_SESSION_ROTATION.md)
- [Gateway v1 session-family sign-out](architecture/GATEWAY_V1_SESSION_FAMILY_SIGN_OUT.md)
- [Gateway v1 identity password rotation](architecture/GATEWAY_V1_IDENTITY_PASSWORD_ROTATION.md)
- [Gateway v1 owner-only identity creation](architecture/GATEWAY_V1_IDENTITY_CREATION.md)
- [Gateway v1 owner-only identity disablement](architecture/GATEWAY_V1_IDENTITY_DISABLEMENT.md)
- [Gateway v1 authenticated identity-event read](architecture/GATEWAY_V1_IDENTITY_EVENT_READ.md)
- [Gateway v1 authenticated session-event read](architecture/GATEWAY_V1_SESSION_EVENT_READ.md)
- [Gateway v1 authenticated approval request](architecture/GATEWAY_V1_APPROVAL_REQUEST.md)
- [Gateway v1 authenticated approval decision](architecture/GATEWAY_V1_APPROVAL_DECISION.md)
- [Phase 7 local-v1 trust and optional signed evidence](architecture/ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
- [Phase 7 signed approval-evidence decision and verification foundation](architecture/ADR-0004_PHASE_7_SIGNED_APPROVAL_EVIDENCE.md)
- [Phase 7d enterprise local-persistence design](architecture/ADR-0005_PHASE_7D_ENTERPRISE_LOCAL_PERSISTENCE.md)
- [Phase 7 readiness execution plan](architecture/PHASE_7_READINESS_EXECUTION_PLAN.md)
- [Phase 7 readiness ledger](reference/phase7-readiness.json)
- [Public source snapshot marker](reference/public-source-snapshot.json)
- [Security review evidence boundary](reference/security-reviews/README.md)
- [Phase 7 local-v1 conformance freeze](architecture/PHASE_7_LOCAL_V1_CONFORMANCE_FREEZE.md)
- [P7-B1 post-merge security review input](reference/security-reviews/P7-B1/post-merge-review-0526845.json)
- [Phase 4 exit evidence](architecture/PHASE_4_EXIT_EVIDENCE.md)
- [Local identity and owner bootstrap](architecture/LOCAL_IDENTITY_AND_OWNER_BOOTSTRAP.md)
- [Local server session evidence](architecture/LOCAL_SERVER_SESSION_EVIDENCE.md)
- [Local offline owner recovery](architecture/LOCAL_OWNER_RECOVERY.md)
- [SQLite backup and restore](architecture/SQLITE_BACKUP_AND_RESTORE.md)
- [SQLite recovery inspection events](architecture/SQLITE_RECOVERY_INSPECTION_EVENTS.md)
- [SQLite retention policy](architecture/SQLITE_RETENTION_POLICY.md)
- [Authentication and integration posture](architecture/AUTH_AND_INTEGRATION_POSTURE.md)
- [Open core and product repositories](architecture/OPEN_CORE_AND_PRODUCT_REPOSITORIES.md)
- [Agent configuration, skill, and context management](architecture/AGENT_CONFIGURATION_SKILL_AND_CONTEXT_MANAGEMENT.md)
- [CLI and OS operator interface](architecture/CLI_AND_OS_OPERATOR_INTERFACE.md)
- [MCP 2026-07-28 interoperability and outage recovery](architecture/MCP_V2_FASTMCP_INTEROPERABILITY_AND_OUTAGE_RECOVERY.md)
- [Phase 8 adapter authority conformance](architecture/PHASE_8_ADAPTER_AUTHORITY_CONFORMANCE.md)
- [Phase 9 API-backed Control Center](architecture/PHASE_9_API_BACKED_CONTROL_CENTER.md)
- [Phase 10 product-surface contract spine](architecture/PHASE_10_PRODUCT_SURFACE_CONTRACT_SPINE.md)
- [Docker-first runtime-neutral enforcement decision](architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)
- [Compatibility and conformance](architecture/COMPATIBILITY_AND_CONFORMANCE_MATRIX.md)
- [Rust core and TypeScript Control Center](architecture/RUST_CORE_AND_TYPESCRIPT_CONTROL_CENTER_ARCHITECTURE.md)
- [Full architecture catalog](architecture/README.md)

## Integrators and SDK Authors

- [SDK overview](sdk/README.md)
- [TypeScript source reference](sdk/typescript-reference.md)
- [MCP adapter guide](sdk/mcp.md)
- [Agent contract guide](sdk/agent.md)
- [Conformance guide](sdk/conformance.md)
- [Examples](sdk/examples.md)
- [Contract provenance](reference/CONTRACT_PROVENANCE.md)
- [Contract versioning and negotiation](reference/CONTRACT_VERSIONING.md)
- [Product direction alignment](reference/PRODUCT_DIRECTION_ALIGNMENT.md)
- [Docker AI technical comparison](reference/DOCKER_AI_TECHNICAL_COMPARISON.md)

Current npm workspaces are unpublished workspace packages. Documentation
describes repository-local contracts, not installable packages or stable public
APIs.
MCP 2026-07-28, framework interoperability, recovery, identity, telemetry,
Registry verification, signer-provider, and reconciliation documentation is
experimental source truth; none implies production support or runtime
authority.

## Product and Extension Authors

- [Open core and downstream product boundaries](architecture/OPEN_CORE_AND_PRODUCT_REPOSITORIES.md)
- [Agent configuration, skill, model-overlay, and shared-library design](architecture/AGENT_CONFIGURATION_SKILL_AND_CONTEXT_MANAGEMENT.md)
- [OS CLI, daemon, service, output, and automation contract](architecture/CLI_AND_OS_OPERATOR_INTERFACE.md)
- [Agent framework adapter inclusion](architecture/AGENT_FRAMEWORK_ADAPTER_INCLUSION.md)
- [SDK information architecture](architecture/SDK_INFORMATION_ARCHITECTURE.md)

Private downstream repositories may implement paid management, connectors,
model packs, and release composition. Portable formats, authority boundaries,
security behavior, and conformance remain public-core concerns.

## Maintainers and Release Reviewers

- [Roadmap](ROADMAP.md)
- [Product build sequence](PRODUCT_BUILD_SEQUENCE.md)
- [Phase 7 readiness execution plan](architecture/PHASE_7_READINESS_EXECUTION_PLAN.md)
- [Phase 7 readiness ledger](reference/phase7-readiness.json)
- [Public source snapshot marker](reference/public-source-snapshot.json)
- [Security review evidence boundary](reference/security-reviews/README.md)
- [Phase 7 local-v1 conformance freeze](architecture/PHASE_7_LOCAL_V1_CONFORMANCE_FREEZE.md)
- [P7-B1 post-merge security review input](reference/security-reviews/P7-B1/post-merge-review-0526845.json)
- [ADR-0006: Phase 7 local-v1 trust and optional signed evidence](architecture/ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
- [ADR-0007: Docker-first runtime-neutral enforcement](architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)
- [ADR-0005: Phase 7d enterprise local persistence](architecture/ADR-0005_PHASE_7D_ENTERPRISE_LOCAL_PERSISTENCE.md)
- [ADR-0004: Phase 7 signed approval evidence](architecture/ADR-0004_PHASE_7_SIGNED_APPROVAL_EVIDENCE.md)
- [ADR-0003: open core, extensions, and management plane](architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md)
- [ADR-0002: authority layer and v1 distribution](architecture/ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md)
- [ADR-0001: historical v1 product scope](architecture/ADR-0001_V1_SCOPE.md)
- [Mandatory Phase 14 distribution](architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md)
- [Source release process](RELEASING.md)
- [Public-readiness report](PUBLIC_READINESS.md)
- [Legacy identifier inventory](reference/LEGACY_IDENTIFIER_INVENTORY.md)
- [Product direction alignment](reference/PRODUCT_DIRECTION_ALIGNMENT.md)
- [Pinned Rust toolchain](RUST_TOOLCHAIN.md)
- [Governance](../GOVERNANCE.md)
- [Maintainers](../MAINTAINERS.md)
- [Security policy](../SECURITY.md)
- [Support](../SUPPORT.md)
- [Changelog](../CHANGELOG.md)

## Onboarding

- [Project onboarding](onboarding/PROJECT_ONBOARDING.md)
- [Agent onboarding](onboarding/AGENT_ONBOARDING.md)

## Documentation Status

- **Current** docs describe checked-in behavior and developer workflows.
- **Experimental** docs describe implemented source without stable compatibility
  guarantees.
- **Proposal** docs describe future architecture and do not imply availability.

These labels describe source maturity, not distribution or support. Public
repository visibility would not convert experimental source into a supported
release. See [claims and maturity vocabulary](CLAIMS_AND_MATURITY.md).

Architecture catalog labels these categories explicitly. Internal ledgers,
handoff prompts, private reviews, marketing source, and deployment operations
are intentionally outside public documentation.
