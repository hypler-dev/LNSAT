# Distributed Knowledge, Hardware, And Observability

## Status And Boundary

This document records broad architecture and product direction. Gateway source
now includes bounded OTel correlation/redaction and SPIFFE workload-identity
interfaces with negative tests. It creates no live daemon, database, queue,
policy bundle, collector, binary, installer, OS image, portal, deployment, host
mutation, trust domain, or control.

The target is a high-performance, cross-platform LNSAT control plane that can
use mixed older and newer hardware without weakening policy, tenant isolation,
audit, or fail-closed behavior. Old hardware is a first-class deployment
baseline when measured health and capability meet role requirements. Cluster
management is supported by later adapters; LNSAT does not require a proprietary
mega-cluster runtime or Kubernetes.

## Architectural Invariants

- Agents request intent; agents never receive direct infrastructure authority.
- LNSAT Gateway remains the security boundary. Knowledge, memory, hardware,
  telemetry, UI, MCP, and platform adapters cannot bypass it.
- Dedicated knowledge/context/memory services supply evidence, not authority.
- Policy decisions are versioned, signed, attributable, auditable, and
  fail-closed.
- Explicit deny wins over allow. Tenant, residency, purpose, and sensitivity
  constraints apply before data retrieval or action authorization.
- Secrets remain references. Raw secret values never enter knowledge records,
  telemetry, policy bundles, logs, prompts, fixtures, or audit payloads.
- Raw tenant knowledge stays in its allowed region. Global replication is
  limited to permitted hashes, metadata, and derived indexes.
- Recommendation and simulation precede execution. Authority-node, database,
  policy, or residency moves always require an approved packet.

## Logical Planes And Service Boundaries

Use coarse independently deployable services. Split further only after measured
load, security isolation, or failure-domain evidence requires it.

### Gateway And Identity Plane

- authenticates human, workload, service, and agent identity;
- resolves tenant, home region, session, device, workload, and capability refs;
- authorizes every knowledge read, policy decision, proposal, and action;
- applies rate, purpose, residency, disclosure, and approval constraints;
- emits immutable decision and access evidence without raw rejected values.

Human federation targets OIDC and SAML, with SCIM provisioning. Workloads use
short-lived identities. Service-to-service traffic uses mutual TLS. Static,
long-lived bearer credentials are not the target trust model.

### Policy And Organizational Rules Plane

- owns authoritative, versioned policy and organizational-rule writes;
- compiles OPA/Rego policy to WASM;
- signs policy bundles and publishes signed manifests;
- distributes immutable bundles to regional evaluators;
- records activation, supersession, revocation, and evaluation evidence.

Central authority owns policy versions. Regional evaluators serve signed cached
reads. Invalid, revoked, unknown, or stale bundles deny privileged actions.
Authority loss may preserve bounded ordinary reads under the last valid bundle,
but denies writes, approvals, privilege escalation, and infrastructure changes.

### Knowledge, Context, And Memory Plane

- provides shared, policy-filtered organizational knowledge to authorized agents
  across platforms;
- stores canonical records in PostgreSQL and vector retrieval data with
  `pgvector`;
- stores graph projections and relationship indexes in PostgreSQL initially;
- separates source evidence, derived summaries, vector indexes, graph
  projections, agent/session memory, and policy/rule records;
- tracks source ref, tenant, region, owner, sensitivity, purpose, retention,
  provenance, version, hash, timestamps, and supersession state;
- returns minimum necessary context bundles through Gateway mediation.

This plane may rank, retrieve, summarize, and relate evidence. It cannot grant
permissions, execute actions, or silently convert retrieved text into policy.

### Event And Audit Plane

NATS JetStream is the target durable event backbone for policy publication,
knowledge invalidation, telemetry-derived placement events, audit ingestion,
and management read-model updates. Consumers are idempotent, events are
tenant-scoped, and replay never bypasses current authorization.

Audit remains append-oriented and independently verifiable. Event delivery is
not proof of action success; canonical audit evidence records request, decision,
approval, action result, policy version, actor, tenant, and region.

### Hardware Allocation Plane

The Hardware Allocation Engine (HAE) converts signed inventory, bounded
benchmark results, historical telemetry, health, locality, reliability, and
policy constraints into explainable role recommendations and simulations.
It does not execute placement or move authoritative state in its first phases.

### Observability Plane

Node agents and services emit OpenTelemetry-compatible signals to regional
collectors. Proposed storage and operator surfaces are:

- VictoriaMetrics for metrics;
- Grafana for dashboards and controlled exploration;
- Loki for logs;
- Tempo for traces;
- Alertmanager for alert routing;
- optional Pyroscope for continuous profiling;
- optional eBPF collectors where OS support and policy allow;
- optional Redfish/IPMI reads for out-of-band hardware health.

