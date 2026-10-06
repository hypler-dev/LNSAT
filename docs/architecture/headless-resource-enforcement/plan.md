<!-- intent-driven-delivery:plan:v1 -->

# Plan: HCFG-6 observed resource and runtime enforcement

Status: accepted
Authority: [HCFG-6 intent](intent.md); current acceptance/implementation belongs to [Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design)
Owner: LNSAT maintainers
Accepted by: human owner on 2026-10-01 at exact PR #72 head `0dbe0a2874428721b1a4ba6bad1708ec5fdbb572`; see Project Status
Last updated: 2026-10-05

## Scope and protected lanes

This packet defines the complete resource-to-runtime verification boundary for the first nonempty Docker Engine Git workflow. The acceptance reconciliation checkpoint was documentation only. The pure S1 input decoder may precede the complete source freeze after its own exact contract and independent source review; it performs no observation or authority work. Behavioral verifier and integration work requires the mandatory complete native/wire/daemon/synchronization source freeze and independent review. No host permission change, Docker observation/process, selected target, migration, initialization, activation, public contract rollout, merge, supported-artifact build/pull/publish, release or production is opened. The accepted bootstrap and Phase 11 operator packet retain their own gates.

## Files and ownership

The primary controller owns architecture, trust boundaries, these three artifacts and the linked `headless-resource-enforcement/*-source-spec.md`/synthetic-vector companions. Exact related documentation scope is `docs/PROJECT_STATUS.md`, `docs/DOCS_INDEX.md`, the three `docs/architecture/headless-local-bootstrap/{intent,spec,plan}.md` artifacts and inventory digest refresh. Producer does not independently approve its own proposal. Future source requires separately assigned exact ownership for contracts, host verifier, private Docker observer, immutable adapter probe, store/lease synchronization and bootstrap integration. No canonical unrelated files or old PHR attestations are owned.

## Sequence

The human accepted the [source-order amendment](source-freeze-staging-decision.md)
on 2026-10-03 at reviewed revision `5a1338cb31706bde4e1458a5089cfacb28e90917`.
Reviewed inert Stage-A module contracts may now precede implementation without
final artifact pins. The complete source/pin/positive-feasibility freeze remains
mandatory before product integration. The following original complete-freeze
steps retain that integration gate; they no longer prohibit separately reviewed
private candidate source under Stage A.

Current Stage-A sequence: private Linux preparation-journal custody, followed
by the [readable-object ACL parser/sampler](native-acl-candidate-source-spec.md),
and the [pure private mountinfo byte candidate](native-mountinfo-candidate-source-spec.md).
Project Status owns exact source, validation and independent review evidence.
The parser is a bounded untrusted representation prerequisite; it performs no
I/O, path/descriptor association, permission classification or authority work.
The later genuine mount reader still needs filesystem origin, held-root
association, no-follow lookup, deadlines, drift and actual Linux evidence.
Present/absent ACL classification, selected SQLite/socket/O_PATH custody and
complete native/source/pin/positive-feasibility freeze remain open. Candidate
success cannot prove cleanup, committed binding, initialization eligibility or
runtime authority.

