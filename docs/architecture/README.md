# Architecture Catalog

Architecture docs use three maturity categories. **Current** describes checked-in
source or enforced developer rules. **Implementation note** records bounded
experimental foundations. **Proposal** describes future design and does not
claim shipped capability. Accepted decision records constrain future work
without claiming that their target product is implemented.

These categories are source-document labels, not support levels. When a linked
document lacks its own status banner, this catalog classification controls.
[Claims and maturity vocabulary](../CLAIMS_AND_MATURITY.md) defines public
wording; [project status](../PROJECT_STATUS.md) controls merged truth.

## Current Architecture

- [Architecture and developer guide](ARCHITECTURE_AND_DEVELOPER_GUIDE.md)
- [Authority layer and reference workflow](AUTHORITY_LAYER_AND_REFERENCE_WORKFLOW.md)
- [Threat model](THREAT_MODEL.md)
- [System architecture](SYSTEM_ARCHITECTURE.md)
- [Packet model](PACKET_MODEL.md)
- [Policy and audit](POLICY_AND_AUDIT.md)
- [Data model](DATA_MODEL.md)
- [Authentication and integration posture](AUTH_AND_INTEGRATION_POSTURE.md)
- [Context synthesis](CONTEXT_SYNTHESIS.md)
- [MCP adapter design](MCP_ADAPTER_DESIGN.md)
- [Substrates and nodes](SUBSTRATES_AND_NODES.md)
- [Internal knowledge surface](INTERNAL_KNOWLEDGE_SURFACE.md)
- [Control Center information architecture](MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md)
- [Rust core and TypeScript Control Center](RUST_CORE_AND_TYPESCRIPT_CONTROL_CENTER_ARCHITECTURE.md)
- [Open core and product repositories](OPEN_CORE_AND_PRODUCT_REPOSITORIES.md)

## Accepted Decisions

