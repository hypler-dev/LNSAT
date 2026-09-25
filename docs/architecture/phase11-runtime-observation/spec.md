<!-- intent-driven-delivery:spec:v1 -->

# Specification: Phase 11 runtime identity observation and derivation

Status: proposed
Intent: [Phase 11 operator run packet](../PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md)
Owner: LNSAT maintainers
Last updated: 2026-09-25

## Behavior

This specification defines the source-only contract for deriving and observing
the daemon, image, configuration, entrypoint, and in-image adapter identities
that a later real disposable Docker proof must bind before process creation.
It supplements the operator packet and does not authorize Docker access,
select a host, build or run an image, or establish runtime evidence.

Before any real CLI invocation, the observer must receive a separately
reviewed, explicit private operator authority that names one exact value for
every `UNSET_BLOCKING` field in the canonical packet. Its source revision,
tree, packet identity tuple, and declaration must match that authority exactly.
The packet tuple is the canonical packet path, the exact packet-bearing public
commit and tree, and the Git blob ID of that packet at that commit. It also
names the packet's historical PR `hypler-dev/LNSAT#39`, reviewed head
`2c918bc59b82ffabc378b47e66137733cf24a6d7`, public merge
`190ab32443f60a2a1bc78f990e8ea5571c28f96f`, and integration tree
`17247c9c194f6a332e99ee32ae5052620349896b`. Those historical values do
not substitute for the current packet-bearing commit/tree/blob. Any change to
any required tuple member or packet content rejects and requires review.
The
current packet locks source revision `b41aa756bccd85843ac540abfd927e8c5693d5fe`
and tree `fecb4303cfe1b5224d3c1f1fbd8f2c86008e389c`; later source changes
need a new reviewed lock and authority decision. Today no such complete
authority exists, so real observation remains blocked with zero CLI calls.

Once that gate is satisfied, the observer receives one already-admitted private
run declaration and performs bounded, read-only observations through an
explicitly supplied Docker CLI wrapper. It must derive a canonical private
observation record containing:

- client executable and endpoint identities, daemon identity and API/runtime
  version, platform, and relevant security posture;
- the immutable image manifest digest and platform-specific manifest identity;
- the OCI image configuration descriptor digest, configuration JSON identity,
  declared entrypoint, command, environment/mount/network/privilege posture,
  and selected root filesystem metadata;
- the exact adapter reference and version, its expected host-built digest, and
  the in-image adapter path, executable identity, and entrypoint binding; and
- independent provenance commitments linking the approved source revision and
  build identity to the selected image and adapter.

The observer must preserve the distinction between an image manifest digest and
an OCI image configuration descriptor digest. A configuration ID identifies the
configuration object referenced by a manifest; it is not the manifest digest
and neither value alone proves image provenance. The observer must also record
which values came from the CLI, which came from independently verified
provenance, and which are only supplemental runtime observations.

The current schema-2 profile's `image_digest` is passed to `docker run` as an
image reference, and the private run manifest requires the same value. Neither
contract defines whether that value denotes a manifest digest or the local
configuration-based image ID. The implementation must not silently choose one
meaning. A versioned, reviewed binding decision must name both identities and
their comparison before the observer can accept an image.

Missing, malformed, substituted, mutable, platform-incompatible, or unstable
identity rejects before process creation. Missing provenance or adapter identity
is a rejection even when `docker image inspect` returns successfully.

## Interfaces and contracts

The source-only interface is a bounded parser around a fakeable command
boundary, for example:

`observe_phase11_runtime_identity_v1(cli, request) -> Result<RuntimeObservationV1, ObserverError>`

`cli` is an injected observer, not a shell string. A real CLI boundary must
reject absent, incomplete, stale, or mismatched operator authority before
invocation, including a daemon version read. Its allowed operations are
fixed read-only daemon/version and image inspection commands. Image archive or
adapter-byte inspection needs a separately accepted bounded mechanism. The
implementation must use argument arrays, a cleared environment, an explicit
local Unix endpoint and private empty Docker configuration, fixed timeouts,
bounded stdout/stderr, and an explicit `pull=never` policy. It must never accept
arbitrary caller commands, shell syntax, mutable tags as identity, unbounded
output, or a discovered endpoint.

The fake CLI test path supplies deterministic command/argument/result fixtures,
including malformed JSON, duplicate or unknown fields, non-zero exits, timeout,
oversized output, changed responses between reads, and truthful-looking but
unverified values. Synthetic fixture authority may exercise the parser and
command boundary in tests, but must be unselectable by a real driver. Tests may
launch a fixture-local fake CLI process but must prove that no real Docker
binary, daemon, socket, image, or network is accessed. A separate negative
test must prove zero fake CLI calls when any operator authority field is
missing or mismatched.

The canonical private observation record is versioned, domain-separated, and
bounded. It contains exact typed fields for the manifest digest, OCI config
descriptor digest, config content digest when independently computed, platform,
entrypoint, adapter identities, provenance commitments, and observation stage.
It must reject a config ID supplied as a manifest digest, a manifest digest
supplied as a config digest, a mutable image reference, or an adapter path with
no independently bound executable identity.

The observer must not infer provenance from `docker image inspect`. Docker's
inspect output describes local image/container metadata and does not establish
that the selected bytes came from the approved source or build. Likewise,
exporting or inspecting an image archive can expose layer and config metadata,
but does not by itself authenticate the source-to-build-to-image chain or hash
arbitrary bytes inside a mounted image. An in-image adapter digest therefore
requires a bounded, separately reviewed observation mechanism and an external
binding to the approved build artifact.

