<!-- intent-driven-delivery:intent:v1 -->

# Intent: HCFG-6 observed resource and runtime enforcement

Status: proposed
Authority: [Project Status, HCFG-6](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design)
Owner: LNSAT maintainers
Accepted by: pending; human owner decision required
Last updated: 2026-10-01

## Problem and evidence

The accepted [V1 requirement](../../PRODUCT_BUILD_SEQUENCE.md#headless-configuration-and-control) separates resource reachability from agent action authority. Every declared resource must resolve to observed identity, and selected OS controls must hold at grant and use. HCFG-3 currently composes untrusted resource references/digests. HCFG-5B B3B observes SQLite's actual main descriptor; it does not observe a target workload's restrictions.

The existing Docker-local supervisor rechecks executable, endpoint and disposable Git target before launch, constructs restrictive argv, and immediately writes the approved action payload to the child. It has no authenticated startup observation barrier. Argv, a profile digest, a socket filename, a caller's JSON, or a successful Git receipt cannot prove actual namespace, mount, privilege or cgroup restrictions. Docker resolves bind paths on the daemon host; its inspect response names configured mount sources but does not supply the mounted target's inode identity.

## Desired outcome

Provide real nonempty resource verification for the first Docker Engine Git workflow. Resolve an owner's explicit resource binding to stable host identity; bind the exact installation/generation/epoch and action to it; observe the created workload's actual target and restrictions before releasing the action payload; recheck revocation and identity at use. Every declared resource and requested control must have a supported verifier. Missing, stale, substituted, forged or unsupported evidence denies admission. A post-launch uncertainty preserves the consumed attempt and its receipt/reconciliation obligations.

The full outcome includes the owner binding, bootstrap prerequisite, per-attempt runtime barrier, protected admission, orphan cleanup and selected-target proof. A parser, diagnostic identity snapshot, empty declaration, mocked observer, or supported-control boolean does not complete HCFG-6 or V1.

## Users and systems

Local host owner, protected `lnsatctl` bootstrap/configuration, Gateway, SQLite authority store, private selected-resource verifier, and the versioned Docker-local supervisor/reference adapter. Agents and MCP remain Gateway clients. They receive neither a Docker socket nor a general filesystem/OS capability.

## Constraints

- Reuse [accepted bootstrap](../headless-local-bootstrap/intent.md), HCFG-3 composition, deterministic policy, distinct approval and one-time attempts. Resource verification creates no alternate authorization path.
- Preserve [Docker-first architecture](../ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md). The first engineering backend is same-host Linux Docker Engine, not a native-host substitute. No package OS/architecture row is selected by this design.
- Keep the [Phase 11 operator packet](../PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md), its source lock, launch contract and `PREPARED_SOURCE_ONLY_NOT_EXECUTION_READY` verdict unchanged. The stronger startup barrier requires a separately selected new profile/protocol; it cannot silently alter the locked proof.
- Trust the host owner and host administrator/kernel/Docker daemon within the explicit local threat boundary. The new evidence is not remote attestation or adversarial-host rollback protection.
- No automatic host hardening, permission relaxation, chown, ACL/SELinux changes, image pull/build, daemon discovery, remote endpoint, privileged helper or installation is introduced.
- Human acceptance of this proposed authority boundary precedes source that can activate it. Source review, actual Docker/selected-target proof, merge, release and production remain separate gates.

## Non-goals

Native-host/VM/remote execution; unrestricted service/connector/device access; arbitrary mounts; generic orchestration; restored-authority activation; release artifacts; graphical setup; broader execution capabilities. The first backend rejects unsupported declared kinds rather than dropping them. Other kinds require their own concrete verifiers and versioned conformance.

## Assumptions and verified facts

- Verified in source: `runtime_profile.rs` admits one closed Docker profile; it has no owner-controlled HCFG resource locator inventory.
- Verified in source: `docker_local_supervisor.rs` constructs one writable target bind and restrictive process argv, then sends the current request after `spawn`; it has no ready/challenge/observation barrier.
- Verified in source: `phase7_git_adapter.rs` verifies a marked disposable Git target, not an arbitrary repository/service resource resolver.
- Engineering proposal: same-host Linux identity-mapped bind mounts permit independently comparing the held host root's device/inode with the trusted adapter's mounted-root observation. Unsupported mappings and Docker Desktop cross-VM filesystems must deny this backend; they are not presumed equivalent.
- The owner must explicitly accept the proposed amendment to HCFG-5B’s no-resource-open rule, and the staged-process distinction described in the specification. The accepted bootstrap rule remains unchanged until that decision. No target action is permitted during bootstrap or the startup barrier.

## Risks

Path-to-mount races, recursive submounts, external hard links, copied identity claims, extra image volumes/environment, daemon or endpoint substitution, UID remapping, fake probe frames, stale generation/epoch, revocation during startup, launch timeout, and orphaned preparation can widen reachability or misstate outcomes. Kernel flag values alone cannot prove a particular filter or limit; selected-target behavior and profile/implementation identity remain required.

## Acceptance evidence

Owner accepts the exact [specification](spec.md), including the supported first capability tuple, privileged-component trust boundary, the explicit bootstrap metadata-observation amendment, resource-free bootstrap probe, and staged adapter barrier. A fresh independent read-only design review must resolve actionable P1/P2 before implementation. Later source, actual runtime and package evidence are mapped separately in that specification; none is claimed by this proposal.

## Source-of-truth links

[Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design) owns current proposal/implementation/acceptance truth. [Product Build Sequence](../../PRODUCT_BUILD_SEQUENCE.md#headless-source-packet-order) owns requirements and sequence. This intent/spec/plan supplies the proposed behavior; the Phase 11 packet remains runtime authority. Green PR71 source CI supplies only the prior selected-store prerequisite.
