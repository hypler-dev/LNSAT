# Phase 7 Readiness Execution Plan

## Canonical readiness sentence

Canonical readiness states: Phase 7a signed-evidence design = complete; Phase 7b wrapper verification = implemented_verification_only; Phase 7c Ed25519 primitive = implemented_not_wired; Phase 7d schema candidate = proposed_test_only; P7-ADR0 local-v1 trust-model revision = complete; P7-M1 core persistence = complete; P7-N1 nonce/expiry lifecycle = complete; P7-B1 preauthorization hardening = complete; P7-C1 atomic consumption = complete (implemented_not_wired); P7-A1 local authorization = complete (source-only, implemented_not_wired); P7-R1 Git reference adapter = complete (source-only, implemented_not_wired); P7-X1 local-v1 conformance freeze = complete (source-only evidence, no runtime/publication authority); runtime is schema 17/17 with migrations 0016 and 0017 registered; optional signed-evidence packets remain blocked.

## A. Current-truth matrix

| Capability                          | Current                                  | Current evidence                                                                                                                                                                                                                                                                        | Missing                                                                                                        | Approval                                      | Authority                           |
| ----------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------- |
| Phase 6 source exit                 | `complete`                               | Authenticated local identities, sessions, approval requests/decisions, durable SQLite evidence, read-only Gateway/MCP, and source conformance exist.                                                                                                                                    | Supported runtime authority loop.                                                                              | none                                          | no new transition                   |
| Phase 7a signed-evidence design     | `complete`                               | ADR-0004 retains canonical bytes, closed wrapper, verification, and key-lifecycle requirements. ADR-0006 makes this optional for local v1.                                                                                                                                              | Operational public-key lifecycle, signer transport, verification, and signed issuance.                         | future `P7-K1/S1/V1/I1`                       | no execution authority              |
| Phase 7b wrapper verification       | `implemented_verification_only`          | `packages/policy/src/signed-approval-evidence-v1.ts` and shared fixtures validate structure and fail closed.                                                                                                                                                                            | Operational verification and persistence.                                                                      | future `P7-V1`                                | no execution authority              |
| Phase 7c Ed25519 primitive          | `implemented_not_wired`                  | Public-only strict TypeScript/Rust verification primitives and vectors exist.                                                                                                                                                                                                           | Runtime verification wiring.                                                                                   | future `P7-V1`                                | no execution authority              |
| Phase 7d schema candidate           | `proposed_test_only`                     | Candidate v18 SQL and verifier remain under test-only source.                                                                                                                                                                                                                           | Optional v18 signed-evidence implementation.                                                                   | future `P7-K1`                                | no authority transition             |
| P7-ADR0 trust model                 | `complete`                               | ADR-0006 separates local approval, execution authorization, and receipt authentication; signed approval is optional.                                                                                                                                                                    | Remaining core behavior and optional signed lanes.                                                             | none for planning decision                    | no runtime effect                   |
| Authenticated local approval record | `implemented_record_only`                | Phase 6 records exact local-session approval evidence with `execution_authorized: false`; P7-A1 revalidates it with current session state before issuing authority.                                                                                                                     | Served/public runtime composition and consequence.                                                             | completed `P7-A1/R1/X1`                       | approval alone grants no authority  |
| Runtime schema                      | `17/17`; migrations 0016/0017 registered | Atomic v15-to-v17 convergence, exact verifier, approved-source attempt derivation, one-approval authorization cardinality, atomic capability consumption, exact-bound local authorization records, accepted-only canonical receipts, rollback, concurrency, capacity, and backup/restore tests. | Served/public route composition, dispatch, and consequence.                                                     | completed `P7-M1/N1/B1/C1/A1/R1/X1`          | internal source proof; runtime closed |
| Public verification material        | `unset`                                  | `P1_PUBLIC_TRUST_STATUS = "unset"`; no enrollment exists.                                                                                                                                                                                                                               | Owner-controlled enrollment, proof of possession, lifecycle.                                                   | future `P7-K1`; no material requested now     | no transition                       |
| Private-key custody                 | `closed` permanently                     | ADR-0006 forbids private keys in LNSAT, Codex, repository, DB, audit, and backup.                                                                                                                                                                                                       | Nothing; external user-controlled custody is product boundary.                                                 | never opened in LNSAT                         | no transition                       |
| Signer transport/provider calls     | `closed`                                 | Provider-neutral interfaces and test doubles only.                                                                                                                                                                                                                                      | Isolated hybrid invoke/pull/export-import transport.                                                           | future `P7-S1`                                | no transition                       |
| Nonce and expiry runtime            | `implemented_not_wired`                  | Store-only OS-CSPRNG nonce issuance, digest-only v16 persistence, trusted UTC five-minute cap, terminal cancel/expiry, restart, rollback, and race proof.                                                                                                                               | Served/public runtime composition and consequence.                                                             | completed `P7-N1/A1/R1/X1`                    | active nonce only                   |
| Atomic one-time consumption         | `implemented_not_wired`                  | Store redemption plus route-neutral authenticated Gateway composition use constant-time digest comparison, one immediate transaction, exact replay, one-winner concurrency, terminal consumed state, audit, restart, rollback, ambiguity, tamper, and secret-disclosure proof.          | Served/public mutation route and bounded consequence.                                                          | completed `P7-C1/A1/R1/X1`                    | atomic consume only; runtime closed |
| Local execution authorization       | `implemented_not_wired`                  | Route-neutral Gateway/store source constructs one exact-bound digest-only capability record, reauthenticates requester/approver lineage, applies a 60-second session/source cap, supports exact-session cancel/revoke, and returns metadata-only replay.                                  | Served/public mutation route, runtime dispatch, and bounded adapter consequence.                               | completed `P7-A1/R1/X1`                       | internal record only; no served authority |
| Git reference adapter and receipt   | `implemented_not_wired`                  | Store-only adapter performs one fixed-argv commit in marked disposable local repositories, records digest-bound receipts, and reconciles exact Git objects after ambiguity.                                                                                                           | Served/public dispatch, runtime composition, and production targets.                                           | completed `P7-R1/X1`                          | disposable-local proof only         |
| Local-v1 conformance freeze         | `complete`                               | Authenticated full-chain, inert backup/restore replay, TS/Rust parity, negative evidence, bounded-resource, runbook, and selected source-profile checks pass.                                                                                                                          | Required Phases 8-11 and 13, then Phase 14 selected artifact/target proof.                                      | completed `P7-X1`                             | evidence freeze only                |
| Runtime API and deployment          | `closed`                                 | Existing handlers remain bounded/read-only; no deployment authority exists.                                                                                                                                                                                                             | Separate later runtime/release authorization.                                                                  | outside this plan                             | no transition                       |

