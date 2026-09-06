# Management Console Information Architecture

`apps/console` is an experimental LNSAT source console. It is separate from the
marketing site and currently renders synthetic public fixtures in read-only
mode. It is not an LNSAT V1 exit requirement; Rangoon owns rich userland UI.

## Product Routes

The required V1 standalone setup and access-management capability belongs to
LNSAT's API and `lnsatctl`, not a mandatory graphical product. Rangoon owns
the graphical wizard, presets, and management UI. LNSAT's
[canonical acceptance gate](../PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control)
covers separate resource access and agent authority, layered declarative
configuration, observed OS enforcement, protected permission changes, and
recovery. Implementation is pending. The route inventory below describes
existing read-only source, not permission editing or an implemented wizard;
future changes require reviewed Gateway contracts and independent security
validation.

| Route         | Purpose                                          |
| ------------- | ------------------------------------------------ |
| `/dashboard`  | System posture and evidence summary              |
| `/knowledge`  | Source-derived records, citations, and freshness |
| `/packets`    | Packet validation and lifecycle evidence         |
| `/agents`     | Agent and session context                        |
| `/approvals`  | Approval-required and decided requests           |
| `/audit`      | Immutable decision and action evidence           |
| `/operations` | Operation ambiguity and reconciliation evidence  |
| `/substrates` | Inventory, capability, and readiness evidence    |
| `/readiness`  | Gate status and missing prerequisites            |
| `/settings`   | Read-only configuration posture                  |

The `operations` route is backed by the synthetic operation-reconciliation
fixture and loopback read-only API projection. It shows stale, degraded,
unavailable, unknown, reconciling, expired, orphaned, and receipt-pending
states. Every retry control remains disabled because no runtime mutation path
is open.

Root redirects or resolves to the dashboard experience. Route definitions and
fixture models in `apps/console/src` are authoritative.

## Expanded Management Surfaces

ADR-0003 adds future management-plane needs without claiming current routes:

| Surface                   | Purpose                                                                                 | Product placement                                           |
| ------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Work contexts             | Detect, group, split, merge, move, and correct requests with evidence                   | public context contract; rich management downstream         |
| Profiles                  | Compose universal, role, workspace, provider, and model overlays                        | portable contract public; collaborative editor downstream   |
| Instructions and skills   | Version, diff, review, assign, share, revoke, and roll back agent content               | portable identity/conformance public; registry downstream   |
| Delegation                | Show agent chain, role ceilings, allowed delegation, and escalation                     | Gateway policy public; organization workflows downstream    |
| Graphs                    | Compose and inspect workflow, inheritance, policy, context, and connector relationships | portable graph contract public; visual authoring downstream |
| Connectors/modules/models | Inventory manifest, compatibility, evaluation, health, quarantine, and revocation       | public contract/conformance; certified packs downstream     |
| Organization              | Projects, environments, identity mappings, separation of duties, evidence export        | local core baseline; enterprise depth downstream            |
| Adapter operations        | Protocol era, server/adapter identity, attempt, outage, reconciliation, receipt, expiry | public read model; runtime control separately gated         |

Small shops should operate useful safe defaults through one owner/operator
without constructing every policy manually. Power users need exact source,
resolved configuration, diffs, manifests, and evidence. Enterprise deployments
need delegated administration, separation of duties, identity mapping,
environment promotion, retention, and export without changing Gateway
authority.

## Relationship Views

Use view matching information shape:

- dense infrastructure inventory for systems, agents, projects, owners,
  health, and status;
- tree for organization, workspace, library, and inheritance hierarchy;
- node graph for delegation, instruction inheritance, context flow, policy
  flow, connectors, and execution relationships;
- material-editor-style graph for profile and workflow composition;
- structured form for common safe settings;
- source editor and diff/review for uncommon instructions and granular rules;
- timeline for versions, assignments, approvals, execution, incidents,
  revocation, and rollback.

Objects may be copied, dragged, connected, reused, exported, and imported.
Visual edits create proposals and immutable diffs. Active configuration changes
still require policy, approval when required, assignment evidence, and
rollback.

## Shared Presentation Rules

- Label evidence as observed, derived, synthetic, stale, or unavailable.
- Display source and citation references where decisions depend on them.
- Distinguish allowed, approval-required, blocked, and not implemented.
- Explain missing gates without offering a bypass.
- Show exact effective profile/skill/instruction/context/model digests and
  resolution trace where agent behavior depends on them.
- Show classifier confidence and human correction for request grouping.
- Keep entitlement state visually separate from action authority.
- Distinguish transport failure, action failure, outcome unknown, cancellation
  requested, and Gateway-confirmed terminal state.
- Show protocol/framework support as planned, implemented, tested,
  experimental, production-supported, or deprecated.
- Disable blind retry; show idempotency and authorization-expiry prerequisites
  before any future recovery action.
- Never render credential values or raw rejected input.
- Preserve useful density at desktop and small viewport sizes.
- Support keyboard navigation, visible focus, semantic headings, and adequate
  contrast in light and dark themes.

## Read-Only Boundary

Current console has no mutation API, runtime dispatch, database writer,
deployment control, or direct substrate integration. Buttons and controls must
not imply an available live action when only evidence exists.

Any future mutation requires a separately reviewed packet contract, Gateway
route, policy decision, approval flow, audit record, rollback behavior, and
end-to-end tests.

MCP/A2A task state, OAuth admission, OTel span state, SPIFFE identity, and
Registry discovery may be displayed as labeled evidence only. UI cannot present
them as approval, execution proof, cancellation proof, or receipt.

## Data Boundary

Synthetic fixtures must be safe to publish: no production data, credentials,
private hostnames, personal paths, customer names, or copied internal records.
Future live data access must pass through Gateway-owned query contracts rather
than direct browser-to-database or browser-to-substrate connections.

## Validation

Console format, typecheck, tests, build, route inventory, and source scanner run
through repository workspace commands. Generated build output is ignored and
must not be committed.
