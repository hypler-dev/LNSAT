# Mobile Edge AI Policy And Worker Architecture

## Purpose

LNSAT treats phones and tablets as first-class future `mobile_edge` substrates
for local inference, privacy-preserving preprocessing, sensor workloads, and
opportunistic compute. Mobile devices extend owner-controlled infrastructure;
they do not become miniature authority servers or unrestricted remote shells.

This document is source-only architecture. It does not build or install a
mobile app, enroll a device, open a listener, transfer a model, run inference,
dispatch a workload, invoke an external service, or mutate live infrastructure.

## Product Value

Mobile policy closes the gap between device management and AI execution. It
lets an owner answer:

- which device, model, runtime, data, sensors, and destination are in scope;
- whether inference may run locally, offline, in background, or over cellular;
- which battery, charging, thermal, memory, storage, and network limits apply;
- whether a person must approve camera, microphone, location, health, personal,
  regulated, or other sensitive-data use;
- where results may go and how long inputs, caches, and outputs may remain;
- which signed decision, workload lease, result, and audit evidence prove what
  happened;
- how a model, policy, workload, app version, or device is revoked.

Primary users are mobile app teams, AI platform teams, security and compliance
operators, enterprise IT, managed-device operators, field-work organizations,
and developers adding governed local inference to existing apps.

## Product Surfaces

LNSAT should separate three surfaces:

1. **Mobile Policy SDK** - embedded in an existing iOS or Android app; verifies
   policy before inference and emits bounded evidence.
2. **Mobile Edge Worker** - installable owner-managed app; advertises bounded
   capabilities and pulls eligible workload leases.
3. **Control Center** - inventories devices, models, policies, capacity,
   approvals, workloads, results, revocations, and evidence.

No surface bypasses Gateway. Platform MDM, work profiles, managed-device
attestation, app sandboxes, and OS permissions remain additional enforcement
layers rather than replacements for LNSAT policy.

## Governing Flow

```text
human or agent inference intent
  -> Gateway identity and device binding
  -> model/data/resource policy decision
  -> approval when required
  -> signed expiring mobile workload lease
  -> on-device policy verification
  -> local model execution
  -> output and egress filtering
  -> result verification
  -> audit evidence
```

Central policy alone is insufficient because a device may disconnect. Mobile
runtime must verify a signed, bounded, expiring lease locally. Missing, expired,
revoked, malformed, or device-mismatched authority fails closed.

## Mobile Roles

Eligible role families:

- private local inference;
- embeddings, reranking, OCR, transcription, and classification;
- image, audio, and sensor preprocessing;
- local redaction before approved transfer;
- offline field assistant;
- checkpointable evaluation or batch shard;
- charging-only opportunistic worker;
- nearby edge cache or model-data relay when separately allowed;
- federated analytic or bounded training update when separately approved.

Prohibited default roles:

- authority, policy writer, approval authority, or root of trust;
- primary database, queue, audit ledger, or irreplaceable state holder;
- arbitrary code executor, raw shell, SSH endpoint, or unrestricted file host;
- permanent listener exposed to local, carrier, or public networks;
- guaranteed-availability worker or sole owner of an uncheckpointed job;
- hidden background compute, covert telemetry, or compute without owner consent.

## Device Capability Manifest

Every enrolled device should declare a signed, versioned manifest containing:

- device ref, owner/tenant ref, management mode, app version, OS, and patch level;
- architecture and SoC family;
- CPU, GPU, NPU/Neural Engine, supported precision, runtime, and model formats;
- available RAM and storage budgets without exposing unrelated personal data;
- battery, charging, thermal, power-mode, and background-execution posture;
- Wi-Fi, cellular, metered, roaming, relay, LAN, and offline posture;
- sensor capabilities with OS permission and LNSAT policy state;
- hardware-backed identity or attestation evidence when available;
- supported workload classes and explicit forbidden capabilities;
- model cache inventory by digest, never by unverified display name;
- last heartbeat, policy version, revocation posture, and evidence refs.

