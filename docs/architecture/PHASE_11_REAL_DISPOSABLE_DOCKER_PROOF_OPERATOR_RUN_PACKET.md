# Phase 11 Real Disposable Docker Proof Operator Run Packet

Status: source-only operator preparation; not execution-ready or authorized

## Authority and source lock

This record prepares the separately authorized real disposable Docker proof.
It does not authorize Docker access, build an executable or image, select a
host, open an endpoint, launch a process, mutate a repository, persist a
receipt, or report runtime evidence.

The proof source is locked to public revision
`b41aa756bccd85843ac540abfd927e8c5693d5fe`, with public tree
`fecb4303cfe1b5224d3c1f1fbd8f2c86008e389c`. That revision is the exact merge
of public-main parent `d93b3f5c9b040fa5ba0051881574f59cf4ee92ea`
and reviewed PR-head parent `914da579f28c98dd59cb5303eba5d7fa3c68664e`.
Movement of the source revision, tree, base, packet, or any later declaration
invalidates authorization and requires a new review and authority decision.

## Public packet integration and version record

The proof-implementation source lock above and this packet's public integration
identity are intentionally different:

| Identity                         | Exact value                                |
| -------------------------------- | ------------------------------------------ |
| Proof-implementation source      | `b41aa756bccd85843ac540abfd927e8c5693d5fe` |
| Proof-implementation source tree | `fecb4303cfe1b5224d3c1f1fbd8f2c86008e389c` |
| Packet PR                        | `hypler-dev/LNSAT#39`                      |
| Reviewed packet head             | `2c918bc59b82ffabc378b47e66137733cf24a6d7` |
| Public packet merge              | `190ab32443f60a2a1bc78f990e8ea5571c28f96f` |
| Packet integration tree          | `17247c9c194f6a332e99ee32ae5052620349896b` |

The packet integration identity proves only that this preparation record and
its fail-closed validators reached public `main`. It does not silently move the
proof-implementation source lock, authenticate a build, or grant runtime
authority. Product/source version remains unpublished `0.1.0`; Gateway wire
contract `lnsat.contracts.v1_0`, local SQLite schema `17`, runtime-profile
families, and adapter protocol versions are unchanged. No tag, package, image,
release, deployment, production, or support state changed.

This document is the canonical operator preparation record. The canonical
runtime contracts remain the
[proof-readiness plan](PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_READINESS.md),
[execution evidence requirements](PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_EXECUTION_EVIDENCE_REQUIREMENTS.md),
and their checked-in fixtures. A later private run manifest carries host paths,
the run window, and exact private identities. No private value belongs in this
public record.

## Current gate verdict

`PREPARED_SOURCE_ONLY_NOT_EXECUTION_READY`

Every field marked `UNSET_BLOCKING` must be resolved to one exact value,
reviewed, and named by a new explicit authority before any Docker observation
or process creation. A private source-only driver composition now joins atomic
created-handle/replay disposition, canonical payload, physical filesystem
preflight, final-supervisor durable guard, and independently host-verified receipt in the test-only served
fake-runtime path. No production-selectable real proof driver currently
authenticates and re-reads the durable claim state immediately before Docker
process creation. The private final-supervisor seam performs that re-read for
the fake-runtime path after the supervisor's repeated target, executable, and
endpoint checks. The seam binds the manifest-declared Docker client, host Git
verifier, local endpoint, and
disposable target to that final context by exact path and domain-separated
filesystem identity. The separate filesystem-only guard binds the declared
source root, proof-driver executable digest, owner-only private evidence
directory, and disposable root after a created claim. It revalidates those
identities and their physical separation in the final supervisor callback;
exact replay stays metadata-only. A separate source-only guard now uses the
declared host Git verifier to reject dirty or unsafe standalone source storage
and require exact separately supplied source revision and tree before the fake
process and again in that final callback. This test-only seam does not by
itself authenticate this packet's locked source revision/tree or a real
proof-driver build, inspect Docker or an image,
or grant operator authority. No route, CLI, daemon configuration, package, or release
selects it for production. No real Docker observation exists, and all
`UNSET_BLOCKING` identities remain blocking. A source-only manifest, admission
digest, or test-only composition never substitutes for a runnable real proof
driver, exact run identities, or separate owner authorization.

The lock above predates these later source-only guards. Any future proof built
from a different source revision or tree requires a new reviewed source lock
and separate authority decision; this record does not move its existing lock.

## Required authenticated durable-store admission boundary

