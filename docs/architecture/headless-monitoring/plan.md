<!-- intent-driven-delivery:plan:v1 -->

# Plan: HCFG-4A exact approval and audit evidence readback

Status: proposed
Authority: [HCFG-4A intent](intent.md)
Owner: LNSAT maintainers
Last updated: 2026-09-10

## Scope and protected lanes

Implement only the three exact `GET|HEAD` contracts in the linked
specification. Reuse canonical Rust store rederivation and `lnsatd` browser
authentication. Keep lists, CLI, watch, cursor, retention, schema, mutation,
runtime, build, release, deploy, and production lanes closed.

Owner acceptance of the intent opens source implementation only. Merge remains
a later exact-head owner decision. Runtime proof, candidate build, signing,
tagging, release, and publication require their separate gates.

## Files and ownership

One source producer owns these overlapping paths:

- `crates/lnsat-store/src/lib.rs`: bounded exact-ID lookup seams and focused
  store tests.
- `crates/lnsatd/src/lib.rs`: exact route parsing, authorization, response
  composition, usage text, and served tests.
- `docs/architecture/headless-monitoring/intent.md`: acceptance-state change
  only after owner acceptance.
- `docs/architecture/headless-monitoring/spec.md`: corrections discovered
  during implementation without scope expansion.
- `docs/architecture/headless-monitoring/plan.md`: evidence ledger.
- `docs/PROJECT_STATUS.md`: implemented source status only after evidence.
- `docs/DOCS_INDEX.md` and `docs/architecture/README.md`: canonical links and
  maturity classification.

No other source file is in scope without a recorded deviation. Dependency
manifests, lockfiles, migrations, TypeScript API/console code, product-surface
fixtures, and frozen legacy fixtures are excluded.

## Sequence

1. Obtain explicit owner acceptance of `intent.md` and `spec.md`.
2. Mark acceptance without claiming implementation.
3. Add exact identifier validation and by-ID store read seams that recover the
   stored project scope and reuse existing project-scoped rederivation.
4. Add the three route families after API-wide version/Host gates and before
   overlapping mutation dispatch, preserving route order and generic denial.
5. Add dedicated read response serializers and bodyless `HEAD` handling.
6. Add focused store, parser, authorization, response, oracle, redaction, and
   regression tests.
7. Run focused and repository-wide validation plus installed local scanners.
8. Update status/evidence only from exact results.
9. Obtain fresh independent review, resolve findings, rerun affected validators,
   commit with DCO signoff, push, and open a reviewable PR.
10. Stop before merge pending exact-head owner authorization.

## Validators

Expected checks after source implementation:

```sh
cargo test -p lnsat-store approval
cargo test -p lnsat-store audit
cargo test -p lnsatd approval_read
cargo test -p lnsatd audit_read
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-targets --all-features
npm run source:check
npm run public:check
git diff --check
```

Use the pinned Rust toolchain through repository-native commands. When installed,
run Semgrep against changed Rust roots with an explicit local ruleset and
metrics/version checks disabled, and Gitleaks with full redaction and reports
outside the repository. Run OSV only if dependency manifests or lockfiles enter
scope. Scanner output is candidate evidence until source-triaged.

## Independent review

A fresh read-only reviewer who did not produce the implementation receives the
accepted intent/spec, exact diff, focused test evidence, full gate results, and
scanner summaries. Review must assess:

- route ambiguity and collision with approval mutation paths;
- auth, role, session, origin, Host, version, and `GET`/`HEAD` parity;
- exact-ID validation, non-enumeration, project-scope recovery, and complete
  rederivation;
- response closure, metadata exposure, redaction, generic denial, side-effect
  honesty, and false authority flags;
- unchanged operation, approval mutation, product-surface, store schema, and
  Phase 9 behavior.

The primary agent resolves every actionable P1/P2/P3 finding and owns final
security, compatibility, integration, and merge-readiness judgment.

## Rollback and recovery

Before merge, drop or revise the isolated branch. After merge, revert the
single HCFG-4A commit or PR. No migration, persistent format, dependency,
runtime state, or external state requires cleanup. Session activity observations
created by source tests remain inside disposable test databases.

Stop implementation on ambiguous scope, need for project-scoped roles, route
collision, schema migration, unbounded query, secret reflection, new mutation,
unexpected dependency change, failed security invariant, or owner rejection.

## Deviations

None. Proposed plan only.

## Evidence ledger

- 2026-09-10: inventory confirmed canonical operation/attempt reads exist;
  approval/audit served reads, list/watch, global event order, cursor, and
  backpressure do not.
- 2026-09-10: store inventory confirmed exact project-scoped rederiving reads
  exist for approval requests, approval decisions, and audit events.
- 2026-09-10: current checkout `codex/hcfg-monitoring-evidence` at
  `25a8618a7febc7e84bc63db97cc33279d3ef5a02`; clean before proposal edits.
- 2026-09-10: intent/spec/plan artifact validation, Prettier, relative-link
  validation, `git diff --check`, public-readiness rules, and all 28 product
  direction tests passed. Public readiness inspected 856 project files and the
  direction check inspected 32 critical documents.
- 2026-09-10: worktree Gitleaks scan with full redaction inspected 14.65 MB and
  reported zero findings. Semgrep was skipped because this proposal changes no
  source; OSV was skipped because it changes no dependency manifest or lockfile.
- 2026-09-10: fresh independent `gpt_reviewer` (Terra xhigh, OpenAI) manually
  reviewed all five proposal paths and reported PASS with no P1/P2/P3 finding.
- Source implementation, source validation/scanning/review, implementation PR,
  merge, runtime, build, and release evidence: pending.
