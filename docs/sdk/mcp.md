# MCP SDK Guide

Status: source-only MCP SDK guide. This guide describes
current read-only MCP inspection surfaces only. It does not create SDK packages,
mutate tools, start listeners, dispatch runtime adapters, read secrets, call
external services, write storage, publish packages, refresh lockfiles, or enable
live execution.

## Source Basis

- `packages/mcp/src/index.ts`
- `docs/architecture/SDK_DOCUMENTATION_INVENTORY.md`
- `docs/architecture/MCP_ADAPTER_DESIGN.md`

## Authority Model

MCP is the adapter surface. LNSAT Gateway remains the security boundary and
authority surface. Current MCP tools wrap existing Gateway inspection contracts
or repo-local build-management docs and return source-derived inspection
responses with `side_effects: []`.

Every current MCP tool registration carries:

- `readOnlyHint: true`
- `destructiveHint: false`
- `idempotentHint: true`
- `openWorldHint: false`
- `side_effects: []`

The official stdio server registration uses the same read-only contract set as
the local server factory. The local read-only server rejects unknown tool names
with `mcp.unknown_tool`.

## Tool Descriptor Table

| Tool                                                                          | Authority or contract basis                                               | Input posture                                                                                 | Output posture                                                                                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lnsat.packet.inspect`                                                        | `lnsat.gateway.packet_inspection.v0_1`                                    | Requires `packet`; optional `request_id`; object input rejects extra properties.              | Gateway packet inspection response plus `gateway_contract_id` and `side_effects: []`.                                                            |
| `lnsat.project.state.inspect.v0_1`                                            | `lnsat.gateway.project_state.v0_1`                                        | Optional `request_id` and neutral `item_id`; reads neutral synthetic item fixtures.           | Gateway response under `gateway_response`, request/response schema `0.1`, neutral item vocabulary, and `side_effects: []`.                       |
| `lnsat.build.packet.read`                                                     | Legacy project-state compatibility inspection                             | Optional `request_id` and legacy `packet_id`; reads the existing legacy fixtures.             | Deprecated alias; exact legacy response and error behavior retained through one supported release and not removed before `2.0.0`.                |
| `lnsat.onboarding.profiles.inspect`                                           | `lnsat.gateway.onboarding_profile_inspection.v0_1`                        | Optional `request_id` and `profile_kind` enum.                                                | Onboarding profile inspection response plus source docs and `side_effects: []`.                                                                  |
| `lnsat.onboarding.context.inspect`                                            | `lnsat.gateway.onboarding_context_packet_inspection.v0_1`                 | Optional `request_id`, `session_id`, and `created_at`.                                        | Onboarding ContextPacket inspection response with `side_effects: []`.                                                                            |
| `lnsat.audit.ledger.migration.approval_preview.inspect`                       | `lnsat.gateway.audit_ledger_migration_approval_preview.v0_1`              | Optional `request_id`, `actor_id`, and `session_id`.                                          | Approval-preview inspection response; `live_execution_allowed: false`.                                                                           |
| `lnsat.audit.ledger.writer_interface.inspect`                                 | `lnsat.gateway.audit_ledger_writer_interface.v0_1`                        | Optional request/session fields and `approval_evidence`.                                      | Writer-interface inspection response; `live_execution_allowed: false`.                                                                           |
| `lnsat.audit.ledger.writer_persistence_preflight.inspect`                     | `lnsat.gateway.audit_ledger_writer_persistence_preflight.v0_1`            | Optional request/session fields, approval evidence, and preflight evidence.                   | Persistence-preflight inspection response; `live_execution_allowed: false`.                                                                      |
| `lnsat.audit.ledger.database_security_preflight.inspect`                      | `lnsat.gateway.audit_ledger_database_security_preflight.v0_1`             | Optional request/session fields, approval evidence, and security evidence.                    | Database-security preflight response; `live_execution_allowed: false`.                                                                           |
| `lnsat.audit.ledger.persistence_readiness.inspect`                            | `lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1`              | Optional request/session fields plus approval, persistence, security, and readiness evidence. | Persistence-readiness response; `live_execution_allowed: false`.                                                                                 |
| `lnsat.audit.ledger.persistence_scope_request.inspect`                        | `lnsat.gateway.audit_ledger_persistence_scope_request.v0_1`               | Optional request/session fields plus approval, readiness, and scope evidence.                 | Persistence-scope request response; `live_execution_allowed: false`.                                                                             |
| `lnsat.hardware.inventory.inspect`                                            | `lnsat.gateway.hardware_inventory.inspect.v0_1`                           | Optional request and bounded inventory evidence.                                              | Hardware inventory inspection with live collection and mutation disabled.                                                                        |
| `lnsat.hardware.allocation.recommendation.inspect`                            | `lnsat.gateway.hardware_allocation_recommendation.inspect.v0_1`           | Optional request and bounded allocation evidence.                                             | Allocation recommendation only; no placement or infrastructure mutation.                                                                         |
| `lnsat.performance.telemetry.inspect`                                         | `lnsat.gateway.performance_telemetry.inspect.v0_1`                        | Optional request and bounded telemetry evidence.                                              | Telemetry inspection only; live collection and mutation remain disabled.                                                                         |
| `lnsat.platform.service_database_inventory.inspect`                           | `lnsat.gateway.service_database_inventory_migration_planner.v0_1`         | Optional `request_id` and `inventory_request`.                                                | Service/database inventory response with `live_database_write_allowed: false` and `live_service_mutation_allowed: false`.                        |
| `lnsat.platform.substrate_control_intent.inspect`                             | `lnsat.gateway.substrate_control_intent.v0_1`                             | Optional `request_id` and `intent_request`.                                                   | Substrate-control intent response with substrate mutation and live execution disabled.                                                           |
| `lnsat.platform.capability_broker_request.inspect`                            | `lnsat.gateway.capability_broker_request.v0_1`                            | Optional `request_id` and `broker_request`.                                                   | Capability-broker request response with broker dispatch and live execution disabled.                                                             |
| `lnsat.platform.substrate_adapter_manifest.inspect`                           | `lnsat.gateway.substrate_adapter_manifest.v0_1`                           | Optional `request_id` and `manifest_request`.                                                 | Adapter-manifest response with adapter invocation, broker dispatch, and live execution disabled.                                                 |
| `lnsat.platform.adapter_invocation_preflight.inspect`                         | `lnsat.gateway.adapter_invocation_preflight.v0_1`                         | Optional `request_id` and `preflight_request`.                                                | Adapter-invocation preflight response with invocation, broker dispatch, and live execution disabled.                                             |
| `lnsat.platform.adapter_invocation_result.inspect`                            | `lnsat.gateway.adapter_invocation_result.v0_1`                            | Optional `request_id` and `result_request`.                                                   | Adapter-invocation result inspection response; no live invocation.                                                                               |
| `lnsat.platform.adapter_invocation_authorization_bundle.inspect`              | `lnsat.gateway.adapter_invocation_authorization_bundle.v0_1`              | Optional `request_id` and `bundle_request`.                                                   | Authorization-bundle inspection response; no broker dispatch or live execution.                                                                  |
| `lnsat.platform.runtime_adapter_readiness_gate.inspect`                       | `lnsat.gateway.runtime_adapter_readiness_gate.v0_1`                       | Optional `request_id` and `readiness_request`.                                                | Readiness-gate response with runtime dispatch, adapter invocation, broker dispatch, and live execution disabled.                                 |
| `lnsat.platform.runtime_adapter_implementation_scope.inspect`                 | `lnsat.gateway.runtime_adapter_implementation_scope.v0_1`                 | Optional `request_id` and `implementation_scope_request`.                                     | Implementation-scope response only; no runtime adapter, dispatcher, MCP registration, or state-changing tool.                                    |
| `lnsat.platform.runtime_adapter_implementation_plan.inspect`                  | `lnsat.gateway.runtime_adapter_implementation_plan.v0_1`                  | Optional `request_id` and `implementation_plan_request`.                                      | Implementation-plan response only; no runtime adapter, dispatcher, or state-changing tool.                                                       |
| `lnsat.platform.runtime_adapter_implementation_authorization_request.inspect` | `lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1` | Optional `request_id` and `authorization_request`.                                            | Authorization-request inspection response; no runtime adapter or live execution.                                                                 |
| `lnsat.platform.runtime_adapter_implementation_approval_gate.inspect`         | `lnsat.gateway.runtime_adapter_implementation_approval_gate.v0_1`         | Optional `request_id` and `approval_gate_request`.                                            | Approval-gate inspection response; no runtime adapter or live execution.                                                                         |
| `lnsat.platform.runtime_adapter_implementation_dry_run_evidence.inspect`      | `lnsat.gateway.runtime_adapter_implementation_dry_run_evidence.v0_1`      | Optional `request_id` and `dry_run_evidence_request`.                                         | Dry-run evidence inspection response; no runtime adapter or live execution.                                                                      |
| `lnsat.knowledge.surface.inspect`                                             | Knowledge sources, search, and context compile Gateway contracts          | Requires `operation` enum: `sources`, `search`, or `context`; optional query/source fields.   | Source/search/context response with `read_only: true`, `local_index_only: true`, and mutation, DB, queue, runtime, and live collection disabled. |
| `lnsat.agent.context_firewall.inspect`                                        | `lnsat.gateway.agent_context_firewall.v0_1`                               | Optional request and bounded firewall bundle evidence.                                        | Firewall decision evidence only; provider dispatch, runtime mutation, and side effects remain disabled.                                          |

## Response Envelope Expectations

Current MCP adapter responses preserve source contract identity and do not hide
authority. A caller should expect:

- `ok` success/failure posture.
- Canonical `request_digest` for validated packet-inspection requests; invalid
  requests or packets preserve `request_digest: null`.
- Tool-specific Gateway or repo-local payload.
- Gateway contract id or contract ids when Gateway-backed.
- Read-only flags such as `live_execution_allowed: false`,
  `state_changing_tool: false`, `mutation_allowed: false`, or equivalent
  blocked-scope fields when relevant.
- `side_effects: []`.

Unknown or invalid inputs fail closed. Unknown tool calls return
`mcp.unknown_tool`. Agent or runtime callers must treat every failed validation
as denial, not as partial permission.

The canonical project-state tool is the neutral contract. Its adapter envelope
contains `tool`, `gateway_contract_id`, `gateway_response`, and
`side_effects: []`; the Gateway response uses `project_state`, `items`,
`activity.completed_items`, and `selected_item`. The legacy tool remains a
separate deprecated compatibility API with its exact request, response, error,
identifier, and fixture-path behavior. Adopters should migrate the tool name,
`packet_id` to `item_id`, and legacy payload fields to the canonical Gateway
envelope.

## Local Stdio Posture

The official MCP SDK server name is `lnsat.mcp.official_stdio.v0_1`; the local
read-only server id is `lnsat.mcp.read_only.v0_1`. Both surfaces expose the
same registered read-only inspection tools.

Modern stateless HTTP is tested as an in-process handler contract only. This
guide does not authorize a hosted listener, external service call, network
exposure, secrets read, or runtime adapter dispatch.

## Compatibility Matrix

Implemented and tested rows are experimental source proof, not production
support.

| Lane                                     | Planned              | Implemented | Tested | Experimental | Production-supported | Deprecated     |
| ---------------------------------------- | -------------------- | ----------- | ------ | ------------ | -------------------- | -------------- |
| Legacy-compatible local stdio inspection | yes                  | yes         | yes    | yes          | no                   | yes, temporary |
| MCP 2026-07-28 read-only stdio           | yes                  | yes         | yes    | yes          | no                   | no             |
| MCP 2026-07-28 stateless HTTP handler    | yes                  | yes         | yes    | yes          | no                   | no             |
| FastMCP 3.4.5 legacy-era interop         | yes                  | yes         | yes    | yes          | no                   | no             |
| FastMCP 4 beta modern/dual-era interop   | yes                  | yes         | yes    | yes          | no                   | no             |
| A2A 1.0 read-only mapping                | yes                  | yes         | yes    | yes          | no                   | no             |
| Operation recovery/readback              | yes                  | yes         | yes    | yes          | no                   | no             |
| MCP Tasks extension                      | optional             | no          | no     | planned      | no                   | no             |
| State-changing tools                     | separate future gate | no          | no     | no           | no                   | no             |

MCP protocol or task state, FastMCP framework state, A2A task state, OAuth
admission, OTel trace context, SPIFFE workload identity, and Registry discovery
cannot grant action authority. See
[MCP 2026-07-28 interoperability and outage recovery](../architecture/MCP_V2_FASTMCP_INTEROPERABILITY_AND_OUTAGE_RECOVERY.md)
and [Phase 8 adapter authority conformance](../architecture/PHASE_8_ADAPTER_AUTHORITY_CONFORMANCE.md).

## Forbidden Examples

These examples remain forbidden in MCP SDK docs until a later packet explicitly
opens scope:

- Adding a state-changing tool.
- Registering an MCP tool that writes files, DB rows, queues, DNS, or network
  state.
- Calling a live adapter, broker, or runtime dispatcher.
- Reading secret values from environment, files, stores, or user prompts.
- Installing packages, refreshing lockfiles, publishing packages, or creating
  releases.
- Starting a network listener or hosted MCP endpoint.
- Treating approval-preview responses as approval activation.
- Treating MCP/A2A tasks, OAuth scopes, OTel spans, SPIFFE identities, Registry
  records, or framework middleware as action authorization.

## Boundary

MCP docs must state that Gateway remains authority and MCP remains transport.
No future example may imply state-changing MCP tools unless an explicit later
packet opens that scope.
