# LNSAT Contributor Instructions

LNSAT provides execution authorization and evidence for consequential agent
actions. Keep changes bounded, reviewable, and fail-closed.

## Start

1. Run `git status --short --branch`.
2. Read `README.md`, `docs/DOCS_INDEX.md`, and relevant source/tests.
3. Use targeted search and focused validation before broad scans.

Graphify is optional. Use it when exact-symbol relationships help; never block
work on graph availability or generated graph output.

## Agent Routing

- Use Codex Spark High workers for bounded implementation, review, tests, and
  documentation when capacity exists.
- If Spark is unavailable or capacity-limited, keep work in the primary Codex
  session.
- Do not use Qwen, local-model, or other smaller-model fallbacks for LNSAT
  source, review, test, documentation, or log-summary work.
- Primary Codex retains architecture, security, database, authorization,
  deployment, and final-review judgment.

## Product Boundary

- Gateway is security boundary; MCP remains adapter layer.
- Secrets are references only. Never commit values.
- Agents never receive direct infrastructure control.
- New mutation authority requires explicit design, policy, approval, audit,
  rollback, and tests.
- Marketing site source lives outside this repository.

## Engineering

- Prefer small vertical changes with tests.
- Preserve public contracts or document compatibility changes.
- Use `rg` for search and repository-native checks for validation.
- Keep console fixture-backed and read-only until runtime integration is
  deliberately opened.
- Do not commit generated output, local state, credentials, or operator notes.

## Validation

Run focused checks while developing, then:

```sh
npm run check
npm run public:check
```

Rust checks use pinned `rust-toolchain.toml`. Toolchain installation remains an
explicit operator action; scripts never install implicitly.

## Repository ownership and parallel work

These repositories are independent sources of truth:

| Repository | Owns |
| --- | --- |
| [VUSL](https://github.com/hypler-dev/vusl) | Normative language specifications, profiles, compatibility rules, conformance vectors and specification governance |
| [LNSAT](https://github.com/hypler-dev/LNSAT) | Native authorization and enforcement contracts, approval and authorization checks, receipts, reconciliation and engine implementation |
| [Rangoon](https://github.com/hypler-dev/rangoon) | Workbench, capability management, persistence, UI, operator records and Rangoon-owned adapters, including its current VUSL parser |

1. Before editing, record the Git root, worktree, branch, HEAD, status and fetch/push URLs. Match the repository to the table above. A folder name, `origin` label, private archive or website checkout is not proof of the intended repository. Never change an existing remote merely to make a push succeed.
2. Put source, tests, documentation and status updates in the repository that owns the change. Do not maintain another editable copy of a specification in a consumer. Consumer copies needed for offline tests must name an immutable upstream commit, path and digest; update them through a reviewed compatibility change.
3. Use one development chat per repository. Additional simultaneous writers in that repository need distinct branches/worktrees and explicit file ownership. Do not edit, reset, stash, clean or switch another chat's checkout. A coordination chat may inspect all three but does not silently become their implementation owner.
4. If work requires another repository to change, prepare a bounded handoff for its owner: outcome, owning repo, exact base commit, proposed files/contracts, compatibility impact, acceptance tests, blocked consumers and allowed external actions. Cross-repository edits require explicit task scope and ownership. The receiving chat rechecks current Git state before acting; chat history is not shared authoritative state.
5. Update the owning repository's existing status/handoff record at each meaningful checkpoint. For an isolated documentation change, the reviewed pull request may serve as that record. Record implemented versus proposed behavior, validation, independent review, unresolved issues, exact commit/PR and publication state. A local edit is not a GitHub update. A pushed branch is not a main merge or release.
6. When publication is authorized, commit and push only the reviewed owning-repository packet to its verified intended remote. Include a substantive README update when behavior, status, setup or ownership changes, plus every additional README gate required by that repository. Preserve unrelated work. Merge, deployment, provider operation and release keep their separate authorization gates; this rule is not blanket publication permission.
7. For a cross-repository contract change, agree the version and compatibility rules in the owning repository first. Consumers pin the reviewed revision and test both supported and rejected cases. Record the exact commit tuple used for integration tests. Do not claim combined support until the relevant end-to-end scenario is verified; do not require a coordinated release when unchanged compatible contracts permit independent shipping.
8. Keep authority boundaries intact. VUSL compatibility, classifier output and Rangoon UI review do not grant engine authorization. LNSAT remains independent; OpenShell is a separate optional engine. Rangoon's core local workflows must remain usable without either engine. A semantic adapter must not silently change native meanings, discard critical constraints or elevate authority.

Use a small coordination index of links, dependency pins and blockers rather than duplicating three product roadmaps. Repository records remain authoritative for their own implementation and release state. Instructions guide contributors; sandbox permissions, branch protection, CI and human review provide separate controls.