After structural admission and a successful D4B2A claim commit, the later
runnable driver must pass the authenticated created-claim handle and exact
bound inputs through the private final-supervisor seam. That seam calls the
store-owned verifier from the supervisor's final callback. The verifier uses
the live session and CSRF proof and one fresh authoritative SQLite transaction
to re-read and cross-check the exact durable consumption, operation, and
attempt immediately before process creation. A caller-supplied
`Phase11DockerRuntimeCompositionClaimV1`, the public operation-read API, or the
structural admission digest cannot satisfy this gate.

The fresh authenticated store transaction must bind:

- consumption, operation, attempt, authorization, project, and resource IDs;
- idempotency key and canonical execution-request digest;
- payload action, target, configuration, and tool-argument digests;
- profile, authority-configuration, adapter reference/version,
  adapter-executable, image, protocol, and launch-contract identities;
- `claim_created = true`, operation `dispatching` at state sequence `2`, and
  attempt `dispatching` at state sequence `1` and attempt sequence `1`; and
- absence of any receipt or reconciliation.

Only exact success may return a bound pre-supervisor guard to the process-
creation path. A failure before the original claim commits rolls back the claim
and attempt. A mismatch or read failure after the durable claim commit rejects
before spawn, preserves or marks `outcome_unknown`, and never redispatches. Any
post-spawn anomaly remains `outcome_unknown` and permits inspection-only
reconciliation, never a blind Docker retry.

## Exact identity register

| Identity                                          | Required exact value                                     | Current state    | Revalidation point                                           |
| ------------------------------------------------- | -------------------------------------------------------- | ---------------- | ------------------------------------------------------------ |
| Public source revision                            | `b41aa756bccd85843ac540abfd927e8c5693d5fe`               | locked           | before build and immediately before process creation         |
| Public source tree                                | `fecb4303cfe1b5224d3c1f1fbd8f2c86008e389c`               | locked           | before build and immediately before process creation         |
| Proof-driver executable SHA-256                   | one built executable from the locked source              | `UNSET_BLOCKING` | stable file identity plus digest before process creation     |
| Docker client executable SHA-256                  | one absolute regular executable                          | `UNSET_BLOCKING` | before preflight, launch, inspection, and cleanup            |
| Host Git verifier executable SHA-256              | one absolute regular executable                          | `UNSET_BLOCKING` | before preflight, consequence inspection, and reconciliation |
| Schema-2 profile digest                           | canonical `lnsat.runtime_profile.docker_local.v1` digest | `UNSET_BLOCKING` | load, admission, and immediately before process creation     |
| Authority-configuration digest                    | exact profile-to-authority binding                       | `UNSET_BLOCKING` | admission and immediately before process creation            |
| Adapter reference                                 | `adapter:docker-local:git-commit`                        | locked           | profile load, admission, launch, and result validation       |
| Adapter version                                   | `v1`                                                     | locked           | profile load, admission, launch, and result validation       |
| Adapter executable SHA-256                        | host-built and in-image `lnsat-git-reference` identity   | `UNSET_BLOCKING` | build, image preflight, admission, and launch                |
| Immutable image digest                            | one locally pre-positioned digest, never a mutable tag   | `UNSET_BLOCKING` | preflight, after launch, and before cleanup                  |
| Image provenance/configuration/entrypoint digests | canonical private observation records                    | `UNSET_BLOCKING` | preflight, after launch, and before cleanup                  |
| Launch-contract digest                            | recomputed from the exact loaded schema-2 profile        | `UNSET_BLOCKING` | admission and immediately before process creation            |
| Canonical private run-manifest digest             | manifest bound to all declarations below                 | `UNSET_BLOCKING` | parse, admission, and immediately before process creation    |
| Driver-admission digest                           | exact structural binding output                          | `UNSET_BLOCKING` | after authenticated durable re-read and before launch        |

The synthetic `a...a`, `b...b`, `c...c`, and `d...d` fixture digests are test
vectors only and are forbidden in a real run manifest. Digest syntax alone is
not identity evidence.

## Private run declarations

The later authority must bind all declarations in one canonical private run
manifest. Values must remain private and use references in any public summary.

- one execution host identity and UTC run window no longer than one hour;
- one exact Docker client path, stable file identity, and SHA-256 digest;
- one exact local Unix endpoint identity, with no TCP or discovered endpoint;
- expected daemon identity, API and runtime versions, platform, and security
  posture;
- one pre-positioned immutable image digest, provenance, platform,
  configuration, entrypoint, exact adapter reference
  `adapter:docker-local:git-commit`, exact adapter version `v1`, and in-image
  adapter digest with `pull=never`;
- one fresh owner-only disposable root, marked repository, Git directory,
  marker, base revision, ownership/mode identity, and target identity;
