<!-- intent-driven-delivery:spec:v1 -->

# Specification: Phase 11 runtime identity observation and derivation

Status: proposed
Intent: [Phase 11 operator run packet](../PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md)
Owner: LNSAT maintainers
Last updated: 2026-09-26

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
image reference, and the private run manifest requires the same value. The
accepted image-identity decision below gives that profile field one exact
meaning. The existing v1 run manifest remains insufficient as real-proof image
authority; a successor contract must bind the other image identities separately.

### Accepted image-identity binding decision

**Owner accepted this image-identity choice and successor field contract on
2026-09-26.** This acceptance is limited to the source-only design. For the
first real disposable proof, use one
platform-specific OCI image manifest and its referenced OCI image configuration.
The approved artifact may be that manifest directly or an OCI image index
whose verified platform descriptor selects exactly that manifest.
Interpret `profile.image_digest` as the local configuration-based ImageID used
by the existing bare `sha256:` Docker run argument. A manifest digest is a
different content identifier and must be supplied and verified separately.
The OCI configuration specification defines ImageID as the SHA-256 of the exact
configuration JSON bytes; the image manifest contains a descriptor for those
bytes. Docker documents running a locally available image by its bare image
ID, while registry manifest references use `name@sha256:...`. This proposal
does not infer a manifest digest from a local image ID or `RepoDigests`.

The existing run-manifest v1 declaration is insufficient for that decision:
its `immutable_digest` is required to equal `profile.image_digest`, while its
`configuration_digest` has no specified OCI byte or descriptor meaning. Keep
v1 source-only and reject it as real-proof image authority. A successor private
run-manifest contract must add these separately named, typed bindings without
reinterpreting either v1 field:

