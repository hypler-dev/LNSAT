<!-- intent-driven-delivery:plan:v1 -->

# Plan: HCFG-6 observed resource and runtime enforcement

Status: accepted
Authority: [HCFG-6 intent](intent.md); current acceptance/implementation belongs to [Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design)
Owner: LNSAT maintainers
Accepted by: human owner on 2026-10-01 at exact PR #72 head `0dbe0a2874428721b1a4ba6bad1708ec5fdbb572`; see Project Status
Last updated: 2026-10-01

## Scope and protected lanes

This packet defines the complete resource-to-runtime verification boundary for the first nonempty Docker Engine Git workflow. This acceptance reconciliation is documentation only. Bounded source work is accepted after the mandatory detailed source freeze and independent review; this packet implements no behavior. No host permission change, Docker observation/process, selected target, migration, initialization, activation, public contract rollout, merge, build/pull/publish, release or production is opened. The accepted bootstrap and Phase 11 operator packet retain their own gates.

## Files and ownership

The primary controller owns architecture, trust boundaries and these three artifacts. Exact related documentation scope is `docs/PROJECT_STATUS.md`, `docs/DOCS_INDEX.md`, the three `docs/architecture/headless-local-bootstrap/{intent,spec,plan}.md` artifacts and inventory digest refresh. Producer does not independently approve its own proposal. Future source requires separately assigned exact ownership for contracts, host verifier, private Docker observer, immutable adapter probe, store/lease synchronization and bootstrap integration. No canonical unrelated files or old PHR attestations are owned.

## Sequence

1. Inspect accepted V1/bootstrap/Phase 11 boundaries and current profile, target, launch and identity code. Verify official Docker/kernel-facing assumptions without opening a Docker endpoint. Separate configured settings from actual observations.
2. Produce the proposed complete contract: explicit owner binding, nonempty verifier coverage, the proposed bootstrap metadata-only observation exception, resource-free probe preparation, private authenticated startup barrier, grant/use revocation, uncertainty and cleanup. Obtain fresh independent read-only review and resolve P1/P2 before presenting an owner decision.
3. Human acceptance is complete: the owner replied `accepted` on 2026-10-01 for exact PR #72 head `0dbe0a2874428721b1a4ba6bad1708ec5fdbb572`. Project Status records the capability/trust/metadata amendment/probe/staging decision; supporting bootstrap artifacts reconcile the exception. Acceptance comes from that human reply, not source checks, old bootstrap acceptance or green CI.
4. Freeze a complete source specification before changing runtime behavior: exact profile 3/protocol 2 frames and domains, daemon API compatibility, bounded native/kernel observation method, UID/mount/cgroup mapping, peer/executable/image origin proof, preparation journal, cleanup selection and store/admission linearization. Separate persistent resource identity from live mount/namespace tokens and separately freeze finite owner-preparation limits versus the uninterrupted startup/action budget. Resolve the pinned safe-library gaps for genuine mount/cgroup association and effective ACL reads; do not replace them with mode bits, synthetic fields or caller proof. Reviewer must find the intended supported positive case actually feasible under non-root LNSAT. A placeholder verifier, claimed boolean or fixture-only acceptance cannot satisfy the freeze.
5. Implement actual owner-binding/metadata verifiers and the immutable native startup probe with focused Rust tests. No authority serialization or injection seam. Integrate the private trusted-daemon observation and exact live channel only after source specification approval; hermetic fixtures test denials without pretending to prove Docker enforcement.
6. After the reviewed source freeze and integration gates, complete atomic bootstrap with that bounded observation and resource-free zero-authority probe preparation, one immediate transaction, durable linked audit, inert restore and orphan quarantine. Complete protected Gateway generation/epoch/stop/revocation admission and one-use startup release before enabling any target. No empty-only initializer or diagnostic-to-active conversion is accepted as the end state.
7. Prove the complete same-attempt chain through actual selected-target runtime evidence under a new exact operator authorization. Keep old Phase 11 proof source/manifest separate; if that proof runs, it supplies only its locked claim, not the stronger new profile's proof. No current Docker authority is implied.
8. Close HCFG-6/headless conformance against every requirement, then continue monitoring/protected control/reliability and selected-target package lifecycle in the accepted V1 sequence. Phase 13/14 and publication remain separate; no narrower source milestone closes V1.

## Validators

Design packet: artifact-shape validators for intent/spec/plan, exact-doc Prettier, `git diff --check`, `npm run docs:direction:check`, `npm run public:check`, inventory write/check after staging, and Phase 11 readiness 43-case suite/check to prove the locked packet remains intact. Documentation-only validation does not require repeating unchanged Rust/workspace builds from green exact59396f5; hosted source CI remains a separate exact-head result. Source packets later run focused pinned Rust tests, complete `npm run check`, public/inventory/format, installed named Semgrep/Gitleaks and dependency OSV when applicable. Missing offline vulnerability data remains unverified.

## Independent review

Fresh native OpenAI Terra xhigh read-only reviewer receives the exact proposed files/diff, accepted V1/bootstrap contract, current source59396f5 and named official research. Review feasibility and P1/P2/P3 authority gaps: configured-vs-observed state, inode/host mapping, malicious probe/caller injection, extra mounts/hardlinks, credentials, preparation vs target process, revocation linearization, trusted daemon, version coexistence, interruption and cleanup. Source/actual runtime reviews are later gates; design PASS never grants activation, merge or release.

## Rollback and recovery

Withdraw the docs without runtime effect. Future precommit preparation failures leave the authority store empty and either prove cleanup or quarantine. After original attempt claim/create, interruptions retain consumption and evidence; cleanup cannot trigger redispatch or declare non-execution. Post-release outcomes retain existing receipt/unknown/reconciliation semantics. Never clear stop/revocation or rewrite older generation/binding to pass a failed probe. Restored prior authority remains inert.

## Deviations

No approved scope deviation. The first accepted engineering Linux same-host Docker Engine 29.8.2/API 1.56 rootful backend is not a native-host fallback or package support selection. The new startup barrier is deliberately versioned separately from the locked Phase 11 proof; old argv/inspect/fake fixtures are not elevated to OS proof.

## Evidence ledger

- 2026-10-01: Public main fetched at `e09a6b02634b04a46f861ed8b092acc2c2e50fe8`. Isolated design base is draft PR #71 head `59396f5927a7e5f657d9a4983748ac084701181c`; exact source CI run `36957301014` completed successfully. Its source/build/store review is only a prerequisite.
- 2026-10-01: The human owner accepted exact reviewed PR #72 head `0dbe0a2874428721b1a4ba6bad1708ec5fdbb572` for bounded source implementation, including the bootstrap metadata-observation amendment. Exact-head CI run `36963652146` completed successfully. Project Status remains the acceptance authority; detailed source freeze and independent review remain outstanding.
- Accepted design and research do not prove any host/kernel/container/resource control. No Docker/runtime/merge/release/production action is taken.
