# SDK Conformance Guide

Status: source-only SDK conformance documentation plus executable
TypeScript/Rust golden vectors. Current vectors are local source checks only.
This guide does not add a published package, external call, live probe, MCP
mutation, policy activation, storage write, network mutation, package
publication, or side effect.

## Source Basis

- `docs/sdk/mcp.md`
- `docs/sdk/agent.md`
- `docs/architecture/SDK_INFORMATION_ARCHITECTURE.md`
- `docs/architecture/SDK_DOCUMENTATION_EXPANSION_PLAN.md`
- `docs/architecture/SDK_DOCUMENTATION_INVENTORY.md`
- `packages/mcp/src/index.ts`
- `packages/packets/src/startup-wizard-policy-profile.ts`
- `packages/packets/src/contract-version.ts`
- `packages/packets/src/contract-error-envelope-v1.ts`
- `packages/packets/src/contract-compatibility-matrix-v1.ts`
- `packages/packets/src/packet-envelope-v1.ts`
- `packages/policy/src/policy-decision-v1.ts`
- `packages/policy/src/approval-evidence-v1.ts`
- `packages/audit/src/audit-event-v1.ts`
- `crates/lnsat-contracts/src/lib.rs`
- `crates/lnsat-contracts/tests/conformance.rs`
- `fixtures/contracts/contract-version-v1_0.tsv`
- `fixtures/contracts/compatibility-matrix-v1_0.json`
- `fixtures/contracts/error-envelope-v1_0.json`
- `fixtures/contracts/packet-envelope-v1_0.json`
- `fixtures/contracts/policy-decision-v1_0.json`
- `fixtures/contracts/approval-evidence-v1_0.json`
- `fixtures/contracts/audit-event-v1_0.json`
- `fixtures/contracts/stable-evidence-digests-v1_0.tsv`
- `packages/packets/schemas/contract-error-envelope-v1.schema.json`
- `apps/console/src/lib/console-model.ts`

## Conformance Posture

Conformance contains 91 shared executable vectors: 14 exact contract-version
cases, twenty packet parser/schema cases, two packet canonical-JSON cases,
thirteen policy-evaluation cases, fifteen approval-evidence cases, and five
stable evidence digest cases, plus nine audit source-chain cases, seven audit
idempotency cases, and six error-envelope cases. They are source checks, not
runtime or release approval.

Contract-version validation is the current executable exception: the shared
fixture runs against TypeScript and Rust and requires exact version, stability,
and error-code parity. It does not execute a runtime or side effect.

Packet-envelope v1 validation, canonicalization, and hashing are also executable
local checks. The shared vector fixes exact contract/schema identity and the
canonical SHA-256 digest. Twenty shared cases prove TypeScript/Rust positive
and negative JSON parsing/schema parity, including canonical number-domain
failures, permission ordering/uniqueness, allow/block conflict rejection, real
UTC instants, and positive validity windows. Rust serializes the parsed packet
to the exact committed canonical JSON, with UTF-16 key ordering, preserved
arrays, unchanged Unicode, and safe integers only. Rust independently verifies
the committed digest preimage;
`hash_packet_envelope_v1` now hashes the same canonical UTF-8 bytes and matches
both committed packet digests.

Policy-decision v1 is executable local evidence. Its vector binds the packet
digest and evaluation instant, fixes deny-first precedence, and requires
unknown profile/capability denial, expiry rejection, deterministic replay, and
`side_effects: []`. Thirteen shared TypeScript/Rust cases cover allow, deny,
approval-required, malformed-time, stale-packet, and invalid-packet outcomes;
the golden vector fixes the exact packet hash and policy decision id. It does
not create approval or persist a decision.

Approval-evidence v1 is executable local evidence. One golden chain fixes the
exact approval request and human decision ids. Fourteen shared TypeScript/Rust
cases cover non-required or tampered policy evidence, malformed/early/expired
times, denial evidence, non-human and self approval, outcome/reason mismatch,
and tampered request bodies. Exact replay is deterministic; approval never
authorizes execution or creates side effects.

