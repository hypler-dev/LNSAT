# HCFG-6 Internal Candidate Assertion Views

Status: independently reviewed precode contract for an inert Stage-A source
candidate. [Project Status](../../PROJECT_STATUS.md#stage-a-internal-candidate-assertion-views)
owns implementation and acceptance truth. Full expected recipe/binding/native
freeze and behavioral integration remain separate. Phase 11 owns runtime proof.

## Outcome and scope

An internal lnsatd comparator can read every already validated candidate profile
or root field without reparsing canonical JSON or turning assertions into native
facts. Existing closed codecs, errors, bounds, canonical bytes and commitments
remain unchanged. No complete registry, selector, comparison decision, binding
admission, worker dispatch, file/OS/socket/SQL call, daemon request, credential,
logger, installer, public CLI/API/SDK, or authority token is added.

The implementation surface is `crates/lnsatd/src/headless_profile.rs` and
`headless_root_manifest.rs`, their existing test files, and a test-only sibling
consumer in `lib.rs`. The [root association contract](root-manifest-source-spec.md#custody-shared-lifetime-and-invalidation)
requires deliberate codec reuse. Existing profile/root schemas and bounds come
from the [startup wire](startup-wire-source-spec.md) and
[root-layout](root-layout-source-spec.md) contracts.

## Exact visibility and decode API

Both modules remain private in lib.rs. They are children of the library root,
so pub(super) makes these items accessible within that root and all lnsatd
descendants. This is deliberately an internal crate-visible data seam, not
sibling-only or a Rust-enforced per-consumer access boundary. No external crate
can name these modules/items; no re-export or public entry point is added.
No production consumer is wired in this slice. Any later production caller,
worker request or integration still needs its own reviewed contract and gates.

Only these existing codec entry points,
owned unverified types, finite errors and their code methods become pub(super):

```rust
pub(super) fn parse_profile(input: &[u8]) -> Result<UnverifiedProfile, ProfileError>;
pub(super) fn decode_root_manifest_claim(input: &[u8])
    -> Result<UnverifiedRootManifest, RootManifestError>;
pub(super) fn decode_root_manifest_layout_claim(input: &[u8])
    -> Result<UnverifiedRootManifestLayout, RootManifestError>;
```

parse_profile_with_floor remains private and unchanged. Callers cannot select an
arbitrary floor. All owned fields and nested serde declarations remain private.
Errors keep current variants/derives and fixed public-safe codes; no candidate
value or path is placed in an error. No pub/pub(crate) spelling, re-export or external crate API is added.
The pub(super) scope is nevertheless crate-wide here; it is not narrower than
pub(crate) in effective reach. Inert candidate data is not authority, regardless
of which internal module reads it.

The existing owned types retain no Clone/Debug/Display/Serialize implementation.
A pub(super) candidate_view(&self) returns ProfileClaimView<'_>,
RootManifestV1ClaimView<'_> or RootManifestV2ClaimView<'_>, respectively.
The two root decoders/views remain distinct; no enum decoder, autodetection,
fallback, family conversion or optional host_layout on v1. Independently selected
expected family still precedes the deliberate decoder call; this seam selects none.

## Test-only sibling consumer

An inline cfg(test) module in lib.rs contains pub(super) consume_profile(raw),
consume_root_v1(raw) and consume_root_v2(raw) test functions. Existing in-module
codec tests supply their already defined synthetic bytes to those functions.
The sibling consumer invokes only the three deliberately widened production
decoders and typed views; it does not expose fixture constants, arbitrary-floor
parsing or new production constructors. A closed synthetic typed projection can
be checked against retained canonical data to exercise nested/array/null surface.
No production serializer is added.

## View ownership

Each pub(super) view has only private fields: a reference to its owning codec
record (or validated nested record) plus PhantomData<std::rc::Rc<()>>.
Private module constructors are the sole creation path. No Clone, Copy, Debug,
Display, Serialize, Deserialize, mutable accessor, Deref or generic JSON view.
The marker makes the view itself !Send and !Sync without allocating an Rc.

The outer lifetime 'a is tied to decoded owned material. Borrowed getters return
'a references; nested wrappers retain that same lifetime. They cannot outlive
the owner and introduce no allocations, hashes, serialization or I/O. Scalars
are copied values and remain candidate assertions. Ordinary returned &str/byte
references retain Rust's usual traits; the marker is not a security boundary
against callers copying claims. No worker API accepts a view or borrow here.
Later worker requests still require their separately reviewed owned payload.

ProfileClaimView wraps UnverifiedProfile, not an independently constructed
ProfileDeclaration. It additionally exposes canonical_bytes() -> &'a [u8],
candidate_profile_digest() -> &'a [u8; 32], and
candidate_authority_digest() -> &'a [u8; 32]. These are existing recomputed
candidate commitments, never proof of selected policy or installed authority.

The v1/v2 root views wrap their distinct owned unverified record. Each exposes
canonical_bytes() -> &'a [u8] and candidate_commitment() -> &'a [u8; 32], borrowing
the existing zeroizing buffers. Canonical bytes are retained codec output, not
original input spelling or a new commitment domain.

## Exact typed accessor surface

Every method below is pub(super), takes &self, and returns the specified type.
No owned declaration/nested serde type escapes. Names mirror validated source
fields; Adapter.reference is the wire member ref. Getters read assertions only.

### ProfileClaimView

| Method                        | Return                    |
| ----------------------------- | ------------------------- |
| `adapter()`                   | `AdapterClaimView<'a>`    |
| `adapter_executable_digest()` | `&'a str`                 |
| `audience()`                  | `&'a str`                 |
| `contract_id()`               | `&'a str`                 |
| `contract_version()`          | `&'a str`                 |
| `engine()`                    | `EngineClaimView<'a>`     |
| `entrypoint()`                | `&'a str`                 |
| `filesystem()`                | `FilesystemClaimView<'a>` |
| `headless()`                  | `HeadlessClaimView<'a>`   |
| `image_digest()`              | `&'a str`                 |
| `isolation()`                 | `IsolationClaimView<'a>`  |
| `limits()`                    | `LimitsClaimView<'a>`     |
| `profile_family()`            | `&'a str`                 |
| `profile_id()`                | `&'a str`                 |
| `schema_version()`            | `u32`                     |

### AdapterClaimView

| Method        | Return    |
| ------------- | --------- |
| `reference()` | `&'a str` |
| `version()`   | `&'a str` |

### EngineClaimView

| Method                             | Return    |
| ---------------------------------- | --------- |
| `endpoint_path()`                  | `&'a str` |
| `implementation_manifest_digest()` | `&'a str` |
| `implementation_manifest_path()`   | `&'a str` |
| `verifier_git_executable_digest()` | `&'a str` |
| `verifier_git_executable_path()`   | `&'a str` |

### FilesystemClaimView

| Method                        | Return    |
| ----------------------------- | --------- |
| `additional_mounts()`         | `bool`    |
| `root_filesystem_read_only()` | `bool`    |
| `target_mount_mode()`         | `&'a str` |
| `target_mount_path()`         | `&'a str` |
| `workdir()`                   | `&'a str` |

### HeadlessClaimView

| Method                      | Return            |
| --------------------------- | ----------------- |
| `binding_digest()`          | `&'a str`         |
| `image_index_digest()`      | `Option<&'a str>` |
| `image_manifest_digest()`   | `&'a str`         |
| `installation_ref()`        | `&'a str`         |
| `probe_entrypoint()`        | `&'a str`         |
| `probe_executable_digest()` | `&'a str`         |
| `recipe_digest()`           | `&'a str`         |

### IsolationClaimView

| Method              | Return                        |
| ------------------- | ----------------------------- |
| `ambient()`         | `AmbientClaimView<'a>`        |
| `host_access()`     | `HostAccessClaimView<'a>`     |
| `host_namespaces()` | `HostNamespacesClaimView<'a>` |
| `network()`         | `&'a str`                     |
| `privilege()`       | `PrivilegeClaimView<'a>`      |
| `run_as_gid()`      | `u32`                         |
| `run_as_uid()`      | `u32`                         |
| `seccomp_profile()` | `&'a str`                     |

### AmbientClaimView

| Method          | Return |
| --------------- | ------ |
| `credentials()` | `bool` |
| `environment()` | `bool` |
| `shell()`       | `bool` |

### HostAccessClaimView

| Method                  | Return |
| ----------------------- | ------ |
| `devices()`             | `bool` |
| `docker_socket_mount()` | `bool` |

### HostNamespacesClaimView

| Method      | Return |
| ----------- | ------ |
| `ipc()`     | `bool` |
| `network()` | `bool` |
| `pid()`     | `bool` |

### PrivilegeClaimView

| Method                    | Return |
| ------------------------- | ------ |
| `capabilities_drop_all()` | `bool` |
| `no_new_privileges()`     | `bool` |
| `privileged()`            | `bool` |

### LimitsClaimView

| Method                 | Return |
| ---------------------- | ------ |
| `cpu_millis()`         | `u32`  |
| `memory_bytes()`       | `u64`  |
| `pids()`               | `u32`  |
| `stderr_bytes()`       | `u64`  |
| `stdout_bytes()`       | `u64`  |
| `wall_clock_seconds()` | `u32`  |

### RootManifestV1ClaimView

| Method             | Return                   |
| ------------------ | ------------------------ |
| `administrators()` | `NumberClaims<'a>`       |
| `components()`     | `ComponentClaims<'a>`    |
| `contract_id()`    | `&'a str`                |
| `controller()`     | `IdentityClaimView<'a>`  |
| `image()`          | `ImageClaimView<'a>`     |
| `instance()`       | `InstanceClaimView<'a>`  |
| `kernel()`         | `KernelClaimView<'a>`    |
| `mounts()`         | `MountClaims<'a>`        |
| `recipe_digest()`  | `&'a str`                |
| `schema_version()` | `u32`                    |
| `templates()`      | `TemplatesClaimView<'a>` |

### RootManifestV2ClaimView

| Method             | Return                    |
| ------------------ | ------------------------- |
| `administrators()` | `NumberClaims<'a>`        |
| `components()`     | `ComponentClaims<'a>`     |
| `contract_id()`    | `&'a str`                 |
| `controller()`     | `IdentityClaimView<'a>`   |
| `host_layout()`    | `HostLayoutClaimView<'a>` |
| `image()`          | `ImageClaimView<'a>`      |
| `instance()`       | `InstanceClaimView<'a>`   |
| `kernel()`         | `KernelClaimView<'a>`     |
| `mounts()`         | `MountClaims<'a>`         |
| `recipe_digest()`  | `&'a str`                 |
| `schema_version()` | `u32`                     |
| `templates()`      | `TemplatesClaimView<'a>`  |

### IdentityClaimView

| Method  | Return |
| ------- | ------ |
| `gid()` | `u32`  |
| `uid()` | `u32`  |

### FileRecordClaimView

| Method     | Return    |
| ---------- | --------- |
| `digest()` | `&'a str` |
| `path()`   | `&'a str` |
| `size()`   | `u64`     |

### KernelClaimView

| Method               | Return                    |
| -------------------- | ------------------------- |
| `active_lsms()`      | `TextClaims<'a>`          |
| `artifact()`         | `FileRecordClaimView<'a>` |
| `build_provenance()` | `FileRecordClaimView<'a>` |
| `configuration()`    | `FileRecordClaimView<'a>` |
| `release()`          | `&'a str`                 |
| `source_commit()`    | `&'a str`                 |
| `source_ref()`       | `&'a str`                 |

### ComponentClaimView

| Method               | Return                    |
| -------------------- | ------------------------- |
| `artifact()`         | `FileRecordClaimView<'a>` |
| `build_provenance()` | `FileRecordClaimView<'a>` |
| `role()`             | `&'a str`                 |
| `source_commit()`    | `&'a str`                 |
| `version()`          | `&'a str`                 |

### TemplatesClaimView

| Method              | Return                    |
| ------------------- | ------------------------- |
| `recipe_document()` | `FileRecordClaimView<'a>` |
| `source_commit()`   | `&'a str`                 |

### ExecutableClaimView

| Method           | Return |
| ---------------- | ------ |
| `device_major()` | `u32`  |
| `device_minor()` | `u32`  |
| `inode()`        | `u64`  |

### EndpointClaimView

| Method           | Return    |
| ---------------- | --------- |
| `device_major()` | `u32`     |
| `device_minor()` | `u32`     |
| `inode()`        | `u64`     |
| `path()`         | `&'a str` |

### DirectoryClaimView

| Method           | Return    |
| ---------------- | --------- |
| `device_major()` | `u32`     |
| `device_minor()` | `u32`     |
| `inode()`        | `u64`     |
| `path()`         | `&'a str` |

### MetadataRootsClaimView

| Method                   | Return                   |
| ------------------------ | ------------------------ |
| `container_repository()` | `DirectoryClaimView<'a>` |
| `daemon_root()`          | `DirectoryClaimView<'a>` |
| `dedicated()`            | `bool`                   |
| `policy_id()`            | `&'a str`                |

### InstanceClaimView

| Method                   | Return                       |
| ------------------------ | ---------------------------- |
| `boot_id()`              | `&'a str`                    |
| `daemon_executable()`    | `ExecutableClaimView<'a>`    |
| `daemon_gid()`           | `u32`                        |
| `daemon_pid()`           | `u32`                        |
| `daemon_start_ticks()`   | `u64`                        |
| `daemon_uid()`           | `u32`                        |
| `endpoint()`             | `EndpointClaimView<'a>`      |
| `host_mount_namespace()` | `u64`                        |
| `host_user_namespace()`  | `u64`                        |
| `listener_kind()`        | `&'a str`                    |
| `metadata_roots()`       | `MetadataRootsClaimView<'a>` |

### MountRecordClaimView

| Method                   | Return    |
| ------------------------ | --------- |
| `device_major()`         | `u32`     |
| `device_minor()`         | `u32`     |
| `filesystem_type()`      | `&'a str` |
| `host_mount_namespace()` | `u64`     |
| `idmapped()`             | `bool`    |
| `mount_id()`             | `u64`     |
| `mount_point()`          | `&'a str` |
| `root()`                 | `&'a str` |

### PlatformClaimView

| Method           | Return    |
| ---------------- | --------- |
| `architecture()` | `&'a str` |
| `os()`           | `&'a str` |
| `variant()`      | `&'a str` |

### ImageExecutableClaimView

| Method             | Return                    |
| ------------------ | ------------------------- |
| `container_path()` | `&'a str`                 |
| `snapshot()`       | `FileRecordClaimView<'a>` |

### ImageClaimView

| Method               | Return                            |
| -------------------- | --------------------------------- |
| `adapter()`          | `ImageExecutableClaimView<'a>`    |
| `build_provenance()` | `FileRecordClaimView<'a>`         |
| `config()`           | `FileRecordClaimView<'a>`         |
| `index()`            | `Option<FileRecordClaimView<'a>>` |
| `manifest()`         | `FileRecordClaimView<'a>`         |
| `platform()`         | `PlatformClaimView<'a>`           |
| `probe()`            | `ImageExecutableClaimView<'a>`    |

### HostLayoutClaimView

| Method            | Return                  |
| ----------------- | ----------------------- |
| `cpu_source()`    | `&'a str`               |
| `fixed_masks()`   | `MaskTypeClaims<'a>`    |
| `lookup_policy()` | `&'a str`               |
| `possible_cpus()` | `NumberClaims<'a>`      |
| `readonly_proc()` | `PathTypeClaims<'a>`    |
| `thermal_masks()` | `ThermalTypeClaims<'a>` |

### PathTypeClaimView

| Method          | Return    |
| --------------- | --------- |
| `path()`        | `&'a str` |
| `source_type()` | `&'a str` |

### MaskTypeClaimView

| Method          | Return    |
| --------------- | --------- |
| `mask_kind()`   | `&'a str` |
| `path()`        | `&'a str` |
| `source_type()` | `&'a str` |

### ThermalTypeClaimView

| Method          | Return    |
| --------------- | --------- |
| `cpu_id()`      | `u32`     |
| `source_type()` | `&'a str` |

## Closed collection views

NumberClaims, TextClaims, ComponentClaims, MountClaims, PathTypeClaims,
MaskTypeClaims and ThermalTypeClaims are pub(super), with private slice reference
and the same PhantomData<Rc<()>> marker. No generic public collection, raw nested
record slice or Iterator implementation is exposed. Methods are len() -> usize,
is_empty() -> bool and get(index: usize) -> Option<Item>; an out-of-range get
returns None without allocation or state change. All ordering/bounds are exactly
the existing validated codec arrays, not a new admission ceiling.

Item is u32 for NumberClaims, &'a str for TextClaims, and the corresponding
Component/MountRecord/PathType/MaskType/ThermalTypeClaimView<'a> otherwise.
Image.index preserves Option<FileRecordClaimView<'a>>; profile's required nullable
index preserves Option<&'a str>. Null never becomes missing-field acceptance.
The top-level collections and all nested wrappers are !Clone/!Copy/!Debug/
!Display/!Serialize/!Deserialize/!Send/!Sync; no mutable data is exposed.

## Meaningful acceptance and validation

1. Existing focused profile/root tests and exact v1/v2 goldens continue passing
   unchanged, including explicit-null versus omission and family/cross-family
   denials; no wire/error/bounds/digest compatibility change.
2. A cfg(test)-only sibling consumer demonstrates complete typed access through
   the internal codec API, stable canonical/digest borrows and nullable/collection
   behavior. It creates no public production caller or comparator.
3. Compile-time negative trait assertions guard owned unverified types against
   Clone/Debug/Display/Serialize and every view/collection against the listed
   copying/printing/serialization/thread-transfer traits. Use repository/standard
   mechanisms, no new dependency. Positive/negative trait tests are invariants,
   not manually repeated getter implementations.
4. Tests distinguish v1/v2 surfaces and collection ordering/boundaries; view
   creation reads already validated material and performs no native/storage work.
5. Pinned host Rust format/Clippy and focused tests; docs/public/inventory/history/
   diff checks; full npm run check for meaningful source change; exact local
   scanners on changed source snapshots; fresh independent source/direct-child
   reviews and attestations. No Linux-native proof is claimed from macOS tests.

## Remaining gates

Independent precode review passed before this candidate implementation.
Named source validation and fresh independent implementation/direct-child review
remain required before a reviewed source checkpoint.
The schema-input matrix is separate advisory evidence and can neither construct
CompleteRecipe nor grant code/runtime authority. Real pins, selected registry
policy, confirmed binding admission, pure expected comparison, native current
association/artifact/OCI acquisition, writable custodian, original-budget/
registration/invalidation/retirement/recovery, full native freeze, supported
positive and unfinished-operation Linux evidence, integration and packaging
remain unclosed. LNSAT stays standalone; Rangoon uses ordinary adapters.

No Docker, host mutation, target pressure, credential intake, installs,
artifact capture/build, public/main mutation, release/deploy/production, or
external GLM source transfer is opened.