## B. Packet ladder

Remaining packet scopes describe work only after prerequisites and exact
packet-specific approval. P7-M1, P7-N1, corrective P7-B1, P7-C1, source-only
P7-A1, source-only P7-R1, and source-only evidence-freeze P7-X1 are complete;
every optional signed-evidence authority packet remains blocked.

### 1) P7-RP0

- `objective`: Preserve historical readiness baseline, ledger, fail-closed validator, and proof that schema/signing/execution stayed closed.
- `prerequisites`: `[]`
- `allowed scope`: Historical completed docs/validator evidence only.
- `forbidden scope`: Runtime, migration, key, signer, adapter, deploy, publication, commit, or push authority.
- `required inputs`: Existing repository truth at the original packet boundary.
- `contracts affected`: Phase 7 readiness plan and ledger v1.
- `DB effect`: None.
- `authority transition`: None.
- `positive tests`: Readiness validator baseline passes.
- `negative tests`: Runtime schema/signing/authority drift fails validation.
- `rollback/failure evidence`: Revert planning artifacts without touching runtime.
- `validation commands`: `npm run phase7:readiness:test`; `npm run phase7:readiness:check`.
- `explicit approval`: Historical planning approval only.
- `completion artifact`: Landed P7-RP0 plan/ledger/validator at source revision `4993eb6def5991d41213daa420a6b230af0ebd2b`.
- `next packet`: `P7-ADR0`.
- `status`: `complete`
- `executable`: `true`
- `approval_gate_ids`: `[]`

### 2) P7-ADR0

- `objective`: Freeze local-v1 trust assumptions, optional signed-evidence lane, user-owned key boundary, online one-time authorization, schema split, reference adapter, release tiers, and revised DAG.
- `prerequisites`: `[P7-RP0]`
- `allowed scope`: ADR/docs/ledger/validator changes only.
- `forbidden scope`: Runtime source, migrations 0016/0017/0018, key material intake, signer/provider activation, authority issuance, adapter execution, artifacts, deploy, commit, or push.
- `required inputs`: External architecture review plus verified source truth at `4993eb6def5991d41213daa420a6b230af0ebd2b`.
- `contracts affected`: ADR-0002/0004/0005 supersession, ADR-0006, readiness ledger v2, roadmap, status, threat model, and staged release plan.
- `DB effect`: None; planning packet changed no database source.
- `authority transition`: None.
- `positive tests`: Validator proves revised lanes and every transition outside completed packets remains closed.
- `negative tests`: At the packet boundary, signed lane blocks local X1, private-key custody opens, old P7-P1 remains active, migration 0016 appears early, or a future packet becomes executable.
- `rollback/failure evidence`: Revert docs/validator slice; runtime remains unchanged.
- `validation commands`: `npm run phase7:readiness:test`; `npm run phase7:readiness:check`; `npm run docs:direction:check`; `npm run public:check`.
- `explicit approval`: User request to adjust respective build plans; grants planning changes only.
- `completion artifact`: ADR-0006 plus revised plan/ledger/validator and aligned roadmap/status/security/release docs.
- `next packet`: `P7-M1` after separate explicit implementation approval.
- `status`: `complete`
- `executable`: `true`
- `approval_gate_ids`: `[]`

### 3) P7-M1

