# Context Synthesis

## Purpose

Coding agents need one synthesized context surface before deeper runtime and
persistence work continues.

The required source families are:

- code
- docs
- tickets
- conversations
- runtime signals

These are not live integrations. A source-only contract
accepts source-backed references and short safe summaries, then emits context
evidence for coding agents.

## Contract

Current contract adds:

```text
synthesizeCodingAgentContext
```

The contract id is:

```text
lnsat.context.coding_agent_synthesis.v0_1
```

The implementation lives in:

```text
packages/packets/src/coding-agent-context-synthesis.ts
```

It requires at least one source from each family:

```text
code
docs
ticket
conversation
runtime_signal
```

## Source Shape

Each source is source evidence, not a connector pull:

```json
{
  "kind": "code",
  "source_ref": "repo:packages/packets/src",
  "summary": "packet compiler and validator code own context shaping",
  "relevance": "primary",
  "trust_level": "source_backed",
  "captured_at": "2026-05-06T00:00:00.000Z"
}
```

Allowed relevance values:

```text
primary
supporting
warning
```

Allowed trust levels:

```text
source_backed
operator_supplied
unverified
```

## Output

The synthesized evidence includes:

- source counts by family
- source refs
- a coding-agent brief from primary sources
- constraints from warning sources
- open questions from unverified sources
- stale or missing source-family markers
- `live_collection_allowed: false`
- `side_effects: []`

## Work Context and Request Grouping

Requests should be grouped through explicit work-context evidence rather than
hidden model memory. Candidate work-context fields include:

- request, conversation, and parent work-stream identity;
- workspace, repository, branch, project, environment, and resource scope;
- initiating human/agent and full delegated chain;
- task and risk classification;
- related packets, approvals, receipts, incidents, tickets, and source refs;
- effective profile, skill, instruction, and model-overlay digests;
- classifier identity, version, confidence, evidence, and human correction;
- creation, movement, split, merge, expiry, and closure history.

Explicit repository, project, packet, identity, resource, ticket, and action
signals outrank model suggestions. Low confidence, conflicting scope, or
cross-project movement requires operator confirmation or denial according to
policy.

Grouping supports Control Center inbox, work-stream, graph, and timeline views
plus equivalent CLI inspection and correction. Grouping never grants role,
capability, approval, or execution authority.

## Context Policy Firewall

A Context Policy Firewall sits between source discovery and
context synthesis. All `AGENTS.md` chains, skills, packet scope, policy
profiles, permission profiles, provider profiles, repo files, docs, tickets,
conversations, runtime signals, and operator inputs must be screened before any
agent or provider receives them.

Firewall decisions:

```text
include
include_redacted
include_summary_only
exclude
human_review_required
deny_context_bundle
```

The firewall records source refs, source hashes, decisions, reason codes,
redaction counts, and withheld-content refs. It does not pass excluded raw
content forward, and audit events must not contain raw secret values.

Recognized firewall levels:

```text
open
guided
guarded
strict
extra_strict
```

The default is `guarded`: packet-scoped context, trusted instruction/skill
roots, summary-first broad files, and fail-closed handling for policy conflicts
or suspicious instructions.

## Safety Boundary

Gateway exposes context evidence through a contract-only handler:

```text
inspectCodingAgentContextSynthesisGatewayRequest
```

Gateway contract id:

```text
lnsat.gateway.coding_agent_context_synthesis.v0_1
```

The handler delegates to `synthesizeCodingAgentContext`, preserves source refs,
source counts, brief, constraints, open questions,
`live_collection_allowed: false`, and `side_effects: []`, and fails closed
without raw rejected value echo.

Current context contracts do not add:

- live ticket connector
- chat/conversation connector
- runtime collector
- database connection
- writer
- queue
- MCP tool
- Fastify route
- network listener
- deploy path
- secrets

## Context Atoms And Working Sets

Context atoms and working sets generalize evidence beyond one client. Coding
agent synthesis remains a consumer of context evidence, but LNSAT context is not
limited to coding agents.

The contract helper is:

```text
createContextWorkingSet
```

Contract id:

```text
lnsat.context.context_atom_working_set.v0_1
```

Each atom carries:

- source ref
- source kind
- summary
- trust level
- freshness
- relevance
- captured timestamp when supplied

Each working set carries:

- one consumer
- bounded output limits
- source refs
- atom map
- working-set summary
- constraints
- `live_collection_allowed: false`
- `side_effects: []`

Uncited, stale, secret-like, or overbroad atoms fail closed. This model adds no
document indexer, ticket/chat/runtime connector, vector DB, persistence
implementation, or secrets.

Future tickets, conversations, and runtime signals must enter through official
APIs or source-backed exports, then through LNSAT Gateway policy and audit. MCP
remains an adapter, not the security boundary.

Shared agent assets may use content-addressed storage and immutable project
lock manifests. Arbitrary cross-project symlinks are not trusted provenance or
reproducible dependency state.

## Next Surfaces

Later packets should expose this source-only evidence in this order:

1. read-only route or UI surface
2. read-only MCP adapter and registration if useful
3. live connectors only after policy, approval, and audit persistence exist
