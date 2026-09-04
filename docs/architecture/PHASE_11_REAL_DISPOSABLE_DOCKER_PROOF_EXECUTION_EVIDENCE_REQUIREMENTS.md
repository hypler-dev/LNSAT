# Phase 11 Real Disposable Docker Proof Execution Evidence Requirements

Status: proposed source-only evidence requirements; no runtime evidence

## Authority and scope

This document extends the accepted
[Phase 11 real disposable Docker proof-readiness plan](PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_READINESS.md)
with the exact evidence commitments required before a separately authorized real
run. It does not assign a packet ID, authorize execution, or report Docker,
image, container, repository, result, receipt, or support evidence.

No Docker binary, daemon, socket, image, container, or repository consequence is
accessed by this source packet. Phase 11 remains incomplete.

## Why this gate exists

The existing source proves canonical request/result framing, one-time attempt
claiming, bounded supervisor construction, durable ambiguity, host-Git
reconciliation, and a reference Git adapter under fake-runtime and host-process
tests. Real runtime proof additionally needs independently reviewable bindings
for runtime identity, image provenance, disposable-target identity, lifecycle,
cleanup, and evidence redaction. A successful source check is not runtime
evidence.

## Required observation commitments

Future proof evidence must commit to these observations without publishing raw
host paths, container identifiers, process output, source bytes, patch bytes, or
credentials:

1. exact proof-plan digest and its seven profile-derived bindings;
2. Docker client executable digest and stable file identity;
3. host Git verifier executable digest and stable file identity;
4. Docker endpoint file-identity digest before launch, after launch, and before
   cleanup;
5. daemon identity, API/version, platform, and security-posture digest;
6. immutable local image provenance, platform, configuration, entrypoint, and
   image digest, with no pull, build, or mutable-tag resolution;
7. in-image reference-adapter executable digest and entrypoint binding;
8. disposable root, repository, Git directory, marker, base, and ownership/mode
   identity digest;
9. Gateway decision, D4B2A claim, D3 request, D4A payload, and launch-contract
   identity digest;
10. runtime isolation and bounded lifecycle observation digest;
11. adapter result plus independent host-Git consequence observation digest;
12. receipt or `outcome_unknown` transition digest;
13. restart and host-inspection-only reconciliation digest;
14. operation-bound cleanup observation digest; and
15. independent review digest.

Every commitment uses a named domain-separated digest over a canonical, bounded,
secret-free private observation record. A digest does not make unreviewed source
or private evidence safe to publish. Custody and reviewer access remain explicit
operator responsibilities.

## Preflight rejection matrix

The future harness must reject before process creation when any of these facts
cannot be established exactly:

- Docker client executable, endpoint file identity, daemon identity, API,
  version, platform, or security posture is missing, substituted, or unstable;
- selected image is absent locally, resolved through a mutable reference, lacks
  approved provenance, targets the wrong platform, changes configuration or
  entrypoint, or contains the wrong adapter executable;
- disposable root, repository, Git directory, or marker is symlinked,
  foreign-owned, group/world writable, outside the approved temporary root, or
  changes identity before the mount boundary;
- Gateway authorization, one-time claim, D3/D4A payload, profile, launch,
  adapter, image, target, or tool-argument identity drifts;
- runtime posture permits agent Docker-socket access, ambient credentials,
  networking, additional mounts, elevated privilege, writable root, host
  namespaces, devices, or unbounded resources;
- approved cleanup policy, operation label, launch-contract label, and
  inspect-before-remove contract are not frozen before launch;
- proof attempts to bypass the served Gateway-to-supervisor chain; or
- evidence cannot satisfy exact canonical shape, size, redaction, custody, and
  independent-review requirements.

After process creation, timeout or disconnect, output or result anomaly, runtime
or target identity drift, adapter or host-Git result mismatch, receipt
persistence uncertainty, container identity or label mismatch, cleanup
inspection or removal uncertainty, and incomplete or redaction-invalid evidence
are `outcome_unknown`. They are never success and never authorize retry.

## Required proof-case evidence

All eight readiness-plan case identities remain unchanged.

