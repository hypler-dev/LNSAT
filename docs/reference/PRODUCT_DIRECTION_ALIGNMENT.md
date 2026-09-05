# Product Direction Alignment

- Status: current documentation control
- Decision sources: ADR-0002, ADR-0003, ADR-0006, and ADR-0007
- Runtime effect: none

This matrix prevents expanded product direction from drifting across public
documentation. Current implementation truth remains in
[Project status](../PROJECT_STATUS.md); planned behavior never becomes a shipped
claim because it appears here.

## Canonical Decisions

| Decision                                                                                                          | Canonical source                                                                               | Required aligned surfaces                               |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Execution authorization and evidence is primary position                                                          | [ADR-0002](../architecture/ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md)                    | README, architecture guide, roadmap, project status     |
| Gateway owns authority above MCP/A2A/API/CLI/UI                                                                   | [Authority layer](../architecture/AUTHORITY_LAYER_AND_REFERENCE_WORKFLOW.md)                   | security, SDK, adapters, CLI, UI                        |
| MCP 2026-07-28 is canonical experimental source; legacy and framework lanes stay bounded                          | [MCP interoperability](../architecture/MCP_V2_FASTMCP_INTEROPERABILITY_AND_OUTAGE_RECOVERY.md) | MCP, SDK, roadmap, status, conformance                  |
| Required path is Phase 8 -> 9 -> 10 -> 11 -> 13 -> 14; Phase 12 and signed lanes stay nonblocking unless selected | [Product build sequence](../PRODUCT_BUILD_SEQUENCE.md)                                         | roadmap, status, release, compatibility, distribution   |
| Public core plus separately versioned downstream products                                                         | [ADR-0003](../architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md)              | governance, contributor, SDK, release, public readiness |
| Docker/OCI is first v1 runtime profile; Gateway authority remains runtime-neutral                                 | [ADR-0007](../architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)               | README, roadmap, status, runtime adapters, distribution |
| Configuration layers only narrow; authority-managed emergency stop dominates                                      | [ADR-0007](../architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)               | config, CLI, UI, policy, adapters, recovery             |
| Agent configuration, skills, instructions, context, and overlays are governed inputs                              | [Management design](../architecture/AGENT_CONFIGURATION_SKILL_AND_CONTEXT_MANAGEMENT.md)       | context firewall, SDK, UI, onboarding, threat model     |
| Gatekeeper models advise; deterministic policy and humans authorize                                               | [ADR-0003](../architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md)              | auth, agent framework, SDK, threat model                |
| Node/graph UI and exact source editor serve different tasks                                                       | [Management UI](../architecture/MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md)                     | UI framework, management design, roadmap                |
| OS CLI is mandatory beside browser UI                                                                             | [CLI and OS interface](../architecture/CLI_AND_OS_OPERATOR_INTERFACE.md)                       | roadmap, package/crate docs, distribution, SDK          |
| Canonical components are built once and wrapped unchanged                                                         | [Distribution plan](../architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md)                     | release, compatibility, commercial composition          |
| Public source visibility is independent from final artifact publication                                           | [Public source readiness](../PUBLIC_READINESS.md)                                              | roadmap, status, release, governance                    |
| Final artifact publication follows Phase 14 and separate explicit go/no-go authorization                          | [Source release process](../RELEASING.md)                                                      | roadmap, status, release, distribution                  |
| Entitlement controls features, never authority                                                                    | [Open-core boundary](../architecture/OPEN_CORE_AND_PRODUCT_REPOSITORIES.md)                    | governance, security, downstream docs                   |

## Repository and Product Boundaries

Standalone LNSAT setup and access management belong to the public product,
independent of downstream management products. The
[canonical pending V1 gate](../PRODUCT_BUILD_SEQUENCE.md#standalone-setup-and-access-management)
aligns README, roadmap/status, console/CLI architecture, and release/distribution
docs. Rangoon may install a verified compatible release or use an existing
service; dependency flows toward LNSAT, never the reverse. Current console
readback does not implement that management gate.

| Boundary            | Source role                                                    | Current state                                                 |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| LNSAT               | canonical authority core and public interoperability contracts | public pre-release source from audited fresh-history snapshot |
| Management products | visual and organization management                             | planned outside this repository                               |
| Connector packs     | product-specific adapters                                      | public contracts only; certified implementations unavailable  |
| Model packs         | advisory profiles, overlays, evaluation, packaging             | planned outside this repository                               |
| Release composition | exact component and trust assembly                             | planned outside this repository                               |

Marketing source remains separate. No boundary above currently supplies a
supported package, hosted runtime, production connector, model deployment, or
production release.

## Documentation Coverage

Alignment review covers:

- entry points: root README, docs README/index, roadmap, project status;
- decisions: ADRs, system architecture, authority lifecycle, product boundary;
- security: threat model, identity/integration, context firewall, security
  policy;
- management: context synthesis, agent configuration, Control Center, UI
  framework;
- integration: agent framework, MCP, SDK agent/extension/conformance docs;
- operations: CLI, daemon, distribution, compatibility, release, public
  readiness;
- enterprise/community: governance, contribution, trust and technical-standard
  plans;
- onboarding: project and agent read orders;
- source-local package/crate READMEs.

Low-level implementation notes remain scoped to their owned contract, route,
store, or migration. They need not restate product expansion when they make no
broader product claim.

## Alignment Rules

1. Current, experimental, proposal, and accepted-plan states stay explicit.
2. Historical ADR-0001 conflicts remain visibly superseded by ADR-0002.
3. ADR-0003 extends product topology but does not expand v1 runtime claims.
4. Public core security and interoperability cannot move behind entitlement.
5. Downstream modules cannot fork Gateway authority.
6. Model output cannot become approval or execution authority.
7. UI, CLI, MCP, REST, A2A, and SDK paths map to same Gateway contracts.
8. Managed content uses immutable identity, provenance, assignment, and
   rollback evidence.
9. Package managers wrap canonical components; editions cannot compile
   alternate authority behavior.
10. Unknown or untested compatibility rows remain unsupported.
11. Protocol, task, OAuth, workload identity, trace, registry, and signer
    evidence never becomes action authority.
12. Local-session approval, optional signed approval, execution authorization,
    and receipt authentication remain separate; private keys stay outside
    LNSAT.
13. Current maturity remains pre-release, source-only, and without published
    artifacts; repository visibility does not change this state.
14. Phase 14 candidate builds follow required Phases 8, 9, 10, 11, and 13;
    Phase 12 and `P7-K1/S1/V1/I1` remain optional, blocked, ungranted, and
    nonblocking unless separately selected.
15. Public repository source is separately gated and may precede Phase 14.
    Candidate build, proof, production signing, artifact publication, and
    support remain distinct later gates.
16. Docker is first integration priority, not product identity or sole
    substrate. Docker governance may add defense in depth but cannot replace
    LNSAT authorization.
17. Configuration inheritance is monotonic: deny unions, allow intersections,
    most-restrictive limits, strongest approval, and active stops dominate.

## Executable Check

Run:

```sh
npm run docs:direction:check
```

The check inventories every tracked Markdown file, validates fourteen roadmap
phases, rejects retired primary framing, checks current source-only maturity,
enforces Phase 8 -> 9 -> 10 -> 11 -> 13 -> 14 ordering plus optional-lane
nonblocking truth, separates public source from artifact publication, requires
artifact publication after Phase 14 and separate authorization, and requires
critical docs to carry owned direction markers.
