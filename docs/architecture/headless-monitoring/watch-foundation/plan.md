<!-- intent-driven-delivery:plan:v1 -->

# Plan: HCFG-4B durable watch foundation

Status: proposed
Authority: [HCFG-4B intent](intent.md)
Owner: LNSAT maintainers
Last updated: 2026-09-26

## Scope and protected lanes

This is a source-only design proposal. After owner acceptance, implement only
the internal journal, migration, append integration, cursor/page read, and
focused tests in the canonical Rust store. PR #33's exact reads are a
dependency; its merge remains a separate decision. Served watch, CLI, Docker,
deployment, production mutation, candidate build, signing, tagging, and release
remain closed.

## Files and ownership

- One source producer: `crates/lnsat-store/src/lib.rs`,
  `crates/lnsat-store/src/phase7_persistence.rs`,
  `crates/lnsat-store/src/phase7_nonce.rs`,
  `crates/lnsat-store/src/phase7_consumption.rs`,
  `crates/lnsat-store/src/phase7_git_adapter.rs`, a new numbered store migration
  under `crates/lnsat-store/migrations/`, and focused store tests. The producer
  must revise this ownership list if the append-path inventory finds another
  included writer; no journal integration may silently omit it.
- One docs producer: this intent/spec/plan and minimal index/status links after
  implementation evidence. The Phase 11 operator packet remains the authority
  for runtime-proof state.
- Inventory checksum changes only if required by the source-tree validator.
  No daemon, CLI, TypeScript, dependency, or product-surface file is in scope.

## Pre-implementation source inventory

The current source places approval request/decision and audit append paths in
`lib.rs`; authorization attempts in `phase7_persistence.rs`; authorization
nonces and nonce state events in `phase7_nonce.rs`; execution authorizations,
capability consumptions, operations, and authorization/operation state events
in `phase7_consumption.rs`; and operation attempts, receipts,
reconciliations, and attempt/operation state events in
`phase7_git_adapter.rs`. The shared `lnsat_phase7_state_events` table has all
four target kinds. These locations establish file ownership, not proof that
every call site, retry path, or transaction boundary has been enumerated.
Step 2 must produce that exact inventory before a migration or source edit.

## Sequence

1. Obtain human acceptance of this intent/spec; do not infer it from PR #33's
   HCFG-4A acceptance or green CI.
2. Inventory every canonical source append, its transaction boundary, and the
   order of included records within each multi-record transaction. Stop on
   missing exact identifiers, non-atomic paths, or family ambiguity.
3. Add additive migration and drift guards for epoch, sequence, floor, closed
   family enum, exact source ID, and index immutability apart from bounded prune.
4. Integrate each source append and journal insert in one transaction; preserve
   deduplicated replay behavior.
5. Add bounded cursor reads with full source rederivation, contiguous ordering,
   explicit gaps, and no partial page.
6. Run focused and full source validation, installed local scans, and independent
   security/correctness review. Resolve findings and rerun affected gates.
7. Update project status from evidence, commit with DCO, push a reviewable PR,
   then stop before merge pending exact-head owner authorization.

## Validators

```sh
cargo test -p lnsat-store watch_journal
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-targets --all-features --locked
npm run source:check
npm run public:check
npm run legacy:inventory:check
git diff --check
```

Use the pinned Rust toolchain and repository-native commands. When installed,
run Semgrep with a named local ruleset and metrics/version checks disabled,
and Gitleaks with full redaction and an outside-repo report. Run OSV only if a
dependency manifest or lockfile enters scope. Do not install tools or upload
source. The docs-only proposal uses
artifact, format, direction, public, inventory, and diff checks.

## Independent review

A fresh read-only reviewer receives the accepted intent/spec, exact diff,
append-path inventory, migration tests, fault/concurrency results, full gate
results, and scanner summaries. It checks totality of family coverage,
transaction atomicity, replay continuity, projection-only pruning, cursor
generation limits, corruption denial, privacy, rollback, and unchanged
authority. The producer does not approve their own work; primary Codex resolves
all actionable P1/P2/P3 findings and owns final judgment.

## Rollback and recovery

Before merge, drop or revise the isolated branch. A migration that reaches a
real database is not rolled back by deleting journal files; a separate owner
approved recovery packet must define safe forward repair or binary rollback.
Stop on any unindexed source path, inability to commit source and journal
atomically, migration drift, unbounded storage, source-evidence deletion,
silent gap, privacy leak, or demand for a served enumeration route.

## Deviations

None. Record any proposed scope change here before implementation.

## Evidence ledger

- 2026-09-26: drafted after PR #33 exact-head CI `36287275526` passed at
  `da8d5fae1829f8aa99158342a477a324b3c70b01`. PR #33 remains draft;
  no GitHub review or owner merge decision has been recorded. This proposal
  does not accept itself or implement a journal.
- 2026-09-26: isolated public worktree `codex/hcfg4b-watch-foundation` added
  this intent/spec/plan only. Artifact validators passed for all three;
  Prettier, relative-link resolution, product-direction tests (31/31), and
  public readiness (872 project files) passed. The legacy inventory checksum
  was refreshed because the proposed documents change the source-tree digest;
  identifier occurrences remain 2,122 across 295 files. Inventory and staged
  diff checks passed. No source tests were run for this docs-only proposal.
- 2026-09-26: a fresh read-only GPT-5/OpenAI reviewer identified four design
  gaps: copied-database identity, session-activity scope, corrupt-journal tests,
  and sequence exhaustion. The proposal now states the copied-database limit,
  excludes session/identity activity from this bounded family set, and requires
  the missing negative tests. The reviewer re-reviewed the corrected packet
  and reported PASS with no remaining P1/P2/P3 finding. Owner acceptance,
  source implementation, and merge remain pending; a proposal commit or push
  does not accept the contract.
- 2026-09-26: source-path inspection found the original file ownership list
  omitted `phase7_consumption.rs` and `phase7_git_adapter.rs`. Fresh read-only
  GPT-5 Codex/OpenAI review found a P1: excluding capability consumption and
  execution-authorization state would omit a committed one-time consumption
  before any operation or attempt state event. The proposed family set and
  file ownership now cover the named Phase 7 lifecycle records and all four
  state-event targets. Exact append-call and rederivation inventory remains an
  implementation prerequisite; this correction has no source behavior effect.
- 2026-09-26: the same reviewer found a P2 test gap: contiguous journal
  sequences alone would not prove the order of records committed together.
  The spec now requires source-append order within each transaction and named
  tests for nonce, authorization/operation, consumption, and receipt paths.