Observability is evidence, not authority. Monitoring outages cannot default to
unsafe placement or privileged execution.

MCP request/task IDs and A2A task IDs may correlate to OTel traces, but durable
LNSAT `operation_id` remains independent. Trace/baggage data is bounded and
redacted; packet bodies, tokens, secrets, approvals, and artifact content stay
out. Span completion never proves action completion. SPIFFE workload identity,
when separately deployed, identifies caller/service only and never grants
action authority.

### Management Plane

Web and application management portals expose tenant-scoped knowledge, rule,
identity, hardware, topology, performance, alert, audit, recommendation, and
simulation read models. Later binary and OS-build distribution supports server,
node-agent, CLI, and operator-app installation. Portals call Gateway contracts;
they do not connect directly to authority databases or host agents.

## Multi-Region And Tenant Model

- Every record carries tenant and residency scope.
- Every tenant has a declared home region for authoritative policy, identity
  mapping, knowledge metadata, and permitted writes.
- Authoritative writes route to the tenant home region.
- Regional reads use signed policy bundles and allowed regional replicas or
  caches.
- Raw knowledge is region-pinned unless an explicit data policy permits
  replication.
- Global control surfaces receive only permitted hashes, metadata, health
  summaries, capacity summaries, and derived indexes.
- Cross-region requests are authenticated, authorized, purpose-bound, audited,
  encrypted in transit, and denied when residency cannot be proven.
- Cache entries bind tenant, region, source version, policy version, expiry,
  sensitivity, and purpose. A cache key can never cross tenants.

Signed hybrid policy flow:

```text
authoritative rule write
  -> validate and version
  -> compile Rego to WASM
  -> sign bundle and manifest
  -> publish through JetStream
  -> regional verification
  -> atomic activation
  -> Gateway evaluation
  -> audit policy version and result
```

Healthy-region target: signed rule propagation completes in less than five
seconds. Revocation and emergency-deny paths receive priority and remain
fail-closed when currentness cannot be proven.

## Knowledge Request Flow

```text
agent request
  -> Gateway identity and tenant resolution
  -> RBAC and ABAC evaluation
  -> residency, purpose, sensitivity, and retention checks
  -> regional source, vector, and graph retrieval
  -> policy-filtered context assembly
  -> response with source refs and policy version
  -> access and decision audit
```

RBAC supplies stable role grants. ABAC constrains those grants by tenant,
region, workload, device, agent, data class, purpose, time, risk, health, and
approval state. Explicit deny wins at every layer.

## Hardware Support Baseline

Initial supported target:

- at least 4 physical CPU cores;
- at least 64 GB RAM;
- PCIe-attached expansion and storage paths;
- SSD/NVMe-only active data and workload storage;
- at least 10 GbE inter-node networking;
- x86_64 or arm64;
- CPU-only operation supported; accelerators are optional.

Linux hosts authority, PostgreSQL, JetStream, and other stateful roles. Linux
and macOS may host stateless workers. Linux uses systemd and rootless
containers. macOS uses launchd and native workers where containers are not the
best fit. Windows node-agent support is later. Kubernetes may be an adapter,
never a core dependency.

Hardware age alone never excludes a node. Measured capability, health,
reliability, locality, power/thermal behavior, and role requirements decide
placement. HDD may be allowed only for explicitly planned cold/archive tiers;
it is never active database, queue, index, cache, or workload storage.

## Node Agent And Hardware Inventory

Target observer is a read-only Rust node agent distributed as:

- Linux amd64;
- Linux arm64;
- macOS Intel;
- macOS Apple Silicon;
- Windows later.

Target Rust ownership extends beyond observer implementation to installed
Gateway, packet, policy, approval, audit/evidence, CLI, and worker core. Current
TypeScript services remain transitional reference behavior; Control Center UI
remains TypeScript/React. `node-agent` means Rust host observer/worker, not
Node.js.

Inventory and observation include:

- CPU sockets, physical/logical cores, cache, instruction sets, NUMA topology;
- RAM capacity, ECC state where visible, topology, pressure, and measured
  bandwidth;
- PCIe generation, negotiated width, lanes, topology, and attached devices;
- SSD/NVMe model, capacity, SMART health, endurance, latency, and errors;
- NIC speed, negotiated state, packet loss, errors, drops, and optional RDMA;
- OS, kernel, architecture, security posture, service state, and agent version;
- temperature, throttling, power, fan, and out-of-band health where available.

Safe benchmarks are explicit, bounded, cancellable, resource-capped, and
audited. They measure CPU, memory, storage, and network capability without
destructive writes or uncontrolled saturation. Production-safe profiles are
separate from maintenance-window profiles.

## Hardware Allocation Engine

HAE recommends these coarse role families:

- authority and policy;
- PostgreSQL database;
- JetStream message bus;
- cache and retrieval;
- vector index;
- graph projection;
- embedding or model worker;
- audit storage and verification;
- object/cold storage;
- web management;
- platform adapter.

