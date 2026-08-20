# Agent Configuration, Skill, and Context Management

- Status: proposal and product-boundary decision
- Availability: not implemented
- v1 core requirement: identity, evidence, policy hooks, and CLI design only;
  full management product is downstream

Product placement and non-negotiable boundaries are accepted by
[ADR-0003](ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md). Detailed
schemas and runtime remain proposal scope.

## Why It Is Useful

Agent systems now spread instructions, skills, tool mappings, role files, and
project context across repositories and model-specific directories. Duplicate
copies drift, hide provenance, waste space, and make it difficult to prove what
an agent received.

LNSAT should govern these assets as versioned inputs to agent action, while a
commercial management module can provide rich authoring, synchronization,
sharing, graph editing, and enterprise operations.

This is related to authority but not identical:

- LNSAT core decides whether a configuration assignment or consequential
  action may occur and records evidence;
- configuration management stores, resolves, distributes, and observes agent
  content;
- model/runtime adapters render portable content into exact host formats.

## Managed Objects

First-class immutable objects:

- instruction set;
- rule or prohibition set;
- role and delegation profile;
- skill package;
- tool/capability map;
- context source and selection rule;
- agent definition;
- model/provider overlay;
- workspace/project profile;
- workflow or graph;
- assignment;
- exception, expiry, revocation, and rollback record.

Every object needs stable identifier, schema version, source origin, publisher,
content digest, dependencies, compatibility, owner, classification, creation
time, review/approval evidence, signature or attestation, and lifecycle state.
Mutable names such as `latest` resolve to an immutable digest before use.

## Universal and Model-Specific Composition

Portable intent and model mechanics stay separate:

```text
organization baseline
  -> workspace/project profile
  -> role profile
  -> universal rules, instructions, and skills
  -> provider-family overlay
  -> model-specific overlay
  -> task-scoped temporary context
  -> exact effective bundle digest
```

Universal layers express organization policy, role, prohibited behavior,
required escalation, common skill semantics, and expected evidence.
Model-specific overlays express prompt syntax, tool-call conventions, token and
context limits, supported modalities, and model quirks.

Overlay resolution is deterministic. More specific layers may add constraints
or implementation detail but cannot silently remove inherited prohibitions,
approval requirements, or evidence duties. Effective bundle exposes full
resolution trace.

## Dynamic Update Lifecycle

Updates are dynamic but never silent:

```text
author -> validate -> evaluate -> review -> approve -> publish immutable version
       -> assign to scope -> canary -> observe -> promote or rollback/revoke
```

Assignment and content publication are separate events. Active agents resolve
only compatible, approved, non-expired versions. Mid-task mutation requires a
new context boundary or explicit restart policy; it cannot silently change
instructions inside an already authorized operation.

Efficiency improvements require before/after evaluation, security regression,
cost/latency evidence, review, and rollback target.

## Shared Storage and Deduplication

Central content-addressed storage is practical for agent assets:

```text
digest store -> project lock/manifest -> read-only materialization
```

Store one immutable blob per digest, then materialize project-specific views by
verified copy, hard link, reflink, read-only mount, or runtime injection where
platform supports it. Project lockfile records exact digests so checkout,
offline work, export, backup, and audit remain reproducible.

Do not use arbitrary cross-project symlinks as primary dependency management.
They break portability, sandbox assumptions, deletion safety, permissions,
backup, and reproducible builds. Language dependencies should continue using
package-manager content-addressed caches and lockfiles (`pnpm`, Cargo, Nix, and
similar). LNSAT deduplicates governed agent assets, not every project package.

Garbage collection must be reference-aware, retention-aware, auditable, and
recoverable. Legal hold, active assignment, rollback targets, and evidence
references prevent deletion.

## Context Detection and Request Grouping

Context classification should produce an explicit, reviewable work-context
object, not hidden model memory. Candidate fields:

- request and conversation identity;
- workspace, repository, branch, environment, and owned resource;
- initiating human/agent and delegated chain;
- detected task type and risk class;
- related packets, approvals, receipts, incidents, and files;
- active profile/skill/instruction digests;
- confidence, classifier version, evidence, and human correction;
- parent work stream and grouping rules.

Deterministic signals—explicit project, repository path, packet scope, identity,
resource, ticket, and action type—take priority. Model classification may
suggest grouping but remains untrusted. Low confidence, conflicting scope, or
cross-project mutation requires operator confirmation or escalation.

Control Center should show inbox, work-stream, graph, timeline, and evidence
views. CLI must provide identical context inspection and correction without
requiring GUI.

## Visual Management

Use view suited to relationship:

- dense inventory/tree for agents, projects, systems, owners, and health;
- node graph for role delegation, instruction inheritance, context flow,
  policy flow, and connector relationships;
- material-editor-style graph for workflow/profile composition;
- structured form for common safe settings;
- source editor for exact files and uncommon granular rules;
- diff/review view for effective configuration and version promotion;
- timeline for history, assignment, approval, incident, and rollback.

Objects should support copy, drag, drop, connect, reuse, export, and import.
Visual edits create versioned proposals and diffs. They never directly mutate
active agent state.

## Roles and Gatekeeper Agents

Gatekeeper models may classify, recommend, summarize, or route. They do not
enforce authority. Each agent identity has:

- permitted request classes;
- maximum capability and risk ceiling;
- scopes and environments;
- roles it may recommend or delegate;
- roles/actions requiring human or stronger-agent escalation;
- model/runtime and profile identity;
- validity, revocation, and session boundaries.

Deterministic Gateway policy enforces ceilings. Model uncertainty or
unavailability chooses deny or escalation for consequential actions.

## CLI Contract

Planned portable command groups:

```text
lnsat context detect|list|show|group|move|correct
lnsat agent list|show|resolve|assign|revoke
lnsat profile create|validate|diff|publish|assign|rollback
lnsat instruction validate|diff|publish|export|import
lnsat skill list|verify|publish|assign|revoke
lnsat graph validate|diff|render|apply
lnsat library sync|verify|gc|export|import
```

All mutating commands use proposal, dry-run, explain, policy, approval,
idempotency, receipt, and audit flow. Machine-readable output and offline
verification are required.

## Security Controls

Threats include malicious instructions, prompt injection, dependency
substitution, overlay constraint removal, stale assignment, poisoned shared
library, origin forgery, unauthorized cross-project sharing, model-specific
semantic drift, context misclassification, tenant data leakage, rollback to
vulnerable content, and compromised sync/adapter.

Required controls:

- immutable content digests and signed/attested origin;
- closed schemas, bounded size, explicit dependencies, and cycle detection;
- trust levels and quarantine before use;
- policy-controlled assignment and cross-boundary sharing;
- separation of author, reviewer, approver, and publisher when required;
- model/runtime compatibility and semantic conformance tests;
- secret scanning, DLP hooks, license policy, and malware/archive safety;
- sandboxed rendering and no executable hooks by default;
- exact effective-bundle evidence on requests and receipts;
- expiry, revocation, canary, rollback, and emergency-disable controls;
- export/import manifests with signature, SBOM where applicable, and
  provenance.

## Product Placement

Public LNSAT should own portable schemas, digest rules, evidence hooks,
authorization boundaries, CLI conventions, and conformance tests. Rich
registry, graph editor, collaborative authoring, enterprise sync, analytics,
and managed distribution are candidates for `LNSAT-Commercial`.
Model evaluation and overlays belong in `LNSAT-Models`; product-specific
rendering and execution belong in `LNSAT-Connectors`.
