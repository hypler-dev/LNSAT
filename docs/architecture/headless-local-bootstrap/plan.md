<!-- intent-driven-delivery:plan:v1 -->

# Plan: HCFG-5B atomic local bootstrap

Status: proposed
Authority: [HCFG-5B intent](intent.md) under the [accepted HCFG-5 requirement](../../PRODUCT_BUILD_SEQUENCE.md#headless-source-packet-order)
Owner: LNSAT maintainers
Last updated: 2026-09-27

## Scope and protected lanes

Design only: one atomic local owner/installation/first-configuration bootstrap, selected-store admission binding, and inert official restore. This packet opens no source mutation, migration, route, OS permission, Docker operation, merge, production action, package, or release. Human owner acceptance of the [specification](spec.md) is required before implementation. HCFG-5A online apply, fresh owner decision, emergency stop, restored-store recovery activation, HCFG-6 platform enforcement, and Phase 11 runtime proof retain separate gates.

## Files and ownership

This proposal owns `docs/architecture/headless-local-bootstrap/{intent,spec,plan}.md` and index/catalog links. The [Product Build Sequence](../../PRODUCT_BUILD_SEQUENCE.md) remains requirement/sequencing authority; [Project Status](../../PROJECT_STATUS.md) remains implementation/acceptance authority. Later source packets assign one writer per overlapping store/migration, CLI, Gateway, and platform-verifier module. The canonical checkout's unrelated dirty files remain untouched.

## Sequence

1. Review this design against the accepted V1 host-owner threat model, existing owner-bootstrap transaction, daemon-shared lease, inert restore, HCFG-3 parser, and HCFG-6 proof boundary. Resolve P1/P2 findings before asking for owner acceptance.
2. Reconcile the proposed HCFG-5A online-apply packet with this local bootstrap design **before** either packet receives owner acceptance. Remove its external-anchor prerequisite and limit clone/rollback claims to the accepted host-owner boundary, selected-store binding, inert official restore, and current stop/revocation floor. Obtain fresh independent review of the paired proposals.
3. Obtain human owner acceptance of the exact atomic fresh-store bootstrap, authority-empty eligibility, path/file admission binding, and inert-restore posture. Acceptance is separate from merge and source implementation.
4. In a later accepted source packet, freeze selected-platform file identity and exhaustive schema table inventory; refactor owner creation so owner, installation, first generation, active pointer, and audit commit in one immediate transaction. Add local CLI proof and protected stdin without an online bootstrap route.
5. Add startup/use admission binding and selected-platform HCFG-6 checks before enabling any headless authority. Prove every failure and interruption edge with focused Rust tests and fresh independent source review.
6. Implement HCFG-5A online apply so it preserves current installation binding, stop/revocation floor, and authority epoch in one protected transaction. Treat restored-store activation as a separate future recovery contract. Do not interpret HCFG-3 diagnostic output as a grant.

## Validators

Design-only: validate the three artifact shapes, run Prettier on the exact touched files, `npm run docs:direction:check`, `npm run public:check`, deterministic `npm run legacy:inventory:check`, and staged `git diff --check`. A later source packet runs focused pinned Rust tests, `npm run check`, `npm run public:check`, inventory, installed local Semgrep/Gitleaks, and OSV-Scanner if dependency manifests change. HCFG-6 and Phase 13 require selected-target evidence beyond source tests. Green CI never grants merge or release authority.

## Independent review

A fresh read-only reviewer receives the exact staged design diff, accepted V1 requirement, HCFG-3 source contract, owner-bootstrap/lease/restore facts, and Phase 11 status boundary. Review for P1/P2/P3 authority gaps, especially first-bootstrap replay, owner-only legacy migration, fresh-path restore, substitution, atomically linked audit, secret intake, and unsupported OS proof. Resolve findings and rerun validators. Design review does not approve future source.

## Rollback and recovery

The proposal can be withdrawn without product effect. A failed future initialization leaves an empty inert authority store unless the entire transaction committed; exact local readback under the lease resolves unknown response. No partial owner or generation becomes active. Orphaned zero-authority OS preparation requires proved cleanup before retry. Official restored initialized stores remain inert until a separately accepted recovery-activation procedure; authority-empty restored snapshots may be explicitly initialized as new stores. Source rollback cannot silently admit an unverifiable generation or erase stop, revocation, audit, or unknown-consequence evidence.

## Deviations

An earlier draft proposed an external owner-only authority sidecar and a two-medium pending/commit protocol. Independent review found it did not supply an independent trust boundary against the accepted host owner and added interruption states. This revision uses one atomic fresh-store transaction and explicitly limits the path/file binding claim. No sidecar or adversarial host-owner anti-rollback guarantee is part of V1.

## Evidence ledger

- 2026-09-27: Public `main` `f669181a1eaf574b1891a5c3fcc838870097e176`; this proposal is stacked on corrected draft HCFG-5A head `a345fd230397712b882094848cc8967ea9e83793`. Existing owner bootstrap, daemon-shared lease, and inert restore inspected in source and docs. No active configuration exists.
- Initial sidecar draft: artifact shape, docs direction, public check, inventory, and staged diff checks passed. Independent read-only review found one P1 and four P2, so that draft was withdrawn before commit or push.
- Revised atomic design: first read-only review found one P1 (parent HCFG-5A conflict), three P2 (empty restore, OS preparation, audit linkage), and one P3 (index label). Corrections landed in both proposed packets. Fresh paired read-only review passed with no P1/P2/P3 on separate local heads. After rebasing the child, artifact shape passed 6/6 across both packets, Prettier passed on nine exact files, docs direction passed 31/31, public check passed on 871 files, legacy inventory passed at 2,122 occurrences across 295 files, and commit-range `git diff --check` passed. Exact combined-head review and CI remain pending.
- Source implementation, merge, Docker, production, package, and release: none.