| Binding               | Required evidence and comparison                                                                                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oci_index_digest`    | Present only when the approved artifact is an OCI image index. Equals SHA-256 of its exact raw bytes and the independently approved index identity. Its selected platform descriptor names `oci_manifest_digest` and has the verified manifest size.                                   |
| `oci_manifest_digest` | SHA-256 of the exact raw single-platform manifest bytes; equals the private declaration and either the independently approved manifest subject or the verified selected index descriptor. An index digest cannot substitute for this field.                                            |
| `oci_config_digest`   | Manifest `config.digest`; equals SHA-256 of the exact raw configuration bytes and `profile.image_digest`. Manifest `config.size` equals the raw byte count.                                                                                                                            |
| `local_image_id`      | Docker image inspection `Id`, container inspection `Image`, and the exact `docker run` image argument all equal `oci_config_digest`. A Docker observation alone never supplies the manifest or provenance proof.                                                                       |
| `platform`            | The approved OS and architecture, plus variant when declared, match the verified configuration. On the index path they also match exactly one verified selected index descriptor. The OCI manifest body does not carry platform fields; absent or ambiguous platform evidence rejects. |

The new contract must bind these fields, their distinct types, the verified
index/manifest/config byte commitments as applicable, and the
provenance-verifier identity into its own domain-separated digest. That digest
must be included in the later
driver-admission, final pre-spawn, post-launch, and pre-cleanup comparisons.
Retain `--pull=never`; no preflight may pull or resolve a mutable tag. Reject
unknown index/manifest/config media types, an index digest supplied as a
manifest digest, multiple matching index platform descriptors, mismatched
descriptor size, malformed or duplicate JSON members, absent raw bytes, or
any substitution among index, manifest, and config digest kinds. The selected
exact Docker client/API and supported OCI media
types still require review before implementation. The bounded source of raw
index/manifest/config bytes and their private custody must also be specified;
Docker inspection output cannot substitute for those bytes.

This choice binds content identities, not build provenance or in-image adapter
bytes. The owner-approved provenance verifier must independently connect the
source revision/tree and build identity to the exact approved artifact,
selected manifest, and config. Separately verified adapter bytes must match the
approved host-built adapter
digest and declared entrypoint. No Docker inspection field, annotation,
self-reported hash, or syntactically matching digest can replace those checks.
Until the provenance format, verifier, trust root, adapter-byte observation,
and custody policy are accepted, the observer rejects before any real CLI call.

The owner has accepted this image-identity choice and successor manifest field
contract. A source-only declaration parser can bind the separately named
identities without claiming that their raw bytes or provenance were verified.
A source-only v2 private run-manifest parser now provides that declaration
binding. It nests validated v1 metadata, retains v1's real-proof ineligibility,
uses distinct Rust digest types, and requires a separately supplied expected
image declaration when parsing. Its canonical digest proves no external
authority or OCI content; the expected declaration is not authenticated by
this parser.
A separate pure helper may check the SHA-256 digest of caller-supplied bytes
against the typed config, manifest, or optional index declaration. It compares
the byte count only with a caller-supplied expected size; no v2 declaration
contains an authenticated OCI descriptor size. That check does not obtain
bytes, validate OCI JSON or descriptor links, authenticate the expected
declaration, establish platform selection, or prove provenance or custody. It
is not selected by the served driver.
A later observer must prove raw-byte and descriptor verification, platform and
entrypoint checks, cross-kind substitution denial, and zero fake-CLI calls for
incomplete authority. Independent review and the operator packet's new source
lock and run authority remain separate gates.

Missing, malformed, substituted, mutable, platform-incompatible, or unstable
identity rejects before process creation. Missing provenance or adapter identity
is a rejection even when `docker image inspect` returns successfully.

### Proposed first-proof raw OCI byte acquisition and custody contract

The first proof should acquire raw OCI objects from a pre-positioned, private
OCI image-layout directory supplied by the operator. This is a proposal for the
bounded source of bytes; it is not an accepted implementation or a substitute
for the private authority gate. The layout follows the OCI image-layout
contract ([OCI image layout](https://github.com/opencontainers/image-spec/blob/main/image-layout.md))
and contains `oci-layout`, `index.json`, and digest-addressed objects under
`blobs/sha256/<hex>`. The observer must not run Docker image save or pull, use a
registry, resolve a tag, or make a network request during this observation.

The private authority must separately name the exact layout-root identity and
the accepted typed digest declarations. It must name the root's absolute path,
device, inode, UID, and mode `0700`, and must specify the artifact kind (OCI
index or direct single-platform manifest), approved platform, and typed
`oci_index_digest` when an index is approved, `oci_manifest_digest`, and
`oci_config_digest`. A path or directory supplied after authority review cannot
replace that exact root identity. Every child directory on a selected path
must have the root device, the authority's UID, and mode `0700`. Every selected
regular file must have the root device, the authority's UID, mode `0600`, and
link count `1`. Any symlink, hardlink, mount crossing, device mismatch, UID or
mode mismatch, or unstable device/inode identity rejects the run.

`oci-layout` must be the exact version `1.0.0`. `index.json` is always the
layout's transport wrapper. On the OCI-index artifact path, its exact bytes
must hash to the separately approved `oci_index_digest`; exactly one descriptor
may select the approved platform and its digest must equal the approved
`oci_manifest_digest`. Nonselected descriptors may differ and are never
fetched; the parser must inspect enough descriptor metadata to reject a second
descriptor matching the approved platform. On the direct-manifest path,
`index.json` is still required as the layout wrapper and must contain exactly
one matching manifest descriptor for the approved platform and
`oci_manifest_digest`, but it is not itself an approved artifact digest. A
direct path must not silently promote the wrapper's digest to
`oci_index_digest`, and an index path must not use an index digest where a
manifest digest is required.

For selected objects read into proof evidence, accept only these OCI v1 media
types: image index, single-platform image manifest, and image configuration.
Layer descriptors remain unverified metadata, including their media types;
they never authorize reading or claiming layer payload bytes. Reject nested
indexes, unknown or Docker-private selected-object media types,
multiple matching platform descriptors, absent or ambiguous platform evidence,
mutable tags, external blob fulfillment, and any descriptor that does not
resolve to the approved digest and declared size for the selected index,
manifest, or config chain. The selected manifest's `config` descriptor must
resolve to the approved configuration digest and its exact declared size. Its
layer descriptors may be parsed as selected-manifest
metadata, but layer payload bytes are outside this proposal and must not be
fetched or claimed as verified. No candidate may be chosen by filename,
directory order, annotation, or a best-effort platform match.

The observer must open the layout root before reading any object and then use
root-relative, no-follow regular-file handles for `oci-layout`, `index.json`,
and only the selected manifest/config paths at
`blobs/sha256/<hex>`. It must reject symlink, hardlink, path traversal, mount
or device substitutions, unsafe permissions, non-regular files, changing
device/inode identity, and an object whose size or SHA-256 digest changes
between open, read, and admission. The implementation must verify that every
opened object remains beneath the pre-authorized root and that every path
component meets the root/child-directory/file predicates above; the exact
portable syscall strategy requires security review before implementation.

Apply fixed hard ceilings to each validation pass: `oci-layout` at most 1 KiB,
`index.json` at most 4 MiB, each selected manifest and configuration at most
4 MiB, and at most 16 MiB total bytes read per pass. Permit at most five
validation passes per run, for an 80 MiB whole-run ceiling: initial admission,
pre-driver admission, final pre-spawn, post-launch, and pre-cleanup. The private
authority must state per-run caps for each limit; a cap may only lower the
corresponding hard ceiling and may never raise it or introduce an unbounded
override. Reject duplicate JSON members, malformed JSON, unsupported fields
that alter identity, oversized objects, descriptor-size mismatch, digest
mismatch, and any read that exceeds either the authority cap or fixed ceiling.

The selected-chain evidence must identify the exact root tuple, `oci-layout`
version, wrapper bytes and identity, selected platform descriptor, optional
approved index bytes and identity, selected manifest bytes and identity,
configuration descriptor and bytes, all declared sizes and media types, and the
validation-pass number and cap counters. Nonselected descriptors are metadata
only and do not become evidence.

After every accepted read, retain only private typed evidence for the exact
bytes, size, digest, media type, descriptor link, filesystem identity, and
authority tuple. Recheck the selected bytes and filesystem identities
immediately before driver admission, final pre-spawn, post-launch observation,
and pre-cleanup. Any changed object, root, descriptor, platform selection,
authority tuple, or cap rejects before process creation or yields
`outcome_unknown` after launch; it must never trigger a blind retry. These
reads and rechecks prove only that bounded selected-object bytes were observed
at those stages. They do not prove continuous custody, provenance, host-built
adapter bytes, daemon image content, or execution authority, all of which
remain separate accepted gates.

Security review and explicit owner acceptance are required before adding code,
changing the packet's blocking fields, or treating this proposal as runtime
proof.

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

Reference material: [Docker image inspect](https://docs.docker.com/reference/cli/docker/image/inspect/), [Docker image-ID run example](https://docs.docker.com/get-started/docker-concepts/building-images/build-tag-and-publish-an-image/), [Docker image save](https://docs.docker.com/reference/cli/docker/image/save/), [Docker Build attestations](https://docs.docker.com/build/metadata/attestations/), [OCI image manifest](https://github.com/opencontainers/image-spec/blob/main/manifest.md), [OCI image configuration](https://github.com/opencontainers/image-spec/blob/main/config.md), and [OCI descriptors](https://github.com/opencontainers/image-spec/blob/main/descriptor.md).

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
- The proposed first-proof mechanism is a pre-positioned, private OCI
  image-layout directory with root-relative no-follow reads and digest-derived
  blob paths, as specified above. Is this exact acquisition, custody, and
  revalidation contract accepted, including its media types and conservative
  size caps?
- Which bounded mechanism can inspect the adapter without granting it socket,
  network, credentials, or broader filesystem access?
- Which private evidence custodian and reviewer may see raw observations, and
  what retention and destruction contract applies?

Until those decisions are accepted and implemented with evidence, all
daemon/image/configuration/entrypoint/adapter identities remain blocking
`UNSET_BLOCKING` fields in the canonical operator packet.