Each result includes eligible and excluded roles, score factors, constraints,
threshold failures, risk, dependency locality, redundancy impact, confidence,
expected bottlenecks, and alternatives. Management UI renders node, rack,
network, service, data-residency, and failure-domain relationships as a visual
graph. Operators can compare current, proposed, and simulated layouts.

HAE states:

```text
supported
supported_with_warnings
restricted_roles_only
below_minimum
quarantined
```

Examples:

- less than 4 physical cores, 64 GB RAM, 10 GbE, supported OS/architecture,
  PCIe, or SSD excludes incompatible roles and raises a threshold warning;
- missing optional sensors or ECC evidence may produce
  `supported_with_warnings` without inventing health;
- degraded SSD endurance, NIC errors, thermal throttling, or unstable benchmark
  results restrict roles or require review;
- critical SMART data, uncorrectable memory errors, persistent link failure, or
  integrity failure recommends drain and quarantine.

HAE consumes monitoring history. It cannot auto-move authority, policy writers,
databases, queues, tenant home regions, or raw knowledge. Later execution must
pass Gateway policy, approvals, signed plan verification, preflight, rollback,
and audit.

## Mobile Edge Eligibility

Mobile devices use a separate baseline from server nodes. They are eligible for
private inference and independent, checkpointable work shards based on current:

- device ownership, management, enrollment, trust, patch, and revocation state;
- architecture, SoC, CPU, GPU, NPU, runtime, precision, and model compatibility;
- app lifecycle and foreground/background allowance;
- battery, charging, thermal, power mode, RAM, and storage budgets;
- Wi-Fi, cellular, metered, roaming, relay, LAN, and offline posture;
- model-cache locality, data locality, egress policy, expected duration, and
  user schedule;
- checkpointability, duplicate-result handling, confidence, and verification.

HAE may recommend local inference, embeddings, OCR, transcription,
classification, sensor preprocessing, redaction, evaluation shards, or
charging-only batch work. It must exclude authority, policy writer, approval,
primary database/queue/audit, guaranteed-availability, arbitrary-code, public
listener, or irreplaceable-job roles.

Many mobile devices provide aggregate throughput only as independent workers.
HAE must not model them as one shared-memory accelerator or assume continuous
availability. Every assignment still requires a signed, device-bound, expiring
lease and on-device policy verification.

## Permission Levels

Permission levels are cumulative ceilings, then reduced by RBAC, ABAC, tenant,
region, and explicit-deny policy:

| Level | Allowed capability                                                   |
| ----- | -------------------------------------------------------------------- |
| H0    | Public product and compatibility information only                    |
| H1    | Tenant-scoped inventory and health readback                          |
| H2    | Metrics, topology, alerts, and policy-filtered knowledge inspection  |
| H3    | Run bounded diagnostics, benchmarks, and placement simulations       |
| H4    | Draft policies, assignments, drain plans, and change proposals       |
| H5    | Approve and execute scoped reversible plans through Gateway controls |
| H6    | Break-glass recovery under dual control, TTL, reason, and full audit |

No level grants arbitrary shell, unrestricted filesystem access, secret reads,
or bypass of packet and approval controls. H6 is not standing administrator
access. It is time-bound, purpose-bound, independently alerted, and revocable.

## Performance And Reliability Targets

Architecture target, not current proof:

- 10,000 concurrent agents;
- 1,000 tenants;
- 99.99% availability for authorized reads;
- 99.9% availability for authoritative writes;
- less than 5 seconds healthy-region rule propagation.

Measure node, workload, and LNSAT-specific signals:

- saturation, utilization, latency, errors, queue depth, throughput, and
  availability;
- CPU/NUMA, memory/ECC, disk endurance/latency, network loss/errors, thermals,
  power, and throttling;
- Gateway auth/policy latency and denial reasons;
- policy bundle age, signature status, propagation delay, and activation skew;
- knowledge retrieval latency, cache hit rate, vector/graph freshness, and
  residency denials;
- JetStream lag, redelivery, storage, quorum, and consumer health;
- PostgreSQL connections, locks, replication, WAL, query latency, and capacity;
- audit ingest, verification, persistence lag, and integrity failures;
- HAE recommendation age, confidence, exclusions, imbalance, and predicted
  capacity margin.

Static thresholds provide immediate protection. Historical baselines identify
node-specific drift across mixed hardware. SLO burn alerts, anomaly detection,
capacity forecasting, and dependency-correlated diagnosis guide operators.
Automated analysis may recommend; it does not silently authorize changes.

## Failure Modes And Required Behavior