- `objective`: Implement minimal migration 0016 persistence required by local authority loop, excluding keys and signed approval evidence.
- `prerequisites`: `[P7-ADR0]`
- `allowed scope`: Authorization attempts, server nonce state, authorization records, capability-digest redemption/consumption, operation/attempt/receipt/reconciliation state, audit bindings, migration/rollback, backup/restore compatibility, and focused APIs/tests.
- `forbidden scope`: Public/private key tables, signed approval evidence, signer transport, provider calls, adapter dispatch, PostgreSQL/HA/fleet, deployment, or publication.
- `required inputs`: Exact v16 physical schema, migration plan from v15, retention/resource bounds, fail-closed audit behavior, rollback/restore evidence, and packet-specific approval.
- `contracts affected`: SQLite schema 16, store APIs, audit/operation/authorization persistence contracts.
- `DB effect`: One registered atomic v15-to-v16 migration limited to inert core local authority state; no non-disposable database was migrated.
- `authority transition`: None by persistence alone.
- `positive tests`: Fresh create/upgrade/reopen/backup/restore, exact reads, idempotency, required-audit atomicity, crash and competing-writer proof.
- `negative tests`: Partial migration, future schema, corrupt row, scope drift, audit failure, capacity exhaustion, rollback failure, or signed-lane field leakage.
- `rollback/failure evidence`: Transaction rollback and inert verified restore; no partially authoritative database.
- `validation commands`: Focused Rust store tests; `npm run audit:migrations:check`; `npm run phase7d:truth:check`; `npm run check`.
- `explicit approval`: Gate `P7_M1_CORE_PERSISTENCE` granted for this bounded source-only packet and now complete.
- `completion artifact`: Registered `0016_phase7_core_persistence`, exact v16 schema verifier, inert authorization-attempt API, and migration/recovery/concurrency/capacity/backup proof with no authority issuance.
- `next packet`: `P7-N1`, now complete under separate `P7_N1_NONCE_EXPIRY`; optional signed lane may begin at `P7-K1` only after separate approval.
- `status`: `complete`
- `executable`: `true`
- `approval_gate_ids`: `[P7_M1_CORE_PERSISTENCE]`

### 4) P7-N1

- `objective`: Implement server-owned nonce and expiry lifecycle for local authorization.
- `prerequisites`: `[P7-M1]`
- `allowed scope`: CSPRNG generation, uniqueness, exact scope binding, issue/expiry/cancel state, trusted time, restart safety, and audit evidence.
- `forbidden scope`: Caller-selected nonce, signing, capability redemption, execution authorization, adapter dispatch, or runtime deployment.
- `required inputs`: Completed M1 evidence, clock/expiry contract, entropy source, cancellation semantics, and packet approval.
- `contracts affected`: Nonce lifecycle and audit contracts.
- `DB effect`: Use approved v16 tables only; no new schema expansion.
- `authority transition`: `active_unexpired_nonce` only after complete persisted proof; never execution authority.
- `positive tests`: Unique issuance, exact binding, expiry/cancel, restart, clock boundary, and deterministic reads.
- `negative tests`: Reuse, caller choice, stale/future time, scope substitution, missing audit, entropy failure, or persistence failure.
- `rollback/failure evidence`: Failed issuance creates no usable nonce; cancellation and expiry remain terminal.
- `validation commands`: Focused nonce/store tests; `npm run phase7:readiness:check`; `npm run check`.
- `explicit approval`: Gate `P7_N1_NONCE_EXPIRY` granted for server-only OS CSPRNG, 32-byte nonces, digest-only v16 persistence, trusted UTC, five-minute approval-capped expiry, and terminal cancel/expiry.
- `completion artifact`: Store-only nonce issue/read/cancel implementation with raw-once secret handling, immutable audit/state evidence, restart/backup, rollback, clock, tamper, and competing-writer proof.
- `next packet`: Corrective `P7-B1`, `P7-C1`, source-only `P7-A1`, `P7-R1`, and evidence-freeze `P7-X1` later completed under separate gates.
- `status`: `complete`
- `executable`: `true`
- `approval_gate_ids`: `[P7_N1_NONCE_EXPIRY]`

### 5) P7-B1