Audit-event v1 is executable local evidence. Three golden events fix exact
source and event identities. Nine shared TypeScript/Rust cases cover policy,
approval-request, and approval-decision events, invalid or early observation,
and packet, policy, request, or decision drift. Rust rebuilds the complete
source chain before producing deterministic evidence. It authenticates no
actor, requests no persistence, authorizes no execution, and creates no side
effects.

The five shared stable-evidence rows cover the linked packet hash, policy
decision id, approval request id, human approval decision id, and terminal
audit event id. TypeScript reconstructs the complete chain and checks each
preimage against its owning JSON golden fixture. Rust independently hashes the
same UTF-8 bytes. Both languages must produce all 91 expected results across
the complete shared suite.

## Stable Error Envelope Checks

| Check                       | Required result                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| Family failure              | `ok: false`, exactly one documented family result field set to `null`, at least one error, empty effects. |
| Error identity              | Stable namespaced `code` plus RFC 6901 `path`; `severity` is always `error`.                              |
| Human message               | Nonempty public-safe summary; message text is not compatibility identity.                                 |
| Rejected raw input          | Never reflected in error code, path, message, or another envelope field.                                  |
| Unknown or extra field      | Rejected by the closed schema.                                                                            |
| Missing or multiple results | Rejected; exactly one frozen family result field is required.                                             |

The shared fixture covers version, packet, policy-decision, approval-request,
approval-decision, and audit-event failures. It adds no retry, approval,
execution, persistence, or mutation authority.

Rust maps every deterministic-core error variant to a public-safe item. Its
shared conformance test serializes one exact four-field failure envelope for
each frozen family and matches code, path, severity, null result field, and
empty side effects. Audit idempotency errors map to their distinct closed
result contract and do not widen `lnsat.error_envelope.v1_0`.

## Stable Compatibility Matrix Checks

The authoritative matrix covers contract version, packet envelope, policy
decision, approval request, approval decision, audit event, and error envelope.
Every family freezes evidence identity, replay/idempotency, and stale-evidence
posture. Structured families are closed and reject unknown fields. Exact
contract/schema reader and writer selection is required; implicit
upgrade/downgrade and implicit deprecated entry are forbidden; stored evidence
changes require a parallel version and explicit audited migration. The matrix
performs no migration and grants no runtime authority.

| Area         | Required posture                                                                                     | Failure posture                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Authority    | Gateway remains security boundary; MCP and agent docs remain adapter/context surfaces.               | Any doc implying MCP, agent, or examples can bypass Gateway fails closed.     |
| Side effects | Current examples and expected responses preserve `side_effects: []`.                                 | Any nonempty side effect list fails closed.                                   |
| Runtime      | Runtime, broker dispatch, adapter invocation, DB, storage, network, deploy, and release stay closed. | Any live dispatch, mutation, or external call example fails closed.           |
| Secrets      | Secret values remain references only and raw input containing secret-like values is withheld.        | Any secret-like value, token, key, password, credential, or DSN fails closed. |
| Human review | Approval-required agent policy rows route to human managers.                                         | Agent final approval, self-grant, or policy activation by agent fails closed. |

## MCP Positive Checks

| Check                        | Source expectation                                                                                          | Expected documentation result                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Registered read-only tools   | `packages/mcp/src/index.ts` defines `29` read-only tool contracts and matching registrations.               | `docs/sdk/mcp.md` lists all `29` tool names and keeps them inspection-only.                                     |
| Tool annotations             | Every current registration uses `readOnlyHint: true`, `destructiveHint: false`, and `openWorldHint: false`. | MCP docs state read-only, non-destructive, closed-world posture and require `side_effects: []`.                 |
| Gateway or repo authority    | Tool responses preserve Gateway contract ids or repo-local build-management basis.                          | MCP docs name authority source instead of presenting MCP as authority.                                          |
| Local stdio only             | Server ids are `lnsat.mcp.read_only.v0_1` and `lnsat.mcp.official_stdio.v0_1`.                              | MCP docs allow local stdio inspection only and forbid hosted listeners, network exposure, and runtime dispatch. |
| Envelope shape               | Tool call responses include `ok`, `is_error`, JSON content or error, tool id when known, and side effects.  | MCP docs describe success and failure envelopes without converting failures into partial permission.            |
| Runtime readiness inspection | Runtime implementation tools report `live_execution_allowed: false` and `state_changing_tool: false`.       | MCP docs frame these as inspection/preflight surfaces, not implementation or dispatch permission.               |
| Knowledge inspection         | Knowledge surface reports read-only/local-index posture and disabled mutation/live collection flags.        | MCP docs keep knowledge examples local/read-only and do not authorize external collection.                      |

