<!-- intent-driven-delivery:plan:v1 -->

# Plan: HCFG-4C versioned monitoring evidence watch

Status: proposed
Authority: [HCFG-4C monitoring watch intent](intent.md)
Owner: LNSAT project owner
Last updated: 2026-09-25

## Scope and protected lanes

The later implementation packet may add a read-only server journal/watch and
focused tests that satisfy [spec.md](spec.md). This plan currently defines
contract and acceptance work only.

Protected lanes:

- [PR #33](https://github.com/hypler-dev/LNSAT/pull/33) HCFG-4A intent/spec and
  the [HCFG-4B snapshot](../headless-monitoring-snapshot/intent.md) must be
  accepted and implemented before this watch can provide a valid first or
  post-gap cursor.
- The owner must choose installation-wide `ReadEvidence` or a narrower
  project/resource scope before source work begins.
- No new approval, control, configuration mutation, bootstrap, revocation,
  emergency, or action-authority path may be added.
- No Docker, runtime observation, installer, release, deployment, production,
  or supported-platform action is authorized.
- No real evidence, credentials, secrets, or production payloads enter tests,
  fixtures, logs, or cursors.

## Files and ownership

This proposal owns exactly these six documentation paths:

- `docs/architecture/headless-monitoring-watch/intent.md`
- `docs/architecture/headless-monitoring-watch/spec.md`
- `docs/architecture/headless-monitoring-watch/plan.md`
- `docs/DOCS_INDEX.md`
- `docs/architecture/README.md`
- `docs/reference/legacy-identifier-inventory.json`: deterministic source-tree
  inventory regeneration required by the new proposal documents.

The HCFG-4A packet in PR #33, product status, and build sequence remain owned
by their existing records. A later implementation packet must name its exact
source, test, and documentation files before editing them. One writer owns
overlapping files.

## Sequence

1. Obtain owner acceptance of the HCFG-4A intent/spec and record its exact
   read scope. Accept and implement HCFG-4B snapshot/cutover before watch.
2. Obtain owner acceptance of this watch intent/spec, including transport,
   retention, cursor, event-family mapping, and authorization decisions that
   are currently open.
3. Create a separate source implementation packet with exact module ownership,
   data-store choice, transport framing, and migration evidence.
4. Implement journal append and publication atomically, then add the bounded
   read-only long-poll page and focused store/served tests. Do not use runtime
   or Docker proof.
5. Add the later `lnsatctl` JSONL consumer only through a separately accepted
   packet or an explicit extension to the implementation packet.
6. Run validators, obtain a fresh independent review, reconcile findings, and
   present the result for owner merge authorization. Merge, release, and
   production remain separate decisions.

## Validators

For this docs-only proposal:

- `python3 <intent-driven-delivery-skill>/scripts/validate_artifact.py docs/architecture/headless-monitoring-watch/intent.md`
- `python3 <intent-driven-delivery-skill>/scripts/validate_artifact.py docs/architecture/headless-monitoring-watch/spec.md`
- `python3 <intent-driven-delivery-skill>/scripts/validate_artifact.py docs/architecture/headless-monitoring-watch/plan.md`
- `git diff --check` on the exact staged six-file proposal;
- `npm run format:check`, `npm run docs:direction:check`,
  `npm run public:check`, and `npm run legacy:inventory:check`.

Expected evidence is successful artifact validation, no whitespace errors, an
exact six-file diff, and explicit proposed/pending markers. No source,
runtime, Docker, or package proof is claimed by these checks.

## Independent review

Before source implementation, a fresh reviewer from a different provider or
model must inspect these three files against the HCFG-4 requirement and PR #33
dependency. The reviewer must report actionable P1/P2/P3 findings covering
ordering, cursor/gap semantics, backpressure, authorization, privacy, and
scope drift. The producer cannot approve its own proposal.

Owner acceptance remains distinct from reviewer PASS, CI green, merge, release,
and production authority.

## Rollback and recovery

This proposal is documentation-only and reversible by reverting its six
documentation paths before acceptance. Do not remove or rewrite existing
status, build-sequence, or HCFG-4A records. If an implementation later fails a gate,
stop before merge, preserve evidence, and revert only its isolated source
packet using normal reviewable Git history. Never delete accepted journal or
evidence data as rollback.

## Deviations

None. Any change to the open authorization decision, transport, retention,
cursor semantics, or source scope must be recorded here before expansion.

## Evidence ledger

- Authority checked: `docs/PRODUCT_BUILD_SEQUENCE.md` HCFG-4 requirement and
  `docs/PROJECT_STATUS.md` current build position.
- Dependency: PR #33 HCFG-4A intent/spec are proposed and acceptance-pending.
- Changed paths: exactly the six files listed in **Files and ownership**.
- The companion HCFG-4B snapshot proposal owns three additional files under
  `docs/architecture/headless-monitoring-snapshot/`; this combined draft changes
  nine documentation paths in total.
- Validation: six artifact validators, Prettier, `docs:direction:check`
  (31/31 tests), `public:check` (872 project files), legacy inventory
  (2,122 occurrences across 295 files), relative links (zero missing across
  eight Markdown files), and `git diff --check`: PASS on 2026-09-25.
- Review: fresh independent GPT Terra xhigh read-only review found bootstrap,
  evidence-binding, pagination, and limit gaps; Sol corrected them and the
  reviewer returned PASS with no P1/P2/P3 finding on 2026-09-25.
- Owner acceptance, source implementation, merge, runtime, deploy, release,
  and production evidence: pending.