- `objective`: Correct preauthorization binding, cardinality, audit chronology, canonical-receipt semantics, packet provenance, store-test modularity, and durable review evidence before any capability consumption or authorization issuance.
- `prerequisites`: `[P7-M1, P7-N1]`
- `allowed scope`: Packet-embedded canonical `ExecutionRequestV1`; store-side rederivation from persisted approved bytes; server-owned attempt time, IDs, and idempotency; one approval decision to at most one execution authorization; accepted-only canonical receipts; real-Git packet provenance; test-only candidate extraction; review-evidence validation; migration 0017 and focused tests/docs.
- `forbidden scope`: Capability consumption, execution-authorization issuance, keys, signer/provider calls, optional signed-evidence activation, adapters, dispatch, receipt API, Gateway/API activation, deployment, publication, or main-branch merge authority.
- `required inputs`: Post-merge review of `052684548502e8f48ab8fcd20165dbe974afa682`, completed M1/N1 evidence, exact approved packet bytes, trusted host clock, existing v16 core tables, and packet-specific correction approval.
- `contracts affected`: `ExecutionProposalV1`, inert `ExecutionRequestV1`, authorization-attempt persistence, schema verification, readiness ledger v3 packet provenance, and security-review evidence.
- `DB effect`: Registered atomic migration 0017 adds one-approval authorization uniqueness, requires authorization approval/binding fields to equal the authoritative attempt and nonce chain, and rebuilds unopened canonical receipt storage as accepted-only. Automatic upgrade fails closed when any v16 Phase 7 record exists, preserving legacy evidence rather than reinterpreting or discarding it. A valid populated v16 database is classified as non-migration-eligible `legacy_phase7_evidence`, never `migration_pending`; semantic drift instead classifies as migration drift with quarantine recommended.
- `authority transition`: None. Attempt result stays `persistence_prepared`; `execution_authorized` stays false; all C1/A1/R1 authority families remain closed.
- `positive tests`: Exact packet/action/target/configuration/adapter/executable/audience derivation, server-owned identity/time, exact replay, one-authorization uniqueness, accepted receipt insertion, real-Git provenance, candidate extraction, and review-manifest verification.
- `negative tests`: Legacy packet, packet/action/target/configuration/adapter substitution, caller chronology/identity injection, expired source, duplicate authorization, rejected canonical receipt, migration data loss, fake/stale/shallow provenance, unreviewed source drift, or unresolved review finding.
- `rollback/failure evidence`: Failed preparation writes nothing; migration interruption and nonempty-receipt guard roll back to v16; valid populated-v16 evidence remains readable through inspection but ineligible for automatic migration; restored-trigger tamper becomes migration drift; closed lanes remain empty; reviewed source drift invalidates review evidence.
- `validation commands`: Focused TypeScript/Rust/store/migration tests; `npm run security:review:test`; `npm run phase7:readiness:test`; `npm run check`; `npm run public:check`.
- `explicit approval`: Gate `P7_B1_PREAUTHORIZATION_HARDENING` granted only for this bounded source correction and now complete.
- `completion artifact`: Canonical preauthorization contracts, server-derived inert attempt records, migration 0017, ledger v3 Git manifests, extracted Phase 7d candidate tests, and independent correction-review manifest.
- `next packet`: `P7-C1`, source-only `P7-A1`, `P7-R1`, and evidence-freeze `P7-X1` later completed under separate approvals.
- `status`: `complete`
- `executable`: `true`
- `approval_gate_ids`: `[P7_B1_PREAUTHORIZATION_HARDENING]`

Legacy-v16 operator path: stop writers, preserve the original database and a
verified backup, and use v16-compatible or read-only inspection tooling for
evidence access. If continued clean-schema work is required, select a separate
fresh v17 database while retaining the v16 database as evidence. Do not force
`user_version`, delete evidence rows, or rewrite them into v17. Any in-place
legacy-evidence migration requires a separately approved future packet.

### 6) P7-C1

- `objective`: Implement atomic single-use capability redemption and consumption before consequence.
- `prerequisites`: `[P7-M1, P7-N1, P7-B1]`
- `allowed scope`: Domain-separated capability digest, constant-time comparison, exact redemption request binding, consume idempotency, replay/conflict denial, concurrency, crash/restart, and required audit.
- `forbidden scope`: Raw capability persistence/logging, authorization issuance, signing, adapter work, blind retry, or DB/API scope beyond approved v16.
- `required inputs`: Completed M1/N1 evidence, capability entropy/handling contract, transaction design, and packet approval.
- `contracts affected`: Capability redemption, consumption, idempotency, replay, and audit contracts.
- `DB effect`: Atomic v16 state transition only; no raw secret storage.
- `authority transition`: `atomic_single_use_consumption` only for exact active authorization state; no consequence yet.
- `positive tests`: One winner under concurrency, exact idempotent replay result, crash/restart durability, and consume-before-dispatch ordering.
- `negative tests`: Wrong/expired/revoked secret, conflicting replay, double consume, audit failure, transaction interruption, timing-unsafe compare, or secret disclosure.
- `rollback/failure evidence`: Pre-commit failure leaves unconsumed state; post-commit ambiguity remains consumed and requires reconciliation, never reuse.
- `validation commands`: Focused consume/store tests; `npm run phase7:readiness:check`; `npm run check`.
- `explicit approval`: Gate `P7_C1_ATOMIC_CONSUMPTION` granted for source-only atomic consumption and now complete.
- `completion artifact`: Atomic redemption implementation, full chain rederivation, concurrency/replay/crash/tamper evidence, and immutable independent implementation-review manifest.
- `next packet`: `P7-A1`, `P7-R1`, and evidence-freeze `P7-X1` later completed under separate approvals.
- `status`: `complete`
- `executable`: `true`
- `approval_gate_ids`: `[P7_C1_ATOMIC_CONSUMPTION]`

### 7) P7-A1

