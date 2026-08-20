# Compliance Readiness Map

> Hosted-service domain remains unselected. Example `*.lnsat.com` hostnames in
> planning material are not reserved or valid for operational traffic.

## Purpose

This document defines the compliance readiness map LNSAT needs before enterprise
claims, paid support claims, hosted `cloud.lnsat.com`, trust-center
publication, or formal audit work begins.

This is source-only planning. It is not a SOC 2 audit, ISO 27001 certification,
penetration test, legal review, production incident process, vendor review,
hosted runtime, data-processing agreement, or customer-data handling path.

## Readiness Families

### Access Control

Required evidence:

- owner/admin bootstrap;
- local auth, OIDC, SAML, SCIM, and isolated auth readiness refs;
- RBAC/ABAC role model;
- privileged action approval classes;
- session boundary refs;
- emergency access and disablement refs.

### Change Management

Required evidence:

- implementation issue or pull-request linkage;
- pull request review model;
- release manifest refs;
- release promotion gates;
- rollback/disablement refs;
- changelog and support window refs.

### Audit And Logging

Required evidence:

- audit event contract refs;
- policy decision evidence refs;
- approval evidence refs;
- export format plan;
- retention/legal hold/deletion plan;
- tamper-evidence and evidence-bundle plan.

### Incident Response

Required evidence:

- security report intake policy;
- vulnerability advisory process;
- severity model;
- mitigation and emergency disablement process;
- customer communication plan;
- post-incident review plan.

### Vendor And Subprocessor Management

Required evidence:

- hosted-cloud subprocessor list plan;
- data-processing posture;
- third-party service inventory;
- customer-owned integration boundary;
- external service approval model;
- commercial support escalation boundary.

### Availability, Backup, And Disaster Recovery

Required evidence:

- backup/restore runbook plan;
- disaster recovery plan;
- high-availability posture;
- recovery point and recovery time targets;
- hosted status-page posture;
- self-hosted operator responsibility split.

### Privacy And Data Governance

Required evidence:

- no-phone-home default;
- telemetry opt-in event list;
- data retention/deletion posture;
- tenant/project isolation evidence;
- secret-reference-only policy;
- hosted cloud data boundary.

### Security Operations

Required evidence:

- vulnerability management plan;
- dependency and license scan plan;
- release SBOM/provenance/signing refs;
- secure update/revocation refs;
- policy bypass and approval bypass test classes;
- SIEM/OpenTelemetry/webhook/syslog export plan.

## Framework Mapping

### SOC 2 Readiness

Planned control families:

- Security;
- Availability;
- Confidentiality;
- Processing Integrity;
- Privacy.

Initial source refs map to access, change, audit, incident, vendor,
availability, backup, privacy, and security operations families.

### ISO 27001 Readiness

Planned control families:

- organizational controls;
- people controls;
- physical controls for hosted operations later;
- technological controls.

Initial source refs map to governance, access, change, incident, supplier,
continuity, privacy, crypto/secrets, logging, monitoring, and secure
development families.

## Public Trust-Center Requirements

Before `cloud.lnsat.com` becomes a hosted product surface, public trust-center
content must cover:

- security architecture;
- compliance readiness status;
- subprocessors;
- data processing and privacy;
- incident response;
- uptime/status posture;
- backup/restore and DR posture;
- support and escalation;
- audit/export options;
- customer-owned client boundary;
- no raw secret storage claim evidence.

## Blocked Scope

This document does not open:

- SOC 2 audit;
- ISO certification;
- penetration test;
- legal review;
- vendor review;
- subprocessor publication;
- DPA publication;
- hosted runtime;
- trust-center publication;
- audit export execution;
- SIEM/OpenTelemetry/webhook/syslog export execution;
- backup/restore execution;
- incident process activation;
- customer data handling;
- database connection/write;
- external service call;
- GitHub API mutation;
- Git push;
- DNS/Cloudflare mutation;
- secret value;
- nonempty side effects.
