# Agent SDK Guide

Status: source-only Agent SDK guide. This guide describes
agent policy, role, skillset, and context-snippet surfaces only. It does not
enable node-agent runtime, policy activation, auth provider wiring, workflow
execution, external calls, package mutation, lockfile refresh, or live
operation.

## Source Basis

- `packages/packets/src/startup-wizard-policy-profile.ts`
- `apps/console/src/lib/console-model.ts`
- `docs/architecture/AGENT_CONFIGURATION_SKILL_AND_CONTEXT_MANAGEMENT.md`
- `docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md`

## Managed Configuration Boundary

Future portable agent configuration resolves:

```text
organization -> workspace/project -> role
  -> universal rules/instructions/skills
  -> provider overlay -> model overlay -> task context
```

Each object and assignment requires version, origin, digest, dependencies,
compatibility, scope, review/approval evidence, activation, expiry, revocation,
and rollback. Later overlays cannot remove inherited prohibitions, capability
ceilings, approval duties, or audit obligations.

Every agent in delegation chain carries explicit identity, role ceiling,
effective bundle digest, scope, audience, expiry, and depth. Child agents cannot
inherit ambient permissions.

Gatekeeper/delegator models may classify, recommend, summarize, or route. Their
output is untrusted policy input and cannot activate policy, approve, sign,
issue execution authorization, or suppress audit.

## Manifest Contracts

Current agent documentation starts from three source-only manifest contracts:

- `lnsat.policy_profile.v0_1`
- `lnsat.skillset_manifest.v0_1`
- `lnsat.manager_role_manifest.v0_1`

The policy profile is a startup-wizard source preview. It produces canonical
JSON, Markdown summary, JSON Schema, MCP capability descriptors, and agent
context snippets. It preserves no-live posture arrays:

- `secret_values: []`
- `auth_provider_wiring: []`
- `storage_writes: []`
- `network_exposure_mutations: []`
- `policy_activations: []`
- `runtime_dispatches: []`
- `live_executions: []`
- `database_connections: []`
- `database_writes: []`
- `external_service_calls: []`
- `side_effects: []`

## Control Levels

| Level              | Allowed posture                                             | Approval posture                                                                   | Blocked posture                                                                             |
| ------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `observe`          | Read, inspect, notify, and track access.                    | No approval-required capabilities.                                                 | Mutation, staging, execution, deploy, DB write, SSH, Docker, and node-agent scopes blocked. |
| `assist`           | Read, inspect, notify, local analysis, and proposal drafts. | `stage.preview` requires approval and remains preview-only.                        | Execution, deploy, DB write, and mutation blocked.                                          |
| `managed_autonomy` | Agents can analyze, draft, and prepare bounded staging.     | `stage.preview`, `execute.approved`, and `rollback.verify` require human approval. | Unapproved execution, secret reads, and root blocked.                                       |
| `strict`           | Allowlisted read, inspect, and notify only.                 | Analysis, proposal, staging, and approved execution require approval.              | Unlisted resources, secret reads, and root blocked.                                         |
| `locked_down`      | Allowlisted read/inspect and owner notifications only.      | Emergency owner override is visible but not activated.                             | Staging, execution, deploy, DB write, and unlisted resources blocked.                       |

No level grants fully open autonomy.

## Manager Authority Matrix

| Role                | Actor | Can activate policy | Authority notes                                        |
| ------------------- | ----- | ------------------- | ------------------------------------------------------ |
| `owner`             | Human | Yes                 | Owns all policy changes and emergency override.        |
| `admin`             | Human | Yes                 | Can approve policy activation, staging, and execution. |
| `approver`          | Human | No                  | Can approve staging and execution routes.              |
| `auditor`           | Human | No                  | Reviews audit evidence.                                |
| `operator`          | Human | No                  | Handles low-risk operations.                           |
| `viewer`            | Human | No                  | View-only role.                                        |
| `policy_reviewer`   | Agent | No                  | Drafts and reviews policy recommendations.             |
| `evidence_compiler` | Agent | No                  | Compiles evidence.                                     |
| `approval_triage`   | Agent | No                  | Triage support only; cannot approve final authority.   |
| `audit_reviewer`    | Agent | No                  | Reviews audit evidence but cannot activate policy.     |

