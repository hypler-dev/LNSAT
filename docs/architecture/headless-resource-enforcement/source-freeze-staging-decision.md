# HCFG-6 Source-Freeze Staging Decision

Status: human owner accepted the source-order amendment on 2026-10-03 at exact
reviewed revision `5a1338cb31706bde4e1458a5089cfacb28e90917`.
[Project Status](../../PROJECT_STATUS.md#hcfg-6-proposed-source-freeze-staging-amendment)
is the sole acceptance record. This amendment changes source ordering, not the
V1 outcome, threat boundary, runtime authority or supported-product claims.

## Verified ordering conflict

The current plan requires complete native/wire/daemon/store freeze before
implementing native verifiers or the new immutable adapter/probe. Supporting
recipe contracts also require actual adapter/probe/image artifact pins before
behavioral integration. Those executables do not yet exist. Image construction
is explicitly closed. Consequently the current order cannot produce the
artifacts required to pass its own source gate.

Fresh independent review identified this as a P2 dependency cycle. It cannot be
resolved with synthetic pins, an always-denying verifier, caller-supplied
proof, a renamed legacy adapter or silent image-build authorization. The
accepted intent's requirement that reviewed freeze precede source capable of
activation is preserved by the staged proposal below. The current broader
plan wording nevertheless requires an explicit human amendment.

## Proposed source and activation stages

### A. Reviewed inert candidate source

Under the human-accepted amendment, an exact private module contract and
fresh independent review may precede implementation of that inert module,
without already possessing the final artifact pins. The controller must name
owned files, invariants, denial/positive cases, validators and integration
dependencies before each source slice. Incomplete cross-module contracts
cannot be hidden by treating a module's review as the complete freeze.

Permitted candidate source includes the planned private native metadata/ACL/
mount/cgroup observers, profile/startup codecs, immutable adapter/probe,
durable preparation journal and transaction-local store methods. These are
implementation prerequisites for the actual engine, not alternate diagnostics
or pure-codec completion. Existing source families and locked Phase 11 source
remain unchanged.

After the private codec, the Linux journal-custody source candidate follows
the contract linked from the [preparation/store specification](preparation-store-source-spec.md#stage-a-private-linux-journal-custody-contract).
Its selected-store lifetime borrow, held-directory descriptor custody, and
bounded immutable revision append remain disconnected from product callers.
Project Status records exact source validation and independent review; the
complete source/pin/positive-feasibility freeze remains open.

Candidate implementation stays disconnected from active product entrypoints:

- No recipe registry entry is admitted while any actual pin is unset.
- No CLI, route, automatic registration, live initializer, active generation,
  configuration apply, migration-on-open, grant or startup release is enabled.
- No public constructor, serialized permit or successful observer injection
  bypasses native provenance, selected-store custody or future release checks.
- Source-only tests use disposable local files/databases/socket fixtures and
  bounded self-process metadata; they do not access a Docker endpoint, open
  private daemon/production resources, mount a target, invoke actual negative
  kernel probes on the host or simulate evidence as a live permit.
- Source compilation uses the existing pinned toolchain. Tool installation,
  selected-target package/image construction and publication remain closed.
- Every candidate has focused negative/positive tests and fresh independent
  review; source changes also receive the broad proportional repository check
  and installed audit-tool checks required by contributor instructions.

The probe/adapter's candidate main must fail before any probe/action when its
required private runtime context is absent or unsupported. Tests exercise
bounded internal methods and denials; they do not launch its destructive or
namespace/privilege syscall sentinels on the host. No general command runner
or alternate native-host backend is introduced.

### B. Separately authorized artifact capture

Once candidate source and its deterministic image/build recipe are concrete,
prepare an exact reviewable artifact-capture packet: source identity, build
inputs/toolchains, target platform, helper/Git/library inventory, network/data
boundary, provenance, expected outputs, cleanup and verification procedures.
The human must separately authorize that exact construction or supply
equivalent independently reviewable artifact evidence. This amendment itself
does not authorize a Docker operation, image build/pull, host mutation, tool
installation, supported package build, publication or runtime proof.

Capture actual component/kernel/template/image/executable bytes and provenance
under that later authorization. Keep all pins `UNSET_BLOCKING` until obtained
and reviewed. A candidate version, source SHA or copied artifact digest is not
proof of current host/component/image association.

### C. Complete freeze before integration or activation

Review the entire native/wire/daemon/journal/store/revocation boundary together
against exact candidate source, feasible non-root positive case, immutable
recipe, captured pins and provenance. Resolve every P1/P2 before declaring this
complete gate passed. Then separately review changes that connect candidate
modules to product entrypoints. No Stage-A module review or test supplies this
approval.

This source gate reviews the exact methods and contracts for future live
association and authority checks. It does not require a current running host,
active installation, runtime observation or action release to exist before
source integration. Those observations cannot be obtained from an unintegrated
candidate or counted as source-freeze evidence.

### D. Separate post-integration activation/runtime gate

At actual activation/use, captured pins must match authenticated current
root/daemon/kernel/image association and verified owner resources. Selected-
store custody, active installation/generation/epoch, stop/revocation checks
and the committed one-use release remain mandatory in their accepted sequence.
Unset/mismatched/unavailable evidence denies; there is no weaker fallback.
Actual disposable runtime proof, merge, release and production retain their
existing separate authorization/evidence gates. No current host or runtime
operation is opened by any source-order decision.

## Preserved requirements

- Nonempty held resource identity and effective ACL/OS controls; metadata-only
  bootstrap exception and resource-free preparation stay bounded.
- Inert adapter startup and exact challenged observation before any action;
  one uninterrupted startup/action budget and separate owner preparation limits.
- Durable journal/cleanup/quarantine, atomic bootstrap/audit, inert restore,
  all-writer generation/epoch/stop/revocation serialization and consumed attempts.
- No live fixture/caller proof, unsupported backend, generic executor, agent
  Docker socket or credential inheritance.
- Phase 11 operator packet stays `PREPARED_SOURCE_ONLY_NOT_EXECUTION_READY`.
  This selects no supported package row and supplies no enterprise/government
  assurance, certification, runtime or V1 completion claim.

## Owner decision and reconciliation

Accepted decision: Stage-A inert candidate implementation follows exact
module contract/review, with Stage B separately authorized, Stage C requiring
complete source/pin freeze and Stage D preserving all actual activation/runtime
gates.

The direct human reply and exact reviewed proposal head are recorded in
Project Status. The controller reconciles existing intent/spec/plan/native/
recipe gate wording with this accepted source ordering. The full integration
freeze remains distinct from exact private-module review.
Do not infer additional acceptance from CI, a reviewer PASS, this text, or the
general V1 objective. No artifact-capture or runtime permission is bundled
with this source-order decision.
