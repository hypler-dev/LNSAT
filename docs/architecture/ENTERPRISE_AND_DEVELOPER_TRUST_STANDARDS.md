# Enterprise And Developer Trust Standards

> Hosted-service domain remains unselected. Example product-site hostnames are
> not valid installed-product operational endpoints.

## Purpose

This document records technical standards LNSAT needs before enterprise buyers
and the developer community should trust it as a full open-source and
commercial product.

This is a source-only roadmap and requirement packet. It does not open live
runtime, release automation, signing execution, Cloudflare mutation, package
publishing, installer execution, auth wiring, database writes, secrets, or
external service calls.

## Product Trust Thesis

LNSAT should be trusted because every artifact, policy boundary, connector,
installer, hosted path, and agent action is inspectable before it can mutate a
system.

Required trust surfaces:

- public security model;
- public open-source governance model;
- signed and reproducible release posture;
- SBOM and provenance for every release artifact;
- vulnerability disclosure and advisory process;
- enterprise audit, identity, retention, and deployment-boundary evidence;
- developer API, module, and compatibility contracts;
- no hidden phone-home behavior;
- clear open-source versus commercial feature boundary.

## Standards To Add

### Release And Supply Chain

Required features:

- SLSA-aligned build provenance for source, server, client, and module release
  artifacts;
- CycloneDX or SPDX SBOM for every release family;
- checksums for source tarballs, binaries, packages, containers, and module
  archives;
- Sigstore/cosign or equivalent artifact signing plan;
- reproducible build recipe and build-environment declaration;
- artifact promotion gates from source plan to release candidate to stable;
- verified GitHub Release asset mapping;
- release support window and LTS policy;
- downgrade protection and rollback/disablement documentation;
- dependency update policy and vulnerability scanning gate;
- OpenSSF Scorecard and license scanning as public quality signals.

### Security And Compliance Readiness

Required features:

- `SECURITY.md` with vulnerability reporting, embargo, advisory, and CVE
  handling policy;
- threat model for Gateway, MCP adapters, clients, hosted cloud, modules,
  installers, and privileged helpers;
- security architecture document showing trust boundaries and fail-closed
  paths;
- SOC 2 readiness control map for access, change, incident, logging, vendor,
  availability, and backup controls;
- ISO 27001 readiness map where applicable;
- crypto inventory and FIPS-friendly posture notes for enterprise review;
- secrets policy that allows references only and later supports KMS/Vault
  integrations without storing raw values;
- secure update-channel plan with signed manifests, expiration, revocation, and
  emergency disablement;
- security test matrix for policy bypass, approval bypass, audit bypass,
  capability escalation, tenant isolation, and raw secret echo.

### Enterprise Identity, Audit, And Operations

Required features:

- SSO/OIDC, SAML, SCIM, local auth, isolated auth, and user-selected
  authorization-level contracts before live wiring;
- RBAC/ABAC role model with explicit permission scopes and approval classes;
- tenant/project isolation model for self-hosted, hybrid, and hosted paths;
- audit export API and file formats for SIEM, GRC, and legal review;
- audit retention, legal hold, deletion, and evidence-export policies;
- OpenTelemetry, webhook, syslog/SIEM, and structured event export plan;
- backup, restore, disaster recovery, and high-availability runbooks;
- upgrade, rollback, uninstall, and emergency disablement runbooks;
- air-gapped install and offline artifact mirror path;
- data processing, subprocessor, DPA, and trust-center requirements for hosted
  cloud before `cloud.lnsat.com` goes live;
- support SLA and enterprise support channel plan.

### Agent Configuration and Delegated Administration

Required features:

- immutable instruction, skill, profile, context, graph, and model-overlay
  identity with origin, signature/attestation, dependencies, and history;
- organization, workspace, role, universal, provider, model, and task overlay
  resolution with inherited-constraint protection;
- policy-controlled author, reviewer, approver, publisher, assigner, operator,
  and auditor separation;
- OIDC/SAML/SCIM subject/group mapping into explicit project membership and
  RBAC/ABAC ceilings;
- delegated-agent identity, scope, audience, role ceiling, depth, expiry,
  revocation, and escalation;
- cross-project sharing, export/import, residency, DLP, legal-hold, retention,
  and deletion controls;
- context grouping confidence/correction evidence and tenant-leakage tests;
- model evaluation, drift, quarantine, and deterministic deny/escalate fallback;
- CLI/API/UI equivalence for inventory, effective configuration, diff,
  assignment, rollback, and evidence export.

### Developer Community And Governance

Required features:

- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `GOVERNANCE.md`,
  `MAINTAINERS.md`, and issue/PR templates;
- clear CLA or DCO decision;
- public roadmap and release cadence policy;
- ADR/RFC process for architecture and protocol changes;
- semantic versioning, compatibility, deprecation, and migration policy;
- public API and SDK stability guarantees;
- conformance test suite for Gateway contracts, module manifests, release
  manifests, and MCP adapters;
- explicit MCP protocol-era support matrix, dual-era downgrade denial,
  FastMCP framework-lane labeling, A2A mapping, and transport-neutral Gateway
  equality;
- examples, local development quickstart, reference modules, and starter
  templates;
- docs versioning by release;
- module certification and marketplace review standards;
- profile, skill, instruction, graph, model-overlay, and shared-library
  conformance plus provenance standards;
- compatibility matrix for operating systems, architectures, browsers,
  databases, auth providers, and supported deployment modes.

### Privacy And Product Boundary

