<!-- intent-driven-delivery:plan:v1 -->

# Plan: HCFG-4A exact approval and audit evidence readback

Status: accepted
Authority: [HCFG-4A intent](intent.md)
Owner: LNSAT maintainers
Last updated: 2026-09-26

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
- `README.md`: public source-maturity summary after implementation evidence.
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
   overlapping mutation dispatch. Enforce the specified route-local header
   admission and existing optional-exact `Origin` read policy without changing
   older routes; preserve route order and generic denial.
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
- auth, role, session, optional-exact `Origin`, Host, version, route-local
  header admission, and `GET`/`HEAD` parity;
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

The repository's legacy inventory checksum was refreshed because changed
tracked source and documentation alter its source-tree digest. Its 2,122
identifier occurrences across 295 files did not change. This generated
inventory file is the only additional path; the implementation remains limited
to the accepted intent and specification.

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
- 2026-09-24: reconciled the proposal with public main after the browser
  session contract changed from cookies to a required bearer/proof header pair.
  Intent and specification remain proposed; owner acceptance is pending.
- 2026-09-24: intent/spec/plan artifact validation, full Prettier check,
  product-direction tests (31/31), public-readiness check (868 files), legacy
  inventory check (2,122 occurrences across 295 files), and Git diff checks
  passed. Fresh read-only `gpt_reviewer` (Terra xhigh, OpenAI) reported no
  actionable P1/P2/P3 finding on the proposal diff against public main.
- 2026-09-26: fresh read-only security/correctness review found two P2 design
  gaps in header admission and `Origin` semantics. The proposed intent and spec
  now preserve the existing optional-exact read-origin policy, require a
  route-local authority/control-header check, and enumerate negative tests.
  The same reviewer re-reviewed the corrected diff and reported no remaining
  P1/P2/P3. Owner acceptance remains pending; no source implementation opened.
- 2026-09-26: LNSAT owner accepted the revised PR #33 intent/spec at `241aeb2`
  in this task, opening only the three exact authenticated `GET|HEAD` source
  reads. Docker, merge, release, deployment, and production remain closed.
- 2026-09-26: source implementation added exact-ID store reads with persisted
  project-scope recovery and full rederivation, three served `GET|HEAD` route
  families, closed response serializers, and focused negative/role tests.
- 2026-09-26: pinned focused store approval tests passed 16/16 and audit tests
  passed 19/19. Served HCFG-4A tests passed 2/2 with local listener binding.
  Pinned `cargo test --workspace --all-targets --all-features --locked` and
  pinned full-workspace Clippy with `-D warnings` passed.
- 2026-09-26: `npm run source:check` passed with local listener binding; it
  includes `npm run check`, `npm run public:check`, docs direction, source-only
  Phase 11 readiness, workspace typechecking/tests, Rust checks, release
  metadata, and build. The initial sandboxed run failed served tests with
  `ListenFailed`; the complete listener-capable rerun passed.
- 2026-09-26: intent/spec/plan artifact validators, focused Prettier,
  `npm run docs:direction:check` (31 tests), `npm run public:check` (868 files),
  `npm run legacy:inventory:check` (2,122 occurrences across 295 files), and
  `git diff --check` passed.
- 2026-09-26: installed Semgrep scanned the two changed Rust files with two
  named local rules. Its one finding is an existing test-only SQL statement
  with an `INSERT`/`INSERT OR REPLACE` literal selector; no caller-controlled
  SQL enters the statement. Gitleaks scanned the worktree with full redaction
  and generated Rust output excluded. Its 16 candidates are existing test
  fixtures, contract field names, or generated JavaScript; none lies in a
  changed source hunk. OSV was not run because manifests and lockfiles did not
  change. Scanner reports are outside the repository.
- 2026-09-26: a fresh read-only Terra xhigh/OpenAI reviewer found one P2:
  the shared product-surface selector returned `400` before the route-local
  generic `403`. The source and served `GET|HEAD` assertions were corrected;
  the reviewer re-reviewed the correction and reported no remaining P1/P2/P3.
- Implementation PR #33 remains draft. Exact-head CI, merge, runtime proof,
  build candidate, and release remain separately pending.