- `objective`: Issue exact-bound, short-lived, revocable local execution authorization records plus one-time capabilities through route-neutral Gateway/store composition.
- `prerequisites`: `[P7-M1, P7-N1, P7-B1, P7-C1]`
- `allowed scope`: Local-session approval proof validation, policy binding, authorization/capability creation, digest-only storage, cancellation/revocation, bounded redemption envelope, and public-safe errors.
- `forbidden scope`: Portable JWT/offline authority, private-key custody, signed approval dependency, ambient adapter credentials, unrestricted shell, dispatch, or production action.
- `required inputs`: Completed M1/N1/C1 evidence, exact authorization schema, capability handling rules, policy requirements, and packet approval.
- `contracts affected`: Gateway local execution-authorization issue/read/cancel/redeem contracts.
- `DB effect`: Approved v16 authorization and audit writes only.
- `authority transition`: `bound_authorization_record` and `execution_authorized` become true only for one exact live record at issue time; persistence or approval alone never does.
- `positive tests`: Exact actor/policy/approval/action/target/config/adapter binding, short expiry, digest-only secret storage, cancellation, revocation, and one-time redemption.
- `negative tests`: Missing/unsigned local approval where required, action/target/config/adapter substitution, wrong audience, expired/revoked policy/session, capability leak, or store/audit failure.
- `rollback/failure evidence`: Failed issue creates no capability; cancel/revoke is durable before dispatch; consumed authority never returns to active.
- `validation commands`: Focused Gateway/store/auth tests; `npm run security:conformance:check`; `npm run phase7:readiness:check`; `npm run check`.
- `explicit approval`: Gate `P7_A1_LOCAL_AUTHORIZATION` granted for source-only local authorization and now complete.
- `completion artifact`: Route-neutral Gateway/store issue/read/cancel/revoke/authenticated-redeem implementation, exact-binding/session/expiry/race/rollback/secret-handling evidence, and immutable independent implementation-review manifest.
- `next packet`: `P7-R1`, now complete under separate `P7_R1_GIT_REFERENCE_ADAPTER` approval.
- `status`: `complete`
- `executable`: `true`
- `approval_gate_ids`: `[P7_A1_LOCAL_AUTHORIZATION]`

### 8) P7-R1

- `objective`: Implement one bounded local Git commit adapter, digest-bound receipt, ambiguous-outcome state, and reconciliation without blind retry.
- `prerequisites`: `[P7-B1, P7-A1]`
- `allowed scope`: Disposable local repository, fixed Git operations, exact repository/base/path/patch/metadata/tree binding, one dispatch, receipt verification, Git-object reconciliation, audit, and sandbox/least-privilege proof.
- `forbidden scope`: Git push/fetch/network, hooks, arbitrary commands, unrestricted shell, production repositories, ambient credentials, extra paths, blind retry, runtime deployment, or public mutation API.
- `required inputs`: Completed A1 evidence, exact adapter protocol/sandbox, disposable fixture repository, receipt/reconciliation contract, and packet approval.
- `contracts affected`: Reference execution adapter, operation, attempt, receipt, outcome-unknown, reconciliation, and audit contracts.
- `DB effect`: Approved v16 operation/attempt/receipt/reconciliation/audit writes only.
- `authority transition`: Consumed authorization permits one bounded dispatch; completion requires exact digest-bound receipt or remains `outcome_unknown`.
- `positive tests`: Exact commit/tree/path/patch equality, hooks/network disabled, one consequence, receipt correlation, lost-response reconciliation, and immutable audit.
- `negative tests`: Base/path/patch/metadata/tree drift, hook or network attempt, extra commit, response loss with retry, receipt tamper, reconciliation mismatch, or audit failure.
- `rollback/failure evidence`: Before dispatch, no consequence; after possible dispatch, inspect exact Git objects and retain ambiguity until proven; never delete or rewrite user repositories.
- `validation commands`: Focused adapter/Gateway/store tests in disposable repo; `npm run security:conformance:check`; `npm run phase7:readiness:check`; `npm run check`.
- `explicit approval`: Gate `P7_R1_GIT_REFERENCE_ADAPTER` granted for source-only implementation and disposable-local-repository execution proof; no public/runtime authority opened.
- `completion artifact`: Bounded Git adapter, receipt/reconciliation implementation, sandbox proof, ambiguity/race/tamper tests, and immutable independent implementation-review manifest.
- `next packet`: `P7-X1`, now complete under separate approval.
- `status`: `complete`
- `executable`: `true`
- `approval_gate_ids`: `[P7_R1_GIT_REFERENCE_ADAPTER]`

### 9) P7-X1

