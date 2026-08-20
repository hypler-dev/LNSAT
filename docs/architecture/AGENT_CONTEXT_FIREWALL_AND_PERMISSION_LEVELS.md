# Agent Context Firewall And Permission Levels

Status: implementation note. Source contracts and read-only Gateway/MCP
inspection are implemented. Provider dispatch, context loading, default-agent
runtime behavior, and Control Center configuration remain future design.

## Purpose

LNSAT must control what an agent can see, what it can do, and how much
autonomy it has before any local model, commercial model, subscription-seat
agent, or delegated internal agent receives context.

This plan adds a source-first control plane for:

- default agent profiles and role presets
- an internal Delegation Broker that routes work without becoming the policy
  authority
- commercial providers such as OpenAI, Anthropic, Google, Mistral, and Cohere
- local model providers such as Ollama, LM Studio, vLLM, llama.cpp, and MLX
- loading `AGENTS.md`, skills, policy files, packet scopes, and other
  agent-specific configuration through one governed loader
- checking loaded context against policy before it reaches the agent
- configurable firewall and permission levels from open to extra strict
- append-only audit events for all decisions, inclusions, exclusions,
  redactions, approvals, denials, and adapter/provider attempts

This document is planning and architecture only. It does not add provider calls,
model downloads, runtime dispatch, secrets, live connectors, hosted mutation, or
external side effects.

The source contract is implemented in
`packages/packets/src/agent-context-firewall.ts`. It validates agent runtime
profiles, provider profiles, permission profiles, screened context bundles,
firewall decisions, reason codes, and audit event plans. It remains
side-effect free: provider dispatch and runtime mutation are always false.

Gateway exposes the same firewall evidence through read-only inspection at
`POST /v1/agents/context-firewall/inspect`. The
`lnsat.agent.context_firewall.inspect` adapter is registered on the local
read-only server, official SDK stdio server, and built stdio surface. The
registration list in `packages/mcp/src/index.ts` is authoritative. The tool
delegates through Gateway and preserves provider dispatch, runtime mutation,
and side effects as false.

## Control Plane Components

### Agent Runtime Profile

Every executable or human-supervised agent seat should resolve to an agent
runtime profile before context loading.

Required profile fields:

```text
agent_id
display_name
agent_kind
provider_kind
provider_ref
model_or_client_ref
default_role
default_skillsets
default_control_level
default_firewall_level
permission_profile_ref
context_policy_ref
secret_ref_policy
audit_profile_ref
operator_owner_ref
enabled
```

Initial `agent_kind` values:

```text
internal_delegation_broker
coding_agent
review_agent
research_agent
test_agent
ops_agent
workflow_worker
human_supervised_seat
```

Initial `provider_kind` values:

```text
commercial_api
local_model
subscription_seat
cli_adapter
human
```

Provider records store names, capabilities, rate/cost metadata, allowed data
classes, and secret references. They must not store secret values.

## Resolved Configuration Chain

Every agent in a delegation chain resolves one immutable effective
configuration before receiving context:

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

Each layer records origin, schema, digest, dependencies, compatibility,
assignment scope, reviewer/approver evidence, activation, expiry, revocation,
and rollback target. Later layers cannot remove inherited prohibitions,
approval duties, or evidence requirements.

Delegation carries effective bundle digest, permission ceiling, allowed role
transitions, audience, scope, expiry, and depth. Child agents cannot inherit
ambient permissions or select a more permissive profile. Configuration update
during active work requires new context boundary or explicit restart and new
evidence.

Portable manifests and digest rules belong to public core. Rich registry,
sharing, graph editing, and organization-wide assignment are downstream
management features. See
[agent configuration management](AGENT_CONFIGURATION_SKILL_AND_CONTEXT_MANAGEMENT.md).

## Default Agents

LNSAT should ship with safe default profiles that can be disabled or tightened:

```text
observer
evidence_compiler
approval_triage
source_reviewer
test_runner
code_contributor
connector_setup_assistant
incident_triage
ops_assistant
delegation_broker
```

Defaults should start at `guarded` firewall level and read/proposal-only
permissions unless the deployment owner explicitly changes them.

The `delegation_broker` may:

- split work into packets
- select candidate agents by declared role, skillset, provider, and policy
- request context bundles
- request approvals
- collect evidence and audit refs
- recommend next actions

The `delegation_broker` may not:

- approve its own requests
- bypass Gateway policy
- access raw secret values
- mutate live infrastructure
- grant new provider permissions
- suppress audit events

## Context Loader

All context loading must pass through a Gateway-owned loader before synthesis or
provider dispatch.

Supported source families:

```text
agent_instructions
skills
packet_scope
policy_profile
permission_profile
provider_profile
repo_files
docs
tickets
conversations
runtime_signals
operator_inputs
```

Initial loader functions:

```text
loadAgentInstructionChain
loadSkillManifestRefs
loadPacketScope
loadPolicyProfile
loadPermissionProfile
loadProviderProfile
compileAgentContextBundle
screenAgentContextBundle
renderProviderSafePrompt
```

The loader returns source refs, hashes, summaries, decisions, redaction counts,
and withheld-content refs. It does not pass excluded raw content forward.

## Context Policy Firewall

The Context Policy Firewall runs between discovery and synthesis.

Inputs:

```text
agent_runtime_profile
requested_capability
packet_scope
source_refs
candidate_context_items
firewall_level
permission_profile
policy_profile
provider_profile
```

Decisions:

```text
include
include_redacted
include_summary_only
exclude
human_review_required
deny_context_bundle
```

Reason codes:

```text
context.secret_like_content
context.provider_disallowed_data_class
context.source_out_of_scope
context.skill_out_of_scope
context.instruction_override_blocked
context.prompt_injection_suspected
context.policy_conflict
context.missing_source_ref
context.untrusted_source
context.overbroad_bundle
context.extra_strict_requires_human_review
```

## Firewall Levels

```text
open
guided
guarded
strict
extra_strict
```

`open`:

- broadest repo-local source access
- still no raw secrets, production/customer data, destructive Git, deploy,
  DNS/Cloudflare mutation, paid/external side effects, or live provider calls
  without explicit packet scope
- all loaded refs and decisions logged

`guided`:

- repo-local context allowed when tied to current packet or user request
- skills and instructions allowed by default but scanned for unsafe overrides
- external/provider dispatch stays approval-bound by provider profile

`guarded`:

- default level
- packet-scoped context only
- skills and `AGENTS.md` chains allowed only from trusted roots
- summaries preferred for broad files
- policy conflicts and suspicious instructions fail closed

`strict`:

- allowlist source refs only
- skills require explicit profile binding
- commercial providers receive summary-only context unless approved
- local model dispatch remains sandbox-bound

`extra_strict`:

- minimal allowlist context
- human review for new skills, new provider profiles, or instruction changes
- no commercial-provider dispatch with sensitive classes
- no mutation permissions, only observe/propose/test in sandbox

Hard gates are never downgraded by firewall level. `open` means less restrictive
context loading, not unsafe authority.

## Permission Modes

Permission profiles combine capability and resource decisions:

```text
allowed
preview_only
redacted
approval_required
blocked
```

Common capability groups:

```text
context.read
context.compile
skill.load
agent.delegate
provider.dispatch.request
repo.read
repo.propose_patch
repo.write_branch
tests.run.sandbox
container.run.sandbox
logs.read
secret.use.brokered
secret.read.never
deploy.request
deploy.execute.approved
```

The Gateway remains the permission boundary. MCP, provider SDKs, CLI adapters,
and subscription seats are adapters.

## Audit Events

Every context and permission decision must emit an append-only audit event.

Initial event names:

```text
agent_profile_selected
delegation_requested
delegation_assigned
context_source_discovered
context_source_screened
context_item_included
context_item_redacted
context_item_excluded
context_bundle_compiled
context_bundle_denied
skill_manifest_loaded
skill_manifest_rejected
agent_instruction_loaded
agent_instruction_rejected
provider_profile_selected
provider_dispatch_requested
provider_dispatch_blocked
permission_profile_selected
permission_checked
permission_denied
firewall_level_selected
firewall_policy_checked
```

Audit payloads may include:

```text
actor_ref
agent_profile_ref
provider_ref
packet_ref
policy_ref
permission_profile_ref
firewall_level
source_refs
source_hashes
decision
reason_codes
redaction_counts
withheld_content_refs
approval_refs
side_effects
created_at
```

Audit payloads must not include raw secret values or raw excluded content.

## Frontend Control Levels

Management UI should expose several control layers:

- organization default: baseline firewall, permission, provider, and audit
  rules
- project default: project-specific overrides and allowed providers
- packet default: packet-scoped sources, skills, and capabilities
- agent default: role, provider, model/client, skillsets, and context rules
- run/session override: one-time tightening or approval-bound expansion
- item-level decision: include, redact, exclude, or review individual files,
  skills, instruction sections, and source refs

Defaults should be conservative:

```text
firewall_level = guarded
permission_mode = preview_only or approval_required for mutation-like actions
commercial_provider_context = summary_only unless approved
local_model_context = packet_scoped
secret_values = never
all_events_logged = true
```

## Future Packets

Recommended follow-up packets:

1. Add management UI preview models for firewall level, permission profile,
   default agents, and provider inventory.
2. Add management UI inspection evidence for Gateway/MCP firewall surfaces.
3. Add local-provider dry-run contracts without model downloads or dispatch.
4. Add commercial-provider dry-run contracts using secret refs only and no live
   API calls.