Manifest data is capability evidence, not authority. Gateway policy and a valid
lease still decide whether work may run.

## Policy Dimensions

Mobile inference policy must cover:

- device ownership: personal, work profile, company-owned, dedicated, or lab;
- device trust, enrollment, attestation, patch, compromise, and revocation state;
- approved model digest, source, license, version, signature, and runtime;
- allowed inputs, data classes, sensors, local stores, and source refs;
- local-only, LAN, relay, cloud, peer, and result-egress boundaries;
- input, model, cache, output, log, and evidence retention/deletion;
- foreground/background posture and user-visible execution requirement;
- charging state, battery floor, thermal ceiling, power mode, and time window;
- CPU/GPU/NPU, RAM, storage, network, and maximum-duration budgets;
- Wi-Fi-only, metered, cellular, roaming, and offline behavior;
- approval thresholds and device/user cancellation;
- result destination, verification, confidence, duplication, and retry policy;
- audit detail, privacy redaction, and source linkage.

OS permission grants never imply LNSAT permission. LNSAT permission never
overrides OS denial or user cancellation. Most restrictive decision wins.

## Workload Lease

A mobile workload lease should bind:

- lease, packet, policy-decision, approval, device, operator, and session refs;
- exact model and runtime digests;
- bounded input refs rather than embedded secret values;
- capability, data, sensor, egress, and result-destination constraints;
- resource budgets and current eligibility requirements;
- issued, not-before, expiry, cancellation, and revocation state;
- checkpoint, retry, idempotency, duplicate-result, and evidence obligations.

Leases should be short-lived, signed, device-bound, cancellable, replay-safe,
and usable offline only within explicit policy. A lease cannot grant capability
outside device manifest, app sandbox, OS permission, or Gateway policy.

## Networking

Initial network model is outbound-only:

- device enrolls through a user-visible one-time or QR flow;
- app creates hardware-backed key material when platform support exists;
- device opens authenticated outbound HTTPS/WebSocket/QUIC-style sessions;
- device pulls leases and model/data manifests; server does not require inbound
  access through carrier NAT or home routers;
- relay is default across networks; optional LAN discovery and peer transfer
  remain later, separate capabilities;
- connectivity changes pause/checkpoint work rather than weakening policy;
- offline operation uses cached signed policy and leases with strict expiry;
- reconnect reconciles lease, cancellation, result, and evidence state.

No custom VPN, peer mesh, public listener, port forwarding, or permanent device
reachability is required for first implementation.

## Platform Boundaries

Shared mobile contract, signature, lease, policy-version, and result-evidence
logic targets a Rust library after explicit implementation packets open. Native
Swift and Kotlin shells retain OS permission prompts, consent, lifecycle,
background scheduling, thermal, battery, network, and secure-storage
integration. No Rust mobile library or native shell exists yet.

### iOS And iPadOS

- Treat work as foreground/user-initiated or OS-scheduled opportunistic work,
  never a permanent daemon.
- Use fixed app runtimes and platform-approved model/data assets; never download
  arbitrary executable code.
- Respect app sandbox, background-task expiry, user cancellation, thermal state,
  power policy, and network policy.
- Managed-device attestation and MDM may strengthen enterprise identity but are
  not requirements for personal opt-in mode.

### Android

- Support normal app, work-profile, company-owned, and dedicated-device modes as
  separate policy classes.
- Use OS-scheduled work or visible foreground work according to platform rules;
  never hide persistent compute.
- Android Enterprise integration may strengthen managed fleets, but consumer or
  self-hosted use must not depend on restricted enterprise-management APIs.
- Hardware/runtime support varies by OEM and SoC; manifest evidence must drive
  eligibility instead of device-name assumptions.

## Hardware Allocation Engine

HAE should treat mobile availability as dynamic. Eligibility and score include:

- current charging, battery, thermal, power-mode, memory, storage, and network;
- NPU/GPU/CPU runtime compatibility and model-cache locality;
- user schedule, device ownership, management, trust, and privacy policy;
- expected duration, checkpointability, result redundancy, and deadline;
- current foreground/background allowance and recent cancellation history;
- data locality, egress boundary, roaming/metered cost, and relay latency.

Mobile devices should receive independent, bounded shards. LNSAT must not imply
that many phones form one shared-memory accelerator. Large-model tensor
splitting, authority roles, and irreplaceable workloads remain excluded until
separate evidence proves them safe and useful.

## Control Center Requirements

Control Center should show:

- enrolled, available, busy, paused, offline, expired, revoked, and quarantined
  devices;
- owner, management mode, OS, architecture, SoC, runtime, model-cache, and trust;
- battery, charging, thermal, memory, storage, connectivity, and eligibility;
- approved/blocked capabilities, sensors, data classes, egress, and schedules;
- current lease, workload class, progress, cancellation, result, and evidence;
- aggregate capacity by device cohort without promising guaranteed capacity;
- policy templates for local-only, work-profile, charging-only, offline,
  sensitive-data, and untrusted-result workers;
- model/device/workload revocation and evidence-backed rollback.

Control Center may propose and approve work. It must not expose arbitrary shell,
unbounded file access, hidden background compute, or policy-bypass controls.

## Result Trust

Mobile results should preserve model, runtime, device, lease, policy, input,
output, timing, resource, and evidence refs. High-value work may require
redundant execution, deterministic probes, confidence thresholds, or server-side
verification. Disconnect, duplicate completion, late result, model mismatch,
policy expiry, or revoked device fails closed and cannot silently publish.

## Implementation Sequence

1. **Complete:** source-only mobile capability, policy, signed lease,
   result, and evidence contracts with validators and negative probes.
2. Deterministic mobile fleet and workload simulator; no network or inference.
3. Read-only Control Center mobile inventory, policy, and scheduling previews.
4. Local loopback worker protocol with synthetic models/data only.
5. Android worker app for explicit opt-in test devices.
6. iOS/iPadOS cooperative worker respecting platform lifecycle.
7. Model registry, signed distribution, result verification, and revocation.
8. Optional managed-device, LAN discovery, relay, peer transfer, and advanced
   scheduling through separate approved packets.

Each step remains independently scoped and validated. Native app installation,
device enrollment, network listeners, model transfer, inference, MDM, attestation,
external services, and live dispatch remain closed until their packet opens.

## Broader Edge Reuse

Mobile policy should become one specialization of a reusable edge-workload
contract. Same identity, capability, signed-lease, resource, egress, result, and
evidence model can later govern:

- laptops, desktops, and AI workstations;
- single-board computers and embedded accelerators;
- NAS and storage appliances;
- cameras, microphones, and vision gateways;
- kiosks, point-of-sale systems, and digital signage;
- industrial gateways, PLC-adjacent processors, and factory inspection nodes;
- robots, drones, autonomous equipment, and vehicles;
- wearables, AR/VR devices, and smart glasses;
- routers, home/office hubs, and network appliances;
- game consoles, smart TVs, and other consumer hardware with usable AI compute;
- dedicated GPU/NPU appliances and edge servers.

Each class needs its own lifecycle, safety, ownership, physical-risk, and
availability rules. Shared contract must not erase those differences. Mobile
remains first specialization because its battery, thermal, background,
consent, sensor, and personal-data boundaries are unusually strict.

## Current Truth

Mobile edge architecture is an explicit product direction. Source contracts add
typed source-only capability and policy-decision contracts, issuer-signed lease
and short-lived status evidence, device-signed result evidence, and validators;
it adds no SDK runtime or dispatch authority. No mobile SDK, worker app,
scheduler, relay, enrollment service, model distribution path, native package,
or live mobile inference exists yet.