- [ADR-0007: Docker-first runtime-neutral enforcement](ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)
- [ADR-0006: Phase 7 local-v1 trust and optional signed evidence](ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
- [ADR-0004: Phase 7 signed approval evidence](ADR-0004_PHASE_7_SIGNED_APPROVAL_EVIDENCE.md)
- [ADR-0003: open core, extensions, and management plane](ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md)
- [ADR-0002: authority layer and v1 distribution](ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md)
- [ADR-0001: historical v1 product scope](ADR-0001_V1_SCOPE.md) — superseded
  where ADR-0002 conflicts

Accepted decisions control scope and sequencing where proposals overlap. Their
release targets remain unsupported until the decision's evidence gates pass.
ADR-0006 owns local-v1 trust, approval-proof variants, online one-time
authorization, user-owned keys, revised schema/packet lanes, reference adapter,
and staged release critical path. ADR-0004 retains Phase 7b/7c
verification-only source for closed wrapper, public
material, result contracts, exact byte derivation, shared vectors, and pure
Ed25519 verification. Provider-neutral signer interfaces use test doubles only.
No active signer, private material, key custody, endpoint, execution
authorization, or runtime authority exists.

ADR-0007 selects Docker/OCI as first v1 integration profile while keeping
Gateway authority, configuration inheritance, stop semantics, and receipts
runtime-neutral. It creates no Docker adapter, image, package, or support claim.

Cross-phase implementation, release-candidate, candidate-build, proof, and
publication order is controlled by [product build sequence](../PRODUCT_BUILD_SEQUENCE.md).

## Implementation Notes

- [Agent context firewall and permission levels](AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md)
- [Gateway v1 contract negotiation](GATEWAY_V1_CONTRACT_NEGOTIATION.md)
- [Gateway v1 local session issue](GATEWAY_V1_SESSION_ISSUE.md)
- [Gateway v1 authenticated session read](GATEWAY_V1_SESSION_READ.md)
- [Gateway v1 authenticated session rotation](GATEWAY_V1_SESSION_ROTATION.md)
- [Gateway v1 session-family sign-out](GATEWAY_V1_SESSION_FAMILY_SIGN_OUT.md)
- [Gateway v1 identity password rotation](GATEWAY_V1_IDENTITY_PASSWORD_ROTATION.md)
- [Gateway v1 owner-only identity creation](GATEWAY_V1_IDENTITY_CREATION.md)
- [Gateway v1 owner-only identity disablement](GATEWAY_V1_IDENTITY_DISABLEMENT.md)
- [Gateway v1 authenticated identity-event read](GATEWAY_V1_IDENTITY_EVENT_READ.md)
- [Gateway v1 authenticated session-event read](GATEWAY_V1_SESSION_EVENT_READ.md)
- [Gateway v1 authenticated approval request](GATEWAY_V1_APPROVAL_REQUEST.md)
- [Gateway v1 authenticated approval decision](GATEWAY_V1_APPROVAL_DECISION.md)
- [Local persistence readiness](LOCAL_PERSISTENCE_IMPLEMENTATION_READINESS.md)
- [`lnsatd` loopback foundation](LNSATD_LOOPBACK_FOUNDATION.md)
- [Phase 4 exit evidence](PHASE_4_EXIT_EVIDENCE.md)
- [Local identity and owner bootstrap](LOCAL_IDENTITY_AND_OWNER_BOOTSTRAP.md)
- [Local server session evidence](LOCAL_SERVER_SESSION_EVIDENCE.md)
- [Local offline owner recovery](LOCAL_OWNER_RECOVERY.md)
- [SQLite backup and restore](SQLITE_BACKUP_AND_RESTORE.md)
- [SQLite recovery inspection events](SQLITE_RECOVERY_INSPECTION_EVENTS.md)
- [SQLite retention policy](SQLITE_RETENTION_POLICY.md)
- [Phase 7 local-v1 conformance freeze](PHASE_7_LOCAL_V1_CONFORMANCE_FREEZE.md)
- [PostgreSQL audit writer scope](POSTGRESQL_AUDIT_LEDGER_WRITER_G09_SCOPE.md)
- [Audit writer persistence preflight](AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md)
- [Audit migration artifacts](AUDIT_LEDGER_MIGRATION_ARTIFACTS.md)
- [MCP 2026-07-28, framework interoperability, and outage recovery](MCP_V2_FASTMCP_INTEROPERABILITY_AND_OUTAGE_RECOVERY.md)
- [Phase 8 adapter authority conformance](PHASE_8_ADAPTER_AUTHORITY_CONFORMANCE.md)
- [Phase 9 API-backed Control Center](PHASE_9_API_BACKED_CONTROL_CENTER.md)
- [Phase 10 product-surface contract spine](PHASE_10_PRODUCT_SURFACE_CONTRACT_SPINE.md)

These files describe experimental local foundations. Local owner, append-only
credential rotation, permanent non-owner disablement, hash-only session
evidence, and a source-local offline owner-recovery transition exist.
Schema-v15 recovery events deliberately omit browser actors and require an
exclusive daemon-shared database lease. They do not authorize production
storage, stable operator commands, identity re-enable, Gateway recovery routes,
approval signing, or runtime writes.

## Accepted Phase 14 Plans

- [Compatibility and conformance](COMPATIBILITY_AND_CONFORMANCE_MATRIX.md)
- [Distribution and client installers](DISTRIBUTION_AND_CLIENT_INSTALLERS.md)
- [Distribution reality and secure installer plan](DISTRIBUTION_REALITY_AND_SECURE_INSTALLER_PLAN.md)

Selected-profile Phase 14 evidence is mandatory before v1 publication.
Phase 14 becomes eligible only after required Phases 8, 9, 10, 11, and 13 pass.
Unselected package/target rows remain unsupported expansion lanes, not initial
local-v1 blockers. These plans do not claim any artifact, installer, target, or
service is implemented or supported.

## Accepted Product Interface Plans

- [CLI and OS operator interface](CLI_AND_OS_OPERATOR_INTERFACE.md)
- [Phase 10 product-surface contract spine](PHASE_10_PRODUCT_SURFACE_CONTRACT_SPINE.md)

Phase 10 requires first-class `lnsat`, `lnsatctl`, and `lnsatd` OS interfaces.
P10-A1 implements an experimental target-neutral source spine only. It claims no
stable support, package, target path, service lifecycle, or artifact.

## Proposals and Future Design

- [Agent configuration, skill, and context management](AGENT_CONFIGURATION_SKILL_AND_CONTEXT_MANAGEMENT.md)
- [UI and framework expansion](UI_AND_FRAMEWORK.md)
- [Persistence schema plan](PERSISTENCE_SCHEMA_PLAN.md)
- [Agent framework adapter inclusion](AGENT_FRAMEWORK_ADAPTER_INCLUSION.md)
- [Distributed knowledge, hardware, and observability](DISTRIBUTED_KNOWLEDGE_HARDWARE_AND_OBSERVABILITY.md)
- [Secure update and revocation](SECURE_UPDATE_AND_REVOCATION_PLAN.md)
- [Self-contained installation](SELF_CONTAINED_INSTALLATION_AND_ADAPTIVE_SETUP.md)
- [Self-deploy packaging](SELF_DEPLOY_PACKAGING_PLAN.md)
- [Mobile edge policy and worker architecture](MOBILE_EDGE_AI_POLICY_AND_WORKER_ARCHITECTURE.md)
- [Enterprise and developer trust standards](ENTERPRISE_AND_DEVELOPER_TRUST_STANDARDS.md)
- [Enterprise community trust expansion](ENTERPRISE_DEVELOPER_COMMUNITY_TRUST_STANDARDS_EXPANSION.md)
- [Enterprise technical standards maturity](ENTERPRISE_DEVELOPER_TECHNICAL_STANDARDS_MATURITY.md)
- [Compliance readiness map](COMPLIANCE_READINESS_MAP.md)
- [SDK information architecture](SDK_INFORMATION_ARCHITECTURE.md)
- [SDK documentation expansion plan](SDK_DOCUMENTATION_EXPANSION_PLAN.md)

Proposal content is roadmap input only. It must not be used as evidence that a
feature, certification, deployment mode, artifact, or support commitment exists.