- one exact host Git verifier path, stable file identity, and digest;
- one exact served `Gateway -> D4B2A -> D3/D4A -> supervisor` chain identity;
- one private evidence directory outside both the source and disposable target;
- one redaction procedure, cleanup contract, rollback/stop contract, retention
  decision, and independent reviewer; and
- only the observation and execution permissions enumerated by the canonical
  run-manifest contract.

The disposable root and repository are `UNSET_BLOCKING`. They must be fresh,
owner-only, non-symlinked, outside the source tree, outside the private evidence
directory, and restricted to a marked disposable Git consequence. No user,
production, or network-backed repository is eligible.

## Driver admission and live store gate

The source-only admission evaluator receives the canonical run manifest, a
caller-supplied D4B2A claim snapshot, one canonical D3/D4A payload, and one
loaded schema-2 profile. It must bind:

- run-manifest, source-revision, and proof-driver executable digests;
- consumption, operation, operation-attempt, authorization, and idempotency
  identities;
- payload, control, execution-request, action, target, and tool-argument
  digests;
- profile, authority-configuration, adapter reference, adapter version,
  adapter-executable, image, and launch-contract identities; and
- `claim_created = true`, `operation_state = dispatching`,
  `operation_state_sequence = 2`,
  `attempt_state = dispatching`, `attempt_sequence = 1`, no receipt, and no
  reconciliation.

Those public claim structs remain non-authoritative. Their presence and the
admission digest authenticate no store provenance, prove no durable freshness,
and grant no launch permission. After the successful D4B2A claim commit, the
later runnable driver must pass the authenticated created-claim handle through
the private final-supervisor seam using the live session and CSRF proof. The
seam calls the store-owned verifier in a fresh authenticated store transaction
after the supervisor's final target, executable, and endpoint checks and
immediately before process creation. It retains the bound opaque guard across
the process boundary only after every binding, state-sequence, receipt-absence,
and reconciliation-absence check succeeds. A post-claim mismatch or read
failure rejects before spawn, preserves or marks `outcome_unknown`, and never
redispatches. A post-spawn anomaly remains inspection-only and never permits a
blind Docker retry.

## D3 and profile limits

The admitted D3 frame must equal the driver's deterministic derivation from
the loaded profile and compiled protocol caps. It does not copy every raw
profile limit unchanged:

| Limit                                                 |                                                          Required value |
| ----------------------------------------------------- | ----------------------------------------------------------------------: |
| canonical stdin frame                                 |                                                    65,536 bytes maximum |
| canonical stdout result frame                         | `min(profile limits.stdout_bytes, 65,536)` bytes; current result 65,536 |
| accepted stderr                                       |                                                                 0 bytes |
| supervisor-only retained stderr for anomaly detection |                                                    16,384 bytes maximum |
| monotonic process deadline                            |             30,000 milliseconds maximum and exact profile-derived value |
| memory                                                |                        268,435,456 bytes for the current closed profile |
| PIDs                                                  |                                       64 for the current closed profile |
| CPU                                                   |                         1,000 millicores for the current closed profile |
| wall clock                                            |                               30 seconds for the current closed profile |

The real schema-2 profile may narrow a limit but may not widen the compiled
cap. Any packet/profile/launch disagreement rejects before process creation.

## Required positive cases

All eight cases run against the same bound source, host, daemon, image,
profile, launch contract, disposable target class, and evidence policy:

1. `real_runtime_one_consequence_and_bound_receipt`
2. `exact_replay_metadata_only_no_redispatch`
3. `post_consequence_unknown_survives_restart`
4. `reconciliation_host_git_inspection_only`
5. `unchanged_target_unknown_without_receipt`
6. `isolation_no_socket_credentials_or_network`
7. `cleanup_verified_container_id_only`
8. `runtime_and_image_identity_stable`

Success requires one claimed attempt, at most one exact disposable Git
consequence, adapter/host-Git semantic equality, one bound receipt only for the
verified consequence, metadata-only replay, durable ambiguity, host-only
reconciliation, runtime isolation observations, identity stability, cleanup
evidence, and independent review. Process exit alone is never success.

## Required preflight rejections

The driver must reject before process creation for every canonical rejection
ID and at least these concrete substitutions:

- client, verifier, endpoint, daemon, profile, adapter, image, entrypoint,
  launch contract, source, target, or manifest identity missing or changed;
- mutable image reference, pull/build need, unavailable local image, wrong
  platform, wrong provenance, or in-image adapter mismatch;
- source/target/evidence overlap, symlink, foreign ownership, group/world
  writable target, missing marker, changed base, or target replacement;