Required features:

- no phone-home by default;
- telemetry opt-in policy with event list, retention, and disablement controls;
- hosted cloud privacy model separated from open-source self-hosted mode;
- clear commercial/open-source feature boundary;
- public license, third-party notices, and dependency license report;
- no bundled customer data, credentials, integrations, tenants, or seeded
  ingestion in factory-clean releases.

### Technical Standards Maturity Addendum

The maturity roadmap adds named enterprise and developer-community standards as
backlog
features that must be tracked separately from marketing or compliance claims.

Required features:

- SLSA Level 3 readiness path, in-toto provenance, Sigstore/cosign artifact
  signing, reproducible build recipes, OpenSSF Scorecard, OSV advisory
  scanning, signed tags, branch protection, and CODEOWNERS review paths;
- CycloneDX and SPDX SBOM support for every release family;
- NIST SSDF/SP 800-218 secure development lifecycle map;
- OWASP ASVS and OWASP API Security Top 10 review checklists for Gateway,
  hosted APIs, and connector SDKs;
- STRIDE or equivalent threat-model workflow for Gateway, MCP adapters,
  modules, installers, clients, hosted cloud, and privileged helpers;
- CIS deployment posture notes and FIPS 140-3-friendly crypto inventory;
- OAuth 2.1/OIDC, PKCE, SAML 2.0, SCIM 2.0, WebAuthn/MFA, RBAC/ABAC, and
  least-privilege API-token standards;
- SPIFFE/SPIRE workload-identity trust-domain, rotation, revocation, and
  workload/human/adapter/server identity-separation plan;
- OpenTelemetry semantic conventions, CloudEvents audit envelope, syslog RFC
  5424, Elastic Common Schema, SIEM export, and tamper-evident audit bundles;
- OpenAPI, JSON Schema, MCP adapter conformance, semantic versioning, API
  stability levels, deprecation windows, golden fixtures, SDK badges, docs
  versioning, ADR/RFC process, and module certification rules;
- dependency integrity, license, provenance, registry-outage, yanked-release,
  namespace-transfer, and unsupported-version negatives before interop support;
- SLO/SLA vocabulary, backup/restore/DR/HA RPO/RTO, air-gapped install,
  offline mirror, LTS policy, and support severity standards;
- GDPR/CCPA readiness, data inventory, data-flow map, minimization, retention,
  deletion, export, subprocessors, DPA, residency, no-phone-home telemetry, and
  open-core/commercial boundary standards.

These are planned requirements until implementation and verification evidence
exists. Public pages must not claim certification, compliance, hosted-cloud
readiness, or downloadable artifact readiness from this addendum alone.

## Public Surface Requirements

`lnsat.com` should expose these trust features as readable public pages before
production release:

- Security;
- Open Source;
- Download;
- Release Trust;
- Governance;
- Enterprise Readiness;
- Hosted Cloud Trust;
- Compatibility;
- Changelog;
- Vulnerability Disclosure.

The public pages may link to planned and not-yet-implemented standards, but they
must label those states clearly.

## Implementation Backlog

Recommended implementation order:

1. Release trust automation: checksums, signatures, SBOM,
   provenance, GitHub Release asset mapping, artifact promotion gates.
2. Community governance: contributing, security policy, code
   of conduct, governance, maintainer, issue/PR templates, CLA/DCO decision.
3. Enterprise trust-center information architecture: public trust pages and enterprise-ready
   evidence model without hosted runtime.
4. Compatibility and conformance matrix: OS, architecture, browser,
   package, module, API, and deployment compatibility tests.
5. Compliance readiness map: SOC 2/ISO readiness, audit exports,
   retention, incident, backup/restore, and vendor/subprocessor posture.
6. Secure update and revocation plan: signed update manifests,
   downgrade protection, revocation, emergency disablement, and rollback.
7. Enterprise developer technical standards maturity: named SLSA,
   OpenSSF, NIST SSDF, OWASP, CIS, FIPS posture, OIDC/OAuth/SAML/SCIM,
   OpenTelemetry, CloudEvents, OpenAPI, JSON Schema, MCP conformance, SLO/SLA,
   DR/HA, privacy, data, and commercial trust standards as source-only planned
   features.
8. Enterprise developer community trust standards expansion: planned
   NIST AI RMF, ISO/IEC 42001, EU AI Act readiness, CSA CCM/CAIQ, SIG, OSCAL,
   FedRAMP/StateRAMP posture, OPA/Rego, VEX, EPSS, CVSS, CISA KEV, SSVC,
   TUF-style metadata, signed release manifest verification, OpenSSF Best
   Practices, API lifecycle, conformance badges, maintainer succession, and
   reproducible local development requirements.

## Acceptance Checks

- trust requirements are source-only and explicit;
- enterprise, open-source, and developer-community standards are separated;
- public `lnsat.com` and future `cloud.lnsat.com` trust obligations are
  separated;
- all future features stay backlog requirements, not live implementation;
- blocked scopes remain closed.

## Blocked Scope

This document does not open:

- binary build;
- package publish;
- release upload;
- signing execution;
- SBOM generation execution;
- GitHub Release creation;
- Cloudflare DNS/Pages/Tunnel mutation;
- hosted cloud runtime;
- auth provider wiring;
- database connection/write;
- runtime or live adapter invocation;
- installer execution;
- service install/restart;
- root helper;
- node-agent;
- Docker runner;
- SSH;
- secret value;
- external service call;
- nonempty side effects.