- `objective`: Freeze local-v1 core conformance and bounded operability evidence without requiring optional signed approval or enterprise topology.
- `prerequisites`: `[P7-M1, P7-N1, P7-B1, P7-C1, P7-A1, P7-R1]`
- `allowed scope`: TS/Rust parity, full positive/negative authority-chain fixtures, backup/restore, retention, audit health, diagnostics, bounded queues/resources, minimal runbook, update/rollback/uninstall/data-loss semantics, and selected platform/filesystem statement.
- `forbidden scope`: New runtime features, signed-lane claims, PostgreSQL/HA/fleet/multi-tenancy, hardware attestation, broad distribution, deployment, or publication.
- `required inputs`: Completed core packets, all local security/operability evidence, exact claimed platform profile, and packet approval.
- `contracts affected`: Local-v1 conformance ledger, support statement, recovery/operations evidence, and limitation list.
- `DB effect`: None beyond validating approved v16 behavior.
- `authority transition`: None; freezes evidence for already implemented core path.
- `positive tests`: Proposal-policy-local approval-authorization-consume-Git receipt/reconciliation-audit chain; crash/concurrency/restore/upgrade/rollback proof.
- `negative tests`: Any skipped binding, replay, duplicate consequence, fail-open persistence, ambiguous success, unsupported platform claim, or hidden signed/enterprise dependency.
- `rollback/failure evidence`: Revoke freeze if prerequisite or support evidence regresses; keep unsupported claims closed.
- `validation commands`: Full repository checks, conformance, security, migration, restore, selected-platform lifecycle, and release metadata checks.
- `explicit approval`: Gate `P7_X1_LOCAL_CONFORMANCE_FREEZE` granted after all core packets completed; source-only evidence freeze now complete.
- `completion artifact`: Local-v1 conformance/support evidence bundle, authenticated full-chain plus inert-restore proof, minimal runbook, selected source profile, and explicit exclusions; no runtime or publication authorization.
- `next packet`: Phase 8 runtime-composition readiness design/review. Phase 14
  remains ineligible until required Phases 8, 9, 10, 11, and 13 pass.
- `status`: `complete`
- `executable`: `true`
- `approval_gate_ids`: `[P7_X1_LOCAL_CONFORMANCE_FREEZE]`

### 10) P7-K1

- `objective`: Implement optional v18 public verification-material enrollment and lifecycle with user-owned private keys.
- `prerequisites`: `[P7-M1]`
- `allowed scope`: Public-key registration, strict parsing, proof of possession, versioning, rotation, retirement, revocation, compromise status, audit, backup/restore, and owner-governed APIs.
- `forbidden scope`: Private-key generation/intake/storage/export/recovery, signer invocation, execution authority, adapter dispatch, enterprise HSM governance, or local-X1 dependency.
- `required inputs`: Completed M1, exact public enrollment ceremony, proof-of-possession profile, lifecycle/compromise semantics, v18 schema, and packet approval; no private key or key file.
- `contracts affected`: Public verification-material and lifecycle contracts plus Migration 0018.
- `DB effect`: None now; after approval, registered v18 public-only schema and migration.
- `authority transition`: `active_public_material` only after governed enrollment; never execution authority.
- `positive tests`: Enrollment, proof of possession, rotation, historical verification, retirement, revocation, compromise, restore, and exact audit.
- `negative tests`: Private material, malformed/noncanonical key, substitution, stale/future version, downgrade, revoked key, missing audit, or lifecycle race.
- `rollback/failure evidence`: Failed enrollment creates no active material; historical public evidence remains verifiable after rotation.
- `validation commands`: Focused policy/store/key-lifecycle tests; migrations; `npm run phase7:readiness:check`; `npm run check`.
- `explicit approval`: Required gate `P7_K1_PUBLIC_KEY_LIFECYCLE`; no key material is requested by this plan.
- `completion artifact`: v18 public-only lifecycle implementation and proof-of-possession/rotation/revocation evidence.
- `next packet`: `P7-S1` and `P7-V1` may proceed independently after K1.
- `status`: `blocked_pending_explicit_input`
- `executable`: `false`
- `approval_gate_ids`: `[P7_K1_PUBLIC_KEY_LIFECYCLE]`

### 11) P7-S1

- `objective`: Implement isolated provider-neutral hybrid signer transport: broker invoke, signer pull, and manual/offline export-import.
- `prerequisites`: `[P7-K1]`
- `allowed scope`: Canonical request envelope, broker boundary, credential references, transport state, user-presence/policy evidence, import validation, cancellation/timeout, and test providers.
- `forbidden scope`: Provider credentials in core, private-key custody, arbitrary-byte signing, blind signing oracle, human-approval label without ceremony evidence, production provider activation, or execution authority.
- `required inputs`: Completed K1, canonical request profile, broker threat model, signer classification rules, credential-reference contract, and packet approval.
- `contracts affected`: Signer request/result/broker transport and approval-ceremony classification contracts.
- `DB effect`: Approved v18 signer-request state only; no private material.
- `authority transition`: None; returned signatures remain untrusted until V1 verifies them.
- `positive tests`: Invoke/pull/export-import equality over exact canonical bytes, user-presence classification, cancellation/timeout, and credential isolation.
- `negative tests`: Arbitrary bytes, provider JSON substitution, credential leak, wrong key/request, missing ceremony, replay, broker compromise simulation, or provider metadata-only trust.
- `rollback/failure evidence`: Failed/ambiguous signing request remains non-authorizing and cannot be imported as approval proof.
- `validation commands`: Focused signer/broker tests; secret-pattern checks; `npm run phase7:readiness:check`; `npm run check`.
- `explicit approval`: Required gate `P7_S1_SIGNER_TRANSPORT`.
- `completion artifact`: Provider-neutral transport implementation, test adapters, boundary review, and oracle-resistance evidence.
- `next packet`: `P7-I1` after `P7-V1` also completes.
- `status`: `blocked_pending_explicit_input`
- `executable`: `false`
- `approval_gate_ids`: `[P7_S1_SIGNER_TRANSPORT]`

