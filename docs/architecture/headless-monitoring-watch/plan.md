<!-- intent-driven-delivery:plan:v1 -->

# Plan: HCFG-4C versioned monitoring evidence watch

Status: proposed
Authority: [HCFG-4C monitoring watch intent](intent.md)
Owner: LNSAT project owner
Last updated: 2026-09-27

## Scope and protected lanes

The later implementation packet may add a read-only server journal/watch and
focused tests that satisfy [spec.md](spec.md). This plan currently defines
contract and acceptance work only.

Protected lanes:

- [PR #33](https://github.com/hypler-dev/LNSAT/pull/33) HCFG-4A exact reads
  merged at `bd9016a`. The [HCFG-4B snapshot](../headless-monitoring-snapshot/intent.md)
  still needs owner acceptance and implementation before a valid first or
  post-gap cursor exists.
- The owner must choose installation-wide `ReadEvidence` or a narrower
  project/resource scope before source work begins.
- The complete selected evidence-to-subject family map and served exact
  evidence readback must be accepted before source work. Missing attempt and
  nonce routes, plus unproved historical state/receipt readback, remain gates.
- No new approval, control, configuration mutation, bootstrap, revocation,
  emergency, or action-authority path may be added.
- No Docker, runtime observation, installer, release, deployment, production,
  or supported-platform action is authorized.
- No real evidence, credentials, secrets, or production payloads enter tests,
  fixtures, logs, or cursors.

## Files and ownership

The core watch proposal owns these six documentation paths:

- `docs/architecture/headless-monitoring-watch/intent.md`
- `docs/architecture/headless-monitoring-watch/spec.md`
- `docs/architecture/headless-monitoring-watch/plan.md`
- `docs/DOCS_INDEX.md`
- `docs/architecture/README.md`
- `docs/reference/legacy-identifier-inventory.json`: deterministic source-tree
  inventory regeneration required by the new proposal documents.

The PR #33 merge reconciliation also updates `docs/PROJECT_STATUS.md` and
`docs/architecture/headless-monitoring/plan.md` to record current source truth.
The HCFG-4A contract and Product Build Sequence remain owned by their existing
records. A later implementation packet must name its exact source, test, and
documentation files before editing them. One writer owns overlapping files.

## Source inventory to verify before implementation

Candidate append paths are `crates/lnsat-store/src/lib.rs` for approval
request/decision and audit, `phase7_persistence.rs` for authorization attempts,
`phase7_nonce.rs` for nonces and nonce state, `phase7_consumption.rs` for
execution authorizations, capability consumptions, operations, and their state,
and `phase7_git_adapter.rs` for operation attempts, receipts, reconciliations,
and attempt/operation state. The shared Phase 7 state-event table has four
target kinds. This file list is a source-location inventory, not proof that
every call site, immutable ID, exact read path, or transaction boundary is
covered. The implementation packet must resolve the accepted family mapping
and test each multi-record commit before a migration or served route is added.

## Sequence

1. Verify PR #33's separately authorized source merge at `bd9016a` and exact-read scope.
   Accept and implement HCFG-4B snapshot/cutover before served watch.
2. Obtain owner acceptance of this watch intent/spec, including transport,
   retention, cursor, event-family mapping, and authorization decisions that
   are currently open.
3. First close the exact read-only served evidence projections and non-mutating
   expiry readback needed by the complete consequential-action family set.
   Create a separate source implementation packet with exact module ownership,
   accepted evidence-family/source-ID/subject-ID/read-path table,
   current-unresolved snapshot projection and trusted cutover time, transport
   framing, migration evidence, and a store-activation generation that
   invalidates served cursors on restart or store reopen. Close missing served
   exact reads before claiming complete watch coverage.
4. Implement journal append and publication atomically, then add the bounded
   read-only long-poll page and focused store/served tests. Cover every named
   multi-record transaction in source-append order and copied/restored store
   denial. Do not use runtime or Docker proof.
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
exact owned-path diff, and explicit proposed/pending markers. No source,
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

The 2026-09-27 PR #33 merge reconciliation adds the two currentness files named
above and updates HCFG-4B/C references from pending merge to merged source.
It changes no snapshot/watch acceptance or source authority. Any later change
to the open authorization decision, transport, retention, cursor semantics, or
source scope must be recorded here before expansion.

## Evidence ledger

- Authority checked: `docs/PRODUCT_BUILD_SEQUENCE.md` HCFG-4 requirement and
  `docs/PROJECT_STATUS.md` current build position.
- Dependency: PR #33 HCFG-4A exact-read source merged at `bd9016a`; this
  does not accept snapshot or watch enumeration.
- Initial proposal paths: the six files listed in **Files and ownership**.
- The companion HCFG-4B snapshot proposal owns three additional files under
  `docs/architecture/headless-monitoring-snapshot/`; the initial combined
  design changed nine documentation paths before the later two-file source
  status reconciliation.
- This 2026-09-26 amendment changes those six intent/spec/plan files plus the
  deterministic `docs/reference/legacy-identifier-inventory.json` checksum.
- Validation: six artifact validators, Prettier, `docs:direction:check`
  (31/31 tests), `public:check` (872 project files), legacy inventory
  (2,122 occurrences across 295 files), relative links (zero missing across
  eight Markdown files), and `git diff --check`: PASS on 2026-09-25.
- Review: fresh independent GPT Terra xhigh read-only review found bootstrap,
  evidence-binding, pagination, and limit gaps; Sol corrected them and the
  reviewer returned PASS with no P1/P2/P3 finding on 2026-09-25.
- Owner acceptance, source implementation, merge, runtime, deploy, release,
  and production evidence: pending.
- 2026-09-26: PR #60 was closed as duplicate HCFG-4B design authority; this
  PR remains the single proposed HCFG-4B snapshot and HCFG-4C watch contract.
  The amendment names the candidate source-family inventory, source-append
  order, signed sequence exhaustion, and a served cursor reset on store
  activation change. Exact family IDs/read paths and owner scope acceptance
  remain open. No source implementation is authorized.
- 2026-09-26: six artifact validators, Prettier, `docs:direction:check`
  (31/31), `public:check` (871 files), legacy inventory (2,122/295), and
  `git diff --check` passed. Fresh independent GPT reviewer reported PASS with
  no P1/P2/P3 on the six-file contract amendment. The first broad
  `npm run check` reached workspace typecheck, then failed because borrowed
  `node_modules` lacked `fastify`. After offline `npm ci`, workspace typecheck
  and all workspace tests passed. Rust tests initially failed on sandbox
  `ListenFailed`; one focused test and the complete `npm run rust:check`
  passed with local loopback access. The first check's earlier source gates
  through Phase 11 readiness passed; no single subsequent `npm run check`
  exit-zero result is claimed.
- 2026-09-26: read-only source inventory found immutable `ste_` state-event
  IDs differ from their target subject IDs; `cpc_`, `rcp_`, and `rec_` records
  also target other subjects. Attempt and nonce exact served reads are absent,
  and existing aggregate reads require proof of historical event coverage.
  Approval expiry is time-derived, not a journal append. The earlier PR #52
  owner-acceptance request was withdrawn. No source work opened.
- 2026-09-26: fresh independent review identified time-only nonce and
  execution-authorization expiry before materialization. The companion
  snapshot now requires a per-family non-mutating exact expiry read and
  boundary refresh; no served nonce read exists and the existing authorization
  read may mutate. This design remains proposed.
- 2026-09-26: six artifact validators, Prettier, `docs:direction:check`
  (31/31), `public:check` (871 files), legacy inventory (2,122 occurrences in
  295 files), and `git diff --check` passed on the revised seven-file diff.
  Fresh independent GPT read-only reviewer returned PASS, no remaining
  P1/P2/P3 after the expiry/readback corrections. PR #52's prior exact heads
  `288745c` and `c3c31e9` passed CI runs `36296555867` and `36298277937`.
  Owner acceptance, source implementation, merge, runtime, and release remain
  separately closed.
- 2026-09-27: PR #33 exact-read source merged at `bd9016a`; PR #52 rebases on
  that public-main truth without granting enumeration, source implementation,
  runtime, or release. The previous exact-head CI claim is historical and
  must be replaced by CI on the rebased head before merge review.
- 2026-09-27: read-only source inventory confirms served exact HCFG-4A reads
  for `apr_`, `apd_`, and `aud_`. Authorization attempts and nonces have no
  served exact route; the nonce and execution-authorization reads may
  materialize expiry. Existing operation/attempt responses expose latest
  aggregate state, not every historical `ste_` event. `cpc_`, `rcp_`, and
  `rec_` have no complete standalone served projection. A later accepted
  exact-read packet must close those gaps without narrowing the final HCFG-4
  family claim before journal/snapshot/watch source can assert complete V1
  monitoring.