1. Inspect accepted V1/bootstrap/Phase 11 boundaries and current profile, target, launch and identity code. Verify official Docker/kernel-facing assumptions without opening a Docker endpoint. Separate configured settings from actual observations.
2. Produce the proposed complete contract: explicit owner binding, nonempty verifier coverage, the proposed bootstrap metadata-only observation exception, resource-free probe preparation, private authenticated startup barrier, grant/use revocation, uncertainty and cleanup. Obtain fresh independent read-only review and resolve P1/P2 before presenting an owner decision.
3. Human acceptance is complete: the owner replied `accepted` on 2026-10-01 for exact PR #72 head `0dbe0a2874428721b1a4ba6bad1708ec5fdbb572`. Project Status records the capability/trust/metadata amendment/probe/staging decision; supporting bootstrap artifacts reconcile the exception. Acceptance comes from that human reply, not source checks, old bootstrap acceptance or green CI.
4. Implement and independently review the [S1 pure owner-binding decoder prerequisite](bindings-source-spec.md) with focused Rust tests under its exact input contract. This step may precede the complete source freeze because it performs no observation, integration or authority work; it does not satisfy that freeze.
5. Freeze a complete source specification before changing runtime behavior: exact profile 3/protocol 2 frames and domains, daemon API compatibility, bounded native/kernel observation method, UID/mount/cgroup mapping, peer/executable/image origin proof, preparation journal, cleanup selection and store/admission linearization. Separate persistent resource identity from live mount/namespace tokens and separately freeze finite owner-preparation limits versus the uninterrupted startup/action budget. Resolve the pinned safe-library gaps for genuine mount/cgroup association and effective ACL reads; do not replace them with mode bits, synthetic fields or caller proof. Reviewer must find the intended supported positive case actually feasible under non-root LNSAT. A placeholder verifier, claimed boolean or fixture-only acceptance cannot satisfy the freeze. Only after complete source freeze approval, implement actual owner-binding/metadata verifiers, immutable native startup probe and private trusted-daemon observation tied to the exact live channel. No authority serialization or injection seam; hermetic fixtures test denials without pretending to prove Docker enforcement.
6. After the reviewed source freeze and integration gates, complete atomic bootstrap with that bounded observation and resource-free zero-authority probe preparation, one immediate transaction, durable linked audit, inert restore and orphan quarantine. Complete protected Gateway generation/epoch/stop/revocation admission and one-use startup release before enabling any target. No empty-only initializer or diagnostic-to-active conversion is accepted as the end state.
7. Prove the complete same-attempt chain through actual selected-target runtime evidence under a new exact operator authorization. Keep old Phase 11 proof source/manifest separate; if that proof runs, it supplies only its locked claim, not the stronger new profile's proof. No current Docker authority is implied.
8. Close HCFG-6/headless conformance against every requirement, then continue monitoring/protected control/reliability and selected-target package lifecycle in the accepted V1 sequence. Phase 13/14 and publication remain separate; no narrower source milestone closes V1.

## Next genuine procfs reader contract gate

