# ADR-0002: Authority Layer and v1 Distribution

- Status: accepted for v1 planning
- Date: 2026-07-23
- Decision owners: LNSAT maintainers
- Supersedes: ADR-0001 where platform, package, installer, service, and
  distribution requirements conflict
- Extended by: ADR-0003 for open-core, downstream extension, managed-agent
  content, advisory-model, visual-management, and OS CLI boundaries
- Proposed extension: ADR-0004 for Phase 7 signed approval-evidence contract,
  cryptographic profile, key lifecycle, and zero-execution-authority closure
- Superseded in part by:
  [ADR-0006](ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
  for local-session approval, optional signed evidence, online one-time
  capability authorization, user-owned keys, and selected-profile distribution
- Implementation state: source foundations through Phase 7/P7-X1 are complete;
  required runtime/product, candidate-build, Phase 14 proof, and publication
  gates remain closed or unmet

## Context

LNSAT needs a precise place in the agent stack. Tool and agent transports,
identity systems, policy engines, attestations, and observability protocols each
solve adjacent problems. None alone binds a proposed consequential action to
authenticated approval, one-time execution authority, an exact receipt, and
durable proof.

LNSAT therefore owns the authority lifecycle above transports. It integrates
with identity, policy, attestation, and evidence systems rather than replacing
them.

The narrow platform and package exclusions in ADR-0001 no longer match the
required operator experience. Supported v1 must prove selected thin installers
consume same signed canonical product artifacts. It need not prove every
planned package family before supporting one narrow profile.

## Decision

LNSAT's primary positioning is:

> Execution authorization and evidence for consequential agent actions.

Public product name is LNSAT without expansion. Earlier telemetry-oriented
wording remains historical identity only, not public category or primary
subtitle.

The plain boundary statement is:

> MCP exposes tools. LNSAT determines whether a proposed action may execute and
> records proof.

LNSAT is transport-neutral. MCP, A2A, REST, CLI, browser, and future transports
may carry requests, but transport never grants execution authority. OIDC or
SPIFFE may establish identity. OPA may provide an external policy decision.
Hardware and runtime attestations may provide environmental facts.
OpenTelemetry and CloudEvents may export evidence. Gateway remains the LNSAT
security boundary.

MCP 2026-07-28 is canonical experimental source protocol. Legacy MCP,
FastMCP 3/4, and A2A now have bounded, tested compatibility lanes, but protocol,
framework, task, session, OAuth, workload identity, trace, or registry state
cannot alter this decision. Required support labeling and equality proof live
in [Phase 8 adapter authority conformance](PHASE_8_ADAPTER_AUTHORITY_CONFORMANCE.md).

The complete layer model and synthetic reference flow are defined in
[Authority layer and reference workflow](AUTHORITY_LAYER_AND_REFERENCE_WORKFLOW.md).
Threats and required negative evidence are defined in
[Threat model](THREAT_MODEL.md).

### Authority Lifecycle

The supported design must bind:

1. one versioned action packet and canonical requested digest;
2. one authenticated requester identity and session;
3. one policy decision over exact identity, scope, action, target, artifacts,
   constraints, and current attestations;
4. when required, one distinct authenticated human approver and exact
   `local_session`, `external_signature`, or combined approval proof;
5. one short-lived server-side execution-authorization record plus
   digest-stored one-time capability redeemed online through Gateway;
6. one adapter invocation that cannot substitute action, target, artifact,
   constraints, or digest;
7. one execution receipt bound to the authorization and observed result;
8. one audit chain proving requested digest equals approved digest equals
   executed digest.

Approval is evidence, not execution authority. An execution authorization is
consumable once and cannot be replayed, widened, transferred, or used after
expiry or revocation.

[ADR-0004](ADR-0004_PHASE_7_SIGNED_APPROVAL_EVIDENCE.md) proposes the exact
Phase 7 signed-wrapper design. It binds actual v1 packet-policy-request-decision
fields rather than inventing parallel action/target/environment/artifact
labels, preserves the existing unsigned decision contract, and leaves
execution authorization as a separate future transition.

[ADR-0006](ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md)
controls current sequencing: signed approval is optional for local v1, private
keys stay user-owned outside LNSAT, and portable signed execution tokens are a
later disconnected-adapter profile.

### Product Boundary Retained From ADR-0001

v1 remains:

- local/self-hosted, single-node, owner-controlled, and loopback-default;
- non-root and fail-closed;
- backed by one embedded SQLite database;
- authenticated through local identities, scoped roles, secure server-side
  sessions, and CSRF protection;
- free of hosted control-plane, managed-fleet, HA, and multi-tenant claims;
- free of unrestricted shell, SSH, database, network, provider, or
  infrastructure control.

Reference execution is local, disposable, synthetic, sandboxed, and
non-production. This decision authorizes design and source contracts only. It
does not authorize a live adapter, provider call, package build, publication,
production signing, release, deployment, or service start.

### Staged v1 Distribution

Phase 14 selected-profile proof is a release blocker. After required Phases 8,
9, 10, 11, and 13 pass, one explicit candidate-build authorization selects one or two
exact OS/architecture/package rows. No row is selected by this ADR. Canonical
CI candidate targets are:

- `aarch64-apple-darwin`;
- `x86_64-apple-darwin`;
- `x86_64-unknown-linux-gnu`;
- `aarch64-unknown-linux-gnu`.

Each canonical bundle contains `lnsatd`, `lnsatctl`, the `lnsat` convenience
dispatcher, bundled Control Center assets, configuration templates,
licenses/notices, and a version/build manifest.

Candidate thin distribution, opened separately per selected profile:

- dedicated Homebrew tap: `brew install hypler-dev/tap/lnsat`;
- direct macOS/Linux `.tar.gz` bundles;
- verified install script;
- `.deb` packages validated on Ubuntu 24.04 and Debian 13;
- `.rpm` packages validated on Rocky Linux 9;
- multi-architecture OCI image;
- `cargo install lnsat` bootstrap/verifier.

The Cargo package contains only the bootstrap/verifier. An explicit setup
command downloads and verifies a signed canonical bundle. Cargo never rebuilds
the product core or creates different product behavior.

Every claimed Homebrew, tarball, install-script, deb, rpm, OCI, or Cargo wrapper
must consume or wrap same versioned canonical components. Applicable
cross-wrapper tests compare embedded component digests. Unselected families
remain unsupported and do not block initial local v1.

Every selected canonical and claimed wrapper artifact requires SHA-256 checksums,
a non-production signature rehearsal/verification bundle, SPDX JSON SBOM, SLSA
v1 provenance, source revision, build recipe, canonical component digest map,
license/notice references, reproducibility evidence, lifecycle evidence, and
non-root/no-auto-start proof. Production signing is a later publication gate
against unchanged Phase 14-proven digests.

Homebrew installs service metadata but never starts `lnsatd`. Operator start is
explicit with `brew services start lnsat`. Linux packages install a non-root
`lnsat` user and a disabled systemd unit, preserve configuration and data unless
explicitly purged, and never start the daemon in post-install scripts.

Compatibility matrix owns exact selected target, architecture, package,
service, path, security-evidence, and lifecycle rows. Unknown, unselected, or
untested rows are unsupported rather than silently implied.

### Later Platform Lanes

These and any unselected candidate distribution rows are not initial local-v1
blockers:

- Winget;
- Scoop;
- MSI;
- Chocolatey;
- signed and notarized macOS `.pkg`.

## Non-Goals

- replacing MCP or A2A;
- becoming a generic agent framework or model loop;
- defining a proprietary general-purpose policy language;
- replacing Kubernetes, Nomad, or another orchestrator;
- becoming a generic scheduler or hardware inventory;
- granting unrestricted shell, SSH, provider, network, database, or
  infrastructure control.

## Consequences

- Roadmap retains fourteen numbered phases, with explicitly optional
  post-local-v1 lanes.
- Phase 14 selected-profile compatibility evidence is mandatory before
  `v1.0.0`; package breadth is not.
- Publication follows Phase 14 through a separate explicit go/no-go gate.
- ADR-0001 remains the historical source for retained local-first, single-node,
  SQLite, local-auth, non-root, fail-closed, and support-window decisions.
- ADR-0001 platform/package exclusions no longer control.
- Distribution proposal documents become normative Phase 14 plans where they
  implement this decision.
- ADR-0003 may add downstream product planes without weakening authority
  semantics or adding them to local-v1 blockers.

## Release Gate

No final tag, GitHub Release, production signature, artifact publication,
repository visibility change, deployment, or live infrastructure mutation is
authorized by this ADR. Those actions require a separate explicit release
authorization after all required local-v1 phases and selected Phase 14 rows
pass.
