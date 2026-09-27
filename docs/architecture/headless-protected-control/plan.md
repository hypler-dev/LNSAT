<!-- intent-driven-delivery:plan:v1 -->

# Plan: HCFG-5A protected online configuration transitions

Status: proposed
Authority: [HCFG-5A intent](intent.md) under the [accepted HCFG-5 requirement](../../PRODUCT_BUILD_SEQUENCE.md#headless-source-packet-order)
Owner: LNSAT maintainers
Last updated: 2026-09-27

## Scope and protected lanes

This plan prepares the online apply contract for a previously bootstrapped installation. It does not authorize activation source implementation, a migration, route, OS permission change, Docker proof, merge, publication, or release. The [specification](spec.md) remains proposed and cannot receive activation acceptance until separate exact bootstrap, distinct-person approver, and external store-anchor decisions are accepted. A pure non-activating comparator may be proposed as a later bounded source slice. Bootstrap, emergency stop/resume, offline recovery, HCFG-6 enforcement, and selected-target runtime proof remain independent required V1 work.

## Files and ownership

Design files: `docs/architecture/headless-protected-control/{intent,spec,plan}.md`, plus the documentation index/catalog links. The [Product Build Sequence](../../PRODUCT_BUILD_SEQUENCE.md) remains the canonical V1 requirement; this packet does not duplicate its implementation status. Later source ownership must be assigned by bounded packet: core declaration/comparison; protected SQLite generations and audit; Gateway mutation and redacted readback; CLI client; OS resource verifier. One writer owns overlapping files at a time.

## Sequence

1. Resolve three pending owner security decisions in separate exact records: local bootstrap trust root and one-time first-generation binding; configuration-approver enrollment and distinct-person proof; external store-anchor creation, bind/update ordering, clone/restore refusal, and loss recovery. Each record must include denial and interruption acceptance tests. The current generic approval permission is insufficient by itself. Only then seek acceptance of active apply.
2. Reconcile HCFG-4 authenticated evidence readback before using watch or status as apply outcome proof. A missing or disconnected event never settles a mutation outcome; exact durable readback does.
3. After a separately accepted pure-comparator slice, implement `lnsat.headless_config.comparison.v1` with canonical snapshot/summary digests and the exact partial order in the specification. It has no persistence or activation. Test every widening and identity-substitution edge.
4. Specify and review the new store schema/activation generation, owner/installation binding, immutable transition/audit linkage, idempotency, compare-and-swap, stop/revocation precedence, and copied-store behavior before any migration lands. Initialize existing stores with no active generation.
5. Implement Gateway and CLI in one protected vertical packet only after authentication, decision, and schema designs are accepted. Server recomputes all candidate and policy facts. All writes and audit evidence commit atomically. Later UI uses the same API.
6. Prove platform grant/use resource identity and OS enforcement in HCFG-6 before enabling activation on a selected target. Then run Phase 13 negative, race, interruption, and recovery gates. Runtime proof, packages, and release remain later gates.

## Validators

Design-only: run `./node_modules/.bin/prettier --check` on the exact touched files; `npm run docs:direction:check`; `npm run public:check`; `npm run legacy:inventory:check` after writing the deterministic inventory; and `git diff --check` on the staged exact file set. Source slices: focused pinned Rust tests for their exact modules, `npm run check`, `npm run public:check`, source inventory, and installed local Semgrep/Gitleaks; OSV-Scanner when dependency manifests are touched. HCFG-6 and Phase 13 require platform and race evidence separately from source tests. Report commands, counts, and exact failures in the PR; green CI does not authorize merge.

## Independent review

A fresh read-only reviewer receives the exact proposed diff, accepted V1 requirement, HCFG-3 source contract, Gateway/owner-recovery evidence, and Phase 11 status boundary. Review for P1/P2/P3 authorization and lifecycle gaps, especially self-approval, rollback regrant, DB copy, atomic audit, identity TOCTOU, and false in-flight outcome claims. The producer resolves findings and reruns validators. Source changes later require a new reviewer; this design review does not approve future code.

## Rollback and recovery

The design proposal can be withdrawn without product effect. Later source rollback cannot erase or reactivate authority state. An interrupted apply must be determined from exact durable generation/audit readback under authentication. Any uncertain dispatched consequence remains unknown pending reconciliation. A failed authority-store or OS-enforcement check denies new activation, and operational recovery uses separately approved local procedures.

## Deviations

No deviation approved. If implementation reveals that external OS control cannot be prepared before active-pointer commit or rechecked at use, stop activation work and revise the contract for owner review. If distinct-person proof cannot be established, retain online widening denial rather than weakening to a second session.

## Evidence ledger

- 2026-09-27: Public `main` `f669181a1eaf574b1891a5c3fcc838870097e176`; design branch created from that commit in an isolated public checkout. HCFG-3 has no active generation or apply route; existing Gateway sessions, approval, owner recovery, and immediate-transaction audit are foundations only.
- Validation: local intent/spec/plan artifact checks passed 3/3; Prettier passed on six touched files; `docs:direction:check` passed 31/31 tests; `public:check` passed on 868 files; legacy inventory passed with 2,122 occurrences in 295 files; staged `git diff --check` passed. Source and Rust tests were not needed for this docs-only proposal.
- Independent review: first pass found copied-store trust, comparison, audit, acceptance, and authority-wording gaps. Corrections passed a fresh read-only re-review with no remaining P1/P2/P3. This is design review only, not future source approval.
- Source implementation, merge, Docker, production, package, and release: none.