| Case                                             | Required terminal evidence                                                                                                                                                               | Forbidden inference                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `real_runtime_one_consequence_and_bound_receipt` | one attempt, one exact disposable Git consequence, adapter/host result equality, one bound receipt, runtime and cleanup commitments                                                      | source or process exit alone proves success             |
| `exact_replay_metadata_only_no_redispatch`       | original attempt/receipt identities plus replay response and unchanged runtime/consequence counters                                                                                      | replay may launch runtime or create another consequence |
| `post_consequence_unknown_survives_restart`      | post-spawn ambiguity, persisted attempt, restart readback, unchanged unknown identity, no receipt                                                                                        | restart converts unknown to success                     |
| `reconciliation_host_git_inspection_only`        | prior unknown, zero runtime relaunch, exact host-Git observation, reconciliation record, bound terminal state                                                                            | reconciliation retries Docker or adapter work           |
| `unchanged_target_unknown_without_receipt`       | unchanged base/target observation, persistent unknown, no receipt, no retry                                                                                                              | absence of change proves safe retry                     |
| `isolation_no_socket_credentials_or_network`     | bound launch posture, daemon security posture, container lifecycle observation, absence commitments for agent socket, credentials, network, extra mounts, privilege, and host namespaces | declared arguments alone prove kernel/runtime isolation |
| `cleanup_verified_container_id_only`             | operation/launch-bound private container identity, matching lifecycle labels, endpoint/client revalidation, removal-or-proven-absence outcome                                            | arbitrary container ID may be removed or published      |
| `runtime_and_image_identity_stable`              | equal prelaunch/postlaunch/precleanup client, endpoint, daemon, image, entrypoint, adapter, and launch commitments                                                                       | one initial digest proves later stability               |

Missing, reordered, ambiguous, redaction-invalid, or unreviewed evidence fails the
case and leaves Phase 11 incomplete.

## Cleanup binding

A private container ID file is not sufficient proof of ownership. Future forced
cleanup must first bind the container to the exact operation and launch-contract
identities using runtime-observed labels or an equivalently exact immutable
mechanism. Docker client, endpoint, and daemon identity must be revalidated
before inspection and removal. Missing or mismatched binding disables removal
and records cleanup uncertainty as `outcome_unknown`; it never widens the cleanup
target.

## Public evidence redaction

Checked-in or public evidence may contain only contract identifiers, bounded
case status, domain-separated commitments, timestamps at approved precision,
and independent-review references. It must reject:

- host, repository, Git-directory, socket, or private Docker-config paths;
- raw container IDs, commands, arguments, stdout, stderr, source, patches, or
  canonical request/result frames;
- credentials, capabilities, session or CSRF tokens, environment values, or
  private registry configuration; and
- any runtime, receipt, support, production, release, or completion claim not
  backed by the full private evidence set and independent review.

The exact forbidden-field list is a minimum schema lock, not an alias bypass.
The later public-evidence parser must reject equivalent data nested under other
names, escaped into strings, or represented through aliases.

## Exact later execution authority

Before any real Docker access, a later authority must name:

- execution host and bounded run window;
- exact Docker client path/digest and local Unix endpoint;
- expected daemon identity, API/version, platform, and security posture;
- immutable pre-positioned image digest, platform, provenance, configuration,
  entrypoint, and adapter executable digest, with `--pull=never`;
- fresh owner-only disposable root and marked repository identity;
- exact host Git verifier path/digest;
- existing served Gateway-to-D4B2A-to-D3/D4A-to-supervisor chain;
- all eight case IDs, private evidence location, redaction process, cleanup
  limits, rollback/stop behavior, and independent reviewer; and
- explicit permission for only the named Docker observations and executions.

Authority stops on missing identity, base or source movement, mutable image
resolution, unexpected network need, unsafe target state, evidence-custody
ambiguity, or any action outside the named run.

## Closed boundary

This source contract adds no Docker command, daemon configuration selector,
public route, runtime result, receipt, target mutation, image/package artifact,
deployment, publication, production authority, or support claim. It does not
complete Phase 11. Next gate remains the separately authorized real disposable
Docker image and runtime proof after these requirements and its execution harness
receive source review.
