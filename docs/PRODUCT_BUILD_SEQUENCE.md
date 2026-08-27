# Product Build Sequence

- Status: current documentation control
- Product effect: none
- Runtime effect: none
- Artifact effect: none

This document reconciles LNSAT's original v1 goal, accepted architecture
changes, current implementation truth, and remaining build order. It prevents a
completed source packet from being mistaken for a supported runtime or a
package build from starting before product behavior is complete.

## Preserved Product Goal

First supported release remains an owner-controlled, local/self-hosted,
single-node authority product:

- Rust owns security-critical contracts, local persistence, daemon behavior,
  authorization, receipt binding, and stable operator CLI behavior;
- TypeScript and React own Control Center and client-facing source surfaces;
- SQLite is initial embedded authority store;
- local identities, scoped roles, secure sessions, CSRF protection, policy,
  distinct-human approval, exact one-time authorization, bounded consequence,
  receipt, reconciliation, and audit form one end-to-end product loop;
- runtime is non-root, loopback-default, fail-closed, and explicitly started;
- hosted SaaS, fleet/HA, multi-tenancy, unrestricted infrastructure control,
  and production reference actions remain outside initial v1.

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
5. Phase 14 requires only explicitly selected target/package rows. Package
   breadth may follow later, but every claimed row still needs complete
   artifact, trust, and lifecycle proof.
6. Public core and private downstream products remain separate. Downstream
   management, connectors, models, and release composition cannot fork or
   weaken Gateway authority.
7. ADR-0007 selects one local Docker/OCI profile as first v1 runtime
   integration. Docker Agent, Docker MCP Gateway, and Docker Sandboxes may be
   composed as replaceable adjacent systems; Gateway remains sole authority and
   same contracts must support later secure-VM, native-host, and remote
   profiles.

## Current Build Position

| Phase | Current truth                                           | Remaining release blocker                                                             |
| ----- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1-3   | source and deterministic-contract foundations complete  | preserve public/source and TS/Rust conformance gates                                  |
| 4     | source checkpoint complete                              | packaged lifecycle proof belongs to Phase 14                                          |
| 5     | source-local exit complete                              | preserve auth/session/approval security gates                                         |
| 6     | source exit complete                                    | supported runtime claim remains closed                                                |
| 7     | P7-X1 source conformance complete                       | preserve Phase 7 authority-chain and disposable-target invariants                     |
| 8     | bounded loopback runtime composition merged             | preserve exact routes, one-attempt evidence, and production-unsupported boundary      |
| 9     | authenticated exact-ID Control Center readback exists   | preserve live/fixture separation and fail-closed ambiguity mapping                    |
| 10    | P10-X1 source conformance complete                      | preserve product-surface compatibility and Phase 14 lifecycle ownership               |
| 11    | first existing-route served disposable Git proof exists | complete separately gated local profile proof without production repository authority |
| 12    | optional post-local-v1 lane                             | none unless selected support profile requires it                                      |
| 13    | planned                                                 | complete reliability, security, recovery, update/revocation, and RC-source freeze     |
| 14    | blocked; no support row selected; no artifacts          | build and prove only selected target/package rows after required product phases pass  |

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
   OS/architecture/package rows. Build immutable canonical candidate components
   once per selected target and wrap those exact digests. Candidate-build
   authority grants no artifact publication, production signing, install on user hosts,
   service start, deployment, or stable promotion.
8. **Phase 14 candidate-artifact proof.** Verify reproducibility, component
   parity, SHA-256, non-production signature rehearsal/verification bundle,
   SPDX JSON SBOM, SLSA v1 provenance, licenses/notices, clean install,
   explicit start, upgrade, backup/restore, rollback, uninstall, non-root, and
   no-auto-start behavior in disposable environments. Any changed artifact
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
P10-A3 now adds authenticated read-only health/status, explicit macOS/Linux
Unix-socket client transport with path and peer-UID proof before bearer
transmission, stdin-only session-token intake, and stable text/JSON/JSONL/YAML.
Numeric-loopback HTTP remains browser/API transport and is closed for
`lnsatctl` bearer reads. P10-A4 adds non-root offline backup, fresh inert
restore, and protected-stdin owner recovery with exclusive-lease preflight,
credential/audit append, and all-owner-session revocation. Exact parity keeps
API routes, MCP tools, Control Center actions, served mutation, and activation
unavailable. P10-X1 now freezes 13 evidence rows, 13 required negatives, and
eight compatibility guarantees. P11-R1 now proves one full served chain over
the existing eight Phase 8 loopback routes and one marked disposable Git
fixture, including disconnected execute response, daemon restart, authenticated
evidence readback, reconciliation, and exact replay without redispatch. It adds
no route, Docker profile, production target, or support claim; Phase 11 remains
incomplete and separately gated.

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