- Gateway-chain bypass, `claim_created != true`, replayed or unauthenticated
  claim snapshot, stale or non-dispatching durable state, existing
  receipt/reconciliation, attempt sequence other than one, or operation state
  sequence other than two;
- D3/D4A payload, profile-derived limit, tool-argument, or launch binding drift;
- network, ambient environment or credentials, Docker-socket mount, extra
  mount, elevated privilege, writable root, host namespace, device, or
  unbounded-resource request;
- unfrozen cleanup labels/policy, unapproved evidence destination, redaction
  failure, unexpected network need, or action outside the named run.

A rejection is a safe non-run, not proof success. It creates no receipt and
does not authorize correction followed by an automatic retry.

## Receipt, ambiguity, and reconciliation

Only an independently host-verified semantic result may persist one receipt.
Exact replay returns metadata only and never dispatches. A timeout, disconnect,
truncated or anomalous output, nonzero exit, runtime or target drift,
adapter/host mismatch, receipt uncertainty, container-label mismatch, cleanup
uncertainty, or incomplete/redaction-invalid evidence becomes
`outcome_unknown`.

`outcome_unknown` is durable, is never success, and never authorizes retry.
After restart it remains unknown. Reconciliation may inspect exact host Git
state only; it must not launch Docker or the adapter. A verified matching
consequence may bind one reconciliation record and one receipt. An unchanged
target remains unknown without a receipt.

## Cleanup, stop, and rollback

Before inspect or remove, revalidate the Docker client, Unix endpoint, daemon,
operation identity, launch-contract identity, and immutable lifecycle labels.
Cleanup may address only the private Docker-written container ID bound to those
identities. Missing or mismatched identity disables removal and records
`outcome_unknown`; it never broadens the cleanup target.

Stop on any authority-stop ID, identity movement, unsafe target state,
unexpected network need, evidence ambiguity, or out-of-scope action. Do not
retry a consequence. Preserve the private evidence set and disposable target
until review resolves receipt/reconciliation and cleanup state. Source rollback
is a separately reviewed revert; it does not alter durable evidence or prove
runtime cleanup.

## Evidence destinations, retention, and redaction

Private evidence goes only to the owner-only absolute location named in the
private run manifest, outside source and target. Retain it through independent
review, Phase 11 acceptance or rejection, and any later Phase 13/14 decision.
Deletion or shortened retention requires a separate operator decision after
all ambiguity and cleanup state is resolved.

Public evidence may be written only after redaction validation and independent
review. It may contain contract IDs, bounded case status, domain-separated
commitments, approved-precision timestamps, and review references. It must not
contain paths, raw container IDs, commands, arguments, output, canonical
frames, source or patch bytes, environment values, credentials, capabilities,
session or CSRF values, or private registry configuration. Secrets are
references only; raw secret values never enter manifests, arguments, logs,
receipts, or public evidence.

## Pass and fail criteria

The proof passes only when every blocking identity is exact and stable, all
eight cases satisfy their terminal evidence contract, every required negative
rejects at the correct boundary, cleanup is verified or proven absent, public
redaction validation passes, and an independent reviewer reports no unresolved
P1/P2 finding. Only then may maintainers decide whether Phase 11 runtime proof
is complete. Passing does not authorize build-candidate creation, release,
deployment, publication, production, or support.

Any missing identity, failed positive or negative case, unresolved
`outcome_unknown`, unverified cleanup, evidence-custody gap, redaction failure,
or unresolved P1/P2 finding fails the run and leaves Phase 11 incomplete.

## Separate authorization required

Before any Docker access, the owner must issue a new explicit authorization
naming the exact proof source revision, this finalized operator record and its
reviewed revision, canonical private run-manifest digest, proof-driver
executable digest, schema-2 profile and authority-configuration digests,
the reviewed durable-admission verifier and bound pre-supervisor-guard contract,
the private final-supervisor seam and its exact payload/profile plus
manifest-to-supervisor identity binding,
exact adapter reference `adapter:docker-local:git-commit`, exact adapter version
`v1`, adapter-executable/image/launch digests, execution host and UTC window,
local Unix endpoint, exact served-chain authorization identity
`Gateway -> D4B2A -> D3/D4A -> supervisor`, disposable root and marked
repository, evidence location and retention, all eight cases, cleanup limits,
and independent reviewer.

This record is not yet eligible for that authorization: the runnable driver and
all `UNSET_BLOCKING` values remain absent. Merge, runtime, build-candidate,
release, deploy, publication, production, and support authority remain separate
and false.
