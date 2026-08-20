# Self-Contained Installation And Adaptive Setup

## Product Decision

LNSAT launches as self-contained, self-deployable packaged software. Installed
product owns setup, configuration, Control Center, Gateway, policy, evidence,
and worker enrollment inside deployment-owner systems.

Public documentation and binary distribution are delivery channels only. They
provide no infrastructure identity, operational endpoint, tenant authority,
control-plane authority, enrollment authority, or runtime dependency.

## Current Truth

Repository currently contains source contracts, local isolated beta proofs,
package-family plans, and setup/onboarding previews. It does not yet contain a
production setup script, published platform packages, completed installers,
native mobile worker, or deploy-from-zero runtime.

This document defines target behavior for those future artifacts without
claiming they exist now.

Production runtime language and migration boundary are defined in
`docs/architecture/RUST_CORE_AND_TYPESCRIPT_CONTROL_CENTER_ARCHITECTURE.md`:
Rust owns installed security/infrastructure core; TypeScript owns Control Center
UI and generated clients. Current TypeScript runtime remains transitional until
conformance passes.

## Setup Contract

Setup must run from installed product and remain owner-directed. Planned flow:

1. Detect supported host facts without changing host state.
2. Show detected capabilities, limitations, and unsupported requirements.
3. Ask owner which management topology and agent roles to enable.
4. Ask owner which compute resources may participate and under what policy.
5. Ask owner for network, authentication, integration, and secret references.
6. Generate reviewable configuration and a dry-run plan.
7. Require explicit approval before service install, enrollment, network
   exposure, privileged change, or runtime activation.
8. Validate resulting deployment and record evidence for every applied step.

Setup must support repeatable review, safe reruns, rollback planning, and
configuration export without depending on a vendor-operated service.

## Detection Model

Read-only detection may identify:

- operating system and version;
- architecture such as `x86_64` or `arm64`;
- CPU, GPU, NPU, accelerator, memory, storage, and thermal capability hints;
- container, service-manager, virtualization, and local runtime availability;
- loopback, local-network, and owner-provided private-overlay readiness;
- existing Control Center, Gateway, worker, and configuration state;
- device class, including server, workstation, edge device, or mobile client.

Detection reports capability evidence. It does not decide workload eligibility,
grant agent authority, scan unrelated networks, install dependencies, or enroll
other devices.

## Owner Choices

Setup must ask rather than assume:

- single-system or multi-system deployment;
- Control Center placement;
- Gateway and worker placement;
- local-only, private-network, private-overlay, or owner-managed TLS topology;
- which agents may connect and which actions each may request;
- approval levels, policy profiles, budgets, schedules, and audit retention;
- which compute devices may participate, including opt-in mobile devices;
- whether models, connectors, or integrations stay disabled, local, or
  separately configured;
- whether any service starts automatically.

Owner choices become explicit configuration and evidence. Package source,
download location, branding, network reachability, and hardware presence never
grant authority.

## Platform Adaptation

Packaging may provide platform-specific payloads behind one setup experience.
Capability-qualified targets include Linux, macOS, Windows, containers,
`x86_64`, `arm64`, and later supported mobile clients. Unsupported features must
fail closed with clear explanation; setup must not silently substitute a wider
permission, weaker isolation boundary, remote service, or different topology.

Mobile participation remains opt-in and policy-limited. Battery, charging,
thermal state, foreground/background rules, network class, model limits, data
classification, and revocation must be evaluated before any mobile workload.
Native app, enrollment, model transfer, inference, relay, peer mesh, and runtime
dispatch remain separate future packets.

## Operational Identity

Installed deployment receives operational endpoints only from owner-approved
configuration created or imported during setup. Endpoint configuration binds
deployment owner, environment, Gateway identity, TLS/network policy, and audit
evidence. Distribution channels never supply operational identity by default.

Loopback HTTP may be allowed for single-host development. Remote endpoints
require owner-approved secure transport. Credentials and secret values remain
outside generated repository artifacts and appear only through secret
references or approved local secret handling.

## Fail-Closed Rules

Setup must stop before mutation when:

- platform or required capability is unsupported;
- owner intent is missing or ambiguous;
- requested topology exceeds declared network boundary;
- required policy, approval, rollback, or audit evidence is missing;
- secret material would be written into unsafe config or logs;
- requested agent capability exceeds selected profile;
- device enrollment or compute participation is not explicitly approved;
- detected state conflicts with existing immutable deployment identity.

## Delivery Boundary

Documentation and binary distribution may explain requirements and deliver
verified artifacts. They do not configure infrastructure. Installed setup code
performs local detection and produces owner-reviewed configuration. Separate
packets must authorize package creation, signing, publication, installer
execution, service changes, network changes, enrollment, and runtime activation.

## Next Source Slices

1. Create Rust workspace and cross-language conformance foundation.
2. Define strict read-only system capability manifest for setup detection.
3. Define owner-choice installation profile and topology schema.
4. Define deterministic setup plan and negative probes.
5. Add local dry-run rendering in Control Center.
6. Build platform package and installer slices only after explicit release
   packets open them.