## MCP Negative Probes

| Probe                       | Invalid example                                                                                     | Expected fail-closed result                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Unknown MCP tool            | Call `lnsat.platform.runtime.dispatch.execute` or any tool not in the registered `29` names.        | Local read-only server returns `ok: false`, `is_error: true`, `tool: null`, error code `mcp.unknown_tool`, and `side_effects: []`. |
| Invalid call envelope       | Submit a non-object call request or a request without a usable `name`.                              | Server rejects the call with MCP call validation error and `side_effects: []`.                                                     |
| State-changing tool attempt | Register or call a tool that writes files, DB rows, queues, DNS, or network state.                  | Documentation must classify the example as forbidden until a later packet opens MCP mutation scope.                                |
| Live dispatch attempt       | Treat readiness, implementation plan, approval gate, or dry-run evidence tools as dispatch grants.  | Expected response remains inspection-only: no runtime adapter, broker dispatch, live execution, or state-changing tool.            |
| Secret read attempt         | Pass prompt/env/file/store secret values through MCP input or examples.                             | Docs reject the example; secret values are not valid SDK documentation content.                                                    |
| External call attempt       | Use MCP docs to call hosted services, hosted MCP endpoints, third-party APIs, or external crawlers. | Docs reject the example; local stdio inspection does not open external call or network exposure scope.                             |
| Nonempty side effects       | Return `side_effects: ["wrote_db_row"]` or any mutation evidence from an MCP example.               | Expected result is failure; current MCP docs require `side_effects: []`.                                                           |

## Modern and Framework Conformance

These experimental lanes have source and automated proof:

| Lane                   | Current proof                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| MCP 2026-07-28         | modern entrypoint, discovery, stateless request metadata, JSON Schema 2020-12, unsupported-version and downgrade denial    |
| Legacy/modern dual era | explicit era selection, configured fallback only, capability intersection, exact Gateway equality                          |
| FastMCP 3.4.5          | isolated stable legacy-profile interop with native lane                                                                    |
| FastMCP 4 beta         | isolated experimental modern-profile interop with native lane                                                              |
| A2A 1.0                | agent-card/task/artifact/extension mapping with no authority widening                                                      |
| OAuth/SPIFFE           | exact admission/workload identity, resource/audience binding, revocation, and no action-authority substitution             |
| OTel                   | redacted correlation only; span/task status cannot become durable outcome or receipt                                       |
| Registry/supply chain  | exact version/integrity/license/provenance plus outage, drift, yank, substitution, and namespace negatives                 |
| Outage recovery        | restart, lost response/task ID, duplicate retry, cancellation ambiguity, stale status, expiry, orphan, and reconcile cases |
| Signer interface       | test-double-only unknown/revoked/mismatched identity, purpose, algorithm, digest, provider, and lifecycle negatives        |
| Control Center         | shared fixture, loopback read API, and browser-model equality; retry controls disabled                                     |

Official conformance `0.1.16` covers its available loopback HTTP 2025-11-25
`server-initialize` scenario. It does not expose MCP 2026-07-28 or stdio server
scenarios; those claims rely on official v2 SDK tests and are not labeled as
framework coverage.

