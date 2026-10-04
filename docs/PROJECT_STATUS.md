# Project Status

LNSAT `0.1.0` is pre-release, source-only software. Repository is suitable for
contract evaluation and contributor development, not production operation.

## Version Posture

Product/source SemVer remains unpublished `0.1.0` across the root npm package,
every private npm workspace, and the unpublished Cargo workspace. The stable
Gateway wire target is `lnsat.contracts.v1_0`; the default product surface is
`lnsat.product_surface.v1` with explicit source-diagnostic v2 selection; local
SQLite schema is `17`. These layers are independent. PR #39 merged Phase 11
operator preparation into public `main`, but changed no product, wire, family,
persistence, runtime-profile, or adapter-protocol version and created no tag or
release. See [contract versioning](reference/CONTRACT_VERSIONING.md).

Current bounded engine source lane: the [private Linux journal-custody
candidate](#stage-a-private-linux-journal-custody-candidate). Its source and
proof limits are distinct from unfinished V1 integration, enterprise assurance
and actual runtime gates.

## Active Security Remediation

The owner accepted the
[loopback browser session header hardening](architecture/SECURITY_LOOPBACK_BROWSER_SESSION_HEADER_HARDENING.md)
intent on 2026-09-10. The in-review packet removes browser cookies from the
numeric-loopback authentication path and requires an explicit non-ambient
session-token plus independent-proof header pair on every authenticated browser
request. Merge, deployment, publication, and release remain separately gated.
The accepted [local authentication availability and UDS withdrawal](architecture/SECURITY_LOCAL_AUTH_AVAILABILITY_AND_UDS_WITHDRAWAL.md)
applies source remediation for the same-UID Unix control-socket substitution and
global login-limiter lockout findings. It withdraws Unix bearer reads before the
first supported release, preserves browser header-pair transport, and still
requires focused validation and independent review before release judgment.

### Session creation private buffer lifetime

Canonical work record: this subsection. Under the existing local-authentication
remediation and enterprise/government security direction, the bounded source
hardening wraps session generation's three temporary entropy arrays and its
intermediate bearer hex string in the already pinned `Zeroizing` owner.
Those private allocations are scrubbed on drop, including an early random-
provider error. The OS random source, entropy sizes, token grammar, digest
domains, authentication behavior and all public fields/errors remain unchanged.
This creates no identity, session, transport or action authority.

`LocalSessionSecretsV1` retains its existing movable public `String` fields.
Adding a public `Drop` implementation would break existing field moves and is
outside this slice. Callers retain responsibility for returned raw secrets and
their copies. Existing daemon issue/rotation paths explicitly scrub original
result fields after creating the private zeroizing browser-header holder.
This private-buffer improvement is not universal memory erasure, a confirmed
vulnerability assessment, MFA, FIPS/provider assurance or government readiness.

Pinned auth tests passed (13/13), and the full `npm run check` passed with
1,471 TypeScript workspace tests, 139/139 TypeScript contract comparisons,
251 store tests (one intentionally ignored child helper), and 100 daemon
tests. The initial full run stopped on stale generated inventory; it was
retained as failed evidence, refreshed, and rerun successfully. Named local
Semgrep `p/rust` and redacted Gitleaks worktree scans reported zero findings;
dependency files are unchanged. Fresh independent source review covers the
private-buffer change and existing caller handoff. Public-history-native
review binding uses `PHR-0013`; it grants no runtime or release authority.

Parent selected-write contract PR #81 passed exact-head source CI
`37159123843`, job `111308655772`, at
`59bbb92f9df96afdf0b4e7166c38cb92134be27f` on `2026-10-03T22:49:02Z`.
That evidence covers the proposed contract, not selected-write implementation.

At this session-buffer checkpoint the HCFG-6 source-order decision was pending;
its later human acceptance is recorded in the canonical staging subsection.
This session-buffer change opened no native/profile/journal/store Stage-A code,
candidate SQL, Docker, host mutation, artifact build, merge, release,
deployment or production. The Phase 11 packet remains unchanged.

Repository source is public through the independently audited fresh-history
cutover recorded in [public source readiness](PUBLIC_READINESS.md). Public
visibility does not change this maturity, publish an artifact, or establish
support.

Initial public history uses `lnsat.public_source_snapshot.v1`. Archived Phase 7
records remain immutable, but their private Git topology and reviewer identity
are not independently replayable from public history. Validators report those
skipped checks, forbid tags and `v1.0.0`, and grant no supported-release
evidence. Public-history-native review provenance remains required before a
supported release.

Accepted product position: **Execution authorization and evidence for
consequential agent actions.** LNSAT is an authority lifecycle above MCP, A2A,
REST, CLI, and browser transports; it integrates with identity, OPA-compatible
policy decisions, hardware/runtime facts, and evidence export. Current source
does not yet implement that end-to-end lifecycle.
Canonical readiness states: Phase 7a signed-evidence design = complete; Phase 7b wrapper verification = implemented_verification_only; Phase 7c Ed25519 primitive = implemented_not_wired; Phase 7d schema candidate = proposed_test_only; P7-ADR0 local-v1 trust-model revision = complete; P7-M1 core persistence = complete; P7-N1 nonce/expiry lifecycle = complete; P7-B1 preauthorization hardening = complete; P7-C1 atomic consumption = complete (implemented_not_wired); P7-A1 local authorization = complete (source-only, implemented_not_wired); P7-R1 Git reference adapter = complete (source-only, implemented_not_wired); P7-X1 local-v1 conformance freeze = complete (source-only evidence, no runtime/publication authority); runtime is schema 17/17 with migrations 0016 and 0017 registered; optional signed-evidence packets remain blocked.
In inherited packet labels, `publication authority` means release-artifact or
runtime publication authority; it does not govern repository-source visibility.
Current completed packet is `P7-X1`. Optional signed-evidence packets
`P7-K1/S1/V1/I1` remain blocked/ungranted. `P7-P1` is superseded by `P7-K1`;
no public/private key input is requested.
[Phase 7 readiness plan](architecture/PHASE_7_READINESS_EXECUTION_PLAN.md) and
[ledger](reference/phase7-readiness.json) confirm no execution authority opened.

## HCFG-3A Core Declaration Composition

HCFG-3A implements an experimental pure Rust declaration parser and composition
primitive under the accepted headless configuration requirement. Its sealed
model separates resource declarations from principal/action ceilings, enforces
ordered narrowing layers, retains denials, and rejects resource restoration,
weaker approval, and increased budgets. The
[source contract](architecture/headless-configuration/spec.md) defines exact
bounds, canonical content identity, and redacted diagnostic output.

Integrated source validation passed 19 headless tests within 45 core unit and
13 existing conformance tests, canonical pinned workspace clippy,
npm run source:check, dependency/signature audits, and independent read-only
review. Full source validation passed on the combined HCFG-2/HCFG-3A tree;
source acceptance is complete after the independently reviewed integration
corrections. OSV and Gitleaks report no findings. Semgrep's sole finding is a
confirmed false positive on an authored invalid uppercase SHA-256 test digest;
no rule is suppressed. The implementation adds no package versions and leaves
existing daemon configuration, packet policy behavior, and product-surface
manifests unchanged.

Merge remains a separate owner decision. This foundation does not implement
config effective or config export commands, verify resource identity, or
grant action/activation authority. Full current policy, authenticated ownership,
approvals, OS enforcement, and persisted stop/revocation checks remain required
before future activation. Headless control and the larger V1 goal remain
incomplete; this packet grants no runtime, artifact, or release authority.

## HCFG-3B Effective And Redacted Export Diagnostics

HCFG-3B exposes the HCFG-3A parser and composition primitive through exact,
v2-selected `lnsatctl config effective` and `config export` commands. Both read
one explicit absolute declaration file through a bounded, regular non-symlink,
stable-identity boundary. The declaration contract remains separate from daemon
configuration. Parse or composition failure returns no partial result.
The loader currently supports Linux and macOS file identity only; other targets
fail closed with `headless_config.platform_unsupported`.

`effective` reports only the composed declared ceiling. `export` emits a
deterministic `lnsat.headless_config.redacted_export.v1` diagnostic that is
non-applicable and non-reimportable. Output excludes source bytes, paths,
installation/principal/resource/layer references, resource identity digests,
and secrets. It explicitly denies verified identity, OS enforcement, admission,
activation, and action-authority claims. Text, JSON, JSONL, and YAML render the
same closed result without side effects.

The exact command contract, redaction, invalid-input behavior, deterministic
formats, and no-side-effect boundary are covered by focused CLI tests and the
[headless configuration specification](architecture/headless-configuration/spec.md).
Merge remains a separate owner decision. The remaining HCFG-4 monitoring scope,
HCFG-5 protected control, HCFG-6 enforcement/conformance, runtime proof,
artifacts, and release remain incomplete and separately gated.

## HCFG-4A Exact Evidence Readback

The owner accepted the revised [HCFG-4A intent](architecture/headless-monitoring/intent.md)
and [specification](architecture/headless-monitoring/spec.md) for source
implementation on 2026-09-26. [PR #33](https://github.com/hypler-dev/LNSAT/pull/33)
merged the reviewed head `da8d5fae1829f8aa99158342a477a324b3c70b01`
into public `main` at `bd9016a48e8d675d8f52c406a4b7103b16c708f3`
on 2026-09-27 after separate owner merge authorization. It implements three
authenticated exact-object `GET|HEAD` routes for approval requests, approval
decisions, and audit events. Each route requires the existing loopback browser
session header pair and `ReadEvidence` permission. The store recovers the
persisted project scope from an exact identifier and rederives the full linked
evidence chain before returning one stable, redacted domain object. Generic
denial hides missing records, drift, and storage failure.

Focused served/store tests, pinned full-workspace Rust tests and Clippy,
`npm run source:check`, documentation checks, public readiness, inventory,
fresh independent review, and exact-head CI passed before merge. Fetched
public-main ancestry confirms the reviewed head as the merge parent. This
source work does not add list, search, watch, cursor, CLI, schema, mutation,
runtime, package, or release behavior. Phase 11's
[operator run packet](architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md)
remains the runtime-proof status authority; no real Docker proof or production
authorization follows from these reads.

## HCFG-4B/4C And HCFG-5 Contracts

[PR #52](https://github.com/hypler-dev/LNSAT/pull/52) merged the proposed
bounded current-unresolved evidence snapshot and versioned watch design at
`dcbbdfec75ce614ab6f330ed5cb0940517613c3c`. It remains a design record
only. Enumeration scope, immutable evidence-to-subject mapping, exact
served readback, non-mutating expiry proof, and source implementation require
separate owner acceptance. Merged HCFG-4A exact reads do not grant them.
Authorization-attempt, nonce, historical state-event, consumption, receipt,
and reconciliation evidence still lack complete read-only served projections;
current aggregate reads cannot establish a complete watch family.

Draft [HCFG-5A](https://github.com/hypler-dev/LNSAT/pull/61),
[HCFG-5B](https://github.com/hypler-dev/LNSAT/pull/62), and
[HCFG-5C](https://github.com/hypler-dev/LNSAT/pull/63) propose protected
online configuration transitions, atomic local bootstrap, and an exact fresh
owner-decision challenge. Their reviewed design heads have green exact-head CI.
On 2026-09-30 the human owner authorized the controller to accept the reviewed
contracts needed for V1 and proceed with bounded source implementation. This
is human acceptance of HCFG-5B at
`662fc5f489d70d735d9d612e9f8cce6ed3a2b593` and HCFG-5C at
`0d5db17a1de7fdbd40abcfe4ddf901a39e89e160`, not an agent self-approval.
The accepted [bootstrap contract](architecture/headless-local-bootstrap/intent.md)
records the host-owner assumption, atomic first initialization, selected-store
binding, and inert-restore policy. The owner-decision contract retains exact
change-view confirmation, credential rechecks, bounded challenges, and one-use
consumption. Routine design and implementation choices within these reviewed
contracts no longer await another owner acceptance. Named validation and fresh
independent source review remain required. HCFG-6 enforcement and actual
initialization/activation require their own implementation and proof. Runtime
proof, merge, package, and release retain separate gates. No configuration
mutation or resource access follows from the design acceptance alone.

### HCFG-5A bounded pure comparison model

Canonical implementation record: this section. The owner accepted the
[bounded pure-model specification](architecture/headless-comparison-model/spec.md)
at PR #67 head `7166ee6d2ab0e213e7f565eedc3b86dd1204763f` in the
2026-09-30 development conversation. The isolated source draft implements a
structural Rust comparison model with private fields, sealed declaration
recomposition, bounded per-side evidence, independent mode and budget ordering,
exact canonical commitments, explicit in-memory change summaries, and redacted
diagnostics. The 37 focused headless regressions include 18 comparison tests,
an independent 65-state/4,225-pair mode and budget oracle, and a manually
specified canonical golden vector checked against a real model result. Pinned
Rust formatting, strict Clippy, full `npm run check`, public/documentation and
inventory checks, installed local Rust/secret scans, and fresh independent
source/test/documentation review passed. This remains an unmerged source draft;
it supplies no authenticated comparison, owner decision, or activation.
Acceptance covers pure Rust comparison mathematics and tests only. The
assertions cannot authenticate
resource identity, policy, current effective authority, or enforcement. The
model must always retain `authority_comparison: unverifiable`,
`identity_verified: false`, `activation_available: false`, and
`grants_action_authority: false`.

The initial compatibility binding recognizes the existing source contract
`lnsat.runtime_profile.docker_local.v1` exactly and rejects other asserted
profile versions. This conditional compatibility check supplies no platform
proof or execution permission. HCFG-5B/5C source implementation, authenticated
active-generation derivation, HCFG-6, monitoring, activation, merge, and release
remain separate gates. The Phase 11 operator packet remains runtime authority;
its source-only preparation verdict is unchanged.

### HCFG-5A exact asserted profile compatibility

Canonical work record: this subsection. The accepted pure-model specification
requires a separately reviewed source change for each additional recognized
asserted profile. The bounded V1 prerequisite extends that closed source list
to exactly `lnsat.runtime_profile.docker_local.v1` and
`lnsat.runtime_profile.docker_local.v2`. The latter is the selected HCFG-6
native contract identity. This changes only conditional comparison of supplied
assertions; it implements no native schema-3 decoder, profile verifier, journal,
store, initializer or authenticated comparison. This compatibility change
accepted no HCFG-6 source-order amendment and opened no Stage-A implementation;
the later human source-order acceptance is recorded separately below.

Both contexts must retain the same exact profile string. Mixed versions and
unknown or near-match strings deny without a model commitment, summary or
view. The selected string remains in model/view commitments; existing v1
golden bytes remain unchanged. Equal, narrowing and widening mathematics must
work for nonempty matching v2 inputs. Diagnostics retain
`authority_comparison: unverifiable`, `identity_verified: false`,
`activation_available: false`, and `grants_action_authority: false`.

The isolated source draft implements this bounded recognition. Thirty focused
comparison/view tests passed, including unchanged v1 golden commitments,
nonempty v2 equality/narrowing/widening, both mixed-version directions, matched
unknown/near-match pairs, stopped v2 and distinct v1/v2 model/view commitments.
Fresh independent OpenAI Terra xhigh source/test/contract review passed with
no findings. Full pinned `npm run check` reached terminal exit zero: strict
Rust formatting/Clippy, all workspace tests/type checks and 1,471 TypeScript
tests passed. The first restricted run failed 55 daemon listener tests
(49 `ListenFailed`, six socket `PermissionDenied`); the unchanged suite passed
when disposable loopback/Unix test sockets were permitted. No production or
Docker endpoint was used. Local named `p/rust` Semgrep and redacted worktree
Gitleaks found zero findings; no source/report upload or tool installation
occurred. PHR-0012 binds the independently reviewed source commit
`e3a2cb063ef1827c966939f44e7867de6704579e` to its direct-child attestation
`65a5441f661c35fcf4ac102d9b5a46346c36197d`. Committed native provenance
passed with 12 attested records and zero pending. Draft PR #80 remains
unmerged at that exact head. Hosted source CI run `37157277947` and job
`111303156585` completed successfully at `2026-10-03T22:24:24Z`. These are
source review/validation results, not runtime or supported-release authority.

This is within the existing accepted pure comparison boundary, not acceptance
of online apply or native execution. Physical profile/schema verification,
selected-store custody and current-authority integration remain required.
The Phase 11 operator packet remains `PREPARED_SOURCE_ONLY_NOT_EXECUTION_READY`;
Docker, host mutation, candidate builds, merge, release and production remain
closed. V1 and enterprise/government assurance remain incomplete.

### HCFG-5B B1 fresh-store prerequisite

Canonical implementation record: this section. Under the accepted bootstrap
contract, B1 adds only a store-owned read-only schema-17 inspection. It verifies
one complete main-schema identity (31 tables and 218 objects), rejects temporary
objects and attached databases, rechecks native schema/migration/immutable
retention seeds and integrity, and requires all 28 authority/evidence tables to
be empty in one deferred read transaction. Schema identity includes tables,
views, triggers, indexes, and autoindexes, including names a wildcard filter
could otherwise overlook. Only exact compiled migration, store metadata, and
preserve-only retention seeds may pre-exist. Unknown or altered state denies.

The result is a private-field snapshot diagnostic with
`initialization_available: false` and `grants_action_authority: false`; it has
no wire serializer or authority conversion. It may become stale after any
writer commits. The later initializer must repeat the private gate inside its
own immediate transaction together with host-owner, file/path, lease,
declaration, and selected-platform enforcement checks. This adds no migration,
owner credential, installation, generation, configuration audit, command,
route, OS verifier, or activation. Current source has no HCFG-6 verifier that
can authenticate all declared resources and enforce the selected controls.

Nine focused bootstrap tests, strict store Clippy, and full `npm run check`
passed on unchanged source bytes. Documentation, public readiness, inventory,
and local dependency/signature checks passed. Fresh independent source review
found no source defects; its stale-inventory validation finding was resolved by
refreshing the inventory and rerunning the full check on frozen files. Local
secret scanning found no leaks. The Rust scan reported two pre-existing
test-helper findings and no finding in the new production module.

Git-bound independent review evidence is tracked as `PHR-0006` in the
[public-history review registry](reference/public-history-reviews/registry.json).
This remains an unmerged source-only prerequisite. The next source work must
establish selected-store file/owner/lease binding and real selected-platform
resource/enforcement proof before atomic initialization can admit authority.
Matching a SQLite filename alone is not proof of its opened file identity.
The Phase 11 operator packet and source-only runtime verdict are unchanged.
Bootstrap and V1 remain incomplete; this prerequisite does not initialize a
usable installation.

### HCFG-5B B2 transaction-local owner foundation

Canonical implementation record: this section. Under the accepted bootstrap
contract and standing owner authorization, B2 extracts the existing owner
credential and identity-event construction into a private transaction-local
helper. The public owner-bootstrap API, errors, single-owner checks, schema
verification, immediate transaction, and commit behavior remain unchanged.

Preparation validates and copies the exact identity, display name, and time;
it owns the credential ID and a zeroizing verifier, retains no plaintext
password, and has no debug, clone, or wire representation. The insert helper
accepts only an existing SQLite transaction and never starts, commits, or
rolls back one. Its caller must use an immediate transaction and abort the
whole operation on any error. A later initializer can therefore compose owner,
installation, generation, and linked audit writes in one transaction instead
of committing an owner first.

Seven focused owner-bootstrap tests and strict store Clippy pass. Three new
tests prove owned metadata cannot be substituted after preparation, the caller
can drop the password before the transaction, no owner rows are externally
visible before caller commit, and outer rollback erases all identity,
credential, and event rows after success or injected later-insert failure.
Full `npm run check` passed on unchanged source bytes. Fresh independent
read-only source and documentation review found no actionable defects. Local
secret scanning found no leaks; the named Rust static scan reported two
unchanged test-helper informational findings and no new production findings.
Git-bound review evidence is tracked as `PHR-0007` in the
[public-history review registry](reference/public-history-reviews/registry.json).

This changes no schema, migration, public API, CLI, route, installation,
generation, configuration audit, resource verifier, OS control, or activation.
The existing owner-only foundation remains legacy/inert for headless setup.
Selected-store binding, real resource/enforcement proof, and the complete
atomic initializer remain open source work. Phase 11 runtime authority and
V1 readiness are unchanged.

### HCFG-5C C1 current owner credential prerequisite

Canonical implementation record: this section. The [C1 credential source
specification](architecture/headless-owner-decision/credential-source-spec.md)
defines the bounded implementation details.
The HCFG-5C design was accepted by the human owner at exact head
`0d5db17a1de7fdbd40abcfe4ddf901a39e89e160`. C1 is the bounded source
implementation of its current-owner credential prerequisite; the design is
accepted, source implementation is complete for this slice, and independent
source review passed. This record does not self-accept new authority.

C1 prepares a private snapshot only after a valid owner password verifies
against the current bounded credential chain. The snapshot has no `Debug` or
`Clone`, wire representation, public constructor, or success-injection seam.
Each store instance owns a private transient scope marker; recheck requires
that marker and the actual borrowed SQLite transaction connection to match the
original store. A different store, reopened store, process, or connection
cannot reuse the snapshot even when credential bytes match.

The read transaction ends before Argon2id work. The later transaction-local
recheck reloads the current owner identity and complete bounded credential
chain, compares exact identity and credential metadata plus the domain-bound
SHA-256 PHC fingerprint, and writes no rows. PHC row values are held through
`Zeroizing<String>` on success and error paths. The existing public owner
password API and result/error family remain unchanged; schema remains 17.

Eleven focused tests and strict store Clippy passed. Coverage includes real
rotation/recovery, valid same-version verifier replacement, historical-chain
corruption, immutable identity/role drift, malformed owner status evidence,
store movement/reopen and cross-wired transaction rejection, absence of
credential-component row writes, and unchanged session activity. Fresh independent source review found
no actionable defects. Gitleaks found no leaks; the named Rust static scan
reported only two unchanged test-helper informational findings and no new
production finding. Full `npm run check` passed on unchanged source after two
checkout-environment failures: the first sandboxed run could not bind disposable
daemon listeners; the socket-enabled run then lacked the existing workspace
dependency directories. Restoring those dependency links required no install,
manifest or lockfile change. The terminal run covers all 100 daemon tests and
the complete Rust/TypeScript source gates; neither earlier failure is rewritten
as a pass or claimed as a code fix. This remains an unmerged source draft, and
exact-head hosted CI run
[37145456578](https://github.com/hypler-dev/LNSAT/actions/runs/37145456578)
succeeded for draft PR #76 head
`cad0d35fe5a20366679557d89dcada217f63dbe3` on 2026-10-03. Hosted source
verification does not open runtime or support.
Git-bound review registration is `PHR-0010` in the
[public-history review registry](reference/public-history-reviews/registry.json).

C1 does not implement full configuration, challenge, session, decision,
installation, generation, resource, or activation authority. Runtime/V1/FIPS,
MFA, and government-assurance gates remain incomplete. Phase 11 packet status
authority is unchanged, and no merge, release, runtime, production, or
deployment action follows from this source slice.

### HCFG-5C C2 complete comparison view prerequisite

Canonical implementation record: this section. The [C2 complete-view source
specification](architecture/headless-owner-decision/view-source-spec.md) is
frozen under the accepted HCFG-5C baseline at exact head
`0d5db17a1de7fdbd40abcfe4ddf901a39e89e160`. The bounded C2 source slice is
implemented. Preliminary contract review passed; independent source review
found no source defects, and its stale documentation-index wording finding was
corrected in this packet. This record does not create a second acceptance
authority or accept new authority.

C2 defines a closed complete conditional model view over the accepted HCFG-5A
comparison result. The view includes every changed resource and rule field,
all eight asserted context fields, old and candidate declaration digests, and
a distinct model-view digest. Resource and rule changes remain complete and
sorted; nullable sides are explicit, and no filtering, pagination,
abbreviation, or ellipsis is permitted.

The canonical JSON view has an inclusive 131,072-byte cap and a bounded writer
that exposes no partial output on overflow. The existing comparison model,
classifications, commitment, summary, supported asserted profile, and redacted
diagnostic remain unchanged. The view is source-only in-memory model material;
it is not a supported wire or profile contract.

Ten focused view tests, strict contract-crate Clippy, pinned Rust formatting
and full `npm run check` passed. The full gate covered 88 contract unit tests,
13 contract conformance tests, 251 store tests and all 100 daemon tests, plus
the complete TypeScript and source-conformance gates. Documentation, public
readiness and refreshed inventory checks passed. The named local Rust scan
found no findings. Worktree secret scanning reported one confirmed false
positive in ignored generated metadata: the pinned Ed25519 library documents
a PEM begin marker without any key body. The complete documentation line
matches its pinned library source; no application secret was found and no rule
was suppressed. Dependencies, lockfiles and schema 17 are unchanged. Git-bound
independent source review is registered as `PHR-0011` in the
[public-history review registry](reference/public-history-reviews/registry.json).
Draft PR #77 remains unmerged at exact head
`7ee3422e3ff8b67458e159cfab21807fd272fbc9`. GitHub readback confirmed CI run
`37148971399`, attempt 1, and source-gate job `111278633780` completed
successfully at `2026-10-03T19:55:05Z`. CI supplies source validation; it does
not grant merge or runtime authority.

C2 creates no authenticated server view, current-state derivation, consent,
confirmation, challenge, session, decision, candidate generation, or action
authority. No schema, route, storage, migration, runtime, package, release,
deployment, or production state follows from this prerequisite. Full HCFG-5C,
HCFG-6, V1, and enterprise/government assurance remain incomplete.

### HCFG-5B B3A custody readiness withdrawn

Historical B3A source and independent review are preserved by immutable
[PHR-0008](reference/public-history-reviews/PHR-0008/review.json).
Draft [PR #71](https://github.com/hypler-dev/LNSAT/pull/71), exact head
`437db8058feaa93df1f9bad551f70727fbd73a27`, failed source CI run
`36944404753` on its Linux nonregular-path fixture. More importantly, subsequent
cross-process evidence confirmed that opening and closing an additional database
`File` can cancel POSIX locks belonging to another live SQLite connection in the
same process. Keeping that extra handle until custody drop or checking a WAL
checkpoint does not resolve this hazard. Source readiness is withdrawn; the
historical Mac validation and review do not prove the correction. Prior review
manifests are not rewritten.

### HCFG-5B B3B main descriptor observation and lock correction

Canonical implementation record: this section. Under the accepted bootstrap
contract and standing human source authorization, the isolated corrective
candidate removes every direct selected-store database handle and checkpointed
header read. It retains an owner-owned exact `0700` parent and regular
single-link exact `0600` named database and shared lease, device/inode
observations, and nonzero equal real/effective host UID. The exclusive shared
lease is validated and locked before any SQLite open. Busy callers cannot open
SQLite or create its WAL/SHM coordination files.

A fresh private read-only/no-create connection uses the fixed native Unix VFS.
Exact SQLite `3.53.2` source identity, non-debug posture, and unique builtin
function origin are checked before the native `sqlite_filestat('main')` call.
The native string allocator is bounded by a temporary 4096-byte
`SQLITE_LIMIT_LENGTH` before allocation; the original connection limit is
restored on success and denial. SQL NULL and malformed, duplicate, unknown,
out-of-range or other-VFS diagnostic shapes deny with static errors. A private
typed decode keeps the main descriptor internal. Safe in-place `fstat` observes
that actual descriptor's owner, mode, regular type, link count and device/inode
without opening, duplicating or closing any database alias. Native and named
metadata are checked twice and rechecked on explicit custody use.

The repository forces the FILESTAT compile flag and rejects named ambient
compiler, target, flags, wrapper, native-source and link overrides before Cargo.
Locked full Cargo metadata requires the single pinned bundled SQLite package and
exact native features and the exact fs-only production Nix alias. Developer-host compiler/SDK binaries, PATH and Cargo
configuration remain trusted; these checks do not authenticate a release
artifact. External consumers lacking the required capability fail closed.
Existing Nix `0.31.3` remains unchanged; an exact fs-only Nix `0.29.0` alias
supplies the safe raw-descriptor metadata API without relaxing unsafe-code
prohibition. Existing locked Serde is reused for private typed decoding.

The header prefilter is removed. A current schema held in uncheckpointed WAL is
read normally, with no checkpoint, migration or journal assignment. Malformed
and old-schema read-only denials may create coordination files or the lease;
they write no main database or authority rows. Source coverage includes a real
child-process POSIX byte-lock contender across ordinary/selected coexistence,
second-selection denial, bounded-native failure, repeated observation,
post-open schema denial and selected destruction while the ordinary reader
remains alive. The prior checkpoint test remains a separate check of connection
closure before shared-lease release.

Nineteen focused selected-store regressions passed locally on macOS; the one
normally ignored child-only harness was invoked by the lock regression. Six
native build-policy tests passed. An initial full repository check failed in an
existing served fake-runtime test: 99 daemon tests passed and one returned
`gateway.runtime_composition.denied` instead of success. The exact test passed
alone, then the normal parallel daemon suite passed 100/100 on unchanged source.
A subsequent full `npm run check` passed on the same frozen candidate, including
100/100 daemon tests twice and 240 store tests with the child harness normally
ignored but explicitly invoked by its parent regression. Workspace Clippy,
formatting, source metadata and `npm run build` passed. The cause of the initial
intermittent denial was not identified; no correction of that reliability
history is claimed.

Independent source review closed the validation finding after the terminal
unchanged full-check pass. Review provenance is tracked as `PHR-0009` in the
[public-history review registry](reference/public-history-reviews/registry.json).
Exact-head Linux source CI run `36957301014` completed successfully at
`59396f5927a7e5f657d9a4983748ac084701181c`. This closes the hosted source
gate only; the historical failed run remains failure evidence. Gitleaks found no leaks;
named Rust and JavaScript Semgrep scans found no new confirmed production
defect, with unchanged informational Rust findings locally triaged. Native npm
dependency and signature checks passed. Recursive offline OSV remained
unverified because its vulnerability database was unavailable; a separate
public-coordinate query returned no advisories for the one new Nix version.
That narrow query is not full dependency coverage or a vulnerability-free claim.

This observes main database metadata only. It does not prove release-artifact
identity, effective ACL isolation, journal/WAL/SHM descriptor custody, resource
identity or OS enforcement. No serializable permit, production proof injection,
initializer, configuration activation, CLI, route, schema or migration is added.
Complete atomic initialization and V1 remain incomplete. The Phase 11 operator
packet remains runtime authority and its source-only verdict is unchanged.

### HCFG-5B B4 durable-state contract

Canonical work record: this subsection. The [proposed durable-state source
contract](architecture/headless-local-bootstrap/state-source-spec.md) fills the
installation/generation/current-pointer/bootstrap-audit details required by the
accepted HCFG-5B and HCFG-6 designs. It is supporting contract work, not an
initializer or trusted-state implementation. Current schema remains 17; no
table, migration, state reader, route, CLI or mutation is added.

The contract retains the four planned `headless_installations`,
`headless_generations`, `headless_active` and `headless_config_audit` families.
It separates the owner's confirmed declaration reference from the new random
installation/store-instance UUIDs. Both are bound by the immutable root and
bootstrap event; confirmed declaration/binding/preparation bytes are preserved.
The pure model uses the stored declaration reference, while a future private
authenticated comparison must also bind the actual UUID/store/file root.

Ordered columns, distinct hash domains, bounded canonical text, null genesis,
noncircular root/generation/audit linkage and same-transaction readback are
specified. Current-state derivation must recheck selected-store custody,
complete audit/generation evidence, actual compiled policy, epochs/stop and
fresh native resource/enforcement proof. Existing transaction-local session/
CSRF checks and the C1 current-owner credential recheck are reused; neither
creates installation authority.

Two synthetic store vectors were recomputed independently to check canonical
framing, ordered column counts and the distinct root/generation/audit
commitments for one shared declaration reference. They do not prove Rust
parser execution, credential/event rederivation, native observations, store
custody or a trusted-state reader. Fresh independent OpenAI Terra xhigh
contract review resolved a rendered credential-generation invariant error;
the corrected value is exactly `1`. Artifact-shape, formatting, documentation
direction (31 tests, 183 Markdown files), public readiness, inventory
(2,122 occurrences across 295 files), schema-17 truth, public-history evidence
(11 attested, zero pending), and unchanged Phase 11 readiness (43 tests,
execution closed) passed. This remains a proposed supporting contract, not
complete source-freeze acceptance or implementation evidence.

Draft PR #78 remains unmerged at exact head
`751c14811fda380adcc00e3f036baab89e836725`. GitHub readback confirmed CI run
`37152111406`, attempt 1, and source-gate job `111287942648` completed
successfully at `2026-10-03T20:54:17Z`. This validates the source draft; no
merge, initialization or runtime authority follows.

The proposed next headless migration 18 cannot silently import the unrelated
historical Phase 7d signed-evidence v18 test-only layout. Actual registration
requires reconciliation of the compiled schema, exhaustive eligibility and
legacy truth labels; optional signing remains blocked. The complete native/
wire/daemon/store freeze retains its gates. Source-order acceptance was pending
at this checkpoint and was accepted later in the canonical staging record.
No Stage-A implementation, initialization, activation, Docker, host ACL,
artifact build, merge, release or production action follows from this record.

### HCFG-5B B5 schema and verification contract

Canonical work record: this subsection. The [B5 schema source proposal](architecture/headless-local-bootstrap/schema-source-spec.md)
specifies exact candidate SQL for the B4 root/generation/audit/pointer layout.
It executes no new SQL, adds no migration file or registry entry, and leaves
current schema 17 and ordinary store behavior unchanged. Its migration-body
text identity is separate from the still-unset actual SQLite schema digest.
Source-order acceptance was pending at this B5 checkpoint; the later accepted
amendment is recorded below. The full integration gate remains closed.

The proposal rejects occupancy in all 28 existing non-seed tables before any
lasting migration change. Metadata and retention rebuilding are explicit
seed mechanics: retain all 28 current preserve-only families and add four.
It adds four STRICT empty headless tables, exact unique indexes, deferred
cyclic foreign keys, immutable-history triggers and pointer genesis/monotonic
guards. Static expectations are 35 tables, 32 non-seed tables and 242 main
objects; these counts are not observed SQLite output. Actual candidate
execution, full emitted-object verification and the new schema digest remain
unproven. No legacy owner or restored authority acquires headless authority.

Source inspection also found a profile compatibility dependency. HCFG-6's
native proposal selects contract `lnsat.runtime_profile.docker_local.v2` at
schema version 3; at the B5 checkpoint the conditional comparison model
recognized only asserted v1. A future generation must retain the actual native
profile identity. The separately recorded pure-model compatibility slice
addresses conditional v2 recognition; authenticated comparison still requires
verified native/current state. Relabeling v2 as v1 or an
always-denying placeholder cannot close that requirement. B5 changes no
comparison source or native behavior.

Independent OpenAI Terra xhigh contract review passed with no findings. A
separate Luna medium static inventory confirmed the B4 column ordering,
foreign-key parent keys, guard/retention families, named indexes/triggers and
exact proposed SQL-text hash. Neither review executed SQL or established its
syntax, emitted SQLite objects or a schema-manifest digest. Artifact shape,
formatting, documentation direction (31 tests, 184 Markdown files), public
readiness, inventory (2,122 occurrences across 295 files), schema-17 truth,
public-history evidence (11 attested, zero pending), and unchanged Phase 11
readiness (43 tests, execution closed) passed. These are documentation/static
checks; the unchanged parent source gate passed in PR #78. Actual candidate
SQL execution, source implementation and runtime proof remain unperformed.

Draft PR #79 is unmerged at exact head
`2fcdbb0d937cddc29f77497e7d38896bb947a23a`. GitHub readback confirmed
source-gate CI run `37154531103` and job `111295076082` succeeded at
`2026-10-03T21:34:42Z`. It validates the supporting source draft, not candidate
SQL execution, schema identity, initialization or runtime authority.

### HCFG-5B B6 selected-write and migration custody contract

Canonical work record: this subsection. The [B6 selected-write source proposal](architecture/headless-local-bootstrap/selected-write-source-spec.md)
specifies private writable connection ownership and selected migration ordering
needed by complete atomic setup. Source inspection confirmed that B3B remains
read-only main-descriptor custody, ordinary `SqliteStore::open` remains unbound
and automatically migrates its legacy list, and B2/C1 supply only owner and
credential prerequisites. None implements this writable initializer.

The proposal keeps candidate schema 18 outside the ordinary migration list,
requires the lease before a no-create fixed-VFS writable open, repeats exact
schema/empty-state checks inside explicit immediate transactions, and preserves
actual main-descriptor observation without an extra database alias. WAL/SHM
named-path/lifecycle evidence is explicitly distinct from descriptor-bound
proof; the concrete observer and full writer/mutex freeze remain outstanding.
No source, schema, pragma or existing ordinary-open behavior changes here.

Migration commits before preparation. The proposed preparation store digest
binds actual B4 file/path custody to schema 18 and its future exact manifest;
no precommit installation UUID or schema-17 journal is repurposed. Preparation
and cleanup precede one atomic owner/root/generation/audit/pointer transaction.
Credential scopes follow the actual connection, unknown commits require exact
readback, and connection closure precedes lease release. Journals, diagnostics
and copied state never become authority.

Fresh independent OpenAI Terra xhigh contract review found no actionable
P1/P2/P3. Artifact shape, formatting, documentation direction (31 tests,
185 Markdown files), public readiness, inventory (2,122 occurrences across
295 files), schema-17 truth, committed native provenance (12 attested,
zero pending) and unchanged Phase 11 readiness (43 tests, execution closed)
passed. These validate documentation and existing source boundaries; no
candidate SQL or new source test ran. The unchanged parent source gate passed
at exact draft PR #80 head `65a5441f661c35fcf4ac102d9b5a46346c36197d`.

This is supporting contract work under accepted HCFG-5B/HCFG-6 baselines, not
complete freeze acceptance or selected-write implementation. Source-order
acceptance was pending at this B6 checkpoint; the later accepted amendment is
recorded below. Candidate SQL execution, initialization, activation, Docker,
host mutation, merge, artifact builds, signing, release, deploy and production
remain closed at this B6 checkpoint. V1 and
enterprise/government readiness are incomplete. The Phase 11 operator packet
retains its locked source and source-only runtime verdict.

## HCFG-6 Resource And Runtime Enforcement Design

Canonical work record: this section. The accepted V1 requirement needs real
nonempty resource identity and selected OS enforcement at grant and use.
**The human owner accepted HCFG-6 for bounded source implementation on
2026-10-01**, replying `accepted` directly to the request for draft PR #72 at
exact reviewed head `0dbe0a2874428721b1a4ba6bad1708ec5fdbb572`.
The [intent](architecture/headless-resource-enforcement/intent.md),
[specification](architecture/headless-resource-enforcement/spec.md) and
[plan](architecture/headless-resource-enforcement/plan.md) record that accepted
design. HCFG-5B/5C acceptance and green CI were prerequisites, not the source
of this new human decision.

Acceptance includes the first same-host Linux Docker Engine 29.8.2/API 1.56
rootful engineering backend, explicit trusted host/kernel/daemon boundary,
nonempty marked Git repository and exact runtime profile, owner-controlled
binding, private daemon/kernel startup observations, resource-free bootstrap
probe and inert trusted-adapter staging. Unsupported kinds/mappings deny.
This selects no package OS/architecture row and supplies no supported runtime.

The owner also accepted the narrow amendment to bootstrap's no-resource-open
rule: metadata-only held directory handles and bounded host-side marker/Git
identity reads after the selected-store lease and declaration/binding checks.
The [bootstrap intent](architecture/headless-local-bootstrap/intent.md),
[specification](architecture/headless-local-bootstrap/spec.md) and
[plan](architecture/headless-local-bootstrap/plan.md) reconcile that exception,
handle lifetime, finite owner preparation budget, random precommit preparation
ID, durable journal and later atomic installation/audit binding. No Git
subprocess, target-mounted workload, target action or action grant is permitted
during bootstrap. Existing B1/B2/B3B source behavior is unchanged.

Current Docker-local source verifies configuration, executable/endpoint metadata
and a marked disposable Git target before launch, then writes the approved
action payload immediately after spawn. Restrictive argv and a configured
mount source do not prove the workload's actual target inode, namespaces,
privilege, seccomp or cgroup controls. No authenticated startup observation
barrier or verified filesystem-backed HCFG owner-binding inventory is implemented. The S1 pure input decoder below does not supply either. No boolean, caller JSON,
mocked observer or empty-only initializer completes HCFG-6. Atomic bootstrap,
protected control, monitoring, actual runtime and V1 remain incomplete.

Initial design review found a P1 bootstrap-order conflict and P2 backend/journal
identity gaps. The revised design named the exact backend, explicitly sought
the metadata amendment and allocated preparation identity before installation.
Fresh independent OpenAI Terra xhigh read-only review of the final feasibility
clarifications found no actionable P1/P2/P3. At the accepted head, design
artifact, docs, formatting, public-readiness, inventory and native review-evidence
checks passed; the unchanged Phase 11 readiness suite passed 43/43. GitHub
connector verification after the human decision confirmed draft PR #72 at the
same exact head and CI run `36963652146` completed successfully. Those results
cover that accepted head, not subsequent acceptance-document edits.

**Next source gate: complete and independently review the exact source freeze
before behavioral integration.** It must resolve genuine native mount and
effective-ACL observation, immutable component/template and kernel recipe
identities, bounded wire/daemon/native formats, cleanup custody and
store/admission/revocation linearization. Persistent resource identity is
distinct from live mount/namespace tokens. The finite resource-free owner
preparation budget is distinct from HCFG-3's zero denied-action budget; startup
and action share one bounded action budget without resetting it at release.
Real kernel/daemon observations and later runtime/package proof remain required.

### HCFG-6 S1 pure owner-binding decoder source draft

On 2026-10-02, the bounded S1 pure decoder source draft was recorded from the
exact owner-binding contract in
[the supporting source specification](architecture/headless-resource-enforcement/bindings-source-spec.md).
It accepts caller bytes plus a sealed HCFG-3 declaration and returns a sealed
unverified declaration input. It performs no file loading, path resolution,
owner or OS observation, selected-store proof, persistence, CLI, route,
generation, permission grant, or runtime work. Strict bounds, exact inventory
matching, canonical path syntax, lexical overlap rejection, separate
commitments, asserted-identity pairing, and redacted diagnostics are covered
by fifteen focused Rust tests.

Fifteen focused Rust tests, Rustfmt, strict Clippy and the complete pinned `npm run check` passed. Documentation/public checks and inventory passed; the unchanged Phase 11 readiness suite passed 43/43. Local Semgrep `p/rust` ran eleven rules on ten Rust files with zero findings or parse errors, and Gitleaks reported zero worktree findings. Fresh independent OpenAI Terra xhigh read-only review resolved a plan-order conflict and missing test proofs, then found no remaining actionable P1/P2/P3. The first broad check stopped on sandbox-denied disposable socket fixtures (`Operation not permitted`); the complete rerun with disposable local fixtures allowed exited zero. Draft PR #74 is at exact head `5fd0a571d6b74ba34333aae8d4c80b0427caffc3`. GitHub readback confirmed exact-head CI run `37102692708` and its source-gate job `111145197193` completed successfully. This S1 draft is a pure input prerequisite and does not
complete the HCFG-6 source freeze, native/wire/daemon/synchronization
contracts, verifier, bootstrap, runtime, package, release, or V1 gates.
Current profile/protocol and Phase 11 source-lock truth remain unchanged.

### HCFG-6 native source-freeze proposal checkpoint

The supporting [native source specification](architecture/headless-resource-enforcement/native-source-spec.md)
and [preparation/store specification](architecture/headless-resource-enforcement/preparation-store-source-spec.md)
were added on 2026-10-02 in an isolated public checkout based on PR #74's exact
source head. They specify private native ownership, held-object and ACL bounds,
genuine procfs/mount/cgroup association, a separate preparation protocol without
an unborn installation ID, profile 3/protocol 2, finite private daemon transport,
immutable preparation revisions, exact cleanup and installation-wide release/
revocation serialization. They change documentation only.

Independent OpenAI Terra xhigh native feasibility review found a feasible
non-root path within the accepted trusted-root model after two P2 corrections:
require a present exact-controller socket ACL observed with safe bounded
no-follow path reads under held root-controlled ancestry, and name the daemon
identity bridge as root-provisioned artifact attestation tied to current kernel
peer credentials, peer pidfd, boot ID, start ticks and socket identity. No direct
non-root hash of a running root daemon's ptrace-protected executable is claimed.
Inherited/proxied listeners, generic ACL-absence positives and unsupported
native observations deny. The proposed safe Rust ACL dependency is not added.

**The complete source freeze remains pending.** Ordinary-object kernel/LSM ACL
absence classification, exact nested native wire fields, API security-field
projections, immutable built-in mount/device/security recipes and actual
component/kernel/image pins still require complete review before behavioral
integration. Actual pins remain `UNSET_BLOCKING`; no source activation may
proceed while unset. This checkpoint supplies no native verifier, journal,
migration, bootstrap, release guard, protected control, watch or runtime proof.
The Phase 11 packet remains runtime authority; full HCFG-6 and V1 remain open.

For this documentation checkpoint, artifact shapes, exact-doc formatting,
documentation alignment (31 tests, 170 Markdown files), public readiness
(901 files), refreshed inventory (2,122 occurrences across 295 files) and the
unchanged Phase 11 readiness suite (43/43) passed. Fresh independent OpenAI
Terra xhigh proposal review resolved frame-size, nullable-index and review-base
ambiguities, then found no remaining actionable P1/P2/P3. That PASS covers this
proposal checkpoint only. The complete source freeze and behavioral integration
remain gated, and hosted CI for this subsequent documentation head is separate
from green PR #74 source CI.

### HCFG-6 exact native/wire/daemon research checkpoint

On 2026-10-03, GitHub readback confirmed draft PR #75 head
`60460a33291b621836d73f1bb746bf4c384b59a5` and exact-head CI run `37104768503`
completed successfully. That result covers the earlier documentation proposal,
not this subsequent delta. Fetched public main remains
`e09a6b02634b04a46f861ed8b092acc2c2e50fe8`; the canonical checkpoint remains
clean and its private archive remote is not public-main authority.

The supporting [wire proposal](architecture/headless-resource-enforcement/startup-wire-source-spec.md)
now specifies schema-3 profile fields, separate precommit/action contexts,
native fields, canonical domains and frame bounds. The
[Docker proposal](architecture/headless-resource-enforcement/docker-source-spec.md)
resolves API 1.56 against exact Moby 29.8.2 commit
`8af9fe3a36bab3e039862a2ab1cef1880c9b4d03`, finite request/framing controls,
generated readonly metadata and rootful namespace/device assumptions. The
[native proposal](architecture/headless-resource-enforcement/native-source-spec.md)
adds the stock-ext4 no-reachable-ENOSYS predicate, manifest bootstrap ordering
and explicit trusted-root idmapped-mount attestation. Mountinfo does not expose
an idmapped flag. Selected-store ACL evidence is associated named-path proof,
not a database alias or fd-bound ACL read.

Independent exact-source review found that Moby always repeats the primary
GID in the workload's supplementary list. The proposed positive predicate is
exactly one copy of that same effective GID; every distinct group denies. The
host controller's list stays empty. This corrects an impossible empty-workload
list without adding a distinct effective group-access class. The accepted
specification explains the correction; recorded human acceptance stays at
exact PR #72 head. Full-freeze review still gates behavioral integration.

**This remains a documentation proposal checkpoint.** Closed nested API
response projections, manifest anchor/provenance fields, realized immutable
mount/device/environment and negative-probe recipe, actual component/kernel/
image pins and coherent full-freeze review remain required. Synthetic golden
vectors establish proposed byte commitments only. No native verifier, journal,
migration, atomic bootstrap, protected control, watch, runtime or V1 completion
is supplied by this delta. Phase 11 runtime authority and all execution gates
remain unchanged.

For the 2026-10-03 proposal delta, documentation alignment passed 31 tests
with 174 Markdown files, public readiness checked 905 files, legacy inventory
remained 2,122 occurrences across 295 files, and unchanged Phase 11 readiness
passed 43/43 with execution closed. Fresh independent OpenAI Terra xhigh
native/wire/Docker/vector review found no remaining actionable P1/P2/P3.
These checks and review cover documentation and synthetic commitments only;
the full native source freeze remains pending. Hosted CI must be checked on
the subsequently committed exact head.

### HCFG-6 root manifest and OCI custody proposal checkpoint

Exact draft PR #75 head `c74b9b5607453a738813b91b3a93eab54cd046ed` passed
hosted source CI run `37109900511` on 2026-10-03. Complete local pinned source
validation for that head passed 1,471 workspace tests and 541 Rust tests with
one ignored case. Those results cover that head, not this subsequent proposal.

The [root manifest/OCI companion](architecture/headless-resource-enforcement/root-manifest-source-spec.md)
now defines a strict root-controlled anchor, canonical manifest commitment,
current daemon/kernel instance association, exact artifact/provenance records
and raw OCI config/manifest/optional-index parent links. Profile/caller digests
are content expectations, not root authority. A hashed provenance file binds
its identity; its build/current-instance assertion uses the accepted trusted
root boundary. No signature, remote attestation, hostile-host protection,
certification or actual installed-image proof is claimed.

Exact Moby create/start/Inspect source confirms a pre-start `none` endpoint
placeholder, allocated Ports/Networks objects and a tracked-only Mounts array.
Generated metadata/OCI mounts require native observations; API image Config
re-encoding cannot authenticate raw config ImageID or parent links. The
[Docker companion](architecture/headless-resource-enforcement/docker-source-spec.md)
records these positive-case corrections and source-defined omission/default
limits. Complete nested projections and exact selected normalization still
remain open.

This is documentation only. Full native source freeze still requires the
closed nested API allowlist, complete immutable realized mount/device/environment
and negative-probe recipe, actual reviewed pins and coherent independent
review. No native verifier, preparation journal, atomic bootstrap, protected
generation/epoch/stop/revocation, monitoring, runtime, package or V1 completion
is supplied. Phase 11 status authority and execution gates remain unchanged.
For this documentation delta, artifact-shape checks passed 3/3, exact-doc
formatting and diff checks passed, direction validation passed 31 tests with
175 Markdown files, public readiness checked 906 files, and refreshed inventory
remained 2,122 occurrences across 295 files. Unchanged Phase 11 readiness passed
43/43 with execution closed. Fresh independent OpenAI Terra xhigh read-only
review of the complete eight-file proposal found no remaining actionable
P1/P2/P3 after the controller clarified the ext4-versus-native virtual-filesystem
scope and explicit current-kernel trust bridge. This PASS covers the proposed
grammar/source facts only; full source freeze and new exact-head hosted CI
remain separate gates. Unchanged source suites are the prior exact-head
results above, not newly run tests of a live verifier.

### HCFG-6 closed response proposal checkpoint

Exact draft PR #75 head `4f9955a5fcab9cb5fadf1c26913e0821a631ff47` passed
hosted source CI run `37113024699` with source-gate job `111174452417`.
Those terminal results cover the preceding root/OCI proposal, not the following
documentation delta. Public main remains
`e09a6b02634b04a46f861ed8b092acc2c2e50fe8` after a fresh fetch.

The [closed Docker response proposal](architecture/headless-resource-enforcement/docker-response-source-spec.md)
adds explicit nested types, compare/discard/forbid paths and source-normalized
empty/null/omitted rules. Its pinned mechanical appendix inventories 47 types
and 368 fields; this extraction is not a permission or runtime proof. Exact
served routing, image merge, create defaults, Inspect construction and null
network source resolve successful empty warnings, Args/Cmd separation, copied
masked/readonly defaults, omitted mount options, inactive Swarm, disabled NRI,
stock runtime aliases and uname-versus-Go architecture. The proposed first
recipe explicitly fixes ShmSize and empty daemon default ulimits; no host
configuration is observed or changed.

This remains a source-contract proposal. Actual immutable component/kernel/
image pins, complete realized mount/device/environment/security values,
negative-probe procedures and coherent independent full-freeze review remain
required before behavioral integration. No native verifier, journal, atomic
bootstrap, active generation, protected control, watch or runtime is added.
Phase 11 remains `PREPARED_SOURCE_ONLY_NOT_EXECUTION_READY`; V1 and enterprise/
government deployment readiness remain incomplete.

For this documentation delta, artifact-shape checks passed 3/3, exact-doc
formatting and diff checks passed, direction validation passed 31 tests with
176 Markdown files, public readiness checked 907 files and refreshed inventory
remained 2,122 occurrences across 295 files. Unchanged Phase 11 readiness
passed 43/43 with execution closed. A separate mechanical check matched all
47 type sections, 368 source field references and copied snapshot hashes.
Fresh independent OpenAI Terra xhigh read-only review found no remaining
actionable P1/P2/P3 after correcting an ambiguous string-size override,
documentation index descriptions and explicit fixed HostConfig response
values. The component predicate names the complete stock
Engine/containerd/runc/docker-init call path. No Go serialization canary was
run because no Go compiler is installed; no installation occurred. These are
source-contract and documentation results, not parser/enforcement tests or
full-freeze approval. New exact-head hosted CI remains separate from the
preceding green result; unchanged runtime source retains its prior evidence.

### HCFG-6 realized recipe proposal checkpoint

Exact draft PR #75 head `033323b276e1fc874a6fae43c88551275eacc913` passed
hosted source CI run `37116570533`. This terminal result covers the preceding
closed-response checkpoint, not the following documentation proposal. Freshly
fetched public main remains `e09a6b02634b04a46f861ed8b092acc2c2e50fe8` and is
an ancestor of this source chain; the canonical archive checkout remains clean.

The [realized recipe proposal](architecture/headless-resource-enforcement/realized-recipe-source-spec.md)
defines finite mount/device predicates, exact initial image/process environment
and five challenged native denial sentinels. Exact runc v1.5.2 peeled source
resolves shared directory-mask tmpfs aliases, potentially writable private
null-device file masks, standard nodes/symlinks, no-TTY setup and mknod-to-host-
bind fallback. That fallback is excluded from the proposed positive recipe.
The private wire adds bounded initial environment observations; updated
synthetic vectors remain unverified encoding examples. CPU bandwidth units are
explicitly millicores, distinct from wall time and total CPU consumption.

Complete source freeze remains open: actual component/kernel/template/image
pins are `UNSET_BLOCKING`; the exact registry and derived commitment layouts,
selected snapshotter/kernel mount normalization, immutable image/library/Git
inventory, current root-attested mask layout, safe probe methods and controlled
resource-pressure procedures require further source review. Five sentinels
cannot prove every denied syscall or resource ceiling. No behavior, native
verifier, journal, bootstrap, protected control, monitoring or runtime is added.
There is no change to accepted design or the separate activation gates.
Phase 11 remains `PREPARED_SOURCE_ONLY_NOT_EXECUTION_READY`; V1 and enterprise/
government readiness remain incomplete.

For this documentation delta, artifact-shape checks passed 3/3, direction
validation passed 31 tests with 177 Markdown files, public readiness checked
908 files, and inventory remained 2,122 occurrences across 295 files.
Unchanged Phase 11 readiness passed 43/43 with execution closed. A pinned
Node verifier reconstructed the displayed synthetic inputs, commitments and
frame byte counts; a separate structural check covered all 32 recipe table
rows. Fresh independent OpenAI Terra xhigh review found no remaining P1/P2/P3
after two vector corrections and one malformed table row were fixed. The
first vector verifier incorrectly replaced displayed release inputs with
derived values; it was tightened to reject those mismatches. Its earlier PASS
is superseded, not enforcement evidence. No native syscall, pressure,
Docker or live environment test was run. New exact-head hosted CI remains
separate; prior CI is not evidence for this proposal delta.

### HCFG-6 proposed source-freeze staging amendment

Canonical decision record: this subsection. Independent read-only gate audit
found a P2 ordering cycle: actual new adapter/probe/image pins are required
before behavioral integration, while implementing those candidates and
constructing the image are both closed before that same complete freeze.
Source/artifact/runtime evidence must not be substituted for one another.

The human owner accepted the
[staging decision](architecture/headless-resource-enforcement/source-freeze-staging-decision.md)
in this development conversation on 2026-10-03 (America/Los_Angeles), replying
`accepted` to the presented PR #75 source-order amendment at exact reviewed
revision `5a1338cb31706bde4e1458a5089cfacb28e90917`. The decision bytes at the
current stack base were verified equal to that reviewed revision. This is a
direct human acceptance, not controller self-acceptance or inference from CI.

**Source-order acceptance is complete.** Reviewed inert private Stage-A
candidate modules may follow their exact contracts and fresh independent
review without final artifact pins. Separately authorized artifact capture and
one complete source/pin/positive-feasibility freeze remain required before
product integration. Docker, image/package construction, permission changes,
initializer, active integration, merge, release and runtime remain closed.
The original HCFG-6 acceptance is unchanged; this amends source ordering only.
Earlier checkpoint statements of pending source-order acceptance are historical.

The first selected engine candidate is the
[private preparation-journal codec](architecture/headless-resource-enforcement/preparation-store-source-spec.md#stage-a-private-journal-codec-contract),
following the native plan's codec-first order. Its exact canonical grammar,
commitments, phase/identity continuity, finite bounds, fixed errors and private
ownership receive independent contract review before code. Native/file custody,
schema writes, bootstrap/release and full-freeze integration remain separate;
codec success cannot prove a current fact or create authority.

Exact Moby source also establishes root-owned `0710` containers/per-container
metadata ancestors and `0644` generated files. Same-UID access does not prove
non-root controller access to the accepted rootful daemon. Required native
metadata custody needs a reviewed feasible preprovisioned ACL or other exact
accepted method; no privileged helper, automatic permission change or procfs
magic-link fallback is inferred. This remains a full-freeze feasibility item.

The preceding exact recipe head `a73d9d7068c48f7a6acabe0451ef4ab26967dbff`
passed hosted source CI run `37118861695`. For this proposed decision,
documentation direction passed 31 tests (178 Markdown files), public readiness
checked 909 files, inventory remained 2,122 occurrences across 295 files, and
unchanged Phase 11 readiness passed 43/43 with execution closed. Exact-doc
formatting and diff checks passed. Fresh independent OpenAI Terra xhigh review
found no remaining P1/P2/P3 after separating complete source/artifact freeze
from later live activation observations, avoiding another ordering cycle.
That review covered the proposed amendment only. The later human acceptance
above opens the stated source ordering, not a complete freeze or runtime claim.

Exact parent security-design PR #86 head
`350abaccf6a2b32e0b4edc01120a763d8d9471d8` passed hosted source CI run
`37168251752`, job `111335662383`, at `2026-10-04T01:49:25Z`.
This is exact source/design evidence, not implementation of proposed MFA,
strict crypto, encrypted storage or independent audit custody.

### Stage-A preparation-journal codec candidate

Canonical implementation record: this subsection under the accepted source-order
amendment. The private store candidate implements exact journal record syntax,
candidate/journal commitments and bounded immutable revision-chain validation.
It follows the accepted codec-first preparation-engine sequence. All module
functions/types remain private; the scoped dormant-module annotation preserves
its disconnected state. No public re-export, active caller, file/database
operation, native observer, random-ID generator or transition writer is added.

Strict parsing requires every field, including explicit nullable members,
struct-order compact JSON and exactly one LF. It rejects alternate encodings,
wrong schema/digest/identity/type/bounds, immutable context drift, missing prior
digest, revision gaps/replays, forbidden phase edges and container substitution.
Five data-free errors provide fixed bounded codes. Parsed chains are untrusted
assertions of internal consistency, not evidence of actual custody, cleanup,
current store identity, completed bootstrap or action authority.

Fresh pre-implementation contract review resolved two P2 ambiguities (digest
spelling and closed errors) and explicit P3 quarantine-positive coverage before
source began. Independent Python/manual positional-array goldens anchor the
commitments. The final focused Rust suite passed 11/11. The complete pinned
`npm run check` exited zero, including strict workspace Clippy/Rustfmt,
1,471 TypeScript workspace tests, 139 contract conformance cases, 262 store
tests (one child helper is marked ignored and invoked by its cross-process
regression), 100 daemon tests, and unchanged Phase 11 readiness 43/43 with
execution closed. Documentation direction passed 31 tests over 189 Markdown files;
public readiness checked 941 files and inventory remained 2,122 occurrences
across 295 files.

Fresh independent OpenAI Terra xhigh source review resolved historical status
ambiguity, a missing created-container negative and a phase-type error-class
defect. The latter already denied admission; the string-only decoder now
classifies all five tested wrong JSON types as `journal.invalid_record`.
Public-history-native review binding uses `PHR-0014`; the reviewed source commit
and its separate attestation child must bind the actual Git tree, canonical
diff and file hashes. No source/readiness/release approval is inferred from
that identifier alone.

Named local Semgrep `p/rust` ran eleven rules on eleven Rust files without parse
errors. Neither new journal file had an alert; five unchanged temp-directory
alerts elsewhere remain recorded with bounded baseline triage. Redacted
Gitleaks reported zero worktree leaks. Dependency manifests and locks are
unchanged. The first full check failed on sandbox-denied disposable sockets;
the first final-source rerun failed on stale generated inventory. Both failures
are retained separately. After inventory regeneration, the complete rerun with
disposable local fixtures allowed passed; no gate was skipped or waived.

At the codec checkpoint, durable file/native custody and the remaining engine
work were unfinished. The subsequent private journal-custody candidate is
recorded below. Native/profile proof, selected-store/schema-18 writing,
bootstrap/release, complete source/pin/positive-feasibility freeze, product
integration, monitoring, advanced security and real runtime proof remain
unfinished. Actual pins remain
`UNSET_BLOCKING`. This candidate neither narrows the V1 end state nor replaces
the nonempty engine with a diagnostic/always-denying observer.

### Stage-A private Linux journal custody candidate

Canonical implementation record: this subsection. The human-accepted source-
order amendment permits the private filesystem candidate after its exact
contract and fresh precode review. Source is present in the private
`headless_preparation` child, with a minimal selected-store lifetime bridge.
All entrypoints remain disconnected; the schema is still 17 and the existing
ordinary/read-only selected-store APIs retain their behavior.

The guard exclusively borrows an actual inspected read-only `SqliteStore`,
retains its actual parent and exclusive lease, and rechecks native main-file
association without duplicating or closing SQLite's descriptor. Safe Linux
`openat2` descent and descriptor-relative `mkdirat` anchor the owner-private
root, preparation directories and revision files. Modes are checked, never
repaired. Canonical untrusted frames use exclusive no-clobber creation, full
file flush then directory flush, complete bounded readback and fixed errors.
There is no path-only I/O, procfs fallback, public constructor or successful-
observer injection.

Private actual stat/chain baselines reject inode replacement and observed
content drift within one guard lifetime. Each inspection reads the complete
root twice and compares both results with the retained baseline. Append admits
only its exact expected delta; older files and unrelated preparations remain
unchanged. Any failure poisons the guard, returns no partial result, and leaves
partial files for denial/reconciliation without repair, retry or deletion.
Restart establishes a new physical baseline from untrusted bytes; it supplies
no external anti-rollback or earlier-flush success proof. Finite observation
checks are not atomic with arbitrary same-owner host mutation.

Only the existing exact `nix 0.31.3` gains its `dir` feature; dependency versions,
locks and toolchains are unchanged. Its actual pinned `Dir::from_fd` error
branch leaves ownership open despite the API documentation. A narrowly pinned
safe wrapper closes only that newly owned enumeration descriptor once on
failure; it never handles a borrowed/main/lease descriptor. Dependency upgrades
must re-review this rule. Shared logic compiles on macOS; actual construction
and descent deny there without a fallback.

Precode review resolved creation anchoring, descriptor ownership, retained
baseline and inspection/post-append comparison ambiguities before their
implementation. Local focused Rust tests passed 13/13: the existing 11 codec
groups, a genuine macOS platform-denial case and descriptor ownership checks
in an isolated child test process. Its ignored helper runs explicitly in that
child, avoiding descriptor reuse by parallel tests. Strict store all-target
Clippy and the complete pinned `npm run check` passed: 1,471 TypeScript tests,
139 cross-language comparisons, 264 store tests and the remaining workspace
Rust gates. Both ignored store helpers are invoked by their parent regression
tests. Docs checks covered 189 Markdown files, 33 critical documents and all
14 roadmap phases; public checks covered 944 project files. Inventory and
pending-source history validation passed without granting release eligibility.

Fresh independent custody source/docs and aggregate Rust/claims reviews passed.
The changed Rust files' named Semgrep scan returned two test-only alerts,
independently reviewed as non-actionable fixture findings. Redacted Gitleaks
returned zero findings; recursive OSV returned zero known dependency alerts.
Initial default-cache, lint and scanner certificate failures were corrected
without installing tools. The first complete check rejected the shared clone's
Git object alternates; copying its objects locally, removing only that alternate
reference and passing `git fsck --full` resolved the provenance failure. The
complete rerun passed; failed attempts remain separate evidence, with no gate
skipped or waived. Aggregate build review identified a separate Cargo-home
configuration P2 to correct before main integration.

At this reviewed source checkpoint, nonempty Linux filesystem positives must run on the
exact published source head in the existing pinned Ubuntu CI; they were not
executed on the macOS host. Source fixtures do not establish the selected
kernel/profile, ACL/mount/ancestry feasibility or Phase 11 runtime proof.

This candidate persists untrusted phase assertions only. `cleanup_verified`
and `bound` do not prove observed cleanup or committed SQL/audit state. The
observation-owning phase writer, B6 writable connection, schema-18 execution,
atomic bootstrap, release serialization, all-writer coverage, native profile/
Docker observation, complete source/pin/positive-feasibility freeze and product
integration remain unfinished. Watch/monitoring and strict crypto/MFA/audit
assurance remain their separate accepted or proposed work. No operator CLI,
route, live initializer, activation, artifact construction, Docker, merge,
release, deployment or production action is opened. Phase 11 remains
`PREPARED_SOURCE_ONLY_NOT_EXECUTION_READY`; actual pins remain `UNSET_BLOCKING`.

### Main source integration: native build configuration correction

Canonical implementation record: this subsection. The requested preparation for
GitHub main integration includes the reviewed linear source chain and the
private Stage-A custody candidate; unrelated conflicting drafts and failing
dependency PRs are excluded. This preparation supplies no merge authorization.

Fresh aggregate build review found a P2: the native override gate inspected only
repository config and process environment while Cargo could also load selected
home or ancestor configuration. The independently reviewed correction resolves
the physical repository cwd and effective Cargo home, rejects external config
presence before tool invocation, requires a regular non-symlink exact repository
config, closes named direct and Cargo-equivalent native selectors, and rejects
extra runner arguments. It never reads external config contents or modifies
operator configuration. Developer-host and toolchain trust remain explicit;
finite checks supply no release attestation or concurrent hostile-host proof.

The source correction is present. All 10 focused native-policy tests passed,
including real runner subprocesses that reject wrapper/linker home config,
ancestor/legacy config, dangling/symlink config and named environment selectors
before fake Cargo's sentinel is reached. A configuration-free physical-path
positive reaches that sentinel. The complete pinned `npm run rust:check` passed,
including strict all-target Clippy, 139 contract comparisons and workspace tests.
Docs checks passed 31 tests across 189 Markdown files, 33 critical documents and
14 phases; public checks passed across 945 project files. Named `p/javascript`
Semgrep returned zero alerts/errors and redacted Gitleaks returned zero findings.
Dependency versions and lockfiles are unchanged by this correction. Inventory,
final independent review and history attestation retain their gates.

The preceding custody slice's complete `npm run check` passed at its own reviewed
checkpoint. Exact-head Ubuntu CI and resolved review threads remain required
for a concrete main merge decision. Strict crypto, MFA and audit/privacy designs
remain proposals. Full source/pin/positive-feasibility freeze, behavioral
integration, Docker, host mutation, schema-18 execution, artifacts, signing,
release, deployment and production remain closed.

The main integration candidate is public PR #88, initially published at exact
head `d1b1d85b40cbc01a802a8a68eac5e1be516e023f`. Its Ubuntu source CI run
`37191633294` failed strict all-target Clippy on five Linux-only test diagnostics:
one redundant `Write` import and four needless identifier borrows in the
private custody fixtures. Dependency signatures and vulnerability checks passed;
the new Linux custody positives had not run when Clippy stopped the gate. The
failure remains recorded despite the preceding macOS source checks passing.

The bounded correction removes those five test diagnostics without changing
production behavior, dependencies, lint policy or CI. The macOS rerun passed
pinned formatting, strict workspace all-target Clippy and 13 focused Rust
tests, with the descriptor child helper explicitly invoked by its parent.
Documentation checks passed 31 tests over 189 Markdown files, 33 critical
documents and 14 phases; public checks passed over 946 files. Inventory passed
with 2,122 occurrences across 295 files. Named `p/rust` Semgrep returned two
unchanged test-fixture alerts and zero errors, independently triaged as
non-actionable; redacted Gitleaks returned zero findings.

Fresh independent review, the `PHR-0017` source/attestation pair and a new
exact-head Ubuntu source run retain their gates. The Linux run must execute the
nonempty custody positives before the main candidate is declared ready. No
failure is waived and no merge, runtime or release authority follows from this
correction.

### Repository review workflow: owner-accepted CodeRabbit retirement

Canonical acceptance and implementation record: this subsection. On
2026-10-04, the human owner accepted disabling CodeRabbit from the routine
LNSAT workflow and using repository-native tools plus fresh independent
internal LLM review. The bounded source change adds the repository configuration
and updates contributor guidance and the README review pointer.

The configuration selects disabled automatic/incremental reviews, empty opt-in
labels/keyword, disabled draft reviews, request-changes/auto-approval behavior,
review progress/status messages, automatic summaries and ambient chat replies.
It does not uninstall the app, revoke repository access or block explicit manual
mentions. Routine contributor work does not invoke CodeRabbit CLI/manual reviews.
The official provider schema and documentation govern configuration syntax;
local validation and fresh independent review precede its publication.

Public main protection currently requires the strict, up-to-date `Node and Rust
source gates` check and conversation resolution; CodeRabbit is not a required
check. The effective ruleset read contains no additional branch rules. This
change leaves required checks/protection intact, preserves existing findings and
immutable review records, and retains independent Git-bound evidence and separate
human merge/release authorization. A bot result, LLM verdict or source CI pass
grants no runtime, release or certification authority. The `PHR-0018` source/
attestation pair and exact final-head CI retain their gates.

The published integration head `41255fd289cef536218d349519ce6b1b53b1fdfd`
passed the complete pinned local `npm run check`, with 18 public-history-native
attestations, zero pending and supported-release eligibility false. Exact Ubuntu
run `37194297972`, job `111412826233`, passed dependency signatures, dependency
audit, strict Rust lint and actual normal/zero-created Linux custody positives.
It then failed one store fixture: 275 tests passed, one failed and two child
helpers were listed ignored but invoked by their parent regressions. The held
guard correctly rejected a revision replaced by a symlink as retained-baseline
`journal_custody.changed`; that test expected the fresh-descent
`journal_custody.io_rejected` classification.

The bounded correction changes only that exact expected fixed error and explains
baseline-before-descent ordering. Production behavior, rejection requirements,
assertion strictness, lint/CI, dependencies and runtime boundaries are unchanged.
The failed run remains evidence; neither its nonempty positives nor the passing
macOS run supply whole-head CI success. Fresh independent source review, the
`PHR-0019` source/attestation pair and a new complete exact-head Ubuntu run retain
their gates before main readiness.

### HCFG-6 generated daemon metadata custody proposal checkpoint

Exact draft PR #75 head `5a1338cb31706bde4e1458a5089cfacb28e90917` passed
hosted source CI run `37120253071` with job `111194814745`. This result covers
the preceding staging proposal; its human acceptance was pending at this
checkpoint and is recorded as accepted in the canonical staging subsection.
Public main was `e09a6b02634b04a46f861ed8b092acc2c2e50fe8` after that fetch,
and the canonical checkpoint was clean. No Stage-A implementation had begun
at this documentation checkpoint.

The [generated metadata custody proposal](architecture/headless-resource-enforcement/docker-metadata-source-spec.md)
specifies a conditional non-root path through rootful daemon metadata ancestry:
exact inherited access/default ACLs, search-only O_PATH identities, bounded
named ACL observations and readable own-container generated-file handles.
Exact source distinguishes Docker's data-root chmod normalization, `fdget`'s
O_PATH rejection, special POSIX ACL syscall routing and in-place metadata
writes. Requested `0644` files can inherit the proposed observed `0640` ACL
shape; creation mode alone is not current inode evidence.

The root-manifest proposal adds exact current daemon/container-root identities
and an explicit trusted-root dedicated-data-root assertion. ACL inheritance
below the container repository grants controller metadata access beyond one
new directory; shared workload roots are excluded by this proposed recipe.
LNSAT performs no automatic permission provisioning, directory inventory,
foreign-container read, procfs magic-link reopen or privileged-helper call.
Root-mediated transient replacement and the dedication assertion retain the
accepted trusted-root boundary; no atomic named-read or hostile-root assurance
is claimed. Full source/pin/positive-feasibility freeze and later actual
provisioning, activation, runtime, package and security assurance remain open.
Phase 11 remains `PREPARED_SOURCE_ONLY_NOT_EXECUTION_READY`.

For this documentation proposal, artifact shapes passed 3/3, documentation
direction passed 31 tests (179 Markdown files), public readiness checked 910
files, inventory remained 2,122 occurrences across 295 files, and unchanged
Phase 11 readiness passed 43/43 with execution closed. Exact-doc formatting
and diff checks passed; all seven copied Linux source hashes matched their
research report. The first bounded hash extractor omitted the digit in `ext4`
and matched six names; correcting the filename pattern verified all seven,
without a source/hash mismatch. Fresh independent OpenAI Terra xhigh contract
review found no remaining P1/P2/P3 after the controller explicitly separated
precreate, created, post-start and terminal-cleanup metadata predicates.
This PASS covers the conditional proposed custody method, not complete native
freeze, current host proof or the then-pending staging acceptance. No dependency,
source, CLI, schema or runtime behavior changed. New exact-head hosted CI is
separate from the preceding green result; unchanged source was not rebuilt for
this docs-only delta. The resulting exact head
`3a1971860d370c08a16a575ef7e1a8cf3c87ebbd` subsequently passed hosted source
CI [run `37122640734`](https://github.com/hypler-dev/LNSAT/actions/runs/37122640734),
job `111201633544`, on 2026-10-03. Draft PR #75 remains open; this result does
not accept the source-order amendment or complete native freeze.

### HCFG-6 controlled resource-pressure proposal checkpoint

Exact draft PR #75 head `6c65a2bd5e388222e149ad2d5250516bf7b9afe6` passed
hosted source CI [run `37123949018`](https://github.com/hypler-dev/LNSAT/actions/runs/37123949018),
job `111205384429`, on 2026-10-03. This covers the preceding result-only
dependency checkpoint, not the following procedure proposal. Fetched public
main remains `e09a6b02634b04a46f861ed8b092acc2c2e50fe8`; canonical checkpoint
was clean. The source-order amendment was pending human acceptance at this
procedure-proposal checkpoint; later acceptance is recorded above.

The [pressure proof proposal](architecture/headless-resource-enforcement/pressure-proof-source-spec.md)
defines three fixed future test-only CPU/memory/PID cases with positive anchors,
finite stimuli and independent host kernel/cgroup evidence. Linux v6.8 source
distinguishes period bandwidth, local/hierarchical memory events, any-source
OOM kill counts and PID denial caused by a leaf or ancestor. Limits, errnos,
sampled usage or helper output alone do not pass. Exact own-case identity,
bounded current observations, controlled host/ancestor eligibility and
cleanup/quarantine are required; an inconclusive result stops the series.

Normal preparation remains one thread with its five non-destructive sentinels.
The proposed pressure helper never enters the product registry, startup wire,
ordinary preparation journal or bootstrap transaction. Exact test-only source/
decoder/custody review, pending staging acceptance, immutable artifact pins
and separately authorized disposable proof remain required. No source helper,
pressure, Docker, host configuration or runtime result is added. Full native
freeze, actual startup/action proof, package and enterprise/government assurance
remain incomplete. Phase 11 stays `PREPARED_SOURCE_ONLY_NOT_EXECUTION_READY`.

For this procedure proposal, artifact shapes passed 3/3, direction passed 31
tests (180 Markdown files), public readiness checked 911 files, inventory
remained 2,122 occurrences across 295 files, and unchanged Phase 11 readiness
passed 43/43 with execution closed. Exact-doc formatting and diff checks
passed; all four copied Linux research-source hashes matched. Fresh independent
OpenAI Terra xhigh review found no actionable P1/P2/P3 in the seven-file proposal.
This is conditional procedure/source-feasibility evidence, not an actual
pressure outcome, accepted source-order amendment or complete native freeze.
New exact-head hosted CI remains a separate gate.

### HCFG-6 acceptance reconciliation checkpoint

The 2026-10-02 acceptance reconciliation in commit `2e6ce73` changed documentation only; current profile/protocol,
source, CLI and schema are unchanged. The initial acceptance update on
2026-10-01 failed before command startup with `Resource temporarily unavailable
(os error 35)`, including a read-only unsandboxed attempt; that failure remains
historical evidence. Command execution recovered on 2026-10-02. The public
checkout remains at the accepted exact head with public origin, and fetched
public main remains `e09a6b02634b04a46f861ed8b092acc2c2e50fe8`.
For the reconciled acceptance files, all six intent/spec/plan shape checks,
documentation alignment, Phase 11 readiness tests (43/43), refreshed inventory
(2,122 occurrences across 295 files) and the complete pinned `npm run check`
passed on 2026-10-02. Unlike the earlier clean-revision audit's environment
failure, this full source-check invocation reached terminal exit zero on the
reconciled worktree. Fresh independent OpenAI Terra xhigh read-only review
found no actionable P1/P2/P3. The result-only status update receives proportional
documentation/public/inventory validation before commit. Hosted CI remains
a separate exact-head gate; no new CI success, merge or runtime proof is claimed.

The Phase 11 operator packet remains runtime authority with its locked
source/launch contract and `PREPARED_SOURCE_ONLY_NOT_EXECUTION_READY` verdict.
Acceptance opens bounded source design work, not Docker observation/execution,
host permission mutation, initialization, activation, merge, release,
publication, deployment or production.

## Enterprise And Government Security Direction

Canonical work record: this section. On 2026-10-03 the human owner required
advanced security for enterprise/government use alongside the active V1 build.
The [supporting requirements](architecture/ENTERPRISE_GOVERNMENT_SECURITY_REQUIREMENTS.md)
extend the existing Phase 13/14 hardening work with explicit human identity,
assurance/crypto/key, audit/privacy, supply-chain and resilience acceptance
evidence. They do not mark these capabilities implemented or certify LNSAT.
The 2026-10-03 owner clarification requires rigorous independent scrutiny and
preparation for future third-party ISO/government assessment. The supporting
requirements now distinguish exact product evaluation from organizational ISMS
assessment and require traceable claims, reproducible proof, assumptions and
residual limits. No scheme, assurance level or government approval is selected.
Jurisdiction, information class and deployment boundary remain unresolved;
the current U.S. mapping is provisional. Detailed protected/public-contract
behavior requires its own exact accepted specification and independent review.

Inspected local source has Argon2id password/session/CSRF foundations and scoped
roles. Phishing-resistant MFA/federation and a FIPS-validated crypto provider
are not established; optional Ed25519 approval verification is not an activated
signing/custody path. Signed artifact/update, SBOM/provenance and selected-target
assurance remain Phase 13/14 gates. Hashes/export do not independently prove
trusted-host-owner anti-tamper protection. The active HCFG/native/bootstrap/
control/runtime build remains mandatory. No SaaS/fleet/HA/multi-tenant scope,
Docker, host mutation, merge, release or production action opens here.

Fresh independent OpenAI Terra xhigh security review found no P1/P2 in the
requirements or supporting hardening proposal. Two P3 evidence issues were
corrected: the strict Ed25519 source locator and the integrity registry's
binding to the final status/requirements/sequence documents. The retained
hardening analysis supplies two explicit options and their tradeoffs; it is
derived design evidence, not a vulnerability scan or compliance assessment.
Detailed identity/provider selection and implementation remain open.

### Crypto operation/provider source inventory

Canonical work record: this subsection. The owner's enterprise/government
security direction requires the control/crypto inventory in parallel with the
accepted engine work. The [bounded crypto inventory](architecture/CRYPTO_OPERATION_PROVIDER_INVENTORY.md)
and [manual source baseline](reference/crypto-operation-provider-inventory.json)
record 17 operation/boundary classes and SHA-256 bindings for 35 named source,
manifest, lock and process-document blobs at exact source
`a92857ed762f28873990bd1f1a921b104363537e`, tree
`ce08e9bc72e7a66bb9b08a999139d151a0330f1d`.

This distinguishes Rust daemon/SQLite auth and persistence foundations from
TypeScript local-beta/PostgreSQL, contract and adapter source. It does not
establish shared token protocols or a shared deployed crypto backend. Named
source has Argon2id, OS random interfaces, SHA-256 commitments and optional
Ed25519 verification; signer profiles remain interface-only. OAuth/SPIFFE
adapters rely on injected verification. Storage/backup checks establish named
integrity/custody facts, not encryption. Registry review checks metadata shapes;
source-review hashes are not signatures or produced artifact proof.

The inventory records actual source facts for later provider selection, not a
strict-profile specification, exhaustive transitive/compiled crypto census,
control-matrix completion or runtime check. Approved module/version/environment,
certificate/security policy where required, self-test/error state, entropy
health, identity/MFA/federation, key lifecycle, encrypted storage/backup,
protected audit and artifact-signing evidence remain unestablished. No provider
or profile is selected or activated here; no government assurance follows.
Detailed protected/public-contract behavior still needs its exact accepted spec.

The parent private session-buffer source PR #82 passed exact-head source CI
`37161819790`, job `111316664186`, on
`a92857ed762f28873990bd1f1a921b104363537e` at `2026-10-03T23:46:00Z`.
This supplies parent source evidence only. This slice changes documentation;
no Rust/TypeScript behavior, dependency, API, schema or product version changes.
At this standards-mapping checkpoint, source-order acceptance and Stage-A
implementation were pending. The later human acceptance and first private
candidate are recorded above. Candidate SQL, Phase 11 packet, Docker, host
mutation, artifact construction, merge, release and production gates remain
unchanged and closed.

Local manual verification passed for all 35 bound blobs and 45 source ranges.
Documentation direction passed 31 tests across 186 Markdown files; public
readiness, generated legacy inventory, Phase 7d truth, Phase 11 readiness,
native public-history evidence, exact-file formatting and whitespace checks
passed. Native history remains 13 attested, zero pending and ineligible for
supported-release evidence. Fresh independent OpenAI Terra xhigh review found
one canonical status-link defect, corrected before final byte binding, and no
other actionable P1/P2/P3. Broad source tests and code scanners were not rerun
for this documentation-only slice; parent exact-head source CI is the separate
source evidence above.

Exact inventory draft PR #83 head
`87f4fcf85d6a443b6d847109b48d55d6e064edeb` subsequently passed hosted source
CI run `37163994904`, job `111323064566`, at `2026-10-04T00:26:31Z`.
This is documentation/source validation, not runtime/module assurance or owner
acceptance of the separate source-order amendment.

### Proposed strict crypto admission design

Canonical work record: this subsection. The requested enterprise/government
direction and completed bounded source inventory require exact crypto/provider
admission design before a strict assurance claim. The
[proposed design](architecture/STRICT_CRYPTO_ADMISSION_DESIGN.md) makes complete
selected-operation coverage, exact module/version/environment/approved-mode
association, validation eligibility, entropy/self-test/error-state evidence and
key lifecycle explicit. Evidence failure or change denies without weaker
fallback; crypto admission does not independently grant action authority.
Actual positive module/environment proof remains required.

**Owner acceptance and implementation are pending.** This is a design proposal,
not a selected provider, certificate, algorithm, target or deployment. It adds
no source, configuration field, public API, dependency, schema or executable
guard. Current Argon2id/session/digest/verification source is unchanged; it does
not acquire a strict assurance claim. MFA/federation, encryption, protected
audit, artifact lifecycle, actual runtime and full V1 remain incomplete.

The HCFG-6 source-order amendment is a separate engine decision, accepted later
in the canonical staging record above; it accepts no strict crypto design.
Phase 11
packet/pins, Docker, host mutation, candidate artifact construction, private-key
or provider calls, merge, signing, release, deployment and production remain
closed. This proposal's review or hosted source CI cannot accept either design
or open those gates.

Post-correction documentation direction passed 31 tests across 187 Markdown
files; public readiness, generated inventory, exact-file formatting and staged
whitespace checks passed. The initial unchanged Phase 7d, Phase 11 and native
history checks also passed; native history remains 13 attested, zero pending
and ineligible for supported-release evidence. Fresh independent OpenAI Terra
xhigh review found and resolved two P2 issues: final artifact identities must
follow reviewed source and separately authorized capture, and unavailable or
unapproved mode must deny rather than approved mode. No remaining actionable
P1/P2/P3 was found in the corrected proposal. No broad source tests or code
scanners were rerun for this documentation-only slice; parent exact-head source
CI is separate evidence above.

Exact strict-admission draft PR #84 head
`a7739bfdde8d25168cde90af433966c0ef424e86` passed hosted source CI run
`37165741406`, job `111328140941`, at `2026-10-04T01:00:26Z`.
This validates the design/source tree; it does not accept the design or prove
an actual module, provider, authenticator or runtime.

### Proposed human authentication assurance design

Canonical work record: this subsection. The accepted enterprise/government
direction requires verified human assurance and fresh exact consequential
confirmation. The [proposed design](architecture/HUMAN_AUTHENTICATION_ASSURANCE_DESIGN.md)
defines one Gateway-owned human/session/challenge/decision evidence boundary,
compares local WebAuthn with selected OIDC federation, and requires exact
enrollment, distinct-person linking, revocation, inert recovery and privacy.
The browser session header pair is CSRF/request proof, not two human factors.

**Owner acceptance, exact source contracts and implementation are pending.**
Local WebAuthn is conditionally recommended for the owner-controlled package;
its domain-origin/secure-context requirement cannot reuse the existing numeric
loopback origin. No origin, transport, IdP, authenticator, library, assurance
level, schema or deployment is selected. Existing password/session, roles,
approval, offline recovery and OAuth/workload adapter behavior is unchanged.
No MFA, federation, AAL/FAL/IAL or government readiness is established.

The HCFG-6 source-order decision was pending at this human-auth proposal
checkpoint and was accepted later in the canonical staging record above.
Stage-A source integration, candidate SQL, strict crypto acceptance,
audit/privacy, Phase 11 packet/pins and full V1 remain open.
This documentation adds no route or authority. Docker, host/configuration
mutation, actual credential/provider/key work, candidate artifact construction,
merge, signing, release, deployment and production remain closed.

Named documentation direction passed 31 tests across 188 Markdown files;
public readiness passed its three tests, and refreshed legacy inventory retained
2,122 occurrences across 295 files. Exact-file formatting and staged whitespace
checks passed. The initial inventory check failed because the new document was
not staged when its tracked-file inventory was first generated; that failed
receipt is retained and refresh after exact staging passed. Independent review
found no actionable P1/P2/P3 in the final byte-bound proposal; hosted exact-head
source CI remains separate.
Broad source tests and code scanners were not rerun for this docs-only slice;
the unchanged parent source CI above is the separate source evidence.

### Proposed audit/privacy and evidence custody design

Canonical work record: this subsection. The accepted enterprise/government
direction requires minimized disclosure and reliable decision/outcome evidence.
The [proposed design](architecture/AUDIT_PRIVACY_AND_EVIDENCE_CUSTODY_DESIGN.md)
separates private authority records/backups, authorized evidence disclosure,
optional telemetry and independent custody. It requires explicit coverage,
failure atomicity, recipient permissions, field semantics, retention and
inert recovery before implementation or assurance claims.

**Owner acceptance, exact source contracts and implementation are pending.**
Local content hashes, immutable triggers and exact chain rederivation remain
useful source integrity evidence. They do not prove complete history, external
custody, encryption or protection from a malicious host owner. Current schema
17 retains 28 families with no cleanup. HCFG-4A reads remain installation-wide;
their stored project decoder scope is not a project authorization grant. The
telemetry sink can be invoked, but allowed keys and fixed privacy flags cannot
prove contextual sensitive-data exclusion.

This proposal creates no export route, global sequence, collector, encryption
provider, permission, schema, stop mechanism or authority transition. The
HCFG-6 source-order amendment was pending at this audit proposal checkpoint
and was accepted later in the canonical staging record above. Native/store
integration, HCFG-4B/4C, human assurance, strict crypto and full V1 remain
incomplete. Phase 11 packet/pins
retain runtime authority. Docker, host mutation, candidate SQL execution,
actual credential/provider/key work, candidate artifact construction, merge,
signing, release, deployment and production remain closed.

The design basis is exact draft PR #85 source head
`ae89f83a8de1ad10359a29ec61e1937befcf4160`; all 18 named raw source/doc blobs
were verified against that immutable revision. Parent hosted source CI run
`37167115468`, job `111332234904`, was still running at initial observation;
no terminal result is inferred. Named proportional documentation validation
passed 31 tests across 189 Markdown files; public readiness passed three tests,
and refreshed inventory retained 2,122 occurrences across 295 files. Exact-file
formatting and staged whitespace checks passed. Fresh independent OpenAI Terra
xhigh review found no actionable P1/P2/P3 in the proposal. Final byte binding is
required before commit. Broad source tests and code scanners were not rerun for
this documentation-only slice. These checks do not establish actual runtime,
privacy, collector or encryption proof.

### Dependency advisory checkpoint

On 2026-10-03 a fresh `npm run audit:dependencies:check` passed on exact draft
head `3a1971860d370c08a16a575ef7e1a8cf3c87ebbd`, reporting zero vulnerable
packages and no advisory exceptions. This is the npm registry's known-advisory
result for that lock, not a complete source/runtime vulnerability assessment.

A separate read-only comparison evaluated all 12 open GitHub Dependabot alert
ranges against every matching instance in that head's npm lock and fetched
public-main `e09a6b02634b04a46f861ed8b092acc2c2e50fe8`. Exact Git blobs and
lock hashes were checked before strict semver evaluation. None of those 12
ranges includes a draft locked instance; all 12 include a public-main instance.

| Package      | Draft locked versions                   | Fetched public-main versions            |
| ------------ | --------------------------------------- | --------------------------------------- |
| `fast-uri`   | `3.1.8` (two nested instances), `4.2.1` | `3.1.6` (two nested instances), `4.1.3` |
| `ip-address` | `10.7.2`                                | `10.4.0`                                |
| `undici`     | `7.30.0`                                | `7.29.0`                                |

The alerts remain open and public main remains affected by those reported
ranges. No alert was dismissed and no dependency, lock, runtime or public-main
byte changed in this checkpoint. Fresh independent OpenAI Terra xhigh review
found no actionable P1/P2/P3 in the exact comparison and its evidence. Source dependency
maintenance, merged-main remediation, runtime security and supported release
are separate states; these checks supply no enterprise/government assurance
or certification claim.

## Current Build Position

Complete headless setup and access-management through the versioned API and
`lnsatctl` remain accepted V1 requirements. They must distinguish
LNSAT's resource access from agent action authority, support layered declarative
configuration and customizable least-privilege settings, expose actual OS
enforcement coverage, and protect configuration changes through Gateway.
LNSAT remains a standalone product; installation or API use cannot bypass
approval or increase authority implicitly. The
[headless configuration and control requirements](PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control)
own this additional product acceptance scope. Graphical setup, presets, and rich
management UI are later LNSAT surfaces, not V1 exit requirements. Existing
P10-X1 source conformance does not satisfy it; current Control Center readback
remains read-only. No new
management mutation, runtime, installer, or supported-platform claim is opened.

HCFG-0/HCFG-1 source diagnostics are implemented: status defaults to and echoes
exact `lnsat.product_surface.v1`; explicit v1/v2 selection is exact-match only
and fails before session work when duplicate, malformed, unsupported, or
wrong-route. The accepted pre-1.0 security correction changes the v1 command
inventory and status bytes, records the superseded digests, and keeps selector
matching fail closed. Explicit
`lnsat.product_surface.v2` adds source-only v2 manifest/status diagnostics plus
`lnsatctl config schema|validate`; validation reads a selected config and a
referenced runtime profile but opens no database, listener, process, or action
authority. No range or fallback exists. Headless configuration/control and
Phase 11 real Docker proof remain pending.

### HCFG-2: Redacted explicit configuration comparison

Canonical packet record: this section. Accepted scope is bounded source delivery
under the headless configuration requirement. Implementation adds opt-in v2
`config show` and `config diff` over the existing explicit-file loader. Review
and validation are required before this packet is considered ready to merge;
merge remains a separate owner decision.

`show` reports a fixed redacted configuration summary and exact source evidence.
`diff --config <baseline> --against <candidate>` compares validated configuration
values in the core and emits only fixed changed-field names, never old/new
paths, addresses, console keys, profile identifiers, or source bytes. It
separates exact source-byte changes from normalized configuration changes;
formatting alone and an explicit default address do not imply a changed setting.
Referenced runtime-profile evidence participates in comparison. The two loads
are sequential observations, not an atomic snapshot or proof of live drift.

Both commands require exact `lnsat.product_surface.v2` selection and support
text, JSON, JSONL, and YAML. Frozen v1 behavior and configuration schema remain
unchanged. No storage, listener, process, mutation, activation, or action
authority opens. Output does not compute effective authority, prove resource
identity or OS enforcement, or provide an applicable configuration export.
Layer composition, effective/export, monitoring, and protected control remain
pending under the [ordered headless sequence](PRODUCT_BUILD_SEQUENCE.md#headless-source-packet-order).
Rollback is a normal reviewed source revert; there is no persistent migration.

### Existing runtime and product foundations

Phase 8 bounded loopback runtime composition is merged. Phase 9 authenticated,
exact-ID Control Center readback and manifest-only source-local console hosting
are implemented as experimental source. Phase 10 P10-A1 product-surface spine,
P10-A2 explicit-only configuration, and P10-A3 browser/API health/status plus
withdrawn Unix CLI health/status contracts are implemented. P10-A4 offline
backup, inert restore, protected owner recovery, non-root enforcement, and
cross-surface unavailability parity are also implemented. P10-X1 closes Phase
10 source conformance with a security-corrected fail-closed
evidence/compatibility ledger. P11-R1
adds one experimental served reference proof over existing Phase 8 loopback
routes and a marked disposable Git fixture. The execute response is discarded;
after daemon restart, the requester resolves the unknown outcome only through
authenticated evidence readback and reconciliation. It opens no new route,
production target, or support claim. P11-D1 adds one closed source-only
`docker_local` runtime-profile contract, explicit file/parser validation,
deterministic profile and authority-configuration digests, and a side-effect-
free execution-request binding check. It opens no Docker endpoint, adapter,
image, route, dispatch, receipt, or execution authority. P11-D2 adds explicit
daemon-configuration selection of that closed profile plus public-safe config
readback of profile identity and profile/authority-configuration digests. It
retains validated profile evidence for later packets but opens no Docker
endpoint, socket, process, image operation, mount, route, dispatch, receipt, or
execution authority. P11-D3 adds a closed source-only adapter-process protocol:
canonical single-frame JSON request/result bytes, exact operation and runtime
identity binding, bounded stdin/stdout/stderr observations and deadlines, and
fail-closed malformed, duplicate, truncated, oversized, substituted, timed-out,
or ambiguous-result handling. It launches no process, opens no Docker surface,
and creates no repository consequence or receipt. P11-I1 adds authenticated
same-origin packet intake for active owner/operator sessions with CSRF, exact
actor/session binding, and atomic immutable packet plus server-time policy
evidence. Exact replay returns original policy evidence. It creates no approval,
execution authorization, adapter dispatch, Docker action, repository
consequence, or receipt. Phase 11 remains incomplete and separately gated;
P11-D4A now closes the digest-only adapter payload gap with a bounded canonical
wrapper carrying the exact approved execution request plus target and shared
Git tool-argument digests. It performs no process or Docker action. P11-D4B1
adds a dormant, source-only supervisor for one schema-2 `docker_local` profile.
It revalidates the full D4A/D3/profile binding, exact Docker CLI and host Git
verifier digests, one absolute local Unix endpoint, and one marked disposable
Git target before launch. The constructed run is environment-cleared,
pull-disabled, networkless, capability-free, no-new-privileges, non-root,
read-only, and profile-resource-bounded. Post-spawn anomalies remain
`outcome_unknown`; cleanup requires a valid private Docker-written container ID,
and success requires independent host Git consequence inspection plus an exact
semantic result-digest match. Hermetic tests use a fake Docker
executable and disposable Unix socket, so no real Docker or image-isolation
claim exists. P11-D4B2A adds source-only durable lifecycle APIs: capability
consumption and one Docker-adapter attempt claim are atomic; exact replay never
creates another attempt; one independently host-verified semantic result may
persist one receipt; interrupted `dispatching` attempts reopen as
`outcome_unknown`; and reconciliation inspects exact Git evidence without Docker
or adapter retry. Five hermetic store tests cover concurrent claim, receipt,
replay, reopen, reconciliation, no-consequence behavior, and the closed contract
fixture. P11-D4B2B now passes experimental served fake-runtime integration over
existing Phase 8 loopback routes with hermetic fake executable, disposable Unix
socket, marked temporary Git target, and host Git verifier. The existing eight
routes and their public-response fields remain unchanged; the internal
fake-runtime selector is compiled only for crate tests. Three adversarial served
tests confirm: success/replay/idempotency drift rejection; post-consequence
unknown survives restart and reconciles through host Git inspection only;
unchanged-target unknown persists without receipt. Exact replay is metadata-only
with no redispatch. The chain is D2 schema2 loaded profile -> D4B2A atomic claim
-> D3/D4A payload -> D4B1 supervisor -> D4B2A receipt/unknown. No served route
configures or invokes Docker. P11-D4C1 adds the source-only
`lnsat-git-reference` executable, exact D4A-retained profile mount-path handoff,
self-executable binding, strict host/container repository-identity remapping,
lazy-fetch- and Trace2-disabled bounded Git consequence, private-index cleanup,
and canonical result framing. Ten hermetic adapter tests use only a host child
process and marked temporary Git fixtures. No real Docker binary/daemon/socket, image pull/build/run,
production repository, deployment, release, package, or support exists. Real
Docker image/runtime proof, package, deploy, production, and support claims
remain separately closed. Phase 11 remains incomplete.
One real-Docker proof-readiness contract now derives canonical source-only
profile, authority-configuration, adapter, executable, image, and launch
identity plus eight future proof cases. Its tests and repository validator use
no Docker process or socket; no runtime evidence exists. It grants no execution,
receipt, route, production, package, deployment, or support authority.
A source-only execution-evidence requirements contract now freezes the exact
runtime, image-provenance, disposable-target, served-chain, lifecycle, cleanup,
redaction, and independent-review commitments for those same eight future
cases. It contains no actual evidence or execution seam and keeps every runtime,
completion, production, package, deployment, and support flag closed.
A source-only execution-harness contract binds the proof plan and evidence
requirements digests with the same closed lists and later-authority declaration
and stop IDs. PHR-0005 records independent source review. It is metadata only,
has no runnable proof driver, runtime evidence, or execution authority; Phase 11
remains incomplete.
The private run-manifest contract now binds a nonce, bounded UTC window, exact
later-run identities, and private evidence custody declarations to a separately
supplied expected source-root/revision/build identity. It rejects evidence
beneath source or the disposable target root and declared source/target path
overlap lexically. JSON alone never grants permission or proves physical
filesystem identity or disjointness.
It performs no filesystem identity checks or runtime I/O. A later driver must
resolve and authenticate the physical source and target identities and
revalidate their disjointness immediately before process creation; preflight
the daemon, image, configuration, entrypoint, and in-image adapter; traverse Gateway ->
D4B2A -> D3/D4A -> supervisor; and use daemon/client/endpoint-revalidated,
launch-label-bound inspect-before-remove cleanup.

The private served-driver admission evaluator now adds a source-only structural
boundary: canonical run manifest -> fields in a caller-supplied claim snapshot
-> D3/D4A payload -> loaded profile -> launch-contract digest. Replay, ambiguous
state/receipt/reconciliation, and binding drift fail closed, but its digest
authenticates no snapshot, revalidates no durable state, and grants no launch
permission. It is implemented source-only, verification-only structural
binding, not a runtime gate. After a successful D4B2A claim commit, a later
runnable driver must authenticate the created-claim result, call a private
store-owned verifier in a fresh authenticated store transaction, and re-read
the exact durable consumption, operation, and attempt through the durable-store
boundary. Only exact created, dispatching, no-receipt, and no-reconciliation
state returns a bound pre-supervisor guard. Failure after claim commit rejects
before spawn, preserves or marks `outcome_unknown`, and never redispatches. This
evaluator performs no store write, route,
filesystem/process/Docker I/O, receipt, evidence persistence, selector, or
runtime execution. Phase 11 remains incomplete; real Docker proof and later
Phase 13/14 release gates remain separately closed.
The source-only
[operator run packet](architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md)
locks the proof-implementation source at public revision
`b41aa756bccd85843ac540abfd927e8c5693d5fe` and tree
`fecb4303cfe1b5224d3c1f1fbd8f2c86008e389c`. Separately, PR #39 integrated
the reviewed packet head `2c918bc59b82ffabc378b47e66137733cf24a6d7`
into public `main` as merge `190ab32443f60a2a1bc78f990e8ea5571c28f96f`
with tree `17247c9c194f6a332e99ee32ae5052620349896b`. That packet integration
identity does not move the proof-source lock. The record enumerates later
executable, image, profile, launch, manifest, target, admission, case, D3-limit,
receipt, reconciliation, ambiguity, cleanup, evidence, retention, redaction,
and pass/fail requirements. All live identities remain explicitly blocking.
The packet grants no Docker, execution, build-candidate, release, deploy,
publication, production, or support authority.
Required path stays Phase 8 -> Phase 9 ->
Phase 10 -> Phase 11 ->
Phase 13 -> Phase 14. Phase 12 and optional signed-evidence
packets remain nonblocking unless separately selected. No binary/package work
starts until required product/runtime phases and Phase 13 release-candidate
source freeze pass. See [product build sequence](PRODUCT_BUILD_SEQUENCE.md).

ADR-0007 accepts Docker/OCI as first v1 runtime integration profile while
preserving runtime-neutral Gateway authority and later secure-VM, native-host,
and remote profile lanes. P11-D1 implements its closed profile and digest-
binding foundation. P11-D2 adds explicit configuration and redacted readback
only. P11-D3 adds protocol framing and identity binding only. P11-I1 closes
fixture-only packet/policy seeding through authenticated atomic intake. P11-D4A
adds canonical approved-payload, target, and Git tool-argument binding. P11-D4B1
adds the hermetically tested supervisor, P11-D4B2A adds durable attempt/receipt
and restart-reconciliation semantics, and P11-D4B2B exercises that chain through
the unchanged Phase 8 routes only under an internal crate-test-only fake-runtime
selector. P11-D4C1 supplies a source-only reference-adapter executable and
hermetic host-process proof without an image or Docker access. No real Docker
adapter process, image operation, package, supported runtime, emergency-stop
route, or supported deployment exists.

## Maturity Summary

| Area                 | Status                 | Evidence                                                                                                                                                                                                                                      |
| -------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript contracts | Experimental           | Versioned packet, policy, approval, audit, knowledge, and substrate source with tests                                                                                                                                                         |
| Policy evaluation    | Experimental           | Deterministic allow, deny, and approval-required decisions in `packages/policy`                                                                                                                                                               |
| Audit persistence    | Local foundation       | Stable SQLite events, PostgreSQL artifacts, idempotency, disposable tests                                                                                                                                                                     |
| SQLite durability    | Local foundation       | Ordered authority-chain and audit evidence persistence with rollback                                                                                                                                                                          |
| Rust daemon          | Local experimental     | Exact loopback routes plus explicit closed config and manifest-only console hosting                                                                                                                                                           |
| Gateway              | Local experimental     | Shared inspection, bounded runtime evidence, identity, telemetry, and Registry source                                                                                                                                                         |
| MCP                  | Read-only experimental | Official v2 modern stdio/HTTP handlers plus bounded temporary legacy compatibility                                                                                                                                                            |
| CLI                  | Local experimental     | `lnsat` packet/manifest plus `lnsatctl` diagnostics, inspection, and offline recovery                                                                                                                                                         |
| Control Center       | Local experimental     | Exact-ID live Gateway readback plus separate unchanged synthetic fixture panel                                                                                                                                                                |
| Agent configuration  | Proposal               | Versioned profile, skill, instruction, context, and shared-library architecture only                                                                                                                                                          |
| Optional modules     | Product boundary       | Versioned extension contracts only; no implementation                                                                                                                                                                                         |
| Rust                 | Local foundation       | Deterministic contracts plus embedded SQLite bootstrap and integrity core                                                                                                                                                                     |
| Distribution         | Not available          | No package, binary, image, installer, release, or update channel                                                                                                                                                                              |
| Docker integration   | Experimental source    | P11-D1 through P11-D4C1 include closed profile/config/protocol/payload, durable lifecycle, served fake-runtime proof, and a hermetically tested source-only reference adapter; no real Docker, image operation, supported runtime, or support |
| Hosted runtime       | Not available          | No production service, customer-data path, or runtime dispatch                                                                                                                                                                                |

“Experimental” means checked-in implementation has automated coverage but no
stable compatibility or support commitment.

## MCP, Framework, and Recovery Direction

Canonical source protocol is MCP 2026-07-28. Official TypeScript v2 split
packages back modern read-only stdio and stateless HTTP-handler behavior;
explicit negotiation retains 2025-11-25 as temporary legacy compatibility.
REST, CLI, both MCP eras, and framework lanes route through transport-neutral
Gateway contracts. Modern-only discovery, JSON Schema 2020-12, bounded
transport handling, and downgrade denial have automated proof.

FastMCP 3.4.5 passes legacy-profile interop and FastMCP 4.0.0b1 passes an
experimental modern profile from temporary isolated Python environments. A2A
1.0 mapping, OAuth access admission, OTel correlation, SPIFFE
workload-identity interfaces, Registry quarantine/supply-chain verification,
signer-provider interfaces, operation recovery, and Control Center
reconciliation readback are source-implemented and tested. Optional task-ID
fields remain correlation metadata only; MCP Tasks itself is watch-only and
unimplemented. No Roots or Sampling dependency was added.

`@modelcontextprotocol/conformance` 0.1.16 passes its supported loopback HTTP
2025-11-25 `server-initialize` scenario. That upstream stable framework does not
yet expose MCP 2026-07-28 or stdio server scenarios, so modern/stdin claims rely
on official v2 SDK tests and are not mislabeled as framework coverage. No
production listener, state-changing tool, real IdP/SPIRE/HSM/KMS integration,
signer activation, real key/trust material, execution path, or production
support exists.

Dependency remediation pins Vitest 4.1.11, Next.js 16.3.8, Hono 4.13.7,
and Sharp 0.35.4. The 2026-09-30 source maintenance also constrains fast-uri
majors 3 and 4 separately to 3.1.8 and 4.2.1, ip-address to 10.7.2, and undici
major 7 to 7.30.0. These revisions address the newly reported dependency
advisories without introducing a major-version migration. The npm audit gate rejects every reported vulnerability;
no advisory exception remains. This is source dependency maintenance and
opens no runtime, deployment, package, or supported-release claim.

The pure-comparison draft's first exact-head CI run caught additional Fastify
and Hono advisories in the live npm audit. Its separate maintenance follow-up
pins Fastify 5.12.5 and Hono 4.13.7 within their existing major versions. The
Fastify patch preserves the same transitive requirements; the lock records the
verified registry tarball identity and integrity. No audit suppression, model
contract change, or runtime authority follows from these patches. Exact-lock
installation, full `npm run source:check`, live dependency/signature audits with
zero vulnerabilities and no exceptions, offline npm/crates.io/PyPI advisory
scanning, and worktree secret scanning passed. Fresh independent maintenance
review found no remaining findings. Offline scanning does not establish Python
transitive coverage or runtime exploitability. The draft remains unmerged; exact
published-head CI is tracked on its pull request.

See [MCP interoperability and outage recovery](architecture/MCP_V2_FASTMCP_INTEROPERABILITY_AND_OUTAGE_RECOVERY.md)
and [Phase 8 adapter authority conformance](architecture/PHASE_8_ADAPTER_AUTHORITY_CONFORMANCE.md).

## Expanded Product Direction

ADR-0003 and ADR-0007 now fix repository, product, and first-integration
boundaries:

- `LNSAT` remains canonical open authority core;
- managed instructions, skills, profiles, context, graphs, and model overlays
  are planned governed inputs;
- gatekeeper models remain advisory;
- rich registry, graph editing, collaboration, certified adapters, model packs,
  and package composition remain staged LNSAT work;
- portable formats, Gateway authority, essential security, OS CLI conventions,
  and conformance remain public-core concerns;
- Docker/OCI is first planned v1 runtime profile, but Docker remains a
  replaceable executor/MCP layer rather than LNSAT authority;
- configuration inheritance can only narrow authority, and persisted
  authority-managed emergency stop dominates lower-precedence configuration.

This direction adds no live module runtime, model deployment, connector,
registry install/enable authority, entitlement, hosted service, or unpublished
artifact. See
[ADR-0003](architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md),
[ADR-0007](architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md),
and [product direction alignment](reference/PRODUCT_DIRECTION_ALIGNMENT.md).

## Compatibility

Current workspace packages are private and unpublished. Source exports may
change before first supported release. Contract changes should still use
explicit schema versions, migration notes, fixtures, conformance tests, and
changelog entries so evaluation remains reviewable.

Exact-match contract-version validation now identifies
`lnsat.contracts.v1_0` as the stable v1 target and retains `v0_1` as deprecated
compatibility. TypeScript and Rust consume the same stable, deprecated,
malformed, and unsupported vectors. Unknown versions fail closed; no range or
implicit downgrade negotiation exists.

The parallel stable v1 packet-envelope family now has exact contract/schema
identities, closed-field validation, bounded reference-only identity and scope,
integer budgets, absolute expiry, explicit idempotency, canonical UTF-8 JSON,
and deterministic SHA-256 evidence. Its shared golden vector fixes the digest.
The earlier `version: "0.1"` parser remains separate with no implicit
conversion.

Rust now parses stable packet JSON into a typed envelope, validates the closed
structural schema with twenty shared TypeScript/Rust positive and negative
cases, and emits the exact committed canonical JSON bytes. Recursive object
ordering follows UTF-16 code units, array order is preserved, Unicode is not
normalized, and fractional, unsafe, or negative-zero numbers fail closed. A
deterministic risk-boundary property test and no-panic byte fuzz entry cover
parser risk. Rust SHA-256 now hashes those exact canonical UTF-8 bytes and
matches both shared packet digests. Rust permission allow/block sets now require
ascending unique identifiers and reject overlap. Real UTC instants and positive
packet validity windows now match TypeScript validation.

The stable v1 policy-decision family now snapshots and hashes the validated
packet, applies explicit deny-first capability/risk rules, binds identity,
scope, idempotency, evaluation time, and expiry, and emits deterministic
side-effect-free evidence. Unknown capabilities/profiles deny; stale packets
produce no decision. Rust now mirrors this evaluation across thirteen shared
allow, deny, approval-required, invalid-time, and stale-packet cases, including
exact golden decision/hash identities, deterministic replay, and risk-boundary
property coverage.

The stable v1 approval family now converts only exact approval-required policy
evidence into a content-bound request, then records a distinct human
identity/session decision inside the inherited expiry window. Tampering,
self-approval, non-human approver namespaces, and stale evidence fail closed.
Approval evidence never authorizes execution and has no side effects; its
digests are content identities, not authentication or signatures. Rust now
matches the exact golden request/decision ids plus fourteen shared request and
decision validation cases, deterministic replay, and request-window property
coverage.

The stable v1 audit family now rebuilds exact packet-policy-approval chains
before emitting bounded policy, approval-request, or approval-decision events.
Source and event digests, terminal-source idempotency, observation ordering,
redaction state, and zero-authority fields are explicit. The contract does not
authenticate, persist, dispatch, or mutate.

Shared TypeScript/Rust evidence now freezes the exact UTF-8 preimages and
SHA-256 identities across the stable packet, policy, approval request, approval
decision, and terminal audit event chain. Rust now proves packet parsing,
canonical-byte, packet-hash, policy-evaluation, and approval-evidence parity
plus committed-preimage digest parity. Rust also rebuilds the complete audit
source chain, matches all three golden event/source identities, rejects source
drift and early observation across nine shared cases, and preserves
deterministic replay with no persistence or execution authority.

The stable v1 error envelope now unifies version, packet, policy, approval, and
audit failures under one exported type/helper contract, closed JSON Schema, and
six-family golden fixture. Code/path pairs are compatibility identity, messages
remain public-safe and non-authoritative, family results are null, and side
effects stay empty. Rust now maps every deterministic-core failure variant to a
public-safe item and matches all six shared family vectors without widening the
distinct audit-idempotency result contract.

The stable v1 compatibility matrix now covers contract version, packet, policy,
approval request, approval decision, audit, and error-envelope families in one
authoritative fixture. Exact negotiation, closed shapes, evidence identities,
replay/idempotency, stale-evidence behavior, and explicit audited migration are
frozen without opening runtime authority.

## Known Source Cleanup

Earlier development encoded milestone identifiers in exported status constants,
tests, and synthetic fixture names. Some project-state inspection contracts also
retain legacy naming. These values are implementation metadata, not stable API.

Cleanup requires a dedicated compatibility change because API, MCP, fixtures,
and tests share those identifiers. Safe sequence:

1. inventory exported versus test-only labels;
2. define neutral lifecycle status contract;
3. add compatibility aliases or versioned replacements where needed;
4. rename synthetic project-state fixtures;
5. update TypeScript/Rust conformance and SDK reference docs;
6. remove aliases only with documented breaking-change policy.

Phase 1 inventory is recorded in the
[legacy identifier inventory](reference/LEGACY_IDENTIFIER_INVENTORY.md). It
classifies every current occurrence, names source owners and compatibility
consumers, and fixes migration order without changing identifiers.

The core package now exposes neutral product lifecycle status metadata. Its
legacy build-phase exports had no repository source consumers, so they were
replaced without compatibility aliases. Serialized schemas and runtime
responses are unchanged.

The packets package now uses neutral source-status values for all 85 exported
status constants. Exact consumer evidence found only package barrel re-exports,
so no compatibility aliases were needed. Versioned contract identifiers and
serialized evidence references remain unchanged and separately gated.

The policy package now uses neutral metadata for its six exported status
constants. The four pre-release values remain `source_only`; the parallel stable
v1 decision and approval families use `contract_only`. Earlier values had no
repository consumers.

The audit package now uses neutral metadata for its eleven exported status
constants. Ten pre-release values remain `source_only`; the parallel stable v1
audit-event family uses `contract_only`. Earlier values had no repository
consumers; ledger contract IDs, records, digests, migrations, and persistence
behavior are unchanged.

Gateway/API exports now use neutral status metadata across 33 surfaces. Four
local-beta routes retain exact legacy wire-status values under internal
compatibility constants, with response assertions. The canonical
`lnsat.gateway.project_state.v0_1` contract and
`POST /v1/project-state/inspect` route use neutral item vocabulary and
fixture paths. The legacy project-state route remains unchanged for
compatibility.

MCP exports now use neutral `read_only` status metadata across 57 surfaces.
Protocol-visible `status` and `lnsat_status` fields retain exact legacy values
under private compatibility constants with existing response assertions.
Tool names, request/response shapes, and Gateway authority remain unchanged.

The CLI now exports neutral `source_only` status metadata. Exact consumer
evidence found documentation references only, so no compatibility alias was
needed. Command names, output shapes, packet validation, and hashing behavior
are unchanged. Packet inspection now runs as `lnsat packet inspect` and uses
the same Gateway contract semantics as API and MCP transports.

Project-state MCP inspection now has the canonical versioned tool
`lnsat.project.state.inspect.v0_1` on local, official SDK, and built stdio
surfaces. The legacy tool remains registered as a read-only deprecated alias
with its exact response/error behavior and a removal floor of `2.0.0` after at
least one supported-release deprecation window. The canonical MCP tool accepts
neutral `item_id`, delegates to the canonical Gateway contract, and returns
neutral project-state fields from `fixtures/project-state/summary.json`,
`items.md`, `activity-log.md`, and `items/*.json`.

Architecture directory also contains future design proposals. Its
[catalog](architecture/README.md) separates current source notes from proposals
so roadmap documents are not mistaken for shipped capability.

## v1 Scope Decisions

[ADR-0002](architecture/ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md)
supersedes ADR-0001 platform/package restrictions and defines the authority
layer, approval direction, one-time execution authorization, exact receipt
binding, reference flow, and Phase 14 distribution.

[ADR-0006](architecture/ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
supersedes ADR-0002/0004/0005 where they made portable signed approval,
LNSAT-held signing authority, enterprise persistence gates, hardware
attestation, or every package row block initial local v1. It freezes local
session approval, digest-stored one-time capabilities, user-owned keys,
optional hybrid signing, v16 core/v17 correction/v18 optional signed-evidence split,
bounded Git commit reference adapter, and selected-target release proof.

[ADR-0001](architecture/ADR-0001_V1_SCOPE.md) remains historical authority for
retained local/self-hosted single-node, embedded SQLite, local auth, stable
`/v1`, non-root, fail-closed, and no-live boundaries.

The roadmap retains fourteen numbered phases. Core local-v1 phases remain
ordered; explicitly optional post-local-v1 lanes do not block first local
support. Phase 3 Rust deterministic
security core includes packet, policy, approval, audit, audit-event
idempotency, and six-family error-envelope parity. The
[Phase 4 source checkpoint](architecture/PHASE_4_EXIT_EVIDENCE.md) is complete:
the embedded SQLite crate enforces explicit file-backed paths, owner-only Unix
creation, WAL, foreign keys, full synchronous writes, untrusted/defensive
schema posture, ten atomic digest-bound migrations, exact v1-through-v9
upgrade and reopen verification, integrity checks, future/unknown schema rejection, and
rollback proof. Immutable stable packet records persist canonical bytes,
SHA-256 identity, project/resource scope, and project-scoped idempotency.
Immutable stable policy records require that exact packet, digest, project, and
evaluation-time binding, then rederive full decision truth on every read.
Immutable pending approval requests require exact approval-required policy,
packet digest, project, and request-time binding, then rederive full request
truth on every read. Immutable approval decisions bind one terminal outcome to
that exact request, policy, project, distinct human reference/session, reason,
time, and expiry, then rederive full decision truth on every read. Approved
records satisfy only the approval gate and retain `execution_authorized:
false`. Persistence does not authenticate the human or sign the evidence.
Immutable audit events cover policy, request, and decision event families,
bind exact source-chain and terminal-idempotency evidence, persist ordered
reason codes, and rederive the full chain on read. Their authenticated
provenance, persistence-request, and execution-authority flags remain false.
Restart and competing-writer replay, conflicting identity refusal, scoped
reads, mutation refusal, and stored-evidence drift detection are covered.
Online-consistent backup captures committed WAL state into a standalone,
owner-only, current-schema snapshot with migration, integrity, size, and
SHA-256 evidence. Restore verifies and publishes an exact inert copy only at a
fresh path; no existing or active database is replaced. Corruption, symlink,
same-path, interrupted-temp, and publish-race negatives are covered.
Read-only recovery inspection classifies ready, bootstrap, migration-pending,
legacy Phase 7 evidence, unsupported, unknown, migration-drift,
integrity-failure, and unreadable states without taking action. Injected
precommit migration interruption and
`SQLITE_FULL` raw/public writes prove atomic rollback, prior-evidence
preservation, and forward recovery after the fault clears.
Immutable retention policies classify every current authority and audit family
as preserve-only control-plane evidence with no deadline or cleanup
eligibility. Bounded read-only planning verifies exact policy/trigger evidence,
counts protected rows, returns zero candidates, and takes no action.
Immutable recovery-inspection events now persist exact read-only classification,
deployment/target scope, OS-local path fingerprint, caller-supplied canonical
time, deterministic identity/idempotency, and quarantine recommendation. Raw
paths are absent; action and activation remain false. Restart, competing-writer,
backup/restore, migration-interruption, scope, mutation, and drift negatives
pass. Caller authentication, trusted time, quarantine mutation, and activation
remain closed.
The source-only Rust `lnsatd` now requires one explicit database path, rejects
wildcard/non-loopback/port-zero configuration, opens and verifies SQLite before
binding, confirms the operating-system address is loopback, and serves at most
eight bounded concurrent requests. `GET /healthz` remains readiness-only.
Authenticated `GET|HEAD /v1/health` and `/v1/status` reuse exact Host,
contract-version, same-origin fetch metadata, existing session-token header, active
owner/operator/auditor `ReadEvidence`, and one generic denial. They preserve
bodyless HEAD parity, expose no identity/session/path/host data, grant no
mutation authority, and declare only bounded session-activity evidence.
Source-local `POST|GET|HEAD|PATCH|DELETE /v1/session` now issues one bounded
password-authenticated session, reads active SQLite session proof, rotates the
current session secrets, or revokes the authenticated identity's active
session family through strict same-origin browser transport. Stable
`PATCH /v1/identity/password` performs bounded self-service credential
rotation, revokes the session family, and forces reauthentication. Source-local
owner-only `DELETE /v1/identities/{identity_ref}` permanently disables one
non-owner and atomically revokes its active sessions. Stable owner-only
`POST /v1/identities` creates one immutable operator or auditor through a
closed credential schema. Responses return only public
identity/session/credential evidence, emit no CORS allow
headers, and deny `OPTIONS`. Excess work
receives public-safe `503` evidence. An idempotent in-process shutdown handle wakes
accept, stops new work, drains bounded workers, and supports clean database
restart. The binary installs a non-overwriting fail-closed handler for Unix
SIGINT/SIGTERM/SIGHUP and Windows Ctrl-C/Break events; subprocess signal tests
exit cleanly and reopen the same database. Readiness reports exact schema state
and `mutation_authority: false`; the session response separately reports
`cors_enabled: false` and `mutation_authority: false`. Served authenticated
writers are current-session secret rotation, self-service password rotation,
same-identity session-family sign-out, owner-only non-owner creation, and
owner-only non-owner disablement; no packet/action writer, identity re-enable,
recovery
activation, service installation, remote access, or production API support is
exposed. `mutation_authority: false` refers to packet, action, adapter, and
runtime authority rather than protective authentication-state operations.
Phase 5 local identity and approval authentication has passed its source-local
exit. Stable Gateway composition now owns Phase 6 lane; optional user-key
signed approval remains Phase 7 signed lane, local one-time authorization
remains Phase 7 core lane, and stable recovery commands remain Phase 10. Rust
defines an exact versioned Argon2id credential profile. SQLite schema v9
atomically bootstraps exactly one immutable human owner plus preserve-only
credential evidence. Concurrency, invalid-input rollback, reopen,
verification, tamper, migration, and interruption negatives pass. Public
records expose no password or PHC verifier. This owner record grants no runtime
authority. Schema v10 adds password-authenticated, hash-only absolute-expiry
role-bound sessions with independent anti-CSRF proof, content binding, and
append-only revocation. Raw secrets return once and are absent from persisted
and public evidence. The immutable role map now limits identity management to
the owner, approval decisions to owner/operator, and evidence reads to all
three roles. Owner-authenticated creation provisions operator/auditor
credentials. Approval persistence requires an active matching approver
session, independent anti-CSRF proof, canonical session reference, and exact
trusted decision time; approval still grants no execution authority. Role,
CSRF, substitution, expiry, reopen, migration, interruption, and tamper
negatives pass. Route-neutral daemon composition now adds bounded
duplicate-refusing HTTP/1.1 head parsing, non-ambient browser secret headers,
independent session-proof verification, SQLite session/revocation verification,
secret-free authorized request evidence, and one generic denial. Server-owned
UTC now supplies issue/verification time; served session issue is bounded to
five attempts per durably known active identity per monotonic minute, while
unknown, invalid, and inactive identities do not consume limiter capacity but
still consume a validated fixed-profile Argon2id verification.
Authenticated mutation composition can atomically append revocations
for every active same-identity session without duplicate or cross-identity
authority. Schema v11 adds preserve-only append-only activity evidence with a
60-second touch granularity, a 900-second default idle timeout, exact-boundary
rejection, and a 61-row absolute bound. Migrated v10 sessions use immutable
issue time until their first verified touch. Atomic rotation creates fresh
bearer/CSRF material, retains the original absolute expiry, revokes the prior
session with reason `rotation`, and binds immutable replacement evidence.
Daemon authorization consumes the same idle/activity contract. Schema v12 now
adds at most 64 contiguous append-only
credential generations. Authenticated self-service password rotation
reverifies the latest password, appends the next Argon2id verifier, and
atomically revokes every active same-identity session with
`credential_revoke`; it issues no replacement session. Owner-authorized
permanent non-owner disablement appends immutable actor-session-bound status
evidence and atomically closes the target family with `owner_revoke`. Disabled
identities use the dummy Argon2id denial path. Daemon composition owns time and
generic denial for both operations. Password rotation is served through a
closed two-field JSON body, post-authentication per-session limiting, strict same-origin
CSRF proof, full session-family revocation, invalidated session-secret headers, and explicit
reauthentication. Owner-only identity disablement is served with exact empty
framing, permanent status evidence, atomic target-family closure, and no
re-enable authority.
Schema v13 now appends identity-local security events atomically with owner
bootstrap, non-owner creation, password rotation, and disablement. Events bind
contiguous sequence, exact actor session, source digest, credential generation,
and trusted time. V12 upgrades begin a forward-only sequence without fabricated
history. Stable `GET|HEAD /v1/identities/{identity_ref}/events` now serves that
revalidated stream through exact route-only target selection, existing
evidence-read permissions, one generic identity-existence denial, stable order,
and no mutation authority. Schema v14 now appends
session-local `issued`, `revoked`, and `rotated` security events in the same
transaction as their immutable source rows. Events bind contiguous post-v14
sequence, authenticated actor session, replacement session, revocation reason,
source digest, and trusted time. V13 upgrades retain existing session evidence
without fabricated history; the first later mutation begins sequence one.
Stable `GET|HEAD /v1/sessions/{session_id}/events` now serves that revalidated
stream through exact lowercase session-id grammar, existing evidence-read
permissions, one generic session-existence denial, stable order, and no
mutation authority. The daemon holds an owner-only
exclusive database-sidecar lease for its lifetime. Schema
v15 permits actorless session revocation only for exact owner recovery and
actorless `owner_recovered` identity events only for a new append-only owner
credential generation. The source-local offline recovery core requires that
daemon-shared lease, exact canonical database and expected-owner binding,
server-external trusted time, and one atomic credential/revocation/audit
transaction. It invalidates every active owner session and opens no HTTP route.
The live loopback server now
serves `POST|GET|HEAD|PATCH|DELETE /v1/session` through strict source parsing. `POST`
requires exact Origin, same-origin Fetch Metadata, JSON, a custom
session-intent header, a closed body at most 4 KiB, and a per-known-active-identity
limiter; success sets fresh non-ambient bearer/proof headers. Unknown identity
churn cannot consume known-identity capacity. All issue failures
share one stable denial. `POST /v1/session` now publishes the stable
`lnsat.gateway.session_issue.v1_0` contract with closed secret input,
fresh-session-per-success replay, possible failure-side limiter advancement,
and exact success-side limiter/session/event/session-secret-header effects.
`GET|HEAD` now emits the stable `lnsat.gateway.session_read.v1_0` secret-free
contract with exact bodyless `HEAD`, one generic denial, and explicit bounded
activity-evidence side-effect disclosure. No route emits CORS allow headers.
Authenticated `PATCH` now emits stable
`lnsat.gateway.session_rotation.v1_0` success/failure contracts. It requires
exact zero-length JSON framing plus Origin/Fetch Metadata/CSRF proof, atomically
replaces only the current session secrets, preserves absolute expiry, binds
prior and replacement ids in immutable evidence, returns fresh non-ambient
session-secret headers once, declares exact activity/revocation/replacement/rotation/event/session-secret-header
effects, and uses one zero-side-effect denial for transport, authentication,
expiry, replay, clock, evidence, and persistence failure. Authenticated
`DELETE` uses the same transport proof, atomically revokes every active
same-identity session, requires both client-held secrets to be discarded, and emits stable
`lnsat.gateway.session_family_sign_out.v1_0` success/failure contracts.
Success declares exact activity/revocation/event/session-secret-header effects, forces
reauthentication, and is one-time per active family. Transport,
authentication, expiry, replay, clock, evidence, and persistence failures
collapse into one zero-side-effect denial without session-secret headers or identity/session
detail. Authenticated `PATCH /v1/identity/password` accepts only
`current_password` and `new_password`, applies a shared post-authentication
per-session limiter, reverifies the latest credential, appends one immutable generation,
atomically revokes all same-identity sessions, invalidates both session-secret headers, and requires
reauthentication under stable
`lnsat.gateway.identity_password_rotation.v1_0`. Success declares exact
limiter/activity/credential/identity-event/revocation/session-event/session-secret-header
effects. Transport, schema, credential, limit, clock, evidence, and persistence
failures share one denial that exposes only possible verified-session limiter
advancement and no durable credential/session change. Packet/action mutation
and identity re-enable remain unserved. Owner-only `POST /v1/identities`
accepts only identity reference, display name, operator/auditor role, and
password, binds creation to an active owner bearer/CSRF pair, and atomically
appends identity, initial credential, and actor-session-bound event evidence
under stable `lnsat.gateway.identity_creation.v1_0`. Duplicate and all
in-contract failures share one denial exposing only possible limiter
advancement and no durable state change. Authenticated
`POST /v1/approval-requests` now
requires an active owner/operator session and exact CSRF, project, persisted
policy actor, and local-session binding; server-owned time derives immutable
pending evidence with zero approval or execution authority. Authenticated
`POST /v1/approval-requests/{approval_request_id}/decision` now derives one
owner/operator approver from active local-session evidence, enforces
distinct-human review and exact project scope, and persists approved/denied
evidence with server-owned time and zero execution authority. The response is
explicitly unsigned; server signing remains closed. A stable operator recovery
command remains Phase 10; no recovery route or re-enable authority exists. A
transport-neutral Rust browser-API preflight already requires numeric
loopback peer/Host, same-origin Fetch Metadata, exact mutation Origin, JSON, and
independent CSRF proof while rejecting unknown methods and OPTIONS.
Authenticated packet/action Gateway writer and recovery composition,
operator-controlled recovery/quarantine activation, stable product commands,
service lifecycle, packaged install/upgrade/rollback/uninstall, and stable API
composition remain in their later owning phases.
No approval signer, one-time execution issuer, sandbox adapter, hardware
attester, package, binary, image, installer, release, or update channel exists.
No stable OS operator CLI, module runtime, connector, model gatekeeper,
configuration registry, shared skill library, graph editor, entitlement
service, unpublished artifact, or hosted management system exists.

Provider-neutral signer readiness source now models software-vault,
PKCS#11 3.2, and cloud KMS/HSM boundaries using key references and public
readback only. It validates bounded future requests/results and lifecycle audit
metadata without calling providers. P1 remains exactly `unset`; runtime
signing, provider calls, key generation, signer activation, and production
verification all remain false.

Phase 6 source exit is complete. Stable Gateway source composition includes
authenticated approval-decision recording plus authenticated identity-event and
session-event read evidence. This exit remains source-only with no supported
runtime or deployment claim. Phase 7a signed-evidence contract foundation is
accepted in
[ADR-0004](architecture/ADR-0004_PHASE_7_SIGNED_APPROVAL_EVIDENCE.md): one new
immutable wrapper over the complete verified v1 packet-policy-request-decision
chain, pure Ed25519 over an exact domain-separated canonical preimage, pinned
public verification material, fail-closed rotation/revocation, and one
evidence/nonce identity per decision. Phase 7b now checks in pre-release,
unpublished wrapper, public-material, and closed-result schemas; TypeScript/Rust
structural parsers and full-chain rederivation; dependency-free canonical
payload/preimage/SHA-256 helpers; and 26 shared JSONL conformance cases.
Structural fixtures include public RFC key/signature bytes only and never claim
cryptographic success. Phase 7c adds one public-only pure Ed25519 primitive:
TypeScript stays runtime-neutral behind an explicit verification-provider
boundary, Node 22 conformance uses `crypto.verify(null, ...)`, and Rust pins
`ed25519-dalek` `3.0.0` with default features disabled. Exact RFC 8410 SPKI and
canonical base64url checks precede cryptographic work. The selected shared
fixture contains 28 cases (4 accepted, 24 rejected) from public RFC 8032 data,
pinned C2SP Wycheproof commit
`b61843a9a5115bb758134b6a1f5d5e502d445342`, and bounded substitution
negatives. Node 22/OpenSSL 3.5.4 and Rust also matched all 150 cases in that
pinned upstream Ed25519 corpus during dependency acceptance review.

This primitive is not wired into signed-approval evidence. No signing,
production signature verification, private material, key custody, nonce
issuance/persistence, status source, endpoint, store migration, execution
authorization, or runtime authority change exists. Structural wrapper success
still ends in `signed_approval.verification_unavailable`, and all authority
fields remain false.

[ADR-0006](architecture/ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
now controls Phase 7 sequencing. Signed approval is optional for local v1 and
uses user-owned keys only. Local approval, execution authorization, and receipt
authentication are separate. Core path uses authenticated local-session
approval plus an exact server-side authorization record and digest-stored
one-time capability redeemed atomically through Gateway. Optional v18 work
adds public-key lifecycle, hybrid invoke/pull/manual signer transport,
verification, and signed-proof variants. A KMS signature without independent
user presence is service/automation evidence, not distinct-human approval.

Phase 7d now has a proposed
[enterprise local-persistence design](architecture/ADR-0005_PHASE_7D_ENTERPRISE_LOCAL_PERSISTENCE.md).
It retains SQLite only for a measured single-host envelope and freezes
normalized append-only key-status, signed-evidence, nonce-lifecycle,
verification-attempt, single-use-consumption, and nonce-consume-request
idempotency invariants. It also defines PostgreSQL/HA gates, transaction and
migration controls, RPO/RTO, retention, telemetry, and fault/concurrency
acceptance tests. Phase 7d-A1/A2/A3/A4/A5/A6/A7 adds one inert candidate-v18
SQL fixture and test-only verifier for authority order, public Ed25519 material,
append-only key status, nonce identity/lifecycle, immutable signed-approval
evidence, project-scoped issuance idempotency, bounded verification-attempt
persistence, single-use nonce-consumption, and nonce-consume-request
idempotency. Evidence stores bounded canonical bytes, exact preimage digest
identity, structural signature bytes, material/nonce/time bindings, and fixed
false authority.
Consumption records use `nsc_` IDs, lowercase safe authorization refs, exact
`consumed_at` ordering, active material status and expiry checks, and immutable
consumption with adjacent terminal consumed nonce events. Raw authorization
bytes are not stored. Nonce-consume-request idempotency now stores one scoped
project/key request digest to one unique consumption result with canonical
`created_at`. Its domain-separated digest binds exact project, nonce, evidence,
authorization reference, and authorization digest; result/server values remain
outside request identity.
Idempotency binds one project/key to an independently rederived request digest
and unique evidence result. Verification attempts store one canonical identity,
domain-separated project-scope and hostile-input digests, a closed
verified/rejected result and reason, trusted time, and optional safely resolved
evidence/material subject. Raw input is absent. Thirty focused tests cover
the complete 34-code rejection taxonomy, relational and canonical binding,
ordering, exact read-only replay, digest conflict and scope isolation,
active-key, terminal-event, evidence, issuance-idempotency, attempt,
consumption, and consume-request-idempotency races, required-audit rollback,
capacity, tamper, future-version, and query-plan evidence. Candidate public and
signed-evidence storage remains test-only. No active signer, private material,
cryptographic verification wiring, Gateway/runtime issuance or verification
API, attempt cleanup, operational consumption, execution authority, adapter,
API activation, or deployment is implemented.

P7-M1 registers atomic SQLite migration 0016 and schema 16. It adds exact
core-loop tables, digest-only capability fields, immutable audit bindings,
retention metadata, and one inert authorization-attempt append/read path.
Fresh/upgrade/reopen, rollback, competing writer, capacity, backup/restore,
scope, idempotency, and drift tests grant no runtime authority.

P7-N1 adds store-only server-owned 32-byte OS-CSPRNG nonce issuance. Raw bytes
return only on first successful issue, zeroize on drop, and never persist;
SQLite stores SHA-256 digest evidence only. Trusted server UTC caps expiry at
`min(issued + 5 minutes, approval expiry)`. Active state becomes terminal by
cancellation or expiry, with immutable v16 audit/state evidence, exact replay,
restart/backup, rollback, clock-boundary, tamper, and competing-writer proof.
No served/public capability issuance, redemption, or execution consequence is
opened.

P7-B1 registers atomic SQLite migration 0017 and schema 17. Exact
packet-embedded execution proposals now derive inert `ExecutionRequestV1`
bytes and action, target, configuration, versioned-adapter, executable,
audience, and approval-chain evidence. Production attempt preparation accepts
only project and approval-decision selectors; store code reloads exact approved
bytes and owns trusted time, attempt/audit IDs, and idempotency identity. Legacy
packets fail closed for new preparation. One approval decision can back at most
one execution authorization, and each authorization's claimed approval and
binding evidence must equal its authoritative attempt and nonce chain.
Canonical receipt storage accepts only
authenticated digest-matched receipts; rejected payload handling stays closed
for a future append-only verification-attempt family. Migration refuses to
reinterpret or discard any pre-existing v16 Phase 7 record. A valid populated
v16 database stays at v16 with non-migration-eligible
`legacy_phase7_evidence`; semantic tamper becomes quarantine-recommended
migration drift. Operators preserve the original database and a verified
backup, inspect it read-only or with v16-compatible tooling, and use a separate
fresh v17 database if clean-schema work must continue. Forced `user_version`,
row deletion, or evidence rewriting remains forbidden pending separate future
approval. Readiness ledger v3 binds completed packets to real Git commits and
raw-blob SHA-256 manifests, candidate tests are
extracted from store root, and independent review evidence is machine-checked.
No keys, provider calls, adapter dispatch, receipt API, served/public
Gateway/API activation, execution consequence, deployment, or artifact
publication is opened.

P7-C1 adds store-only atomic one-time capability consumption without creating
authorization or capability issuance. Caller-supplied 32-byte secrets are
zeroized immediately after domain-separated digest derivation; only digests
persist and comparison uses a vetted constant-time primitive. One
`BEGIN IMMEDIATE` transaction rederives the full authorization, nonce,
approval, policy, packet, and exact pre-dispatch operation chain before it
persists consumption, terminal `consumed` authorization state, entity, and
required audit evidence. Exact replay returns original evidence without new
writes; wrong/missing/expired/revoked inputs remain non-oracular; conflicting
writers choose one winner. Rollback, post-commit ambiguity, restart/backup,
tamper, secret-disclosure, `INSERT OR REPLACE`, fixed-vector, and two 32-writer
races are covered. Independent review is Git-bound at
`docs/reference/security-reviews/P7-C1/implementation-review.json`. This is
`implemented_not_wired`: no served/public Gateway/API redemption, consequence,
operation attempt, adapter dispatch, receipt, reconciliation, provider call,
deployment, or artifact publication is opened.

P7-A1 adds source-only, route-neutral Gateway/store composition for exact-bound
local authorization issue, metadata read, cancel, revoke, and authenticated C1
redemption. One `BEGIN IMMEDIATE` issuance transaction reauthenticates the
requester bearer and CSRF token, reloads the full attempt/nonce/approval/policy/
packet/session chain, caps a digest-only 32-byte OS-CSPRNG capability to a
60-second half-open window and all source/session expiries, then atomically
persists authorization, prepared operation, state, entity, and audit evidence.
Exact replay returns metadata only. Capability wire ownership is redacted,
non-cloneable, non-serializable, zeroized on use/drop, and never stored raw.
Cancel requires the exact requester session; revoke requires the exact
approver session or owner authority; terminal races cannot reactivate a record.
Authenticated redemption rechecks the exact requester session and CSRF token
inside the consumption transaction. Rollback, post-commit ambiguity,
restart/backup, tamper, expiry boundary, wrong binding/audience/session,
concurrent issuance, and cancel/revoke-versus-redeem races are covered.
Independent review is Git-bound at
`docs/reference/security-reviews/P7-A1/implementation-review.json`. This remains
source-only and `implemented_not_wired`: no served/public mutation route,
adapter dispatch, Git consequence, operation attempt, receipt API, signing,
provider call, deployment, or artifact publication is opened.

ADR-0005 candidate SQL remains test-only design evidence and must not become
v16 wholesale. Core v16 tables remain limited to local authorization, nonce,
consumption, operation, receipt, reconciliation, and audit state; corrective
v17 hardens their semantics; optional public-key and signed-approval
persistence stays in v18. Completed local core
packets `P7-R1/X1` did not depend on optional signed packets
`P7-K1/S1/V1/I1`. PostgreSQL/HA, fleet, multi-tenancy, formal compliance,
hardware attestation, and unselected distribution rows do not block local v1.

Phase 6 source includes stable negotiation, local session
issue, authenticated current-session read, current-session rotation, and
same-identity session-family sign-out plus self-service identity-password
rotation, owner-only non-owner identity-creation, and owner-only permanent
non-owner identity-disablement, authenticated identity-event and session-event
reads, plus authenticated pending approval-request and terminal
approval-decision contracts.
Phase 6 source exit remains complete only while that stable set remains proven in
route-negative and route-positive conformance suites, with no supported runtime
or deployment claim. It remains source-only.
Loopback `GET|HEAD /v1` requires the exact
`LNSAT-Contract-Version: lnsat.contracts.v1_0` header, repeats that accepted
version on success, rejects deprecated `v0_1` rather than downgrading, and uses
the shared version-family error envelope with `side_effects: []`. The endpoint
is static, reads no store, and grants no mutation authority. It is deliberately
unauthenticated because it reveals no deployment or authority state. Every
`/v1/` subroute also requires exact stable version after loopback/Host
validation but before route, authentication, policy, store, or mutation work.
Every routed response after acceptance repeats the version header.
Approval-request creation and approval-decision recording are stable.
Local-password
`POST /v1/session` is closed-schema and non-idempotent: every success creates
fresh authentication state and session-secret headers, while failure discloses only possible
limiter advancement. Authenticated
`GET|HEAD /v1/session` is current-session-only, returns one generic oracle-free
denial for every authentication failure, reflects no secret, and declares that
successful verification may append bounded activity evidence while granting no
packet/action or execution mutation authority.
Authenticated `PATCH /v1/session` is current-session-only and one-time:
success atomically appends replacement, prior revocation, rotation, and
security-event evidence while preserving absolute expiry and returning fresh
session-secret headers; every in-contract denial is generic and zero-side-effect.
Authenticated `DELETE /v1/session` is same-identity-family-only and one-time:
success atomically revokes every active family session, appends security-event
evidence, invalidates both client-held secret headers, and forces
reauthentication; every
in-contract denial is generic and zero-side-effect.
Authenticated `PATCH /v1/identity/password` is authenticated-identity-only and
one-time per active family: success reverifies the latest password, appends one
credential generation and identity event, atomically revokes the family,
invalidates both client-held secret headers, and forces login with the new
password. Its generic
denial discloses possible verified-session limiter advancement while durable
credential/session state remains unchanged.
Owner-only `POST /v1/identities` is create-once per immutable identity
reference: success appends one operator/auditor identity, initial Argon2id
credential, and actor-session-bound identity event atomically. Its secret-free
response declares exact limiter/activity/identity/credential/event effects and
returns no session-secret headers. Duplicate, non-owner, schema, credential, CSRF, clock, drift,
and persistence failures share one generic denial exposing only possible
verified-session limiter advancement; durable state rolls back.
Owner-only `DELETE /v1/identities/{identity_ref}` is one-time per active
operator or auditor target: success appends permanent identity-status and
actor-session-bound identity-event evidence, atomically closes the target
session family, and returns only the target reference, trusted time, and
revoked-session count. Its stable
`lnsat.gateway.identity_disablement.v1_0` response declares exact activity,
status, identity-event, possible target-revocation, and possible target-session
event effects. Owner, missing, malformed, already-disabled, transport, CSRF,
clock, drift, and persistence failures share one zero-side-effect generic
denial; failed SQLite transitions roll back durable activity, identity, event,
and session evidence together. No re-enable, role mutation, owner deletion,
packet/action, approval, or execution authority is added.
Authenticated `GET|HEAD /v1/identities/{identity_ref}/events` validates one
literal route-only human identity reference, requires an active owner,
operator, or auditor session with existing `ReadEvidence` permission, and
returns only closed revalidated identity-event evidence in ascending sequence
order. `HEAD` preserves status and representation headers with zero body.
Missing auth and malformed, unknown, tampered, or unreadable target evidence
share `gateway.identity_event_read.denied` without reflecting target input or
identity existence. Success and denial declare possible bounded session
activity; identity state, session authority, execution authority, and mutation
authority remain unchanged. Query, body, encoded/ambiguous path, mutation, and
`OPTIONS` requests fail closed.
Authenticated `GET|HEAD /v1/sessions/{session_id}/events` validates exact
`ses_` plus 32 lowercase-hex route grammar, requires an active owner,
operator, or auditor session with the same `ReadEvidence` permission, and
returns only closed revalidated `issued`/`revoked`/`rotated` evidence in
ascending sequence order. Existing nullable actor, replacement-session, and
revocation-reason semantics remain exact. `HEAD` preserves status and
representation headers with zero body. Missing auth and malformed, unknown,
tampered, or unreadable target evidence share
`gateway.session_event_read.denied` without reflecting target input or session
existence. Success and denial declare possible bounded session activity;
identity, session-authority, packet/action, signing, nonce, consumption,
execution, and mutation authority remain false. Query, body,
encoded/ambiguous path, mutation, and `OPTIONS` requests fail closed. The
current-session `/v1/session` route remains distinct and unchanged.
Authenticated `POST /v1/approval-requests` is content-bound by server-owned
time: exact derived identity at an identical instant replays, while a different
instant creates a distinct pending request. Stable
`lnsat.gateway.approval_request.v1_0` success declares exact
limiter/activity/append effects outside unchanged
`lnsat.approval_request.v1_0` domain evidence. Its one generic denial exposes
only possible limiter advancement and rolls back durable activity/request
state. Approval recording, signing, execution authorization, session-authority
change, packet/action mutation, and adapter dispatch remain false.
Authenticated
`POST /v1/approval-requests/{approval_request_id}/decision` derives one
distinct active owner/operator approver and canonical local session, supplies
server-owned time, rederives exact project/request/policy/packet evidence, and
records or exactly replays one immutable terminal decision. Stable
`lnsat.gateway.approval_decision.v1_0` declares conditional outer
limiter/activity/append effects outside unchanged
`lnsat.approval_decision.v1_0` domain evidence. Terminal conflicts and every
in-contract failure share one generic denial exposing only possible limiter
advancement. Signing, approval consumption, execution authorization,
session-authority change, packet/action mutation, and adapter dispatch remain
false.

## Phase 8 and Phase 9 Runtime Readback

Phase 8 merged the exact eight numeric-loopback runtime routes, daemon-wide
zero-queue dispatch admission, atomic capability-consumption plus attempt claim,
bounded disposable Git consequence, canonical receipt, and fail-closed
reconciliation evidence. It remains experimental and production-unsupported;
no public listener, user/production repository, blind retry, external receipt
submission, package, deployment, or artifact publication exists.

P11-R1 proves one full served request -> distinct-human approval -> capability
issue -> atomic consume/claim -> disconnected execute response -> daemon restart
-> exact operation and attempt readback -> requester reconciliation -> exact
replay chain through those existing routes. The disconnected client treats the
outcome as unresolved until readback and reconciliation. The proof records
exactly one disposable Git consequence, one attempt, one receipt, and no
redispatch. Reconciliation now validates stable repository identity and
approved evidence while permitting expected post-commit `HEAD`; index and
worktree must still match the approved base. Fresh dispatch still requires
exact approved base and a clean target.
P11-I1 replaces packet/policy fixture seeding for new served requests with
authenticated same-origin `POST /v1/packets`. Active owner/operator session,
CSRF, `request_action`, packet actor/session, immutable packet digest, and
server-time deterministic policy evidence bind in one transaction. Exact
replay returns original policy evidence; response withholds canonical packet,
intent, constraints, and action arguments. P11-D2 permits explicit closed
Docker-local profile selection and public-safe digest readback only. P11-D3
defines canonical bounded adapter-process request/result framing and exact
identity binding only. P11-D4A supplies the exact approved payload. P11-D4B1
added a dormant source-only launch supervisor with fake-runtime tests, and
P11-D4B2A added atomic attempt/receipt persistence plus restart-safe,
inspection-only reconciliation. At those checkpoints, no served route called
either seam. P11-D4B2B now exercises the D2 schema-2 profile -> D4B2A atomic
claim -> D3/D4A payload -> D4B1 supervisor -> D4B2A receipt or
`outcome_unknown` chain over the unchanged existing eight Phase 8 routes only
under an internal crate-test-only selector. It uses a fake Docker executable,
disposable Unix socket, marked temporary Git target, and host Git verifier.
Exact replay is metadata-only with no redispatch; interrupted ambiguity survives
restart; reconciliation inspects host Git only and never launches the runtime or
retries the consequence. P11-D4C1 adds a source-only reference-adapter binary
and D4A-bound exact profile mount-path argument. Host-process tests prove mapped
disposable Git execution, executable and target binding, wrong-mount rejection,
disabled promisor lazy fetch and Trace2 targets, silent pre-output failure,
oversized-input rejection, fail-closed partial output, canonical result output,
and private-index cleanup after success and failure without Docker access. No
real Docker proof or support claim exists, and the separate real disposable
Docker image/runtime gate remains closed.
The proof-readiness plan can now freeze exact future identities and negative
cases without runtime I/O. This remains source design only; no runtime evidence
exists and Phase 11 remains incomplete.

Phase 9 adds a read-only Control Center client for one exact operation ID. One
explicit local login issues the existing bounded session and captures the
non-ambient token/proof response-header pair in volatile React memory. One
explicit Load/Refresh action performs only relative same-origin GETs with
ambient credentials omitted, the stable contract-version header, and both
session-secret headers. Local forget, page hide, unmount, or HTTP 403 discards
the pair and live snapshot. It reads the operation, Gateway-supplied
authorization, and an attempt only when the operation supplies its exact
attempt ID. Closed-shape validation and exact project/resource equality precede
rendering. `completed` requires canonical
Gateway receipt evidence; `outcome_unknown`, failure, timeout, abort, missing
response, missing receipt, and cancellation remain non-successful and never
confirm non-execution. Prior valid live evidence survives failed refresh only
as an in-memory stale snapshot for the same exact operation. Input divergence
clears evidence, late cross-input results are ignored, and a newer mutable
attempt state is accepted only when immutable attempt/scope/adapter/protocol
identity matches. Live evidence and unchanged
`lnsat.control_center.operation_readback.v0_1` fixtures remain discriminated and
visually separate.

`DaemonConfigV1` also has an optional source-local console-root seam. P10-A2
may select it only through one explicit closed configuration file. At bind, it
rejects unsafe manifests and loads only exact regular,
non-symlinked, size-bounded assets into memory. The daemon serves only those
manifest request paths over GET/HEAD on its exact numeric-loopback origin with
self-only CSP/connect policy. There is no directory fallback, traversal,
hostname alias, forwarded-host trust, CORS, public listener, package, installer,
or target-path claim.

See
[Phase 9 API-backed Control Center](architecture/PHASE_9_API_BACKED_CONTROL_CENTER.md).

## Phase 10 Product-Surface Contract Spine

P10-A1 adds target-neutral source contract
`lnsat.product_surface.v1`. `lnsatd`, new Rust `lnsatctl` source, and TypeScript
`lnsat` expose equal source manifest identity without selecting target paths,
source revision, artifacts, package rows, or support. Stable exit-code families,
JSON machine schema, configuration precedence, secret-input rules, recovery and
service boundaries, completion/man source, non-root requirements, and build
posture are explicit.

P10-A2 adds closed contract `lnsat.daemon.config.v1` and
`lnsatd --config <absolute-path>`. One explicit file must be regular,
non-symlinked, UTF-8, at most 64 KiB, duplicate-key-free, and schema-closed. It
may select only the existing database path, numeric-loopback listen address,
paired disposable Phase 8 Git
paths, and exact console-root asset manifest. Mixed direct/config input, unsafe
paths/manifests, secret fields, and environment discovery fail closed. Existing
direct daemon arguments remain compatible.

Current `lnsatctl` implements source-local `doctor`, public-safe `config
inspect`, exact read-only `recovery inspect`, withdrawn legacy `health`/`status`
errors,
non-root offline `backup`, fresh inert `restore`, protected `recovery owner`,
stable text/JSON/JSONL/YAML, manifest, completion, man, help, and version.
Legacy health/status forms return `lnsatctl.unix_transport.withdrawn` before
protected stdin, Unix connection, or request bytes. No bearer or browser proof
is sent to a Unix peer. Numeric-loopback HTTP remains the browser/API transport
with unchanged header-pair authentication. A non-null `control_socket_path`
returns `lnsatd.control_socket.withdrawn` before bind; absent or `null` remains
schema-compatible. No default/remote/DNS/proxy/redirect/retry/discovery CLI
transport exists. Config
inspection returns exact-byte SHA-256 and applied-layer evidence without path,
address, or source-byte reflection. P11-D2 may additionally open one explicitly
selected Docker-local profile file through the closed D1 loader and return only
its contract/profile identities plus profile and authority-configuration
digests; it starts no runtime. P11-D3 consumes that retained identity only in
side-effect-free protocol frame construction and validation; it does not open
the profile path again or launch an executable. P11-I1 opens only authenticated
packet/policy intake and does not invoke D3 framing or any runtime. Recovery
inspection reflects no raw path and performs no migration, repair, quarantine,
credential change, or activation. Backup and owner recovery prove daemon
quiescence through the shared exclusive database lease. Restore requires a
fresh destination, creates inert state, and cannot replace or activate a live
store. Owner recovery validates current schema and expected owner before
reading one bounded UTF-8 password from protected stdin, then atomically appends
credential/audit evidence and revokes all owner sessions. Daemon bind and
offline recovery mutations refuse effective UID zero on macOS/Linux. Recovery
results reflect no raw path or secret material.

Exact `lnsat.operator_recovery.v1` parity exposes these mutations only through
the offline CLI. API has no recovery route, MCP registers no recovery tool, and
Control Center renders no recovery action. Service install/start, activation,
update, provider, served recovery, and other consequence commands remain
unavailable. Existing packet inspection retains CLI/API/MCP equality; its
read-only Control Center projection still preserves exact Gateway policy and
audit evidence with empty effects.

System/user config paths and target/package lifecycle proof remain Phase 14
work. P10-X1 completes Phase 10 source conformance; P11-R1 opens only the
bounded experimental proof described above.
See the
[Phase 10 product-surface contract spine](architecture/PHASE_10_PRODUCT_SURFACE_CONTRACT_SPINE.md)
and [conformance freeze](architecture/PHASE_10_PRODUCT_SURFACE_CONFORMANCE_FREEZE.md).

## Release Readiness Still Required

Before any supported public artifact:

- complete every local-v1-required roadmap phase; hardware attestation and
  other explicitly post-local-v1 phases remain optional;
- select one or two exact Phase 14 OS/architecture core-target rows and prove
  every selected row; unselected rows remain unsupported, not blockers;
- expose pin-verifiable canonical component identity for LNSAT packages and consumers;
- produce reproducible artifacts, checksums, signature bundles, SPDX JSON SBOM,
  SLSA v1 provenance, and selected core-target compatibility evidence;
- document headless configuration, recovery, update, rollback, and revocation;
- complete full-history secret and dependency scans;
- verify public CI, branch protection, issue intake, and security reporting;
- complete public-source history/privacy/metadata review and obtain explicit
  repository-visibility authorization;
- obtain separate later artifact-publication authorization after Phase 14.

LNSAT owns selected core package lifecycle evidence and support claims for
Phase 14 rows. Graphical assets and unselected installer formats do not block
LNSAT V1.

See [roadmap](ROADMAP.md), [release process](RELEASING.md), and
[public-readiness report](PUBLIC_READINESS.md).