### 12) P7-V1

- `objective`: Wire operational signature verification in core against governed public material and exact canonical signing requests.
- `prerequisites`: `[P7-K1]`
- `allowed scope`: Strict SPKI/algorithm/profile checks, canonical preimage rederivation, domain separation, lifecycle/time/nonce checks, bounded attempt persistence, and closed result mapping.
- `forbidden scope`: Signing, provider calls, private keys, algorithm downgrade, metadata-only trust, approval issuance, execution authorization, or local-X1 dependency.
- `required inputs`: Completed K1, retained ADR-0004 verification contract, exact operational status source, attempt retention/capacity behavior, and packet approval.
- `contracts affected`: Signed approval verification result, public-material resolution, attempt persistence, and audit contracts.
- `DB effect`: Approved v18 verification-attempt writes only.
- `authority transition`: `verified_chain` and cryptographic validity only; signature alone grants neither human-approval classification nor execution authority.
- `positive tests`: Canonical reconstruction, active historical key resolution, time/nonce checks, TS/Rust parity, and exact accepted/rejected persistence.
- `negative tests`: Malformed key/signature, wrong algorithm/profile/domain/preimage, chain substitution, stale/revoked/compromised key, replay, time drift, downgrade, or audit failure.
- `rollback/failure evidence`: Verification/persistence failure stays rejected and non-authorizing.
- `validation commands`: Signed-evidence and Ed25519 conformance; focused store tests; `npm run security:conformance:check`; `npm run check`.
- `explicit approval`: Required gate `P7_V1_SIGNATURE_VERIFICATION`.
- `completion artifact`: Operational verification wiring and cross-language/fail-closed evidence.
- `next packet`: `P7-I1` after `P7-S1` also completes.
- `status`: `blocked_pending_explicit_input`
- `executable`: `false`
- `approval_gate_ids`: `[P7_V1_SIGNATURE_VERIFICATION]`

### 13) P7-I1

- `objective`: Add optional or policy-required signed approval proof without changing local execution-authorization semantics.
- `prerequisites`: `[P7-S1, P7-V1]`
- `allowed scope`: `external_signature` and `local_session_and_external_signature` proof variants, canonical issuance/import idempotency, human/service/automation classification, verification evidence, and policy enforcement.
- `forbidden scope`: Default signed requirement for local v1, signature-as-execution-authority, KMS-as-human claim without ceremony, private-key custody, portable execution token, adapter dispatch, or local-X1 dependency.
- `required inputs`: Completed S1/V1, proof-variant policy schema, classification rules, issuance/import contract, and packet approval.
- `contracts affected`: Approval-proof requirement, signed approval evidence, issuance/import, verification, and audit contracts.
- `DB effect`: Approved v18 signed-evidence and idempotency writes only.
- `authority transition`: `valid_signed_evidence` only for matching policy/profile; execution remains separate A1/C1 authority.
- `positive tests`: All three proof variants, policy-required signature, offline import, exact signer/key/nonce/time binding, and human/service classification.
- `negative tests`: Missing required variant, local-only downgrade, invalid/replayed signature, signer/request mismatch, automation mislabeled human, or signature directly authorizing execution.
- `rollback/failure evidence`: Failed issue/import stays non-authorizing; historical evidence remains verifiable after key rotation.
- `validation commands`: Focused policy/signer/verification/store tests; conformance; `npm run security:conformance:check`; `npm run check`.
- `explicit approval`: Required gate `P7_I1_SIGNED_APPROVAL_PROOF`.
- `completion artifact`: Optional signed-proof implementation, policy/classification tests, and portable verification evidence.
- `next packet`: Separate signed-lane support/release review; not P7-X1 prerequisite.
- `status`: `blocked_pending_explicit_input`
- `executable`: `false`
- `approval_gate_ids`: `[P7_I1_SIGNED_APPROVAL_PROOF]`

## C. Approval gates

| Gate                               | Purpose                                                                                 | Status                           | Granted |
| ---------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------- | ------- |
| `P7_M1_CORE_PERSISTENCE`           | revised v16 local authority-loop persistence                                            | `complete`                       | `true`  |
| `P7_N1_NONCE_EXPIRY`               | server nonce/expiry lifecycle                                                           | `complete`                       | `true`  |
| `P7_B1_PREAUTHORIZATION_HARDENING` | preauthorization binding, cardinality, audit, receipt, provenance, and review hardening | `complete`                       | `true`  |
| `P7_C1_ATOMIC_CONSUMPTION`         | atomic capability redemption/consumption                                                | `complete`                       | `true`  |
| `P7_A1_LOCAL_AUTHORIZATION`        | online exact-bound local execution authorization                                        | `complete`                       | `true`  |
| `P7_R1_GIT_REFERENCE_ADAPTER`      | bounded disposable Git commit adapter/receipt                                           | `complete`                       | `true`  |
| `P7_X1_LOCAL_CONFORMANCE_FREEZE`   | local-v1 core security and operability freeze                                           | `complete`                       | `true`  |
| `P7_K1_PUBLIC_KEY_LIFECYCLE`       | optional v18 public-key enrollment/lifecycle                                            | `blocked_pending_explicit_input` | `false` |
| `P7_S1_SIGNER_TRANSPORT`           | optional hybrid external signer transport                                               | `blocked_pending_explicit_input` | `false` |
| `P7_V1_SIGNATURE_VERIFICATION`     | optional operational signature verification                                             | `blocked_pending_explicit_input` | `false` |
| `P7_I1_SIGNED_APPROVAL_PROOF`      | optional/policy-required signed approval proof                                          | `blocked_pending_explicit_input` | `false` |