Provenance is accepted only under a versioned, owner-approved verifier and trust
policy that supplies a deterministic accept/reject predicate and binds the
authority's exact source revision/tree, identified build, immutable image
manifest, OCI config, and adapter artifact. The verifier, trust root,
attestation format, and custody rule remain open decisions; absent an accepted
policy, every provenance claim rejects before any real Docker observation.
A runtime self-hash or adapter-reported hash is supplemental and cannot satisfy
prelaunch provenance or adapter identity on its own.

## States and failure handling

The observer is synchronous and bounded. It has these states:

1. `not_started`: no observation has run.
2. `preflight_observed`: complete operator authority was verified first, then
   all required identities and provenance commitments were independently
   verified and internally consistent, but no launch authority follows from
   observation alone.
3. `rejected`: any missing, malformed, untrusted, changed, or over-limit input
   occurred; no launch may follow.
4. `observation_unknown`: a timeout, disconnect, partial read, response drift,
   or post-observation identity change prevents a conclusive result; the later
   driver must preserve ambiguity and must not retry Docker blindly.

There is no success state that grants execution. Before process creation the
later driver must revalidate the client, endpoint, daemon, manifest, config,
entrypoint, adapter, provenance, profile, launch contract, and run-manifest
bindings. It must repeat the same identity and provenance checks immediately
before launch after the final supervisor checks. After launch it must recheck
the runtime and image commitments after observation and before cleanup. Any
drift or inability to revalidate becomes `outcome_unknown`.

## Data, privacy, and permissions

Real raw CLI output, image configuration, environment values, commands, paths,
socket locations, container IDs, credentials, source bytes, layer bytes, and
adapter output are private evidence. They must remain in an owner-only private
evidence location, must not be logged by the observer, and must not appear in
checked-in evidence. Synthetic, non-sensitive fake CLI fixtures may be checked
in for source tests.

No public observation output is permitted by this proposal. A later public
evidence interface requires its own accepted, closed versioned schema with
exact keys, types, value encoding, length bounds, and unknown-field rejection.
That interface must reject nested aliases, escaped strings, and equivalent
field names capable of carrying private values. Until then, even redacted
commitments and review references remain private. Observation records are not
authority, receipts, support evidence, or release claims.

## Compatibility and migration

This additive source-only specification changes no daemon configuration,
Gateway contract, runtime profile, adapter protocol, image, package, route, or
release state. It has no migration or persistence requirement. A future
implementation must version its observer and record schema, reject unsupported
versions, resolve the profile image-digest meaning explicitly, and preserve the
existing fake-runtime path. Removing an
implementation reverts only this proposed contract and its tests; it does not
alter the operator packet's source lock.

## Acceptance mapping

- Contract tests validate zero CLI calls without complete exact private
  operator authority, including its source revision/tree and every packet
  path, current commit/tree/blob, and historical integration tuple member;
  bounded argument allowlists, timeouts, output limits, fake-CLI isolation,
  typed digest separation, platform binding, and fixed errors.
- Negative tests cover missing daemon identity, endpoint or API drift, mutable
  tags, missing or unapproved provenance, config/manifest digest confusion,
  changed entrypoint, wrong platform, missing adapter identity, adapter path
  substitution, runtime self-hash presented as provenance, malformed or
  oversized output, response changes between preflight and launch, and absent
  or mismatched verifier/trust-policy versions. Until that policy is accepted,
  no real provenance claim can pass.
- Revalidation tests prove checks occur before process creation, immediately
  before launch, after runtime observation, and before cleanup; each drift
  case produces rejection or `outcome_unknown` with zero blind retry.
- Public-evidence tests prove this observer emits no public record or log;
  a later public schema needs separate exact-field redaction tests before use.
- Repository validation must include the relevant source-only fake-CLI tests,
  the pinned Rust checks, `npm run source:check`, source inventory, and
  `git diff --check` when an implementation is proposed.
- A fresh independent review must assess the exact observer contract and its
  evidence limits against the operator packet before any later Docker authority
  is considered.

Reference material: [Docker image inspect](https://docs.docker.com/reference/cli/docker/image/inspect/), [Docker image save](https://docs.docker.com/reference/cli/docker/image/save/), [Docker Build attestations](https://docs.docker.com/build/metadata/attestations/), [OCI image configuration](https://github.com/opencontainers/image-spec/blob/main/config.md), and [OCI descriptors](https://github.com/opencontainers/image-spec/blob/main/descriptor.md).

## Non-goals and open questions

This proposal does not implement an observer, invoke Docker, inspect a daemon,
build or export an image, hash arbitrary in-image bytes, authenticate a supply
chain, grant execution authority, persist evidence, create a receipt, mutate a
repository, or complete Phase 11.

The following decisions require explicit owner and security review before
implementation or real proof:

- Which provenance format and independent verification tool are trusted?
- What is the trust root: source control, build service, signing key, registry
  attestation, or a deliberately composed set?
- How is the host-built adapter bound to the exact in-image executable when
  arbitrary in-image byte hashing is unavailable or unsafe?
- Which Docker CLI/API versions and platform-specific OCI fields are supported?
- Does schema-2 `profile.image_digest` mean the local OCI config image ID or a
  manifest digest, and how is the other identity bound without an implicit
  compatibility change?
- Which bounded mechanism can inspect the adapter without granting it socket,
  network, credentials, or broader filesystem access?
- Which private evidence custodian and reviewer may see raw observations, and
  what retention and destruction contract applies?

Until those decisions are accepted and implemented with evidence, all
daemon/image/configuration/entrypoint/adapter identities remain blocking
`UNSET_BLOCKING` fields in the canonical operator packet.
