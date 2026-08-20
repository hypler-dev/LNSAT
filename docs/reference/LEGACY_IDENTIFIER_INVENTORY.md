# Legacy Identifier Inventory

Status: reproducible baseline and current migration evidence. No identifier,
contract, fixture, API, MCP, CLI, or schema value is changed by this report.

Machine-readable truth lives in
[legacy-identifier-inventory.json](legacy-identifier-inventory.json). Regenerate
and verify it with:

```sh
npm run legacy:inventory:write
npm run legacy:inventory:check
```

## Scope

Inventory scans Git-tracked text files with three expressions:

- milestone identifiers: `BP-[0-9]{4}`, case-insensitive;
- build-packet terminology and dotted tool segments: `build[-_. ]packet`;
- lifecycle source symbols: `BuildPhase|currentBuildPhase`.

Inventory JSON, this report, and generator source are excluded from their own
scan to prevent recursive evidence growth. These exclusions contain search and
classification mechanics, not product legacy values.

## Reproduced Baseline

Baseline revision: `a827ce7a4f4f239e8b9986b619eca6ae37b62441`.

| Surface                  | Occurrences | Files |
| ------------------------ | ----------: | ----: |
| Milestone identifiers    |       2,205 |   326 |
| Build-packet terminology |          59 |    24 |

Current prepared source includes Phase 0 public-scanner regression evidence:

| Surface                  | Occurrences | Files |
| ------------------------ | ----------: | ----: |
| Milestone identifiers    |       2,064 |   286 |
| Build-packet terminology |          58 |    25 |
| Lifecycle source symbols |           0 |     0 |
| Combined inventory       |       2,122 |   295 |

Phase 0 delta is test-only scanner evidence. Phase 2 removes the seven core
lifecycle-symbol occurrences, 80 milestone-coded packet status values, four
policy status values, ten audit status values, and 33 Gateway/API status
exports. It also replaces 57 MCP status exports while retaining exact legacy
protocol values under private compatibility constants. Four legacy local-beta
API wire values remain under internal compatibility constants with four test
assertions. The CLI status export now uses neutral source metadata without an
alias because no repository source consumer used its former value. Three
lowercase test literals remain as intentional API wire and public-scanner
compatibility assertions. No Phase 2 neutral-status occurrence remains.
Original baseline remains reproducible from the recorded revision; current
inventory owns every remaining occurrence. The validator replays the baseline
when that Git object is present and uses the committed verified counts in
shallow checkouts.

## Classification

Every occurrence has exactly one category, owner, migration family, and
migration lane.

| Category                           | Occurrences | Files |
| ---------------------------------- | ----------: | ----: |
| Exported public source constant    |         333 |    57 |
| Internal runtime/source constant   |         421 |    67 |
| API or MCP response value          |          88 |    13 |
| Test-only label                    |       1,260 |   179 |
| Fixture identifier or path         |          18 |    13 |
| Documentation or example reference |           2 |     2 |

Counts overlap by file across categories; occurrence rows do not overlap.

## Compatibility Surfaces

Inventory records 158 exported or API/MCP compatibility surfaces. Each record
names repo-local consumers found through exact symbol references or relative
import traversal. A surface with no consumer names carries explicit
`no_repo_local_consumer_found_by_symbol_or_import_graph` evidence.

Each surface also records:

- schema-version impact: preserve current schema until serialized changes are
  explicitly versioned;
- fixture/conformance consumers;
- compatibility decision: neutral replacement first, deprecated legacy alias
  retained;
- rollback: revert owning family commit and restore legacy values, aliases, and
  fixtures.

These are migration constraints, not permission to rename multiple families in
one change.

## Migration Order

1. Core lifecycle vocabulary.
2. Packet contracts.
3. Policy contracts.
4. Audit contracts.
5. Gateway/API responses.
6. MCP adapter and registrations.
7. CLI surface.
8. Control Center surface.
9. Shared fixtures.
10. Rust conformance.
11. Root tooling.
12. Documentation and examples.

Project-state compatibility occurrences use a separate Phase 3 lane. Legacy
tool names or serialized values stay available until versioned replacements,
deprecation docs, compatibility tests, and rollback proof exist. The inventory
also separates neutral source-status cleanup from 2,028 versioned contract
identifier occurrences and 36 other terminology occurrences that cannot change
without their own compatibility work.

Phase 3 provides `lnsat.gateway.project_state.v0_1`,
`POST /v1/project-state/inspect`, and `lnsat.project.state.inspect.v0_1` as the
canonical API and MCP path. Canonical requests, responses, errors, identifiers,
and synthetic fixture paths use neutral item vocabulary end to end. The legacy
API route and `lnsat.build.packet.read` MCP tool remain separate read-only
compatibility surfaces with exact legacy behavior. The alias cannot be removed
before `2.0.0` or before one supported-release deprecation window. The current
Phase 3 lane contains 58 occurrences across 12 files; every remaining
occurrence belongs to the tested legacy compatibility route, tool, fixture set,
or its explicit migration documentation.