## D. ADR-0005 gate disposition

ADR-0005 G1-G9 no longer form one local-v1 prerequisite set:

| Previous gate                   | Revised disposition                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| G1 physical schema              | Split into core v16 `P7-M1`, corrective v17 `P7-B1`, and optional v18 `P7-K1` work.                                           |
| G2 privacy/legal signed payload | Signed lane or enterprise review; not core-loop blocker.                                                                      |
| G3 signer controls              | `P7-S1`; not local-X1 blocker.                                                                                                |
| G4 OS/backup                    | Bounded local filesystem, backup/restore, and restore test stay in M1/X1; encrypted off-host operations follow later profile. |
| G5 RPO behavior                 | Explicit local data-loss semantics stay in X1; contractual RPO/RTO is enterprise follow-up.                                   |
| G6 attempt retention            | Bounded local retention/capacity/audit-failure behavior stays in M1/X1.                                                       |
| G7 benchmark envelope           | Bounded queues/resources stay in X1; fleet/service benchmark envelope is later.                                               |
| G8 service cutover              | PostgreSQL/HA is enterprise-only and nonblocking for local v1.                                                                |
| G9 runbooks/telemetry           | Minimal local runbook, diagnostics, audit health, and restore proof stay in X1; centralized routing/SIEM is later.            |

## E. Runtime transition order

Local core runtime order after completed persistence foundation, once each
remaining behavior packet is separately implemented and approved:

1. exact authenticated local approval proof validates;
2. canonical execution request is rederived from exact approved packet bytes;
3. server-owned nonce is active and unexpired;
4. at most one exact server-side authorization record and capability digest are created per approval;
5. one redemption atomically consumes authorization before consequence;
6. bounded adapter executes once;
7. one authenticated digest-matched canonical receipt completes outcome, or ambiguity remains unresolved;
8. reconciliation and immutable audit preserve final known truth.

Optional signed proof has a separate order:

1. governed public material is active;
2. canonical request and returned signature verify;
3. proof classification satisfies policy;
4. signed evidence may satisfy approval-proof requirement but never directly
   authorizes execution.

Every transition needs contract, persistence, failure, replay, rollback, and
conformance proof. No single approval, signature, nonce, DB row, adapter
response, task state, trace, or receipt can skip another required transition.

## F. Failure model

Required negative evidence includes:

- unauthenticated/self/wrong-role approval and local-session revocation;
- malformed/noncanonical public material or signature;
- signer oracle, missing user presence, and service-as-human misclassification;
- packet/policy/actor/project/action/target/config/adapter substitution;
- expired/replayed/caller-chosen nonce;
- capability disclosure, wrong digest, conflicting replay, and double consume;
- concurrent consumers and crash between consume/dispatch/response;
- audit/write/capacity failure and partial transaction;
- migration interruption, schema drift/future version, backup/restore mismatch;
- adapter sandbox escape, hook/network/push/shell attempt;
- receipt tamper, timeout, lost response, ambiguity, and blind retry;
- unsupported platform/package claim.

No silent consequential retry is allowed.

## Blocked future packets

`P7-K1, P7-S1, P7-V1, P7-I1`

## Explicit input boundary

P7-M1, P7-N1, P7-B1, source-only P7-C1, source-only P7-A1, source-only P7-R1,
and source-only evidence-freeze P7-X1 are complete at schema 17/17. No Phase 7
core packet is currently executable. Next required work is a separately scoped
Phase 8 runtime-composition readiness design/review packet. Phase 14 target or
package selection remains ineligible until required Phases 8, 9, 10, 11, and 13
pass. No key,
public key, private key, signer credential, HSM/KMS account, runtime toggle,
production adapter target, deployment choice, or package target is granted by
P7-X1. Key/public-material input remains deferred until separately approved
`P7-K1` enrollment design and ceremony exist.

Migrations 0016 and 0017 are registered. Migration 0018 remains optional,
test-only candidate scope. Attempt preparation, nonce issuance/read/cancel,
atomic consumption, and route-neutral local authorization/capability issue,
metadata read, cancel/revoke, and authenticated redemption are source
implemented but not served/public Gateway/API routes.
Signer/provider calls, served/public receipt handling, served/public adapter
dispatch, production Git consequence, runtime API, deployment, build
publication, and package publication remain closed. Source-only disposable Git
proof, receipt persistence, ambiguity, and reconciliation are implemented but
not wired to any public/runtime route.