This section tracks the separate
[self-process reader proposal](native-source-spec.md#stage-a-self-process-procfs-and-held-mount-reader-proposal).
It is a documentation contract checkpoint, not precode approval, implementation
or completion of the genuine reader. Project
Status owns the [current reader gap](../../PROJECT_STATUS.md#stage-a-self-process-procfs-reader-contract)
and [V1 command reconciliation](../../PROJECT_STATUS.md#v1-command-and-contract-completion-gates).
The accepted Stage-A amendment permits an independently reviewed inert candidate;
the supplied-byte decoder does not authenticate its input source.

The next packet must refine the existing
[native observation proposal](native-source-spec.md#safe-native-apis-and-held-identity)
into one exact private procfs/held-mount reader contract. The controller owns its
security and Linux feasibility decisions. Initially owned documentation is this
plan, the relevant native-specification section and its canonical Project Status
subsection; source ownership is assigned only after exact precode review.
Existing mountinfo parser, ACL sampler, journal, schema-17 behavior and the
locked Phase 11 packet are preserved.

| Contract question             | Required resolution before reader source                                                                                                                                                                                                                                                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inputs and custody            | Name the genuine held procfs root, caller-owned held resource descriptors, same-host process context, ownership and lifetime rules. A displayed path, supplied row or synthetic successful observer cannot replace native origin.                                                                                                                                     |
| Filesystem and lookup origin  | Freeze exact filesystem-origin and held-root/mount association checks, descriptor-relative no-follow operations and the finite exception for intentional procfs kernel links. No arbitrary resource reopen or procfs magic-link fallback.                                                                                                                             |
| Read grammar                  | Freeze `self/fdinfo/{held_fd}` and `self/mountinfo` paths, strict required/duplicate/unknown-field rules, inclusive byte/row bounds, terminal EOF and partial-read handling. Reuse the reviewed byte decoder without silently changing its grammar or treating options as authority.                                                                                  |
| Bounded execution             | Specify safe pinned APIs, fixed/fallible storage, interruption/short-read policy and an enforceable monotonic deadline within the existing uninterrupted preparation/action budget. A byte cap alone does not prove bounded return; no unbounded retry.                                                                                                               |
| Current association and drift | Specify before/after descriptor, filesystem, process/root/namespace and mount-row checks, the exact fdinfo-to-row association and refusal of missing, ambiguous, replaced or changing observations. Persistent resource identity remains distinct from live mount/namespace tokens.                                                                                   |
| Output and denial             | Define a private non-serializable observation with fixed data-free errors and no public successful constructor, live observer permit, ACL/idmapping classification or action authority. Unsupported platforms and unavailable origin/association deny.                                                                                                                |
| Source evidence               | Freeze feasible genuine Linux positive, unfinished-operation and denial recipes before source; require actual results before candidate completion. Test construction/execution needs its own permitted scope. No synthetic success, Docker, selected host, permission mutation, target action or pressure proof.                                                      |
| Review and rollback           | Fresh independent read-only precode review must cover every native operation and feasible non-root positive path before implementation. Resulting source needs focused pinned tests, `npm run check`, public/inventory/history checks and separate exact-source/direct-child reviews. Rollback is a reviewed inert-source revert, not journal repair or live cleanup. |

The proposal names same-process held-handle custody, exact confined paths,
finite namespace/root-link exceptions, four-line fdinfo policy, EOF/sentinel
reads, storage bounds and bracketing comparisons. Its readiness was
**NOT_READY** before the exact contract below closed private-candidate precode.
The accepted containment investigation needed exact
construction/lifetime, synchronization/resource, native-fixture method and
crash-bridge interface/invariants. The reviewed synchronous recipe still provides no hard native return
deadline; bounded bytes, readiness polling and checks around a syscall do not
change that fact. The concrete
[retained-lane investigation](native-source-spec.md#retained-lane-containment-contract-investigation)
specifies one outstanding job, terminal timeout quarantine, late-result
rejection and retained cleanup. The human owner explicitly accepted exact
contract/feasibility investigation on 2026-10-04; Project Status owns the
[decision and reader checkpoint](../../PROJECT_STATUS.md#stage-a-self-process-procfs-reader-contract).
Do not ask for that same decision again. The accepted limitation is no hard
native-completion or completed-cleanup guarantee. Construction/drop ownership,
exact resources/synchronization, a feasible genuine unfinished-operation test
method and crash-bridge interface/invariants were required by that review.
Under the accepted Stage-A order, completed actual native tests gate candidate
source completion, and implemented canonical recovery gates product integration;
neither is required to exist before the private source needed to implement it.
The [reconciled evidence order](native-source-spec.md#retained-lane-containment-contract-investigation)
corrects the prior circular wording without waiving either requirement.
The owner's 2026-10-05 delegation also closes the instrumented fixture method
choice; Project Status records the exact proposal and controller selection.
The [selected fixture contract](native-source-spec.md#selected-instrumented-linux-timeout-fixture)
specifies control roles/frames, boot-lifetime retention, watchdog and evidence
ordering. Its independent review is a separate contract subgate, not whole-reader
precode PASS, kernel/harness source permission or execution authority.
The method choice alone did not approve worker source. The later whole-reader
precode PASS opens only the named inert reader source scope. Other procfs/cgroup/securityfs readers,
associated-path ACL classification, socket/SQLite/O_PATH custody and daemon
association remain separately bounded work. No dependency or feature change is
preapproved by this gate description.

The [exact retained-worker candidate contract](native-source-spec.md#exact-retained-worker-candidate-contract)
now supplies concrete construction, state/token ordering, wakeup, cleanup and
crash-bridge interface rules. Fresh independent whole-reader precode review
passed it with the existing native schedule and selected genuine test methods;
[Project Status](../../PROJECT_STATUS.md#stage-a-self-process-procfs-reader-contract)
records the disposition. Under the accepted Stage-A order, the named private
reader/test/declaration source scope is open. Private implementation is now a
source candidate under validation; actual native results remain missing.
Read-only parent-private parser accessors support the reader without changing
the byte contracts. Candidate completion and full integration retain their
separate evidence gates. No kernel/harness source, construction or execution
is opened by this private-reader precode PASS.

### Parallel inert prerequisite

The [exact supplied-byte fdinfo contract](native-source-spec.md#separately-reviewed-stage-a-fdinfo-byte-prerequisite)
is a separately reviewed Stage-A representation prerequisite while native return
and custody remain blocked. Its owned private parser/test/declaration paths are
named there. It adds no observation, deadline or worker and cannot satisfy reader
precode or full native freeze. Fresh exact precode review precedes this parser's
source; focused and full source validation plus exact attestations follow.

## Complete native freeze and later gates

The preceding independent Stage-A prerequisite is the
[private schema-3 profile codec](startup-wire-source-spec.md#stage-a-private-schema-3-profile-codec-contract).
Its exact profile-only contract passed fresh independent precode review after
the mandatory byte/entrypoint denial matrix was completed. The named new private
module/tests and declaration now contain the private candidate; independent source
review and full host validation passed, as recorded in Project Status. Its exact
source/direct-child chain is attested by PHR-0035; that source evidence supplies
no runtime authority. It neither changes schema-1/2 callers nor supplies
startup frames, native evidence or authority.
Project Status owns acceptance and implementation evidence. Actual Linux reader
completion remains open while this independent representation work proceeds.

The reader contract and its later inert source are prerequisites, not the full
native freeze. The accepted
[staging decision](source-freeze-staging-decision.md#c-complete-freeze-before-integration-or-activation)
requires one coherent independently reviewed source/pin/positive-feasibility
freeze before product integration. No current host observation or active
installation is required to exist at that source gate; live association and
activation are later gates.

| Gate                   | Evidence required; current boundary                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inert module source    | Exact reviewed native reader and other candidate contracts/source with genuine bounded Linux fixtures. A parser or module PASS supplies only its own source evidence.                                                                                                                                                                                                                                                                                   |
| Artifact capture       | A separate human-authorized capture packet or equivalent independently reviewable supplied artifact evidence. Actual component, kernel, template, adapter and image bytes/provenance remain `UNSET_BLOCKING`; versions, source SHAs and synthetic digests do not fill them. No construction is authorized here.                                                                                                                                         |
| Complete source freeze | Review native origin/ACL/LSM/association, profile schema-3 and protocol-2 fields, private daemon/response/realized recipes, root/OCI custody, preparation journal, selected-write/migration/bootstrap contracts and installation-wide admission/stop/revocation linearization together against exact source, captured pins and a feasible non-root positive recipe. Resolve every P1/P2; no single companion or all-denial fixture completes this gate. |
| Product integration    | Separately review wiring candidates to protected entrypoints, authenticated owner decisions and atomic bootstrap/configuration/release behavior. No diagnostic-to-active conversion, public injected observer or old-protocol fallback.                                                                                                                                                                                                                 |
| Activation and runtime | A later exact authorization and actual current root/daemon/kernel/image/resource association, selected-store custody, active generation/epoch, persisted stop/revocation and one-use release. Real disposable runtime/cleanup evidence belongs to its operator packet.                                                                                                                                                                                  |
| V1 and release         | Complete the canonical command/contract gates, Phase 11 proof, Phase 13 RC/security/reliability and every selected Phase 14 core-target lifecycle row. Design acceptance, source review, merge, runtime, candidate build and publication remain separate decisions.                                                                                                                                                                                     |

LNSAT remains neutral and standalone. The selected engineering recipe supplies
no general OS, package, enterprise or certification claim. Docker observation,
host/ACL changes, target pressure, credential intake, migration/initializer
activation, merge/main mutation, supported-artifact construction, release,
publication, deployment, production and tool installation remain closed.

### Private context and challenge prerequisite

After the profile codec, the [exact private context/challenge contract](startup-wire-source-spec.md#stage-a-private-context-and-challenge-codec-contract)
names two inert decoders, their source/test ownership, fixed errors, canonical
framing and the complete commitment/denial matrix. Fresh independent precode
review passed. The named private source and focused host tests are implemented;
[Project Status](../../PROJECT_STATUS.md#stage-a-private-context-and-challenge-codec)
owns its disposition. Decoder success establishes only representation and
self-consistency. Trusted challenge generation, replay binding, profile and
remaining-budget enforcement, native facts, release, full freeze and product
integration retain their separate gates.

### Private daemon Version prerequisite

The next independent Stage-A prerequisite is the
[Version-only supplied-body contract](docker-response-source-spec.md#stage-a-private-version-decoder-contract).
It names exact private source/test/declaration ownership, an allocation-free
bounded JSON preflight, closed typed shapes, required identity/build presence,
component consistency and a sealed unverified projection. Fresh independent
precode review passed after the Details-count ambiguity and matrix were
resolved. Its named private source and focused test matrix are implemented;
host-source validation and independent static review pass. Exact source and
direct-child review bindings remain distinct from native and integration proof.
It does not admit Info, Inspect,
Image, HTTP transport, daemon custody, registry values or active callers.
Project Status owns implementation truth; complete source/pin freeze and
integration remain separate gates.

### Private daemon Info prerequisite

After the source-reviewed Version candidate, freeze and independently review
one [Info-only supplied-body contract](docker-response-source-spec.md#stage-a-private-info-decoder-contract).
It names three exact source/test/declaration paths and preserves Version source.
Keep required comparison claims, explicit nil/allocated encodings, closed typed
informational children, finite bounds and fixed errors. The source-based
positive body and complete denial/boundary matrix precede implementation.
[Project Status](../../PROJECT_STATUS.md#stage-a-private-daemon-info-decoder-contract)
owns the passed independent precode review and the bounded private source
candidate with twenty-two independently authored synthetic test groups and full
host-source validation. A post-suite coverage addition receives focused tests,
strict lint and formatting with unchanged production-source continuity.
Fresh independent exact source/direct-child reviews, complete source/pin freeze
and actual selected-target proof remain separate gates. No HTTP/native/daemon
integration, credential/provider operation or new action authority opens here.

## Validators

Design packet: artifact-shape validators for intent/spec/plan, exact-doc Prettier, `git diff --check`, `npm run docs:direction:check`, `npm run public:check`, inventory write/check after staging, and Phase 11 readiness 43-case suite/check to prove the locked packet remains intact. Documentation-only validation does not require repeating unchanged Rust/workspace builds from green exact PR #74 head `5fd0a571d6b74ba34333aae8d4c80b0427caffc3`; hosted source CI remains a separate exact-head result and does not cover a subsequent documentation patch. Source packets later run focused pinned Rust tests, complete `npm run check`, public/inventory/format, installed named Semgrep/Gitleaks and dependency OSV when applicable. Missing offline vulnerability data remains unverified.

## Independent review

Fresh native OpenAI Terra xhigh read-only reviewer receives the exact proposed files/diff, accepted V1/bootstrap contract, current source PR #74 head `5fd0a571d6b74ba34333aae8d4c80b0427caffc3` and named official research. Review feasibility and P1/P2/P3 authority gaps: configured-vs-observed state, inode/host mapping, malicious probe/caller injection, extra mounts/hardlinks, credentials, preparation vs target process, revocation linearization, trusted daemon, version coexistence, interruption and cleanup. Source/actual runtime reviews are later gates; design PASS never grants activation, merge or release.

## Rollback and recovery

A reviewed rollback of the inert candidate removes its private source and
supporting documentation without changing an active product entrypoint or
schema. It does not authorize deletion or repair of an operator journal.
Future precommit preparation failures leave the authority store empty and either prove cleanup or quarantine. After original attempt claim/create, interruptions retain consumption and evidence; cleanup cannot trigger redispatch or declare non-execution. Post-release outcomes retain existing receipt/unknown/reconciliation semantics. Never clear stop/revocation or rewrite older generation/binding to pass a failed probe. Restored prior authority remains inert.

## Deviations

No approved scope deviation. The first accepted engineering Linux same-host Docker Engine 29.8.2/API 1.56 rootful backend is not a native-host fallback or package support selection. The new startup barrier is deliberately versioned separately from the locked Phase 11 proof; old argv/inspect/fake fixtures are not elevated to OS proof.

## Evidence ledger

- 2026-10-04: Private Linux journal-custody source follows the codec candidate:
  actual selected-store/lease lifetime, descriptor-rooted immutable revisions,
  retained stat/chain baselines, bounded readback and poisoned failure. Local
  macOS checks cover compilation and explicit platform denial; nonempty Linux
  fixtures require exact-head source CI. Project Status owns current validation
  and review evidence. No active initializer, SQL, native-profile feasibility,
  runtime, artifact, merge or release gate follows from this candidate.

- 2026-10-03: The [controlled resource-pressure proposal](pressure-proof-source-spec.md) defines three fixed future conformance cases with positive anchors, finite CPU/allocation/task stimuli, independent same-leaf events, ancestor/headroom eligibility and exact own-case cleanup. It cannot be called by normal preparation, action, bootstrap or current API/wire/journal. Exact helper/driver decoder/custody review, actual artifact pins and explicitly authorized disposable proof remain separate gates. Source-order acceptance was pending at this proposal checkpoint; the later accepted amendment is linked above. This pressure proposal authorized no pressure or candidate implementation.
- 2026-10-03: Exact staging-proposal head `5a1338cb31706bde4e1458a5089cfacb28e90917` passed hosted source CI run `37120253071`. The source-order amendment was pending human acceptance at this proposal checkpoint; later acceptance is linked above. A separate [generated metadata custody proposal](docker-metadata-source-spec.md) resolves the source distinction between rootful `0710` search-only ancestry, inherited file ACLs and named ACL reads. Linux `fdget` rejects O_PATH for `fgetxattr`; POSIX ACL syscall reads use `do_get_acl`, not generic file-data xattr permission. Root provisioning, dedicated daemon-root assertion, current root association and complete native feasibility review remain required. No Stage-A implementation, host permission change or current runtime authority follows.
- 2026-10-01: Public main fetched at `e09a6b02634b04a46f861ed8b092acc2c2e50fe8`. Isolated design base is draft PR #71 head `59396f5927a7e5f657d9a4983748ac084701181c`; exact source CI run `36957301014` completed successfully. Its source/build/store review is only a prerequisite.
- 2026-10-01: The human owner accepted exact reviewed PR #72 head `0dbe0a2874428721b1a4ba6bad1708ec5fdbb572` for bounded source implementation, including the bootstrap metadata-observation amendment. Exact-head CI run `36963652146` completed successfully. Project Status remains the acceptance authority; detailed source freeze and independent review remain outstanding.
- 2026-10-02: The S1 pure owner-binding decoder source draft was added from the exact contract. Fifteen focused Rust tests, Rustfmt, strict Clippy, complete pinned `npm run check`, public/docs/inventory checks and unchanged Phase 11 readiness 43/43 passed after plan-order, escaped-path, exact-redaction and nonempty deny-all proof corrections. Fresh independent OpenAI Terra xhigh review found no remaining actionable P1/P2/P3. Local Semgrep `p/rust` and Gitleaks reported zero findings. The first broad check stopped on sandbox-denied disposable socket fixtures; the complete rerun with local fixtures allowed exited zero. Draft PR #74 head `5fd0a571d6b74ba34333aae8d4c80b0427caffc3` subsequently passed exact-head source CI run `37102692708`. S1 is only an input prerequisite; native/wire/daemon/synchronization freeze and all HCFG-6 runtime gates remain open.
- 2026-10-02: Supporting [native](native-source-spec.md) and [preparation/store](preparation-store-source-spec.md) source-freeze proposals define bounded observation, distinct precommit/action protocols, durable revision custody and release/revocation serialization. Independent native feasibility review found a supported non-root design path after requiring a present controller-specific socket ACL and a root-provisioned current-instance attestation with peer pidfd, credentials, boot/start ticks and socket identity. No running root executable hash is claimed. Full freeze remains pending exact wire projections, immutable recipes/pins and reviewed ordinary-object ACL-absence classification; no behavioral integration or runtime gate opens from this checkpoint.
- Accepted design and research do not prove any host/kernel/container/resource control. No Docker/runtime/merge/release/production action is taken.
- 2026-10-03: Exact closed-response head `033323b276e1fc874a6fae43c88551275eacc913` passed hosted source CI run `37116570533`. The following [realized recipe proposal](realized-recipe-source-spec.md) defines finite mount/device/environment predicates, five non-destructive native preparation sentinels and CPU bandwidth units. Exact public runc v1.5.2 source snapshots are research evidence only. Full registry/pins, literal kernel/snapshotter normalization, image inventory, pressure procedures and complete independent freeze review remain open. Updated private-wire/synthetic-vector documentation adds no runtime behavior or source activation.
- 2026-10-03: The realized-recipe documentation delta passed artifact shapes 3/3, direction 31 tests (177 Markdown files), public readiness (908 files), inventory (2,122/295), synthetic encoding verification and unchanged Phase 11 readiness (43/43, execution closed). Fresh independent OpenAI Terra xhigh review found no remaining P1/P2/P3 after correcting the displayed release observation digest, preparation-challenge wording and an unescaped table flag delimiter. The synthetic verifier now asserts displayed release/result input values before deriving commitments; its earlier false-positive result is superseded. Table structure checked 32 rows. No native syscall, pressure, Docker or live-environment result is claimed. Actual pins and coherent complete-freeze approval remain blocking.
- 2026-10-03: Exact tagged Moby source confirmed API 1.56 and exposed the impossible empty workload Groups assumption. Supporting wire/Docker/native proposals require only the existing primary-GID singleton, keep host controller groups empty, and distinguish rootful shared user namespace from private execution namespaces. Narrow ext4 ACL-absence classification now requires exact no-reachable-ENOSYS provenance and explicit trusted-root idmap attestation; mountinfo is not an idmap query. Canonical synthetic vectors and independent proposal review remain source evidence only. Complete API projections, manifest fields, realized immutable recipe, actual pins and full-freeze review still precede behavioral integration.
- 2026-10-03: The documentation proposal delta passed 31 direction tests (174 Markdown files), public readiness (905 files), inventory (2,122 occurrences across 295 files), and unchanged Phase 11 readiness (43/43, execution closed). Fresh independent OpenAI Terra xhigh native/wire/Docker/vector review found no remaining actionable P1/P2/P3. The owner also required advanced enterprise/government security; the [Project Status security record](../../PROJECT_STATUS.md#enterprise-and-government-security-direction) owns that direction and links proposed Phase 13/14 requirements. These results do not complete the full native source freeze or authorize behavioral integration.
- 2026-10-03: Exact PR #75 head `c74b9b5607453a738813b91b3a93eab54cd046ed` passed hosted source CI run `37109900511`. A subsequent documentation proposal adds [root manifest/OCI custody grammar](root-manifest-source-spec.md), including explicit root trust, strict current-instance/artifact records and raw config/manifest/index parent links. Exact Moby create/start/Inspect source now establishes the create-time `none` endpoint placeholder and tracked-only Mounts boundary. Complete nested API projections, immutable realized recipe/pins and complete source-freeze review remain pending; new documentation validation and hosted CI are separate from the prior exact-head green result.
- 2026-10-03: The subsequent eight-file proposal passed artifact shapes 3/3, exact-doc formatting/diff checks, 31 direction tests (175 Markdown files), public readiness (906 files), refreshed inventory (2,122 occurrences across 295 files) and unchanged Phase 11 readiness (43/43, execution closed). Fresh independent OpenAI Terra xhigh read-only review found no remaining actionable P1/P2/P3 after controller clarifications of the virtual-filesystem scope and root/current-kernel bridge. This is proposed contract/source-fact evidence; complete native freeze, behavioral integration, actual runtime and new exact-head hosted CI remain separate.
- 2026-10-03: Exact root/OCI proposal head `4f9955a5fcab9cb5fadf1c26913e0821a631ff47` passed source CI run `37113024699`. The following [closed response proposal](docker-response-source-spec.md) defines nested typed paths and source normalization with a 47-type/368-field pinned mechanical appendix. Native OpenAI Luna readers supplied bounded public-source facts and a Luna docs worker extracted fields; the primary controller owns the security comparisons and integration. Artifact shapes 3/3, formatting/diff, direction 31 tests (176 Markdown files), public readiness (907 files), inventory (2,122/295) and unchanged Phase 11 readiness (43/43, execution closed) passed. All appendix references/hashes matched the copied source snapshots. Fresh independent OpenAI Terra xhigh review found no remaining actionable P1/P2/P3 after response-tuple, bound and index clarifications. No Go serialization canary or live verifier test was run. Actual recipe values/pins and coherent full-freeze review remain blocking; new exact-head hosted CI is separate.