Every lane reuses canonical Gateway fixture results. Planned, implemented,
tested, experimental, production-supported, and deprecated states remain
separate. See
[Phase 8 adapter authority conformance](../architecture/PHASE_8_ADAPTER_AUTHORITY_CONFORMANCE.md).

## Agent Positive Checks

| Check              | Source expectation                                                                                                                                  | Expected documentation result                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Manifest contracts | Agent docs start from `lnsat.policy_profile.v0_1`, `lnsat.skillset_manifest.v0_1`, and `lnsat.manager_role_manifest.v0_1`.                          | `docs/sdk/agent.md` names all three contracts and treats them as source-only startup-wizard preview surfaces. |
| Control levels     | Source profile defines `5` levels: `observe`, `assist`, `managed_autonomy`, `strict`, and `locked_down`.                                            | Agent docs list all `5` and state no level grants open autonomy.                                              |
| Manager roles      | Source profile defines `10` roles, with humans as activation/approval authority and agents as support.                                              | Agent docs distinguish human managers from agent managers and keep `can_grant_self_authority: false`.         |
| Skillsets          | Source profile defines `6` skillsets with allowed resources, blocked resources, approvals, and audit duties.                                        | Agent docs describe skillsets as bounded capabilities, not runtime permission bundles.                        |
| Policy rows        | Default profile has `14` rows; approval-required rows route to human managers.                                                                      | Agent docs preserve allowed, approval-required, and blocked modes without broadening them.                    |
| No-live posture    | Policy profile preserves empty arrays for secrets, auth wiring, storage, network, policy activation, runtime, DB, external calls, and side effects. | Agent docs require these arrays to stay empty and treat drift as denial.                                      |
| Context snippets   | Generated snippets tell agents to read canonical JSON, deny unknown capability, and preserve policy rows.                                           | Agent docs keep snippets as instructions/evidence, not activation or execution authority.                     |

## Agent Negative Probes

| Probe                        | Invalid example                                                                                        | Expected fail-closed result                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Unknown capability           | Add `capability: "teleport.execute"` or another capability outside known or forbidden patterns.        | Validation denies with `startup_wizard.unknown_capability_denied`; unknown capability is denied by default. |
| Missing approval manager     | Mark `stage.preview` or `execute.approved` as `approval_required` without human `approval_manager`.    | Validation denies with `startup_wizard.approval_manager_required`.                                          |
| Agent final approval manager | Route approval-required policy row to `policy_reviewer`, `approval_triage`, or another agent role.     | Validation denies with `startup_wizard.approval_manager_required`; agent manager cannot be final authority. |
| Forbidden capability allowed | Mark `secret.read.never`, `database.write`, `ssh`, `root`, or other forbidden row as allowed.          | Validation denies with `startup_wizard.forbidden_capability_allowed`.                                       |
| Agent policy activation      | Set an agent manager with `can_activate_policy: true` or describe an agent activating policy.          | Validation denies with `startup_wizard.agent_policy_activation_forbidden`.                                  |
| Self-grant authority         | Set any manager with `can_grant_self_authority` other than `false`.                                    | Validation denies with `startup_wizard.agent_policy_activation_forbidden`.                                  |
| Secret-like value            | Include `password`, API key, bearer token, private key, DSN, GitHub token, npm token, or similar text. | Validation denies with `startup_wizard.secret_value_forbidden`, with raw input content withheld.            |
| No-live posture drift        | Set blocked posture flag to `true`, omit no-live posture, or add runtime/DB/network write capability.  | Validation denies with `startup_wizard.no_live_posture_drift` or `startup_wizard.blocked_capability_drift`. |
| Nonempty side effects        | Add `side_effects: ["activated_policy"]` or any mutation evidence.                                     | Validation denies with `startup_wizard.side_effects_forbidden`; expected side effects stay empty.           |

## Product Direction Conformance

Future portable configuration and extension contracts require:

| Probe                                                     | Expected result                                             |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| Universal prohibition removed by provider/model overlay   | Denied with resolution trace naming conflicting layer       |
| Mutable tag used without resolved digest                  | Denied before assignment or execution                       |
| Skill/instruction origin or signature mismatch            | Quarantined; unavailable to effective bundle                |
| Cross-project work-context move without authority         | Denied or human escalation with correction evidence         |
| Gatekeeper model recommends broader role/capability       | Deterministic ceiling wins; recommendation cannot authorize |
| Extension install treated as capability grant             | Denied; install and grant remain separate                   |
| Commercial entitlement treated as policy allow            | Denied; feature availability is not action authority        |
| Connector receipt omits effective config or action digest | Receipt rejected; execution not recorded complete           |
| CLI/UI/MCP produce different canonical proposal           | Conformance failure                                         |

These rows are design requirements until versioned source contracts and golden
fixtures exist. They do not claim expanded runtime support.

## Stable Approval Evidence Checks

| Probe                                                | Expected result                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Allow or deny policy decision submitted for approval | No request; `approval_request.not_required`.                           |
| Malformed or identity-tampered policy decision       | No request; `approval_request.invalid_policy_decision`.                |
| Request before policy evaluation or at/after expiry  | No request; `approval_request.expired`.                                |
| Non-human or malformed approver/session input        | No decision; `approval_decision.invalid_input`.                        |
| Requester attempts to decide the same request        | No decision; `approval_decision.self_approval_forbidden`.              |
| Tampered request id or bound request content         | No decision; `approval_decision.invalid_request`.                      |
| Decision before request or at/after expiry           | No decision; `approval_decision.expired`.                              |
| Approved outcome with denial reason, or inverse      | No decision; `approval_decision.invalid_input`.                        |
| Exact request/decision replay                        | Exact same ids, empty side effects, and `execution_authorized: false`. |

## Stable Audit Event Checks

| Probe                                                                 | Expected result                                                                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Unknown event type, extra top-level field, or malformed observation   | No event; stable validation error with no raw input reflection.                                                           |
| Packet, policy decision, approval request, or approval decision drift | No event; `audit_event.source_evidence_mismatch`.                                                                         |
| Observation before the source event                                   | No event; `audit_event.observed_before_event`.                                                                            |
| Exact source and observation replay                                   | Exact same source hash, event id, idempotency key, and empty side effects.                                                |
| Same source with a later observation                                  | Same source hash/idempotency key and different event id; persistence must treat as collision.                             |
| Any successful stable event                                           | `authenticated_provenance: false`, `persistence_requested: false`, `execution_authorized: false`, and `side_effects: []`. |

## Documentation Fixture Requirements

Future examples, references, and eventual runners must preserve these fixture
fields before package or runtime scope can open:

- MCP registered tools: exactly current read-only inspection tools until a later
  packet explicitly changes tool scope.
- MCP unknown tool denial: `mcp.unknown_tool`.
- MCP and Agent side effects: `side_effects: []`.
- MCP protocol/task state, FastMCP/A2A context, OAuth/SPIFFE identity, OTel
  trace, Registry metadata, and signer-provider metadata: never action
  authority.
- Agent source contract ids: `lnsat.policy_profile.v0_1`,
  `lnsat.skillset_manifest.v0_1`, and `lnsat.manager_role_manifest.v0_1`.
- Agent policy failures: `startup_wizard.unknown_capability_denied`,
  `startup_wizard.approval_manager_required`,
  `startup_wizard.forbidden_capability_allowed`,
  `startup_wizard.agent_policy_activation_forbidden`,
  `startup_wizard.secret_value_forbidden`,
  `startup_wizard.no_live_posture_drift`,
  `startup_wizard.blocked_capability_drift`, and
  `startup_wizard.side_effects_forbidden`.

## Boundary

Conformance docs and local executable vectors describe expected pass/fail
behavior. They do not approve SDK package creation, package
mutation/publication, runtime behavior, live MCP tools, DB, storage/network
mutation, external services, auth provider wiring, policy activation, Docker,
SSH, node-agent, workflow execution, package install/update, lockfile refresh,
release creation, Git push, GitHub mutation, or live side effects.
