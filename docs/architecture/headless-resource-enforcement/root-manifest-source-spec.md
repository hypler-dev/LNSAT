# HCFG-6 Root Manifest and OCI Custody Source Specification

Status: proposed private source contract. [Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design)
owns accepted intent and implementation; the Phase 11 packet owns runtime truth.
This companion resolves the root-manifest envelope, anchor and OCI parent-link
boundary. It does not complete the native source freeze, provision a host,
authenticate a current image, or authorize behavioral integration.

## Trust and anchor

The accepted root/kernel/daemon boundary is explicit. A root manifest is a
current local attestation by that trusted root administrator. It is not remote
attestation, a signature, FIPS validation, supply-chain provenance verification,
or protection against a malicious host owner.

Use only the schema-3 profile's explicit
`engine.implementation_manifest_path` and
`engine.implementation_manifest_digest`. They select a pathname and expected
content; neither is authority on its own. There is no search path, environment
override, automatic generation, newer-file fallback or refresh on restart.
The separately reviewed immutable recipe must supply an exact expected recipe
commitment and artifact/provenance pins in the implementation's closed recipe
registry. A manifest cannot add a registry entry or choose weaker predicates.
The current registry and actual pins remain `UNSET_BLOCKING`.

Read the manifest using the
[native bootstrap procedure](native-source-spec.md#root-implementation-manifest-and-current-daemon-association).
Hold the genuine host root and no-follow ancestry; require root UID ownership,
directory type and no group/other mode write during this initial descent.
Do not classify missing prefix ACLs as positive before kernel provenance is
authenticated. The manifest is a regular root-UID/root-GID file, one link,
at most 64 KiB, with this present access ACL in standard order:

```text
USER_OBJ:rw-, USER:<exact_controller_uid>:r--,
GROUP_OBJ:---, MASK:r--, OTHER:---
```

No other named entry, default ACL or controller write is admitted. The
controller UID is the selected nonzero host identity, never a manifest-chosen
replacement. Observed mode must agree with the ACL. Compare held/name identity
and metadata before/after every bounded read. Decode, check the expected
commitment and recipe, associate the current peer/boot/namespace tokens, then
authenticate kernel/LSM/ext4 provenance and recheck every prefix with the full
effective-ACL rules. Release no guard before that second check completes.
Root `/` need not have an extended ACL. Missing provisioning denies; LNSAT
does not create directories, change permissions or install an attestation.

## Representation and commitments

All fields below are mandatory except explicit nullable `image.index`.
Unknown, missing, duplicate or escaped-duplicate keys, wrong types, null in any
other position, overflow and trailing data deny. UTF-8 JSON is at most 64 KiB,
depth 16 and 2,048 object fields. Strings contain no control/NUL bytes.
Unsigned integers use decimal without sign, exponent or fraction. UID/GID
values fit u32, excluding `4294967295`; PIDs are positive u32. Inodes, byte
sizes, start ticks and mount IDs are positive u64; device major/minor are u32.
Paths are canonical absolute Linux paths, at most 4,096 bytes, with no empty,
dot or dot-dot component; socket paths retain the profile's 100-byte limit.
Common digests are `sha256:` plus 64 lowercase hex. Source commits are exactly
40 lowercase hex, compared with the selected reviewed recipe, never a prefix.

Root-manifest input may contain JSON whitespace. Its commitment is SHA-256 of
`lnsat.hcfg_root_implementation_manifest.v1`, one LF, then the complete compact
recursively ASCII-key-sorted JSON object without trailing LF. Arrays retain
their specified order. This uses the new wire companion's canonical codec,
not the preparation journal's struct-order codec. No self-digest field exists.
The result must equal the profile's implementation-manifest digest.

The exact top-level keys are:

```text
contract_id, schema_version, recipe_digest, controller, administrators,
kernel, components, templates, instance, mounts, image
```

`contract_id=lnsat.hcfg_root_implementation_manifest.v1`,
`schema_version=1`. `recipe_digest` must equal the profile's headless recipe
digest and the selected reviewed registry entry. Recipe commitment covers the
complete immutable native/daemon/image/environment/mount/device/probe
predicates, not this changing current-instance record. Its exact body is still
a full-freeze item; no partial object or manifest digest substitutes for it.

## Exact records

| Record                       | Exact fields and comparisons                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `controller`                 | `uid,gid`: both positive, equal the independently observed host controller identity and the selected profile. Controller real/effective/saved IDs agree and supplementary groups are empty.                                                                                                                                                                                                                                                                                                                                            |
| `administrators`             | Sorted strictly increasing array of at most 16 positive u32 UIDs. Exclude root and the controller. Effective-ACL checks may recognize these selected trusted administrators; the manifest itself still permits only root write.                                                                                                                                                                                                                                                                                                        |
| `kernel`                     | `source_ref,source_commit,release,build_provenance,configuration,artifact,active_lsms`. Source ref is `v6.8`; exact commit/release and all artifact digests equal the reviewed registry. Release is an ASCII string of 1..128 bytes, not a prefix match. The three file records use the artifact grammar below. `active_lsms` is an ordered unique array of 1..16 lowercase ASCII identifiers of 1..32 bytes; it must equal the reviewed recipe and the genuine current securityfs list. Extra/modified LSMs or BPF LSM programs deny. |
| `components`                 | Exactly five records in order: `dockerd,containerd,runc,shim,host_git`. Each has `role,version,source_commit,artifact,build_provenance`. Version is an exact ASCII string of 1..128 bytes. Dockerd/containerd/runc versions are `29.8.2/2.3.6/1.5.2`; shim and host Git must equal the reviewed exact recipe. Dockerd source commit is `8af9fe3a36bab3e039862a2ab1cef1880c9b4d03`. Artifact and provenance are separate file records. No missing, extra or repeated role.                                                              |
| `templates`                  | Exactly `source_commit,recipe_document`. Source commit equals the selected Moby commit. The file record authenticates the reviewed default seccomp/AppArmor/OCI construction recipe and its source/build correspondence. It does not claim the embedded default seccomp template exists as a host file.                                                                                                                                                                                                                                |
| `instance`                   | `listener_kind,boot_id,daemon_pid,daemon_uid,daemon_gid,daemon_start_ticks,daemon_executable,endpoint,host_user_namespace,host_mount_namespace,metadata_roots`. Listener kind is exactly `direct_dockerd_unix`; daemon UID/GID are zero. Boot ID is the genuine lowercase hyphenated host boot UUID. Namespace values are positive u64 inodes, associated with genuine held procfs namespace records.                                                                                                                                  |
| `instance.daemon_executable` | `device_major,device_minor,inode`, matching the held installed dockerd artifact. Root attests that this artifact is the executable used by the named current daemon instance. Non-root LNSAT does not dereference the ptrace-gated root daemon's `/proc/{pid}/exe`.                                                                                                                                                                                                                                                                    |
| `instance.endpoint`          | `path,device_major,device_minor,inode`. Path exactly equals the profile endpoint; type is observed as pathname Unix socket with the required present controller ACL. Compare named identity, current peer credentials and owned peer pidfd on connection and around every call.                                                                                                                                                                                                                                                        |
| `mounts`                     | 1..128 current ext4 mount records, ordered by strictly increasing `mount_id`, unique per held host mount namespace. Every selected owner/manifest/installed-artifact path and its ancestry must be covered. Unlisted mount transitions deny. Genuine procfs/securityfs/cgroupfs observations use their separate native type/association rules and are not ext4 records. Record grammar follows below.                                                                                                                                  |
| `image`                      | `platform,config,manifest,index,adapter,probe,build_provenance`. Config/manifest use OCI blob records; index is an OCI blob record or explicit null. Adapter/probe use image executable records. Build provenance is a root-controlled artifact file. All pins match the independently selected profile and reviewed image recipe.                                                                                                                                                                                                     |

`instance.metadata_roots` has exactly `policy_id,dedicated,daemon_root,container_repository`.
Policy is `lnsat.hcfg_docker_metadata_acl.v1`; dedicated is true, an explicit
trusted-root assertion that the selected daemon data root serves this LNSAT
engineering backend rather than shared workloads. Each directory record has
exactly `path,device_major,device_minor,inode` under the existing bounded grammar.
The repository path is the daemon root plus `/containers`; both held current
root-owned identities must match this manifest and its host mount records.
Authenticated API `Info.DockerRootDir` must exactly match the evaluated daemon
root path. ACL templates and private observation methods are frozen in the
[metadata custody proposal](docker-metadata-source-spec.md). No directory
inventory, host permission mutation or caller-selected metadata root is added.
These fields enter the complete canonical manifest commitment; they are not
optional and do not authorize provisioning.

An artifact file record has exactly `path,digest,size`. Size is positive and
at most 256 MiB; hash actual stable bytes with the native before/after custody
checks. The manifest's declared digest alone is never enough. Total artifact
and OCI bytes read are at most 1 GiB and remain inside the current five-second
administrative observation bound and uninterrupted startup/preparation budget.
No helper subprocess, download, cached positive or reset of the deadline.
Artifact/provenance files are root-owned, regular, single-link, controller
readable and not writable by untrusted identities; genuine effective ACL and
ancestry checks are mandatory. The corresponding reviewed registry digest
must already be set. Hashing a provenance document binds its identity; trust
in its build/current-instance assertion is the explicit root boundary. Later
Phase 13/14 evidence must verify any independently claimed build or signature.

A mount record has exactly:

```text
mount_id,device_major,device_minor,root,mount_point,filesystem_type,
host_mount_namespace,idmapped
```

Filesystem type is `ext4`, `idmapped=false`, paths are canonical, and the
namespace equals `instance.host_mount_namespace`. Genuine current
fdinfo/mountinfo/fstatfs/device observations must match each record and current
boot. No mountinfo "idmapped" field is invented. Absence of idmapping is the
accepted trusted-root assertion associated with these exact live tokens, not
an independent kernel observation. ACL-absence classification additionally
requires the exact reviewed kernel configuration and no-reachable-ENOSYS
ext4/LSM recipe. This array is private current host evidence; it is not
persistent resource identity or public diagnostic output.

A platform record has exactly `os,architecture,variant`; OS is `linux`.
Architecture is 1..32 lowercase ASCII letters/digits/underscore; variant is an
ASCII string of 0..32 bytes, empty when none. Both must equal the single exact
reviewed engineering recipe and OCI config/platform association. This grammar
selects no package support row. API `/version` uses Go architecture names;
`/info` uses host platform naming. Their exact mapping must be frozen with the
selected recipe, not compared as arbitrary equal strings.

An image executable record has exactly `container_path,snapshot`.
The container path is a canonical absolute path of at most 256 bytes; snapshot
is a root-controlled artifact file containing the reviewed executable bytes.
Adapter/probe paths and snapshot digests equal the profile's independent
entrypoint/digest pins and cannot overlap. A snapshot does not prove that an
image contains those bytes. The exact image build/inventory association,
immutable image identity and actual trusted startup observations remain
necessary. No writable host snapshot is mounted into either process.

An OCI blob record has exactly `path,digest,size`; size is positive and at
most 1 MiB. All custody rules for artifact files apply. There are exactly two
or three blobs and at most 3 MiB total. Config digest equals profile
`image_digest` (raw config digest, distinct from a containerd Image Inspect
target Id), manifest equals
`headless.image_manifest_digest`, and nullable index pairs exactly with
`headless.image_index_digest`. These three identities are distinct.

## Current daemon association and invalidation

Compare genuine host boot ID, controller/daemon user and mount namespace
association, `SO_PEERCRED` PID/UID/GID, start ticks, installed dockerd identity,
socket custody and owned `SO_PEERPIDFD` with the instance record. Poll the peer
pidfd through each bounded exchange and immediately before release; compare
the tuple again after every exchange. No inherited `fd://`, socket activation,
proxy or another root service can pass by reporting the expected version.

Root must attest the current daemon's artifact/build/configuration association;
version/Info strings are additional comparisons, not the identity bridge.
Root also attests that this current boot uses the exact kernel artifact,
configuration and build provenance in the kernel record; genuine uname release
must match. Reading an installed kernel file alone does not independently
authenticate the running kernel. This is the accepted trusted-root/kernel
boundary, not a measurement/remote-attestation claim.
A manifest refresh changes its profile commitment. Restart, replaced socket,
changed boot, dead peer, changed source bytes, root-manifest drift or a different
namespace denies the retained guard. It requires separate root provisioning
and the existing protected generation/epoch transition before new action use.
Do not silently reload a refreshed manifest into old authority. Persisted
preparation recovery may inspect/clean its exact orphan only under its separately
authenticated journal and cleanup contract; it cannot relaunch an action.

## OCI raw bytes and parent links

Hash each complete held blob's **raw bytes**, without a domain, JSON
canonicalization, newline removal or reserialization. Require exact byte size
and SHA-256, then decode bounded UTF-8 JSON (depth 32, at most 4,096 fields).
Reject duplicate/escaped-duplicate keys, unknown fields, trailing data and
wrong types. Raw OCI digests must never use the LNSAT root-manifest codec.

This selected subset follows the exact dependencies in
[Moby's go.mod](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/go.mod):
[OCI image-spec 1.1.1](https://github.com/opencontainers/image-spec/blob/v1.1.1/specs-go/v1/config.go)
and [Docker image-spec 1.3.1](https://github.com/moby/docker-image-spec/blob/v1.3.1/specs-go/v1/image.go).
It is deliberately a closed selected-image grammar, not universal OCI support.

- Config requires `architecture,os,config,rootfs`. Optional known top-level
  fields are `variant,created,author,history`; Linux `os.version/os.features`
  are forbidden for this recipe. Platform matches the manifest record; an
  absent variant corresponds to the empty selected variant, otherwise exact.
  `created` is a bounded RFC3339 timestamp, `author` at most 256 bytes.
- Config's `rootfs` is exactly `{type:"layers",diff_ids:[...]}`, 1..16
  distinct full SHA-256 digests in layer order. History, if present, has at
  most 64 objects with only `created,created_by,author,comment,empty_layer`;
  strings are at most 4,096 bytes and empty_layer is Boolean. The number of
  nonempty history layers, when history exists, equals the DiffID count.
- Config's `config` permits only `User,ExposedPorts,Env,Entrypoint,Cmd,Volumes,
WorkingDir,Labels,StopSignal,ArgsEscaped,Healthcheck,OnBuild,Shell`.
  Null is forbidden. Ports and volumes, if present, are exactly empty objects;
  ArgsEscaped, if present, is false; OnBuild/Shell, if present, are empty arrays.
  Healthcheck, if present, has only `Test:["NONE"]`. User, Env, Entrypoint,
  Cmd, WorkingDir, Labels and StopSignal must match the complete reviewed
  image recipe with exact presence, order and values. Arrays are at most 64
  strings, strings at most 4,096 bytes; labels at most 64 bounded string pairs.
  No ambient environment or unreviewed hook is inherited. Exact fixed
  environment and absent-versus-empty image fields remain part of that
  still-required immutable image recipe.
- Manifest requires exactly `schemaVersion,mediaType,config,layers`, with
  optional bounded `annotations`. SchemaVersion is 2 and mediaType is
  `application/vnd.oci.image.manifest.v1+json`. Config descriptor names
  `application/vnd.oci.image.config.v1+json` and equals the actual config
  digest/size. Layers has 1..16 descriptors in order, count equal to DiffIDs;
  mediaType is `application/vnd.oci.image.layer.v1.tar+gzip`. Each descriptor
  is exactly `mediaType,digest,size`, positive size within the reviewed
  per-layer pin. All layer digests/sizes and DiffIDs equal the complete
  reviewed image recipe. URLs, embedded data, foreign layers, artifactType,
  subject and arbitrary descriptor extensions deny.
- Optional index requires exactly `schemaVersion,mediaType,manifests`, with
  optional bounded `annotations`; schemaVersion is 2 and mediaType is
  `application/vnd.oci.image.index.v1+json`. It has exactly one descriptor,
  with `mediaType,digest,size,platform`; mediaType is the selected OCI
  manifest type, digest/size equal the held manifest, and platform is exactly
  `os,architecture` plus optional `variant`, matching the config. Nested
  indexes, duplicate/ambiguous platform candidates and build-attestation
  entries deny this first recipe. Supporting them needs a reviewed recipe.
- Annotations, when present, are at most 64 pairs of ASCII keys (1..256 bytes)
  and UTF-8 values (at most 4,096 bytes), exactly equal the reviewed recipe.
  No key/value is surfaced publicly. No optional OCI field permits null.

Layer blob acquisition/decompression and tar extraction are not introduced.
The comparison authenticates raw config→manifest→optional-index links and
binds the reviewed declared layer/DiffID identities. It does not independently
hash installed layers or prove the daemon unpacked them faithfully. That
association uses the accepted root/daemon boundary, exact prepositioned image
pins and later selected-target proof. The root manifest asserts the blobs
correspond to that daemon's local image; compare Image Inspect's backend-specific
`Id`, platform, Config and RootFS DiffIDs before use. For the pinned containerd
backend, a non-null profile `headless.image_index_digest` requires target Id and
Descriptor.digest equal to that exact held index digest; explicit null requires
both equal to the held `headless.image_manifest_digest`. This predicate is
authenticated before request construction, never inferred from a response.
Missing or mismatched held blobs deny. Follow the index's exact held manifest
descriptor and that manifest's config descriptor to the selected raw config,
rather than equating target Id with
profile `image_digest`. The graphdriver branch instead claims config digest Id;
the complete recipe must select and bind one backend without fallback. A descriptor, tag, RepoDigest,
API Config re-encoding or root-provided file alone cannot replace this chain.
No additional Docker endpoint, registry call, image pull or artifact build.

## Stage-A private root-manifest decoder contract

This supplied-body prerequisite follows the accepted
[source order](source-freeze-staging-decision.md#a-reviewed-inert-candidate-source).
[Project Status](../../PROJECT_STATUS.md#stage-a-private-root-manifest-decoder-contract)
owns review and implementation disposition. It completes the representation
needed to compare a root declaration with the selected profile, registry and
native observations. It does not supply those observations or comparisons.
Fresh independent exact precode review is required before the named source.

### Ownership, interface and retained claims

Owned source is new private `crates/lnsatd/src/headless_root_manifest.rs`,
`headless_root_manifest_tests.rs`, and one private module declaration in
`crates/lnsatd/src/lib.rs`. Existing profile, startup, daemon-response, native,
store, dependency, feature and locked Phase 11 source stay unchanged. Use the
existing pinned serde, sha2 and zeroize dependencies. There is no generic public
manifest decoder, caller-selected registry, I/O, observer constructor or permit.

The sole private entrypoint is
`decode_root_manifest_claim(&[u8]) -> Result<UnverifiedRootManifest, RootManifestError>`.
It accepts only the complete borrowed JSON body. Its output retains the full
closed typed records listed in this document, compact canonical bytes and the
32-byte recomputed manifest commitment. Every identity, pathname, source/build
claim, ordered member, explicit nullable index and declared size remains
available for later private comparison. Do not erase dynamic fields merely
because a predicate or current synthetic fixture accepts them. A Boolean or
commitment alone is insufficient output.

The output has no `Clone`, `Debug`, `Display`, public constructor, serialization
or authority conversion. Internal closed DTO serialization is allowed solely
for canonicalization. Input-derived owned strings, canonical byte buffers and
any temporary owned input/commitment buffers use zeroizing owners. Borrowed
input and serde's internal scratch are outside that erasure claim. Errors carry
no field name, path, value, bytes, offset or underlying serde message. No logging
is introduced. Successful decoding says only that the supplied declaration is
well formed and internally coherent; even an exactly matching caller-provided
profile digest cannot authenticate its origin.

### Complete shape and bounded allocation

All exact records above are map-only objects. Unknown, duplicate, escaped-
duplicate, missing, wrong-type and positional-array encodings deny at every
object position. Every listed field is required; the sole nullable slot is
`image.index`, whose explicit null is distinct from absence. Its non-null form
has the same three-field blob shape as config and manifest. No defaulting,
flattened catch-all, untyped retained JSON tree or ignored unknown subtree.
All integer fields use the widths and value predicates below; negative zero,
signs, fractions and exponents deny even when numerically integral.

Before typed allocation, validate UTF-8 and scan JSON using fixed bounded
storage. The body ceiling is 65,536 bytes inclusive. JSON whitespace is allowed
before, within and after the one object; no LF framing requirement applies.
BOM, malformed UTF-8/escapes/surrogates/numbers, raw controls, incomplete input
and trailing values deny. Root object depth is one and maximum depth is 16.
Each object has at most 32 members; all objects together at most 2,048 members.
Each array has at most 128 elements; all arrays together at most 256 elements.
Decoded keys have 1..256 UTF-8 bytes, decoded string values 0..4,096 bytes.
Count escaped equivalents identically. Apply caps even in unknown branches
before allocating their contents; never skip an unbounded value on shape denial.
The scanner uses no heap-grown parse stack or generic JSON value tree.

After scanning, every decoded string rejects ASCII control bytes U+0000 through
U+001F and U+007F. Fixed keys and identifier grammars impose their additional
ASCII rules. Values otherwise retain their original UTF-8 bytes without Unicode
normalization. Semantic collection caps remain narrower than scanner ceilings:
administrators 0..16, active LSMs 1..16, components exactly five, mounts 1..128.
Empty strings are allowed only where explicitly named below.

### Exact semantic predicates and internal relations

Apply the existing fixed contract, schema, component, kernel source-ref,
listener, metadata-policy, filesystem and platform constants above. Additional
precision for the private candidate is:

- All UID/GID fields are u32 and exclude `u32::MAX`. Controller UID/GID and
  administrator UIDs are positive; daemon UID/GID are exactly zero.
  Administrators are strictly increasing and exclude the controller UID.
  No claim about actual supplementary groups follows from this array.
- Daemon PID is positive u32. Namespace inodes, file inodes, start ticks and
  mount IDs are positive u64. Device major/minor are u32 and may be zero.
  `schema_version` is u32 exactly one. File/blob sizes are positive u64 with
  their separate 256-MiB/1-MiB inclusive caps.
- Common digests and source commits use the exact lowercase formats above.
  Source commits have 40 digits without prefix. Source-ref is exactly `v6.8`.
  Kernel release and component versions are 1..128 printable ASCII bytes.
  Dockerd, containerd and runc versions use the exact specified constants;
  shim/host-Git versions, kernel release and remaining commits stay unverified
  retained claims for independently held registry comparison.
- Components have exactly the five named roles in the specified order. Dockerd
  source commit and `templates.source_commit` both equal the fixed reviewed Moby
  commit. The other source commits are not inferred from their version strings.
- Boot ID is exactly lowercase hexadecimal UUID spelling in 8-4-4-4-12 groups.
  Do not add UUID-v4 restrictions from the startup release-ID grammar. Actual
  boot-ID equality and freshness are native comparisons, not lexical proof.
- Active LSM identifiers match `[a-z][a-z0-9_]{0,31}`, are unique, and retain
  their supplied order. Syntax does not establish the selected permitted LSM
  list or absence of BPF programs; those remain registry/native checks.
- Canonical absolute Linux paths begin `/`; no backslash, empty internal
  component, `.` or `..`, repeated slash or trailing slash is permitted.
  `/` itself is accepted only for mount `root` and `mount_point`. File paths,
  endpoint, metadata directories and executable container paths are non-root.
  The common 4,096-byte cap applies; endpoint uses 100 and executable container
  paths use 256. Root is not a possible regular-file/socket/executable leaf or
  a dedicated daemon data directory in this selected recipe.
- Metadata policy is the exact specified string and `dedicated` is true.
  Container repository path equals daemon-root path followed by `/containers`,
  with no normalization, truncation or independently selected alias. Both
  directory identity tuples remain distinct claims requiring native comparison.
- Mounts are strictly increasing by `mount_id`. Every record has `ext4`, false
  `idmapped`, and the exact declared instance host mount namespace. Distinct
  mount IDs may share a device or pathname (stacked/bind views); do not infer
  native mount selection or pathname coverage from a string-prefix test.
- Platform OS is `linux`, architecture matches `[a-z0-9_]{1,32}`, and variant
  is 0..32 printable ASCII bytes. Empty variant is retained explicitly. These
  are representation rules, not a supported architecture list or API spelling
  mapping. The selected recipe supplies exact architecture and variant.
- Adapter and probe container paths cannot equal or be component ancestors of
  one another. Prefix siblings such as `/bin/probe` and `/bin/probe2` remain
  distinct. Snapshot digests remain independently retained; the decoder does
  not infer role or image inclusion from a shared or different digest.
- Config, manifest and non-null index digests are pairwise distinct. Preserve
  absence-by-explicit-null separately from a present index. No descriptor or
  raw OCI parent-link verification is performed by this manifest parser.
- Checked sum of every declared artifact and OCI blob size is at most 1 GiB.
  Count each named occurrence, even repeated paths/digests; kernel has three,
  components ten, templates one, image adapter/probe snapshots two and image
  provenance one, plus two or three OCI blobs. This is a declared-work ceiling,
  not evidence of bytes read. Future native code independently meters actual
  reads, repeated stability checks, elapsed time and interruption without
  resetting its shared deadline. No deduplication grants extra read budget.

Comparisons that require external truth are deliberately not implemented by
this entrypoint: independently held controller/profile identity; selected
registry recipe/pins; current root ownership, mode, ACL, link count and ancestry;
filesystem/mount coverage; actual file size/hash and stable held/name identity;
current boot/peer/pidfd/executable/namespace association; running kernel/LSM
provenance; raw OCI blobs, descriptor parent links and daemon image selection;
image inventory/startup facts; generation/epoch/attempt/release state. Missing
such facts must deny a future guard, not make this decoder a substitute guard.
Separate exact contracts must name the custody reader and raw OCI verifier
before their source. No root/daemon trust bridge, successful native constructor
or private-authority input API is opened by this representation contract.

### Commitment and deterministic denial

After complete shape and semantic validation, serialize the typed records with
ASCII-lexicographically sorted keys recursively, preserving every required field,
explicit null and array order. Emit compact UTF-8 JSON without a trailing LF;
use normal JSON string escaping, with no optional slash or non-ASCII escaping.
No map may rely on incidental insertion order. Equivalent input whitespace,
key order and escape spelling produce identical canonical bytes. Digests are
SHA-256 of the exact domain bytes already specified, one LF and those bytes.
No self-digest exists. Raw OCI digests will hash raw blobs separately.

Private static error codes use prefix `headless_root_manifest.` with stages:

1. `input_too_large`: body byte ceiling, before copying or decoding;
2. `json_syntax`: UTF-8 or JSON lexical/structural failure;
3. `json_limits`: preflight bounds;
4. `json_shape`: closed typed maps, presence, duplicates, type or integer width/
   spelling;
5. `family`: contract ID and schema version;
6. `claims`: fixed values, lexical predicates, per-record bounds and internal
   cross-record relations including declared-byte ceiling;
7. `canonical`: typed serialization or commitment construction failure.

UTF-8 failure precedes scanning; within the scanner the first left-to-right
syntax/limit violation wins. Semantic stages run only after complete typed
shape succeeds. No expected-digest mismatch code is invented: expected digest
and genuine origin belong to later independently held comparisons. Errors and
output do not prescribe retry, provisioning, cleanup or automatic refresh.

### Required source evidence and remaining delivery gates

Independently authored synthetic positives cover both explicit-null and present
index, empty and maximum administrator arrays, reordered/escaped/whitespace
input, all five components, variable retained identities/paths/versions/digests,
ordered distinct LSMs and mount IDs, namespace equality, both variant forms and
mount `/`. Compare complete retained projections, not just successful return.
Independently reconstruct the domain/LF/canonical hash and at least one fixed
known digest. Equivalent JSON encodings must have identical commitment;
each valid changed dynamic claim must change it. Canonical bytes must remain
bounded and contain every original typed claim.

For every object type test each required member missing, unknown, duplicate,
escaped duplicate, null, wrong type and positional-array form. Exercise required
nullable index separately. Test every fixed constant, numeric zero/maximum/
overflow/spelling, digest and UUID syntax, all lexical string/path bounds,
administrator ordering/controller exclusion, component ordering/source linkage,
LSM duplicates/order, mount ordering/namespace, metadata path relation,
executable equality/ancestor/prefix-sibling cases, distinct image identities,
and both per-file and aggregate byte ceilings (at, below and above).

Test scanner byte/depth/member/array/key/string ceilings at and above each cap
without an earlier failure masking the intended bound. Lower-level preflight
boundary fixtures need not satisfy the closed manifest shape; distinguish those
from successful full-manifest positives. Include malformed UTF-8, escapes,
surrogates, numbers, truncation and trailing data; all escaped-control forms;
static-error secret canaries and deterministic stage precedence. Prove that
altered self-consistent claims remain unverified, not detected forgery or replay.
No host pathname is opened and no synthetic fixture is described as attestation.

Named source validation: focused pinned Rust tests, Rust formatting, strict
all-target Clippy, full `npm run check`, installed scoped scanners, docs/public/
inventory/history/diff checks, and fresh exact-source/direct-child review.
The present precode documentation packet uses proportional docs/public/inventory/
history/format/link/diff and locked Phase 11 readiness checks; no unchanged Rust
build is claimed rerun. Only reviewed private source ownership opens after
precode PASS. Native fixture/kernel/harness source, actual artifact capture,
full source/pin/positive-feasibility freeze, product integration, runtime,
packaging and release retain their separate gates. LNSAT remains standalone;
Rangoon consumes its normal engine/adapter contracts.

## Freeze acceptance and remaining work

Independent review must verify that a future non-root controller can read the
provisioned bytes, authenticate the root bridge without circular ACL trust,
detect instance replacement and verify raw parent links without widening the
accepted endpoint set. Meaningful negative coverage must include controller-
writable manifest, non-root/mapped instance, duplicate fields, changed bytes
with unchanged size, digest/size disagreement, mismatched config/manifest/index,
variant ambiguity, missing provenance, unset registry pin, restart and stale
profile commitment.

This contract defines no live verifier or provisioning command. Complete
nested Docker response projections, actual immutable recipe bodies and pins,
realized mount/device/environment and negative-probe procedures, full source
freeze review and behavioral implementation remain pending. Enterprise and
government claims additionally require the
[separate security requirements](../ENTERPRISE_GOVERNMENT_SECURITY_REQUIREMENTS.md)
and Phase 13/14 selected-deployment evidence.
