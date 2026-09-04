# Phase 11 Real Disposable Docker Proof Readiness

Status: proposed source-only readiness; no runtime evidence

## Status and scope

This document defines a source-only readiness contract for a future, separately
authorized real disposable Docker proof. No canonical packet ID is assigned.
The plan module and fixture describe required identities, proof cases, and
negative boundaries only. They do not report an executed runtime, image, or
consequence.

No Docker binary, daemon, socket, or image operation is accessed by this packet.

Phase 11 remains incomplete.

## Non-authority boundary

Readiness documentation does not authorize execution, select a Docker endpoint,
open a socket, launch a process, pull/build/run/inspect an image, mount a
repository, persist a receipt, or change support/release status. Direct
`docker run` proof bypass is forbidden. Operator acknowledgement is not
execution authorization. Any real proof requires a separate explicit authority
decision, bounded disposable target, and recorded evidence.

## Required identity bindings

Future served proof must bind, before launch and at the consequence boundary:

- `profile_digest`
- `authority_configuration_digest`
- `adapter_ref` and `adapter_version`
- `adapter_executable_digest`
- `image_digest`
- `launch_contract_digest`

Bindings must remain exact across Gateway authorization, D4B2A attempt claim,
D3/D4A frames, supervisor launch, adapter result, receipt, and reconciliation.
Identity drift fails closed. No path or secret values belong in public evidence.

## Future served-chain requirement

Future proof must exercise the existing authority chain through a supported
interface:

```text
Gateway -> D4B2A attempt claim -> D3/D4A payload -> supervisor
  -> real disposable Docker adapter -> receipt or outcome_unknown
```

The chain must preserve one-time authorization, exact replay as metadata-only,
single-consequence behavior, durable ambiguity, and inspection-only
reconciliation. A direct adapter or Docker invocation outside this chain is not
proof.

## Required proof cases

1. `real_runtime_one_consequence_and_bound_receipt`
2. `exact_replay_metadata_only_no_redispatch`
3. `post_consequence_unknown_survives_restart`
4. `reconciliation_host_git_inspection_only`
5. `unchanged_target_unknown_without_receipt`
6. `isolation_no_socket_credentials_or_network`
7. `cleanup_verified_container_id_only`
8. `runtime_and_image_identity_stable`

All eight cases require bounded, reproducible evidence. Missing, ambiguous, or
unreviewed evidence leaves proof incomplete.

## Isolation, cleanup, and evidence

Proof must use a marked disposable repository and exact image/runtime digests.
The adapter receives no agent Docker socket, ambient credentials, network, or
unbounded filesystem access. Pulls and mutable image resolution are forbidden
inside proof. Cleanup may target only a valid container ID written to the
private, proof-bound Docker client directory after identity revalidation.

Evidence must include command construction, image provenance, isolation limits,
adapter and host-Git result binding, receipt/unknown transitions, restart and
reconciliation records, and independent review references. Evidence must be
secret-free and must not expose host paths, source bytes, or credentials.

## Out-of-repository evidence

Repository source can establish contracts and validators. Real proof additionally
needs operator-held evidence for Docker/OCI version and host, image digest and
provenance, daemon/socket identity, kernel/runtime isolation, clean disposable
setup, and captured lifecycle results. These external facts remain unverified
until a separately authorized run records them.

## Failure and unknown semantics

Any post-spawn timeout, crash, transport truncation, identity drift, cleanup
uncertainty, or result mismatch is `outcome_unknown`. Unknown is never success,
never silently retried, and never converted to a receipt without independent
host consequence inspection plus reconciliation evidence. Unchanged target
means no receipt.

## Validation gates

Current validation may check JSON shape, source markers, contract identities,
negative assertions, and docs consistency. Those checks prove readiness
descriptions only. Later Docker validation must be separately authorized and
must run all eight proof cases against a marked disposable target, then receive
independent review. No source check, fake-runtime test, host-process test, or
operator acknowledgement substitutes for real runtime evidence.

## Support and release boundary

This readiness plan does not complete Phase 11, create a supported runtime,
publish an image/package, or authorize production. Docker support requires the
full checked-in and external evidence gates in ADR-0007, followed by Phase 13
release-candidate freeze and Phase 14 candidate-artifact proof. Publication,
deployment, and support remain separately closed.
