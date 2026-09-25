<!-- intent-driven-delivery:plan:v1 -->

# Plan: Versioned monitoring evidence-subject snapshot

Status: proposed
Authority: [Versioned monitoring evidence-subject snapshot intent](intent.md) and the [HCFG-4 requirement](../../PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control)
Owner: LNSAT project owner
Last updated: 2026-09-25

## Scope and protected lanes

This packet defines contract and acceptance work only. It authorizes no source,
schema, storage, server, CLI, runtime, Docker, deployment, release, installer,
production, or supported-platform implementation.

Protected lanes:

- [PR #33](https://github.com/hypler-dev/LNSAT/pull/33) HCFG-4A intent/spec
  must be accepted before snapshot or watch source work depends on its exact
  evidence-read contract.
- The owner must choose installation-wide `ReadEvidence` or a narrower
  project/resource scope before any implementation starts.
- State and journal publication must remain one SQLite transaction; no second
  authorization or mutation path may be introduced.
- The exact evidence-family mapping must be accepted before source work; this
  proposal does not invent family names.
- The exact transport method, route, and fields remain owner-reviewable.
- The snapshot must remain an evidence-subject ID inventory at one cutover.
  Audit history completeness and historical event continuity are separate
  gates.
- No real evidence, credentials, secrets, or production payloads enter tests,
  fixtures, logs, tokens, or review artifacts.

## Files and ownership

This proposal owns exactly:

- `docs/architecture/headless-monitoring-snapshot/intent.md`
- `docs/architecture/headless-monitoring-snapshot/spec.md`
- `docs/architecture/headless-monitoring-snapshot/plan.md`

The HCFG-4A packet, HCFG-4C watch packet, product status, and build sequence
remain owned by their existing records. A later implementation packet must
name exact source, test, migration, and documentation paths before editing.

## Sequence

1. Obtain owner acceptance of the HCFG-4A intent/spec and record its exact read
   scope.
2. Obtain owner acceptance of this snapshot intent/spec, including scope,
   limits, transport mapping, transactional cutover, token, expiry, and
   redaction decisions.
3. Create a separate source implementation packet naming the state tables,
   journal writer, snapshot materialization boundary, cleanup strategy, and
   exact tests. Confirm the watch packet's exclusive cursor semantics
   (`sequence > cutover_cursor`).
4. Implement the bounded read handle and materialized pages in one SQLite
   transaction with the journal cutover watermark. Add deterministic fake data
   tests only; do not add runtime or Docker proof.
5. Integrate the later HCFG-4C watch by starting strictly after the cutover
   cursor and testing concurrent writer, reconnect, retention-gap, and
   unknown-outcome behavior. Keep audit-history completeness separately gated.
6. Run focused validators, obtain fresh independent review from a different
   provider/model, reconcile findings, and present the isolated result for
   owner merge authorization. Merge, release, and production remain separate.

## Validators

For this docs-only proposal:

- `python3 <intent-driven-delivery-skill>/scripts/validate_artifact.py docs/architecture/headless-monitoring-snapshot/intent.md`
- `python3 <intent-driven-delivery-skill>/scripts/validate_artifact.py docs/architecture/headless-monitoring-snapshot/spec.md`
- `python3 <intent-driven-delivery-skill>/scripts/validate_artifact.py docs/architecture/headless-monitoring-snapshot/plan.md`
- `git diff --check -- docs/architecture/headless-monitoring-snapshot/intent.md docs/architecture/headless-monitoring-snapshot/spec.md docs/architecture/headless-monitoring-snapshot/plan.md`
- repository-native docs/readiness checks named by the packet owner, if they
  exist and do not require runtime or Docker.

Expected evidence is successful artifact validation, no whitespace errors, an
exact three-file diff, explicit proposed/pending markers, and no source,
runtime, package, Docker, or release claim.

## Independent review

Before source implementation, a fresh reviewer from a different provider or
model must inspect all three files against HCFG-4, Project Status, PR #33, and
the later watch contract. Review must report actionable P1/P2/P3 findings for
transactional cutover, deterministic pages, limits, expiry, authorization,
privacy, retention gaps, and scope drift. The producer cannot approve its own
proposal.

Owner acceptance remains distinct from reviewer PASS, CI green, merge,
release, and production authority.

## Rollback and recovery

This proposal is documentation-only and reversible by removing the three new
files before acceptance. Do not remove or rewrite existing status,
build-sequence, HCFG-4A, or watch records. If a later implementation fails a
gate, stop before merge, preserve evidence, and revert only its isolated source
packet using normal reviewable history. Never delete accepted evidence or
journal data as rollback.

## Deviations

None. Any change to scope, limits, token semantics, transaction boundary,
retention recovery, redaction, or source ownership must be recorded here before
expansion.

## Evidence ledger

- 2026-09-25: all six HCFG-4B/C intent/spec/plan artifact validators passed.
- 2026-09-25: Prettier on the combined proposal, `docs:direction:check`
  (31/31 tests), `public:check` (872 project files), legacy inventory check
  (2,122 occurrences across 295 files), relative-link check (zero missing
  across eight Markdown files), and `git diff --check` passed.
- 2026-09-25: fresh independent GPT Terra xhigh read-only review found and
  rechecked bootstrap, evidence binding, pagination, digest, and resource-bound
  corrections. Final verdict: PASS, no P1/P2/P3 finding.
- Owner acceptance, source implementation, runtime, and release evidence:
  pending.