| Failure                                    | Required behavior                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Policy authority unavailable               | Serve only bounded reads allowed by last valid signed bundle; deny writes and privileged actions       |
| Bundle stale, invalid, revoked, or unknown | Fail closed; retain prior valid bundle only within declared freshness policy                           |
| Tenant home region unavailable             | Deny authoritative writes; do not redirect them to an undeclared region                                |
| Regional knowledge store unavailable       | Use only policy-permitted current cache; otherwise return source unavailable                           |
| Residency uncertain                        | Deny raw retrieval and cross-region transfer                                                           |
| JetStream degraded                         | Preserve local safety; queue only idempotent permitted work; never treat missing event as approval     |
| Telemetry stale or collector unavailable   | Mark evidence stale; reduce HAE confidence; block unsafe placement execution                           |
| Node below threshold                       | Exclude incompatible roles; retain explainable warning evidence                                        |
| Critical hardware health event             | Recommend drain/quarantine; require approval for stateful movement                                     |
| Node agent compromised or unverifiable     | Revoke identity, quarantine node, reject inventory and telemetry                                       |
| Identity provider unavailable              | Existing short-lived sessions follow policy; deny new privilege and expired identity                   |
| Portal unavailable                         | Core Gateway, policy, audit, and regional reads remain independent                                     |
| Network partition                          | Preserve tenant/region boundaries; no split-brain authoritative writes                                 |
| MCP/A2A transport response lost            | Mark outcome unknown after possible dispatch; reconcile exact operation before retry or terminal state |
| OTel collector unavailable                 | Preserve Gateway/audit operation; mark correlation degraded; never infer action outcome                |
| Registry unavailable or reset              | Use only locally pinned approved metadata; block new unverified discovery/install                      |

## Binary, OS-Build, And Portal Direction

Later packets may define signed/checksummed artifacts for node agents, servers,
CLI, and operator applications; Linux packages or images; macOS launchd
packages; upgrade, rollback, uninstall, revocation, and compatibility metadata;
and web/app portals. Distribution must follow existing release-trust gates.

OS builds and installers cannot embed tenant secrets or grant default root
authority. Host privileges are declared per capability. Self-hosted, hybrid,
and managed deployments share contracts and evidence shapes.

## Phased Packet Sequence

1. **Architecture and schemas:** freeze plane boundaries, tenant/region refs,
   hardware inventory, health, telemetry, recommendation, and permission
   contracts as source-only schemas and fixtures.
2. **Read-only observer:** implement signed Rust node-agent identity, inventory,
   threshold evaluation, bounded benchmark contracts, local fixtures, and
   cross-platform packaging scaffolds without live placement.
3. **Observability spine:** add OpenTelemetry collection contracts, dashboards,
   SLOs, alerts, retention, tenant isolation, and failure/readback tests in local
   stacks.
4. **Knowledge and policy spine:** add local PostgreSQL/pgvector and JetStream
   scaffolds, signed Rego/WASM bundle publication, regional cache validation,
   and fail-closed multi-tenant tests.
5. **HAE recommendation:** implement explainable scoring, role exclusions,
   graph projections, simulations, and historical telemetry inputs without
   execution.
6. **Management surfaces:** add permission-filtered web/app inventory,
   topology, policy, knowledge, observability, audit, and simulation views.
7. **Distribution:** build reproducible signed binaries, OS packages/images,
   compatibility manifests, upgrade/rollback flows, and offline install proof.
8. **Approval-gated execution:** only after independent safety and scale proof,
   open bounded placement/drain adapters with signed plans, approval, rollback,
   and audit.
9. **Scale and region proof:** test 10,000-agent/1,000-tenant targets, regional
   loss, policy propagation, cache staleness, noisy-neighbor isolation, and
   mixed-hardware capacity before release claims.

Each phase needs its own tracked implementation scope, tests, review evidence, and explicit
side-effect boundary. A later packet may reorder implementation based on
measured evidence without weakening these invariants.

## Explicit Non-Goals

- memory server as authorization source;
- agents directly controlling infrastructure;
- arbitrary shell, root-by-default, or unrestricted host access;
- Kubernetes-first or Kubernetes-required deployment;
- hardware-age exclusion or accelerator requirement;
- HDD active database, queue, index, cache, or workload tiers;
- unrestricted cross-region raw-data replication;
- per-agent custom policy forks outside versioned organizational governance;
- automatic authority, database, tenant-region, or raw-knowledge relocation;
- full microservice decomposition before measured need;
- live runtime, installer, daemon, DB, queue, collector, portal, or deployment
  authority from this document.

## Hard Gates

Separate explicit approval packets remain required for secrets or credentials,
production/customer data, DNS/Cloudflare mutation, deploy or hosted mutation,
external SSH, public package publication, production database writes or
migrations, destructive Git, paid/external service effects, privileged host
installation, live node enrollment, placement execution, authority/database
moves, tenant home-region changes, and cross-region raw-data transfer.

This document opens none of these gates.
