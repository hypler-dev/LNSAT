# Product Build Sequence

- Status: current documentation control
- Product effect: none
- Runtime effect: none
- Artifact effect: none

This document reconciles LNSAT's original v1 goal, accepted architecture
changes, current implementation truth, and remaining build order. It prevents a
completed source packet from being mistaken for a supported runtime or a
package build from starting before product behavior is complete.

HCFG-3A prepares the core declaration-composition primitive
needed before effective/export CLI integration. Its bounded source contract
and acceptance live in [Project Status](PROJECT_STATUS.md#hcfg-3a-core-declaration-composition).
HCFG-2 inspection is integrated. Complete composition diagnostics, monitoring,
separately authorized protected controls, and OS-enforcement conformance before
closing the headless gate. No source foundation alone satisfies this sequence.

## Preserved Product Goal

First LNSAT V1 release remains an embeddable, owner-controlled authority
runtime and package:

- Rust owns security-critical contracts, local persistence, daemon behavior,
  authorization, receipt binding, and stable operator CLI behavior;
- `lnsatctl` owns complete headless configuration and operator operations;
- SQLite is initial embedded authority store;
- local identities, scoped roles, secure sessions, CSRF protection, policy,
  distinct-human approval, exact one-time authorization, bounded consequence,
  receipt, reconciliation, and audit form one end-to-end product loop;
- runtime is non-root, loopback-default, fail-closed, and explicitly started;
- hosted SaaS, fleet/HA, multi-tenancy, unrestricted infrastructure control,
  and production reference actions remain outside initial v1; selected core
  package lifecycle proof remains part of the staged V1 build.

## Headless Configuration And Control

Accepted V1 product requirement; implementation and platform proof remain pending.
Gate: headless configuration and control. State: pending; blocks Phase 13
RC freeze regardless of the completed historical P10-X1 source checkpoint.
HCFG-0 and HCFG-1 implement source-only diagnostics. The accepted security
correction supersedes the prior v1 status and manifest bytes to withdraw the
unsafe Unix bearer transport; the ledger binds both old and replacement
digests. Explicitly selected `lnsat.product_surface.v2` exposes the v2
manifest/status diagnostic shapes and `lnsatctl config schema|validate`. There
is no range or fallback.
`config validate` reads the selected config and any referenced runtime profile,
but opens no database, listener, process, or action authority. This does not
satisfy this gate or the separate Phase 11 disposable Docker proof.
LNSAT must provide complete headless setup and ongoing management through its
versioned API and `lnsatctl`. Graphical setup, presets, and management UI are
later LNSAT surfaces built on those protected versioned interfaces; they are
not V1 exit requirements. Selected core package lifecycle is a V1 requirement.
Gateway cannot be bypassed or silently grant additional permissions. Every LNSAT
artifact must expose immutable component
identity and support signature, provenance, and revocation verification under
the [release process](RELEASING.md). Trust-root rotation and downgrade denial
require tests, not trust in a GitHub URL alone.

The LNSAT core and `lnsatctl` must distinguish two independently reviewable
boundaries:

- **LNSAT resource access:** exact folders, repositories, services, connectors,
  runtime profiles, and OS resources the installation may reach.
- **Agent action authority:** which principals may request which bounded actions
  within that resource envelope, which require human approval, and which are
  denied. Resource access alone never authorizes an agent action.

Bind resource grants to canonical identity, not a displayed path alone. Validate
identity at grant and use; reject symlink/reparse-point, mount, or target
replacement that escapes scope. A UI selection is not OS enforcement proof.

Declarative configuration supports explicit layers and composition, with
`config schema`, `show`, `validate`, `diff`, `effective`, `apply`, and `export`.
The core computes effective authority. Product surfaces may render presets and
forms but must consume those results and never compute permissions themselves.
Unknown fields, unsupported capabilities, and invalid composition fail closed.

`lnsatctl` provides secure machine-readable monitoring and control for
`watch`, `status`, `health`, `operations`, approvals, audit, recovery, and
emergency disablement. Watch uses server-sourced versioned events, cursor/resume,
deterministic ordering, bounded retention/backpressure, explicit disconnect
behavior, and JSONL output; transport loss never implies an outcome. Secrets
remain references and are redacted. Online mutations require authenticated
Gateway authorization, are applied atomically, and produce durable audit
evidence. Offline backup, inert restore, owner recovery, and initial bootstrap
are deliberate local exceptions: no agent, API, MCP, or UI path may invoke
them; they require explicit host-owner proof, non-root execution, exact targets,
exclusive daemon-shared lease where applicable, bounded one-time semantics,
and durable evidence. Initial owner bootstrap additionally requires separately
reviewed local ownership proof.
The implementation packet must define the bootstrap trust root, exact initial
owner/installation/configuration binding, one-time consumption, and denial of
forged, substituted, replayed, or interrupted bootstrap activation. Reuse existing
owner-bootstrap security foundations where applicable rather than inventing a
second ownership authority.

Privilege increases require an explicit authenticated human decision bound to the
exact configuration change; an agent or client cannot self-approve.
Rollback must not silently restore revoked or broader authority. Explain the
effect of narrowing or disablement on queued and in-flight work without claiming
that cancellation proves non-execution.

OS abstraction must map stable capabilities to explicit platform controls and
show their observed enforcement status. Unsupported or unverifiable restrictions
must block activation of the affected capability; diagnostic-only visibility may
remain available with a clear coverage warning. Never silently emulate stronger
isolation or label unmediated paths as controlled. Exact OS, architecture,
runtime, and selected core-target rows still require separate compatibility
evidence. LNSAT owns final package-row evidence for every selected target.

This is additional product work beyond the completed P10-X1 source checkpoint,
not a claim that the current read-only Control Center already administers access.
Before Phase 13 RC freeze, implement and independently review the headless
configuration contract and source tests. Phase 13 must cover unauthorized
changes, self-approval, stale/concurrent updates, configuration drift,
unsupported controls, interruption, disablement, rollback, restart, and
secret-safe output. Every claimed target must also pass negative and race tests
for symlink or reparse-point escape, mount substitution, target replacement
between validation and use, and revocation concurrent with use. Graphical
lifecycle remains staged LNSAT product work.
Source implementation needs a separately bounded packet; this documentation
opens no route, OS permission, runtime, install, or execution authority.

### Headless source packet order

The accepted headless requirement is implemented in dependency order. Packet
implementation and acceptance evidence belong to
[Project Status](PROJECT_STATUS.md),
not this ordering record.

1. **HCFG-2 — redacted explicit inspection/comparison.** Reuse the closed loader
   for v2 `show` and `diff`; compare validated values before redaction and
   distinguish source bytes from setting changes. No new configuration fields,
   layer composition, effective-authority result, or mutation.
2. **HCFG-3 — declarative composition and effective/export diagnostics.** Define
   explicit layer inputs and a closed resource-access/action-authority model in
   the core. Reject unknown capabilities and authority-widening inheritance.
   Specify redacted export semantics and test defaults, ordering, conflicts,
   unsupported controls, and secret-safe output before exposing these commands.
3. **HCFG-4 — monitoring evidence.** Inventory existing authenticated reads;
   complete operations, approvals/audit readback, then versioned watch with
   bounded retention, cursor/resume, ordering, disconnect, and backpressure tests.
4. **HCFG-5 — protected configuration/control.** Prepare exact authorization,
   ownership, audit, atomicity, rollback, revocation, and race contracts first.
   Obtain any new authority decision before implementing mutation, bootstrap,
   permission activation, or emergency controls. Reuse existing Gateway and local
   owner-proof foundations; never create a second authority path.
5. **HCFG-6 — enforcement and headless conformance.** Bind observed OS controls
   to stable capabilities, deny unsupported activation, test target substitution
   and revocation races, and close source conformance. Actual runtime and selected
   target proof remain separately authorized Phase 11/14 gates.

This sequence does not preapprove the later mutation contracts or satisfy the
headless release gate. Each source packet requires focused validation and fresh
independent review before a separately authorized merge.

## Accepted Changes Since Original Plan

Accepted decisions changed sequencing and breadth without changing that goal:

1. ADR-0006 makes portable signed approval optional for local v1. Private keys
   remain user controlled outside LNSAT. Core schema v16 plus corrective v17
   serve local authorization; optional signed-evidence persistence belongs to
   separately approved v18 work.
2. Phase 7 source packets through P7-X1 are complete. They prove the authority
   chain and disposable Git consequence in source tests, but no served/public
   execution-authorization or adapter mutation route, runtime dispatch,
   production target, or release authority exists.
3. MCP 2026-07-28 is the canonical experimental protocol source. Legacy MCP,
   FastMCP, A2A, OAuth, SPIFFE, OTel, Registry, and signer-provider evidence
   remain bounded adapter inputs, never authority.
4. Phase 12 hardware/environment attestation, signed-evidence packets,
   enterprise persistence, fleet/HA, and unselected package rows do not block
   first local support.
5. Phase 14 requires only explicitly selected LNSAT core-target rows. Every
   claimed core target still needs artifact identity, trust, runtime,
   compatibility, and package lifecycle proof.
6. LNSAT extensions, connectors, models, and release composition cannot fork or
   weaken Gateway authority.
7. ADR-0007 selects one local Docker/OCI profile as first v1 runtime
   integration. Docker/OCI runtime components remain replaceable integration
   surfaces; Gateway remains sole authority and the same contracts must support
   later secure-VM, native-host, and remote profiles.

## Current Build Position

| Phase | Current truth                                                       | Remaining release blocker                                                               |
| ----- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1-3   | source and deterministic-contract foundations complete              | preserve public/source and TS/Rust conformance gates                                    |
| 4     | source checkpoint complete                                          | selected core-target proof belongs to Phase 14                                          |
| 5     | source-local exit complete                                          | preserve auth/session/approval security gates                                           |
| 6     | source exit complete                                                | supported runtime claim remains closed                                                  |
| 7     | P7-X1 source conformance complete                                   | preserve Phase 7 authority-chain and disposable-target invariants                       |
| 8     | bounded loopback runtime composition merged                         | preserve exact routes, one-attempt evidence, and production-unsupported boundary        |
| 9     | authenticated exact-ID Control Center readback exists               | preserve live/fixture separation and fail-closed ambiguity mapping                      |
| 10    | P10-X1 source conformance complete                                  | headless configuration/control gate pending; preserve core authority ownership          |
| 11    | served Git proof plus closed Docker profile/config/process protocol | complete separately gated adapter/runtime proof without production repository authority |
| 12    | optional post-local-v1 lane                                         | none unless selected support profile requires it                                        |
| 13    | planned                                                             | complete reliability, security, recovery, update/revocation, and RC-source freeze       |
| 14    | blocked; no core-target row selected; no artifacts                  | build and prove only selected LNSAT core-target rows after required product phases pass |

No current package, binary, container, installer, supported runtime, or
published release artifact exists.

Public repository source is separate from release publication. Audited
fresh-history source is public before Phase 13/14 under
`docs/PUBLIC_READINESS.md`, while every artifact, package, tag, support, and
production gate remains closed.

## Required Critical Path

Current required sequence is **Phase 8 -> Phase 9 -> Phase 10 -> Phase 11 ->
Phase 13 -> Phase 14**. Phase 12 remains optional unless a separately approved
support profile makes it required.

1. **Phase 8 runtime-composition readiness — complete.** Freeze exact loopback routes,
   requester/approver authentication, CSRF and permission rules, nonce and
   capability handling, idempotency, disposable-target identity, adapter
   sandbox, receipts, reconciliation, audit, rollback, and ambiguity behavior.
   Readiness/design approval does not authorize implementation or consequence.
2. **Phase 8 runtime composition and conformance — complete.** Reviewed source
   connects only the exact loopback Gateway/store/adapter routes and marked
   disposable Git target. Transport equality and fail-closed ambiguity proof
   pass; production and user repositories remain forbidden.
3. **Phase 9 API-backed Control Center — complete in experimental source.**
   Exact-ID, manual same-origin reads load operation, authorization, optional
   attempt, receipt, and reconciliation evidence through the active local
   session. Live and synthetic evidence remain separate; transport state never
   implies success or confirmed non-execution.
4. **Phase 10 product surfaces.** Stabilize daemon, operator CLI, dispatcher,
   configuration, paths, diagnostics, exit codes, machine output, recovery,
   service metadata, completion, and man-page contracts. Configuration must
   expose redacted resolved precedence, permit only monotonic narrowing, and
   preserve an authority-managed stop across reload and restart.
5. **Phase 11 served reference workflow.** Prove the complete local loop
   through supported interfaces against disposable repositories only. First
   runtime integration uses one isolated local Docker/OCI profile without
   direct agent Docker-socket access.
6. **Phase 13 release-candidate source freeze.** Close reliability, security,
   migration, recovery, update, rollback, revocation, dependency, secret,
   fuzzing, and known-limitation gates. Freeze one exact RC source identity,
   version, changelog, and build recipe.
7. **Phase 14 candidate-build authorization.** Select one or two exact
   OS/architecture core-target rows. Build immutable canonical candidate components
   once per selected target. Candidate-build
   authority grants no artifact publication, production signing, install on user hosts,
   service start, deployment, or stable promotion.
8. **Phase 14 candidate-artifact proof.** Verify reproducibility, component
   parity, SHA-256, non-production signature rehearsal/verification bundle,
   SPDX JSON SBOM, SLSA v1 provenance, licenses/notices, backup/restore,
   non-root behavior, headless configuration, and selected core-target
   compatibility in disposable environments. Any changed artifact
   byte returns work to candidate build and repeats all affected proof.
9. **Final artifact-publication authorization.** After Phase 14 passes, a separate
   go/no-go may permit production signing of unchanged proven digests, final
   signature verification, tag and GitHub Release creation, upload,
   publication, and stable/latest promotion. Publication never follows from a
   source merge or candidate build automatically.

## Current Next Lane

Phase 10 product-surface stabilization is complete at source-conformance level.
P10-A1 implements the target-neutral source manifest, stable exit families, JSON
diagnostics, operator assets, and packet-inspection parity. P10-A2 adds one
bounded explicit `lnsat.daemon.config.v1` file, `lnsatd --config`, public-safe
digest/applied-layer inspection, and exact existing database/listen/Phase 8/
console seams without selecting system, user, target, or package paths.
P10-A3 browser/API health/status retains its authenticated header-pair transport
and stable text/JSON/JSONL/YAML. The accepted local-authentication security
correction withdraws Unix `lnsatctl` health/status before first support: legacy
forms fail before protected stdin, Unix connection, or request bytes.
Numeric-loopback HTTP remains browser/API transport. P10-A4 adds non-root offline backup, fresh inert
restore, and protected-stdin owner recovery with exclusive-lease preflight,
credential/audit append, and all-owner-session revocation. Exact parity keeps
API routes, MCP tools, Control Center actions, served mutation, and activation
unavailable. P10-X1 now freezes 13 evidence rows, 13 required negatives, and
eight compatibility guarantees. P11-R1 now proves one full served chain over
the existing eight Phase 8 loopback routes and one marked disposable Git
fixture, including disconnected execute response, daemon restart, authenticated
evidence readback, reconciliation, and exact replay without redispatch. It adds
no route, production target, or support claim. P11-D1 now establishes one
closed source-only `docker_local` profile/parser, canonical
profile/configuration digests, and exact execution-request binding. It adds no
Docker endpoint, invocation, adapter/image, route, dispatch, receipt, or
support. P11-D2 now selects that profile only through explicit daemon
configuration, loads it through the closed D1 file boundary, retains validated
evidence for a later packet, and exposes only profile identity plus profile and
authority-configuration digests through public-safe config inspection. It
opens no Docker endpoint, socket, process, image operation, mount, route,
dispatch, receipt, or support. P11-D3 now freezes one canonical single-frame
adapter-process request/result protocol. It binds the complete operation,
authority, profile, configuration, adapter, executable, image, and audience
identity set; bounds stdin/stdout/stderr observations and the profile-selected
deadline; rejects framing ambiguity, substitution, timeout, and explicit
unknown outcomes; and returns only stable secret-free errors. It launches no
adapter process, performs no Docker or repository action, and emits no receipt.
P11-I1 now adds authenticated same-origin `POST /v1/packets` for active local
owner/operator sessions. CSRF, `request_action`, packet actor/session identity,
immutable packet digest, and server-time deterministic policy evidence bind in
one transaction; exact replay returns original evidence. Canonical packet bytes,
intent, constraints, and action arguments remain withheld from response. Intake
creates no approval, execution authorization, adapter dispatch, Docker action,
repository consequence, or receipt. P11-D4A now closes the D3 payload gap with
one bounded canonical executable-payload wrapper. It carries the exact approved
execution request and binds its execution, action, target, configuration,
adapter-executable, adapter, audience, and shared Git tool-argument identities
before any later supervisor may use it. It launches no process, opens no Docker
endpoint, mounts no repository, and creates no consequence or receipt. P11-D4B1
adds a dormant, source-only supervisor for one schema-2 `docker_local` profile.
It binds and revalidates exact Docker CLI, host Git verifier, local Unix endpoint,
D4A payload, D3/profile identities, and marked disposable Git target. Its exact
launch arguments clear ambient environment and credentials, forbid pulls and
networking, restrict process and filesystem authority, and bind all profile
limits. Bounded I/O and deadlines fail to `outcome_unknown`; cleanup requires a
valid private Docker-written container ID. Success requires independent host Git
consequence inspection and an exact semantic result-digest match. Hermetic
fake-runtime tests prove construction, limits, safe cleanup requests,
and ambiguity handling, not real Docker or image isolation. No served route,
package, deploy, production, or support claim opens. P11-D4B2A now adds the
source-only durability seam around that future supervisor call: capability
consumption and one Docker-adapter attempt claim commit atomically; concurrent
exact claims converge on one creator and metadata-only replay; independently
host-verified semantic result evidence may persist one receipt; interrupted
`dispatching` attempts materialize as `outcome_unknown` after store reopen; and
reconciliation inspects exact Git consequence without adapter or Docker retry.
P11-D4B2B now passes experimental served fake-runtime integration over existing
Phase 8 loopback routes with hermetic fake executable, disposable Unix socket,
marked temporary Git target, and host Git verifier. Three adversarial served
tests confirm: success/replay/idempotency drift rejection; post-consequence
unknown survives restart and reconciles through host Git inspection only;
unchanged-target unknown persists without receipt. Exact replay is metadata-only
with no redispatch. The chain is D2 schema2 loaded profile -> D4B2A atomic claim
-> D3/D4A payload -> D4B1 supervisor -> D4B2A receipt/unknown. No served route
configures or invokes Docker. A private source-only driver composition now
joins atomic created-handle/replay disposition -> canonical payload ->
final-supervisor durable guard -> independently host-verified receipt. Existing
test-only served fake-runtime integration selects it; no production route, CLI,
or daemon configuration selects it. No real Docker observation or runnable
real proof driver exists; all `UNSET_BLOCKING` identities remain closed.
P11-D4C1 adds source-only reference-adapter
execution: D4A retains the exact profile mount path and the supervisor supplies
that sole repository argument; `lnsat-git-reference` rejects any raw mismatch,
validates canonical D4A input and its own approved digest, requires exact
non-path Git identity across host/container path remapping, executes fixed
bounded Git plumbing with lazy fetch and Trace2 disabled, removes its private
in-repository index, and emits one exact D3 result frame. Hermetic tests launch
only the host-built binary against marked temporary Git fixtures. No real
Docker binary/daemon/socket, image pull/build/run, production repository,
deployment, release, package, or support exists. Phase 11 remains incomplete;
a later separately authorized gate owns real disposable Docker image/runtime
proof.

The private served-driver admission seam now provides a source-only structural
check for that later chain. It binds the run manifest to fields in a
caller-supplied claim snapshot, canonical D3/D4A payload, loaded profile, and
launch-contract digest. Replay, ambiguous state/receipt/reconciliation, and
binding drift fail closed, but its digest authenticates no snapshot, revalidates
no durable state, and grants no launch permission. After the successful D4B2A
claim commit, a later runnable driver must authenticate the created-claim result
and call a private store-owned verifier in a fresh authenticated store
transaction. The verifier must re-read and cross-check the exact durable
consumption, operation, and attempt through the durable-store boundary
immediately before process creation. Only exact live state may return a bound
pre-supervisor guard; a post-claim failure preserves or marks `outcome_unknown`
and cannot redispatch. This evaluator performs no store write, route,
filesystem/process/Docker I/O, receipt, evidence persistence, selector, or
runtime execution. A private source-only final-supervisor seam now cross-checks
the guard and supervisor payload/profile inputs and binds the manifest-declared
Docker client, host Git verifier, local endpoint, and disposable target to the
supervisor's final exact paths and domain-separated filesystem identities. It
calls the one-shot durable verifier only after those repeated checks and retains
the opaque guard across the exact process boundary. Every post-claim failure
marks or preserves `outcome_unknown`. Hermetic tests use the existing fake
executable and temporary Unix socket. No route, CLI, daemon configuration,
package, or release selects the seam, so it is not a runnable proof driver or
real Docker evidence.

A source-only proof-readiness plan now defines one canonical, side-effect-free
identity bundle for the loaded schema-2 profile and freezes eight required
future proof cases. Repository validation covers parsing, canonicalization,
binding drift, closed status, security negatives, and documentation alignment.
It performs no Docker process, socket, daemon, or image operation and carries no
runtime result, receipt, production, package, deployment, or support authority.
Only a separately authorized served-chain run can create real runtime evidence.
A companion source-only evidence-requirements contract freezes the required
client, endpoint, daemon, image, adapter, target, authority-chain, lifecycle,
cleanup, reconciliation, redaction, and independent-review commitments without
recording runtime evidence or opening an execution selector.
The source-only execution-harness contract binds that requirements digest to the
proof-plan digest, inherited lists, and exact later-authority declarations and
stops. It performs no Docker process, socket, daemon, image, or repository work;
PHR-0005 records independent source review of that contract. A runnable proof
driver and real runtime evidence remain separate gates; Phase 11 is incomplete.
The source-only operator run packet locks the proof-implementation source to
public revision `b41aa756bccd85843ac540abfd927e8c5693d5fe` and separately
records PR #39 packet integration at public merge
`190ab32443f60a2a1bc78f990e8ea5571c28f96f`. It consolidates later identity,
target, admission, D3-limit, proof-case, ambiguity, cleanup, evidence,
redaction, and terminal criteria. That packet integration identity moves neither
the proof source nor product/source version `0.1.0`. Its runnable-driver
boundary and all live runtime identities remain blocking. A new exact authority
decision is required before Docker observation or execution, and later release
gates remain unchanged.

P7-K1, P7-S1, P7-V1, and P7-I1 remain optional, blocked, and nonblocking for
this local-v1 critical path.

## Hard Boundaries

Until an exact later gate says otherwise:

- no served/public execution-authorization, capability-redemption, adapter,
  receipt, or recovery mutation route beyond the exact existing Phase 8
  loopback disposable-reference set;
- no production or user-repository consequence;
- no private-key intake, key generation, provider credential, signer call, or
  migration 0018;
- no package or binary claim, host installation, service registration/start,
  tag, release, artifact/package publication, deployment, or production write;
- no automatic promotion from one phase or packet to the next.

## Documentation Ownership And Drift Control

- `docs/ROADMAP.md` owns ordered phase intent and exit gates.
- `docs/PROJECT_STATUS.md` owns current implementation and support truth.
- this document owns cross-phase build and release ordering.
- `docs/architecture/PHASE_7_READINESS_EXECUTION_PLAN.md` and
  `docs/reference/phase7-readiness.json` own completed Phase 7 packet truth.
- `docs/RELEASING.md` owns RC-source, candidate-build, Phase 14 proof, and final
  artifact-publication separation.
- `docs/PUBLIC_READINESS.md` owns pre-release repository-source visibility,
  history/privacy review, and public-development cutover.
- `docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md` maps these decisions across
  documentation.
- `npm run docs:direction:check` rejects missing sequence markers, reordered
  phases, premature Phase 14/build claims, and publication-before-proof drift.

Source completion, test success, merge, repository visibility, candidate build,
Phase 14 proof, and artifact publication are distinct states. Documentation
must never collapse them.