All manager roles must keep `can_grant_self_authority: false`. Agent managers
may draft, review, triage, and recommend; they cannot activate policy, grant
themselves authority, or serve as final approval manager for an approval-required
policy row.

## Skillset Scope

| Skillset              | Capability examples                                        | Allowed resources       | Blocked resources                                   |
| --------------------- | ---------------------------------------------------------- | ----------------------- | --------------------------------------------------- |
| `source-review`       | `source.read`, `source.diff.inspect`, `proposal.draft`     | `repo_files`            | `secrets`, `git_mutation`                           |
| `test-runner`         | `test.plan`, `test.command.preview`, `test.result.inspect` | `package_scripts`       | `package_install`, `docker_runner`                  |
| `deploy-preflight`    | `deploy.plan.inspect`, `release.evidence.compile`          | `release_docs`          | `deploy.execute`, `dns_cloudflare_mutation`         |
| `db-migration-review` | `database.migration.inspect`, `rollback.plan.review`       | `migration_files`       | `database.write`, `database_connection`             |
| `incident-triage`     | `incident.inspect`, `audit.read`, `proposal.draft`         | `logs_as_evidence_refs` | `service_restart`, `ssh`                            |
| `connector-setup`     | `connector.manifest.inspect`, `policy.proposal.draft`      | `connector_manifests`   | `connector_secret_capture`, `external_service_call` |

Every skillset includes `gateway_policy_preview` and `evidence_export_preview`
tool posture, approval needs for staging or execution, access/policy audit
obligations, and rollback evidence expectations.

## Policy Rows

The default policy profile contains `14` policy rows:

| Capability            | Actor | Mode                | Approval manager |
| --------------------- | ----- | ------------------- | ---------------- |
| `read.*`              | Agent | `allowed`           | None             |
| `notify.*`            | Agent | `allowed`           | None             |
| `proposal.draft`      | Agent | `allowed`           | None             |
| `stage.preview`       | Agent | `approval_required` | `approver`       |
| `execute.approved`    | Agent | `approval_required` | `admin`          |
| `policy.activate`     | Human | `approval_required` | `owner`          |
| `database.write`      | Agent | `blocked`           | None             |
| `database.prod.write` | Agent | `blocked`           | None             |
| `secret.read.never`   | Agent | `blocked`           | None             |
| `ssh`                 | Agent | `blocked`           | None             |
| `root`                | Agent | `blocked`           | None             |
| `billing.write`       | Agent | `blocked`           | None             |
| `security.write`      | Agent | `blocked`           | None             |
| `destructive.execute` | Agent | `blocked`           | None             |

Approval-required rows must route to a human manager. Agent managers cannot be
the final approval authority.

## Context Snippet Duties

Generated agent context snippets must preserve these duties:

- Read canonical JSON manifest first: `lnsat.policy_profile.v0_1`.
- Treat unknown capability as denied.
- Agent managers may draft recommendations but cannot activate policy or grant
  themselves authority.
- Policy rows must be carried forward as capability-to-mode facts, not converted
  into permissions outside Gateway review.

## Fail-Closed Behavior

Agent SDK docs must preserve these validation failures:

- Unknown capability: denied by default.
- Missing manager manifest: invalid profile.
- Incomplete manager roles: invalid profile.
- Agent manager with `can_activate_policy: true`: denied.
- Any manager with `can_grant_self_authority` other than `false`: denied.
- Missing skillset template: invalid profile.
- Forbidden capability marked allowed or approval-required: denied.
- Approval-required policy row without a human approval manager: denied.
- Secret-like values or nonempty side effects: denied.

## Audit Duties

Human managers and agent managers carry audit obligations. Human manager roles
record access review and policy decision review obligations. Skillsets record
access tracking and policy decision tracking. Policy rows declare audit levels:
`access`, `decision`, or `high_detail`.

Audit docs must stay evidence-first. They cannot imply that preview evidence
activates policy, creates approvals, writes audit rows, or opens runtime work.

## Boundary

Agent docs must keep humans as authority for approval. Agents cannot self-grant
capability, activate policy, bypass Gateway, or execute live work through this
documentation surface. Current source manifests remain startup-wizard previews;
expanded portable formats require later versioned contracts and conformance.
