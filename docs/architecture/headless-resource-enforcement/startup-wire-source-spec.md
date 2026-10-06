# HCFG-6 Profile and Startup Wire Source Specification

Status: proposed exact source contract; full native/daemon/store freeze and
independent review remain required before behavioral integration.
[Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design)
owns acceptance and implementation truth. This completes the field definitions
referenced by the [native proposal](native-source-spec.md), not runtime proof.
The accepted HCFG-6 intent and Phase 11 source lock are unchanged.

## Common representation

All inputs are bounded UTF-8 JSON. Unknown, duplicate (including escaped-key
duplicates), missing or wrong-type fields deny. Nullable fields are explicitly
listed; no implicit defaults or omitted optional fields. Integers are unsigned
decimal without exponent/fraction/sign, within the stated Rust width. Strings
are exact and never expanded, normalized, shell-interpreted or case-folded.
References use the existing V1 reference validator and a 256-byte ceiling.
Digests are exactly `sha256:` plus 64 lowercase hexadecimal digits. Random
IDs/challenges are exactly 64 lowercase hexadecimal digits from independent
32-byte cryptographic draws; container IDs have the same syntax but come only
from private current daemon inspection. Installation/release IDs are lowercase
hyphenated UUID v4; generation/epoch are positive u64 and attempt sequence is 1.

Canonical JSON uses compact UTF-8 `serde_json` encoding. Object keys sort
lexicographically by their ASCII bytes recursively; arrays preserve the
specified order. Every key below is ASCII. No floating point, generic caller
map or locale-dependent ordering is admitted. Wire frames must equal their
typed canonical re-encoding plus exactly one LF. Profile input may contain
JSON whitespace but its digest uses the canonical object without LF.

Every digest below is SHA-256 of its exact UTF-8 domain, one LF, then the compact
canonical array/object with no trailing LF. This is a new contract; existing
profile 1/2 and D3/D4A encodings/domains remain unchanged.

## Exact schema-3 profile

The top-level fields are exactly:

```text
contract_id, contract_version, schema_version, profile_id, profile_family,
adapter, audience, adapter_executable_digest, image_digest, entrypoint,
filesystem, isolation, limits, engine, headless
```

Values are `contract_id=lnsat.runtime_profile.docker_local.v2`,
`contract_version=lnsat.contracts.v1_0`, `schema_version=3`,
`profile_id=runtime-profile:docker-local:git-reference`, family `docker_local`,
adapter `{"ref":"adapter:docker-local:git-commit","version":"v2"}` and
audience `audience:gateway:local`. The adapter executable digest is independent
of the immutable local OCI config ImageID in `image_digest`. Each profile is
at most 16 KiB. Null is allowed only for `headless.image_index_digest`.

The old schema-2 `supervisor` object is not accepted. This new backend uses
private HTTP over a held Unix stream; it never selects or executes a Docker CLI.
The separate `engine` object has exactly:

| Field                            | Type and meaning                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `endpoint_path`                  | Canonical absolute Linux path, at most 100 UTF-8 bytes; pathname socket only, no URI/environment discovery.                |
| `implementation_manifest_path`   | Canonical absolute path, at most 4,096 bytes, root-provisioned manifest.                                                   |
| `implementation_manifest_digest` | Exact approved root-manifest digest; caller bytes alone never authenticate it.                                             |
| `verifier_git_executable_path`   | Canonical absolute path, at most 4,096 bytes; approved stable host Git executable for later semantic use, never bootstrap. |
| `verifier_git_executable_digest` | Exact installed verifier artifact digest, checked before/after actual use.                                                 |

The [root manifest companion](root-manifest-source-spec.md) defines the
implementation-manifest digest domain and root-controlled custody, recipe
registry, current daemon association and OCI raw-byte parent links. Profile
path/digest fields alone are content expectations, not evidence of root trust.
Its actual pins remain unset and block activation.

The separate `headless` object has exactly:

```text
installation_ref, binding_digest, recipe_digest, probe_entrypoint,
probe_executable_digest, image_manifest_digest, image_index_digest
```

`installation_ref` is the HCFG logical reference, including its required
`installation:` prefix and existing V1 reference grammar; binding/recipe/executable/
manifest digests use the common encoding. `image_index_digest` is required;
explicit null means no selected index, otherwise exact separately verified
index association. The probe entrypoint is absolute, canonical and at most
256 bytes, distinct from the adapter entrypoint. Both actual paths/bytes must
match the separately reviewed immutable image recipe. No sample executable
or image digest is an actual pin.

Filesystem object fields remain exactly `root_filesystem_read_only=true`,
`workdir`, `target_mount_path`, `target_mount_mode=read_write`,
`additional_mounts=false`. Container paths use the existing closed 256-byte
absolute-path validator; workdir equals target mount path and neither overlaps
an immutable entrypoint or reserved built-in mount. Exactly one marked Git
repository bind is available at actual action use; preparation has none.

Isolation fields remain exactly `network=none`, positive non-root u32
`run_as_uid`, `run_as_gid`, and these closed objects:

```text
privilege = {privileged:false, no_new_privileges:true,
             capabilities_drop_all:true}
host_namespaces = {pid:false, ipc:false, network:false}
host_access = {docker_socket_mount:false, devices:false}
ambient = {environment:false, credentials:false, shell:false}
seccomp_profile = runtime_default
```

UID/GID cannot be the undefined Linux ID `4294967295`. Rootful/no-remap uses
the same host user namespace and exact identity map; private PID/IPC/network/
mount/UTS/cgroup/time namespaces are required. The three existing host-namespace
fields do not claim a private user namespace. Image-defined fixed environment
is authenticated by its immutable recipe; no host/agent environment is added.

Limits retain the six exact positive process fields: `memory_bytes` u64
16..512 MiB inclusive, `pids` u32 1..64, `cpu_millis` u32 1..1,000,
`wall_clock_seconds` u32 1..30, `stdout_bytes` u64 1..1 MiB, `stderr_bytes=0`.
These are profile ceilings, not permission or HCFG denied-action limits.
Preparation additionally must fit its fixed separate administrative budget.

Profile domain is `lnsat.hcfg_profile.v3`, followed by canonical complete
profile object. Authority domain is `lnsat.hcfg_profile_authority.v3`, followed
by `[compiled_git_configuration_digest, profile_digest, binding_digest,
recipe_digest]`. The compiled Git capability/configuration floor is reused;
profile or declaration cannot add actions. All field changes affect commitments.

## Exact action and preparation contexts

Action contract is `lnsat.adapter_process.docker_local.v2`, schema 2.
Preparation contract is `lnsat.preparation_probe.docker_local.v1`, schema 1.
Both require `contract_version=lnsat.contracts.v1_0`. Top-level frame fields
are exactly `contract_id`, `contract_version`, `schema_version`, `message_type`,
`context`, `payload`.

Action context fields, in commitment-array order:

```text
installation_id, generation, authority_epoch, operation_id, authorization_id,
attempt_sequence, candidate_digest, profile_digest, recipe_digest,
container_id, channel_id, challenge
```

Preparation context fields, in commitment-array order:

```text
preparation_id, candidate_digest, profile_digest, recipe_digest,
container_id, channel_id, challenge
```

No installation exists during precommit preparation. A preparation frame
containing any installation, generation, epoch, authorization, request or release
field denies. Challenge/channel values are newly drawn by the private host
after exact current object selection, never supplied by an agent. An action
context is bound to the existing consumed durable attempt before any start.

Frame `context` is the closed named object with all the fields listed above,
never a digest string or array. `operation_id` is exactly `opn_` plus 64
lowercase hex digits and `authorization_id` is exactly `xau_` plus 64 lowercase
hex digits, preserving existing durable identities. These are opaque IDs,
not reference strings. The context digest uses a distinct positional projection:
pair each listed name with its frame value, then emit the values in the listed
order as an array. Do not hash the named context object instead.

Context domains are `lnsat.hcfg_startup_context.v2` for action and
`lnsat.hcfg_probe_context.v1` for preparation. Context digest input is
`[contract_id, contract_version, schema_version, [context fields above]]`.
`startup_digest` below is this exact digest; the name introduces no second hash.

## Message payloads and sequencing

| Message               | Exact payload fields                                                                                                                                                 | Frame ceiling including LF |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `startup_challenge`   | `limits`, `startup_digest`                                                                                                                                           | 64 KiB                     |
| `startup_observation` | `startup_digest`, `observation_digest`, `native`                                                                                                                     | 64 KiB                     |
| `action_release`      | `startup_digest`, `observation_digest`, `release_id`, `release_audit_digest`, `execution_request`, `target_digest`, `tool_arguments_digest`, `repository_mount_path` | 8 MiB                      |
| `action_result`       | `release_id`, `release_audit_digest`, `outcome`, `result_digest`                                                                                                     | 64 KiB                     |
| `probe_challenge`     | `limits`, `startup_digest`                                                                                                                                           | 64 KiB                     |
| `probe_observation`   | `startup_digest`, `observation_digest`, `native`, `negative_checks`                                                                                                  | 64 KiB                     |

Limits are exactly `memory_bytes`, `pids`, `cpu_millis`, `wall_clock_millis`,
`stdout_bytes`, `stderr_bytes`, with positive narrowed ceilings and zero stderr.
An action startup and action share the same remaining monotonic deadline and
output/process ceilings; receipt of release cannot reset them. Administrative
preparation uses only its independently fixed resource-free budget. Counts and
allocations include protocol overhead; a valid but too-small action budget
denies before release rather than silently borrowing another budget.

The immutable adapter accepts one challenge, emits one observation and waits
inertly for exactly one matching release. It never parses action arguments
before that release. Early action fields, duplicate frames, unexpected stderr,
stale nonce, context mismatch, pre-release EOF, malformed/oversized/trailing
input and unsupported type deny. A completed result requires a non-null result
digest. `outcome_unknown` requires explicit null and supplies no success. No
other outcome is accepted. A consumed action with ambiguous frame write/result
never receives a replacement attempt or resend.

`execution_request` uses the unchanged closed approved Git request grammar;
the adapter rederives the request, target and tool-argument digests and verifies
the supplied mount path. Private store/gateway authority remains necessary;
wire context/digests and parser success never create authorization.

The preparation executable has no action parser/release state. It accepts only
its separate preparation challenge, emits bounded genuine native facts and
the frozen negative-check results, then exits. No resource mount or target
observation occurs. Exact negative test IDs/procedures and required result
values belong to the immutable probe recipe; unknown or incomplete check sets
deny. No fixture or caller boolean supplies an actual runtime check.

Observation domains are `lnsat.hcfg_startup_observation.v2` and
`lnsat.hcfg_probe_observation.v1`. Inputs are respectively
`[startup_digest,native]` and `[startup_digest,native,negative_checks]`.
Release domain `lnsat.hcfg_action_release.v2` uses
`[startup_digest,observation_digest,release_id,release_audit_digest,
execution_request,target_digest,tool_arguments_digest,repository_mount_path]`.
Result domain `lnsat.hcfg_action_result.v2` uses
`[startup_digest,release_id,release_audit_digest,outcome,result_digest]`.
Every nested object uses the common canonical key ordering. Required nulls
occupy their exact positions. The audit digest cannot be supplied by a client.

## Exact native payload

Native fields are exactly `process`, `namespaces`, `mapping`, `target`,
`mounts`, `devices`, `cgroup`, `security`, `kernel`. These are privately transported
observations from immutable native code, not public diagnostic data or authority.
The frame byte ceiling still applies even when an individual collection is
within its count bound. Unused/missing or unverifiable facts never default.

| Object       | Exact fields and types                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `process`    | `pid` positive u32, `start_ticks` positive u64, `thread_count` u32, `uids` four u32 values, `gids` four u32 values, `groups` sorted unique array of at most 16 u32 values, `cap_inheritable`, `cap_permitted`, `cap_effective`, `cap_bounding`, `cap_ambient` each exactly 16 lowercase hex digits, `no_new_privileges` u32, `seccomp_mode` u32, `scheduler_policy` u32, `executable_digest` digest, `inherited_fds` sorted unique array of at most 16 u32 values, `environment` ordered array defined below. |
| `namespaces` | Exactly `user`, `mount`, `pid`, `ipc`, `network`, `uts`, `cgroup`, `time`; each object is exactly `device` u64, `inode` positive u64 from genuine namespace link metadata.                                                                                                                                                                                                                                                                                                                                    |
| `mapping`    | Exactly `uid_map`, `gid_map`; each array contains at most eight triples `[inside_u32,outside_u32,length_u64]`.                                                                                                                                                                                                                                                                                                                                                                                                |
| `target`     | Required null for preparation; action requires exact object `mount_path`, `device` u64, `inode` positive u64, `owner_uid` u32, `owner_gid` u32, `mount_id` positive u64, `descriptor_cloexec` boolean, `descriptor_access` string.                                                                                                                                                                                                                                                                            |
| `mounts`     | Array of at most 128 mount records defined below, sorted by mount ID without duplicates.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `devices`    | Array of at most 32 records, sorted by canonical `path` at most 256 bytes. Each record has exactly `path`, `type` (`character` or `symlink`), `major` u32, `minor` u32, `mode` u32, `uid` u32, `gid` u32, `link_target` required nullable string at most 256 bytes. A character node has null link target; a symlink has zero major/minor and its exact unexpanded relative or approved procfs target.                                                                                                        |
| `cgroup`     | `membership_path` canonical absolute cgroup path at most 4,096 bytes, `mount_id` positive u64, `directory_device` u64, `directory_inode` positive u64, `controllers` sorted unique array at most 16 ASCII names of at most 32 bytes, `cpu_quota` positive u64, `cpu_period` positive u64, `cpu_burst` u64, `memory_max` positive u64, `memory_swap_max` u64, `memory_oom_group` u32, `pids_max` positive u64.                                                                                                 |
| `security`   | `apparmor_label` at most 256 UTF-8 bytes, `network_interfaces` sorted unique array of at most 16 names of at most 32 bytes, `security_recipe_digest` digest.                                                                                                                                                                                                                                                                                                                                                  |
| `kernel`     | `boot_id` canonical lowercase boot UUID, `kernel_recipe_digest` digest, `procfs_device` u64, `cgroupfs_device` u64.                                                                                                                                                                                                                                                                                                                                                                                           |

Each mount record contains exactly `mount_id` positive u64, `parent_id` u64,
`device_major` u32, `device_minor` u32, `root` and `mount_point` canonical
absolute paths each at most 4,096 bytes, `mount_options` sorted unique ASCII
strings, `optional_fields` sorted unique ASCII strings, `filesystem_type`,
`mount_source`, `super_options` sorted unique ASCII strings. Option arrays have
at most 64 entries of at most 256 bytes; filesystem type is at most 32 ASCII
bytes and source at most 4,096 UTF-8 bytes. Procfs octal path escapes are decoded
before canonical validation; no NUL/control byte, invalid UTF-8 or traversal.
Raw mountinfo text is never used as a commitment or public response.

`process.environment` contains at most 16 strings and at most 4,096 UTF-8 bytes
total. Each is one `KEY=value`: KEY matches `[A-Z][A-Z0-9_]{0,63}`, value is at
most 1,024 bytes with no NUL/control characters; keys are unique. Preserve
the observed initial order rather than sorting. The immutable adapter observes
its own initial environment before mutation or children; host comparison uses
the exact [realized recipe](realized-recipe-source-spec.md#fixed-image-and-actual-process-environment),
including Docker's inserted HOSTNAME. Caller fields or Inspect Config.Env are
not substitutes. Synthetic empty arrays may test decoding but fail this recipe.

Preparation `negative_checks` uses the exact five-record ordered `id,errno`
grammar and native procedures in the
[realized recipe](realized-recipe-source-spec.md#finite-non-destructive-preparation-probes).
Unknown/incomplete/reordered sets deny. The array is private challenged native
output; no copied successful result can create authority. Cgroup pressure proof
and full-freeze approval remain separate requirements.

Source decoder success does not establish that any fact was observed. The
private observer must authenticate the exact image/executable/channel/container
and derive/compare current host and daemon facts before any guard exists.
The supported positive case requires PID 1 and one startup thread, all four
UID/GID values equal the selected nonzero owner, groups exactly one copy of
that same primary GID (no distinct supplementary GID), all five
capability masks zero, NoNewPrivs 1, Seccomp 2, scheduler policy 0 and inherited
descriptors exactly `[0,1,2]` before opening observer handles. Exactly
one full identity UID/GID map `[0,0,4294967295]`, with host-shared user namespace
and private execution namespaces, rejects rootless/remapping. The action target
descriptor is close-on-exec `read_only_metadata`; host/adapter device/inode and
one approved nonrecursive writable target mount agree. Preparation target is
null and has no resource bind.

Controllers are derived from successfully associated required controller
files, not from the leaf's `cgroup.controllers` (which can legitimately be
empty). They must include CPU, memory and PIDs under the exact reviewed recipe;
finite current cgroup association and ceilings are independently compared.
Require `cpu_burst=0`, `memory_swap_max=0`, `memory_oom_group=0`, checked bandwidth arithmetic, exact
profile/recipe association and unchanged process/namespace/cgroup tokens before
release. Kernel mode, a copied digest or configured Docker field alone fails.
Default AppArmor is observed in enforce mode; exact label formatting and every
built-in mount/device match the immutable recipe. No inferred filter hash.

## Rust privacy and validation

Wire DTOs and input codecs are private, strict and explicitly unverified.
Actual native observation is private to the held same-host backend. A successful
parse must not construct a live guard, bootstrap record, release ID, audit row
or cleanup proof. Authority guards have no Clone, Debug, Serialize, Deserialize
or caller constructor; they own current custody and are consumed once.
Raw frames, target paths, environment, native metadata and request bytes remain
private/zeroized where retained; fixed static error codes contain no input.

Before implementation, freeze independent canonical golden vectors for both
contexts, profile/index-null semantics, observations and release/result, then
review them with the complete native/daemon/store freeze. Source tests must
cover escaped duplicate keys, alternate ordering, all unknown/missing/null/type
cases, integer/collection/byte limits, startup/action budget continuity,
cross-context/container/challenge substitutions, framing truncation and replay.
Actual Linux/daemon/probe/selected-target negatives remain separate proof.

## Stage-A private schema-3 profile codec contract

The human-accepted [Stage-A source order](source-freeze-staging-decision.md)
allows this exact independently reviewed inert prerequisite before the complete
integration freeze. The earlier whole-wire freeze requirement remains mandatory
for integration; it does not prohibit this disconnected profile-only candidate.
[Project Status](../../PROJECT_STATUS.md#stage-a-private-schema-3-profile-codec)
owns its disposition. This contract does not open startup/preparation/action
frames, native observation, root trust, registration or a product caller.

Source ownership is limited to new private `crates/lnsatd/src/headless_profile.rs`
and `headless_profile_tests.rs`, with one private declaration in `lib.rs`.
The existing schema-1/2 runtime profile, its loaders, CLI behavior, store schema,
native reader and locked Phase 11 source remain unchanged. No dependency or
feature change is needed. The controller owns this contract, Project Status,
the existing plan/build-sequence links and generated review metadata.

The candidate accepts borrowed bytes and returns a module-private unverified
profile containing validated declarations and their two commitments. It performs
no I/O and cannot construct or expose a guard, credential, active installation,
observer, release, audit or authority token. Neither profile types nor parse
functions are exported outside this private module. Retained input strings and
canonical buffers use zeroizing storage; they have no `Debug`, `Display` or
logging path. Borrowed caller input, serde's transient internal buffers and
allocator behavior are not claimed to be securely erased. This is bounded
representation validation, not a fallible-allocation or hard-time guarantee.

The 16-KiB inclusive input ceiling is checked before UTF-8/JSON parsing. Typed
closed deserialization rejects unknown, missing, duplicate and escaped-duplicate
keys at every object, trailing JSON, wrong types and unexpected nulls. Typed
unsigned numbers reject signed (including negative zero), fraction and exponent
spellings as well as overflow. The required nullable index uses explicit field
presence: an omitted index must never deserialize as its allowed explicit null.
The exact constants, ranges, non-root IDs, digests and reference grammar above
apply. Valid input ordering, JSON whitespace and equivalent JSON string escapes
do not change the canonical digest. Public schema-1/2 parsers are not reused or
silently widened.

All path checks use platform-independent Linux lexical rules: leading slash,
non-root path, byte ceiling, no backslash, NUL, ASCII control, empty component,
trailing slash, `.` or `..` component. They do not resolve or inspect any path.
The filesystem workdir and target must be identical. Component-wise overlap
means equality or either path being an ancestor of the other at a slash boundary;
string-prefix adjacency such as `/work` and `/work-copy` does not overlap.
The target must overlap neither immutable entrypoint nor the finite reserved
roots `/proc`, `/dev`, `/sys`, `/etc/hosts`, `/etc/hostname`, `/etc/resolv.conf`
from the [realized mount contract](realized-recipe-source-spec.md#mount-accounting-algorithm).
The container root mount `/` is deliberately not in that exclusion set because
every valid target lies beneath it; lexical root itself is already denied.
Readonly/mask overlays and forbidden shm are covered by their reserved roots.
Probe and adapter entrypoints must differ. Any additional immutable recipe
layout checks, actual object type and resource/daemon association remain future
native/recipe checks; lexical acceptance supplies none of them.

Canonical encoding serializes only the closed validated typed profile, with
every object's fields in ASCII lexical order, no whitespace or trailing LF.
Its output is also capped at 16 KiB; no generic untrusted JSON object survives
parsing. The profile domain and complete object are exactly as specified above.
The private production parser obtains the Git configuration floor only from
`lnsat_store::phase7_git_adapter_configuration_digest_v1`; callers cannot supply
an alternate floor. The authority-domain hash is an unverified configuration
commitment, not proof of authorization. A private hash helper may take a
synthetic floor inside tests for the already published golden vectors. It is
not exported or connected to a product entrypoint.

Errors are a finite private enum with input-free classifications for input size,
JSON/UTF-8 shape, semantic constraints and canonical encoding. Raw parser errors,
paths, digests and field values are never returned or logged. No successful parse
converts a declared limit, expected digest or synthetic pin into runtime evidence.

Before source, fresh independent review covers this contract and independently
recomputes both existing [profile vectors](startup-golden-vectors.md#schema-3-profile-inputs).
Source tests cover both positive vectors, production floor derivation, whitespace/
ordering/escape invariance, invalid UTF-8 and trailing JSON, exactly 16 KiB and
one byte above it (including size-before-UTF-8 error precedence), required-null
presence, every object's missing/unknown/duplicate/null/type cases, numeric
lexical/range boundaries, the HCFG installation-reference prefix and
reference/digest/path ceilings, each reserved overlap
and component adjacency, target overlap with each immutable entrypoint in both
ancestor directions and equality, probe/adapter equality, exact profile
constants, canonical byte limits and commitment changes for accepted field changes.
Focused pinned Rust tests, formatting and strict Clippy precede `npm run check`,
docs/public/inventory/history checks, installed audit tools and fresh independent
exact-source/direct-child attestations. Rollback is an inert-source revert, with
no runtime cleanup or data migration. Actual Linux reader evidence, complete
native/wire/daemon/store/pin freeze, artifact capture, integration and activation
remain separate unsatisfied gates.

## Stage-A private context and challenge codec contract

This independently reviewed prerequisite follows the accepted
[Stage-A source order](source-freeze-staging-decision.md). The canonical work
record is [Project Status](../../PROJECT_STATUS.md#stage-a-private-context-and-challenge-codec).
It implements representation and self-consistency only. It cannot authenticate
host input, challenge freshness, daemon association, a consumed attempt, profile
narrowing, clock continuity, native observations or execution authority.

### Exact ownership and interface

Owned source is new private `crates/lnsatd/src/headless_startup_challenge.rs`,
`headless_startup_challenge_tests.rs`, and one private module declaration in
`lib.rs`. Existing profile, adapter process, supervisor, native, journal and
store code, dependencies, features, CLI and locked Phase 11 source stay intact.
The controller owns this section, its Status record, existing plan/build links
and generated review metadata. No registration or product caller is introduced.

Two private entrypoints decode a borrowed complete byte frame:
`decode_action_challenge` and `decode_preparation_challenge`. Each returns its
own sealed unverified declaration, retaining its typed context and represented
limits privately, canonical frame bytes and recomputed context digest. The
outputs have no public constructor, `Debug`, `Clone`, serialization
or authority conversion. Internal closed structs may derive Serde for decoding
and canonical encoding. Retained input-derived strings, canonical frames and
temporary commitment buffers use the existing zeroizing owner. No I/O, clock,
random source, thread, observer, session, store or process operation is performed.
No generic message dispatcher, observation, release, result or action parser is
part of this slice.

### Exact grammar and ordered denial

Each entrypoint accepts only its exact contract/version/schema/message tuple
from the contexts and payload table above. There is no fallback or negotiation.
Action accepts only `startup_challenge`; preparation only `probe_challenge`.
Top-level, context, payload and limits must all be closed named JSON objects.
No omitted, unknown, duplicate (including escaped duplicate), positional-array,
null or wrong-type field is accepted at any level. There are no nullable fields.
The action and preparation contexts use precisely their listed fields; in
particular preparation has no installation, generation, epoch or action identity.

Apply these deterministic private denial stages in order:

1. `input_too_large`: reject more than 65,536 bytes before parsing or copying.
2. `framing`: require one final LF, with no earlier literal LF or CR anywhere.
3. `json_shape`: decode the entire remaining UTF-8 JSON value into closed typed
   structs; unknown, duplicate, missing, null, type and trailing-value errors deny.
4. `family`: require the exact entrypoint's contract/version/schema/message tuple.
5. `context`: check all context identity, digest and integer predicates below,
   including the payload `startup_digest` syntax.
6. `limits`: check the represented finite ceilings below.
7. `binding`: recompute the domain-separated ordered context digest and require
   exact equality with the payload's syntactically valid `startup_digest`.
8. `canonical`: require the complete input to equal typed compact ASCII-key-sorted
   re-encoding plus its one LF. Serialization failure uses this same code.

Codes use the fixed `headless_challenge.` prefix and carry no input, field value,
path, raw error text or suggested retry. A noncanonical positional array can be
rejected during shape decoding or final canonical comparison; it never returns
an output. Earlier stages otherwise determine precedence. JSON whitespace,
reordered keys, escaped alternate spellings, BOM, exponent/fraction/signed
numbers and trailing bytes cannot equal the required canonical frame.

`installation_id` must be a 36-byte lowercase hyphenated UUID with version nibble
`4` and RFC variant nibble `8`, `9`, `a` or `b`. `generation` and `authority_epoch`
are positive u64; `attempt_sequence` is u32 exactly 1. Action operation and
authorization IDs retain their exact `opn_`/`xau_` plus 64 lowercase hex syntax.
`preparation_id`, `container_id`, `channel_id` and `challenge` are each exactly
64 lowercase hex characters. All three context digests and `startup_digest`
are exactly `sha256:` plus 64 lowercase hex characters. Parsing these strings
proves no randomness or current object association. A preparation container
exists after private creation and before installation commit; only later private
daemon inspection may supply its trusted identity.

The six represented limits use u64 for memory/stdout/stderr and u32 for
pids/CPU/wall-clock. Their syntax bounds are `memory_bytes=1..536870912`,
`pids=1..64`, `cpu_millis=1..1000`, `wall_clock_millis=1..30000`,
`stdout_bytes=1..1048576` and `stderr_bytes=0`, inclusive. These maxima follow
the schema-3 profile ceilings; a narrowed action value may be smaller than the
profile's creation minimum. They do not compare against a selected profile or
establish enough budget to start. The same finite representation is used for
preparation; actual preparation must separately equal the immutable recipe's
10,000 ms, 67,108,864 memory bytes, 16 tasks, 250 millicores, 65,536 stdout bytes
and zero stderr, and fit its selected profile. The existing one-byte-stdout
vectors remain accepted syntax fixtures, never admission positives. Shared
remaining time, startup/output overhead and fixed preparation feasibility remain
mandatory integration checks; decoding supplies no usable budget or permission.

A changed context with the old digest denies. A fully recomputed self-consistent
context can decode as a new unverified declaration. Detecting replay, stale
nonces or substitution relative to trusted host state requires that future state
and is not claimed here. Limits are outside the context digest by the existing
wire contract; changing valid limits preserves that digest. Later authenticated
channel/profile/budget checks must bind their actual values before use.

### Required source evidence

Independently reproduce both published context digests and exact 1,189/984-byte
LF-inclusive challenge vectors. Add a preparation syntax vector with the fixed
recipe limits; it still proves no runnable positive. Verify encode/decode byte
identity and absence of authority conversion. For every action and preparation
context field, change one valid value, prove old-digest denial and a changed
recomputed commitment; fixed attempt sequence is instead covered by denial.
Check limits changes leave the context digest unchanged and remain unverified.

Exercise both entrypoints against all other contract/schema/version/message
combinations, cross-family frames, all other message types, every nested object's
missing/unknown/duplicate/escaped-duplicate/null/wrong-type/positional-array
cases, invalid UTF-8, every truncation and forbidden raw control byte, CRLF,
extra LF, no LF, trailing JSON, reordered keys and escape/number alternatives.
Test the inclusive 65,536-byte preparse cap and 65,537-byte denial without calling
a padded invalid frame a positive. Cover exact integer widths/range endpoints,
overflow, zero/sign/fraction/exponent forms, UUID version/variant/case/separators,
prefix/hex lengths, uppercase/nonhex/Unicode identities and digest substitution.
Finite fixed errors must never reflect a supplied marker.

Run focused pinned host tests, strict host Clippy/formatting, `npm run check`,
docs/public/inventory/history/diff checks and installed scoped source audits.
Fresh independent precode and source review plus exact source/direct-child
attestations are separate gates. No host check closes native Linux evidence,
complete source/pin freeze, actual activation/runtime, SDK or package readiness.

## Stage-A private observation, release and result codecs

This inert prerequisite follows the accepted [Stage-A source order](source-freeze-staging-decision.md).
[Project Status](../../PROJECT_STATUS.md#stage-a-private-startup-message-codecs)
owns its implementation and review disposition. It completes the remaining
supplied-byte message representations after the existing context/challenge
candidate. It is not a protocol state machine, native observer, trusted release
barrier, adapter, store method or product integration. Fresh independent exact
precode review is required before implementing the named source.

### Ownership, reuse and privacy

Owned new files are `crates/lnsatd/src/headless_startup_messages.rs`,
`headless_startup_native.rs`, `headless_startup_release.rs` and
`headless_startup_messages_tests.rs`. The only change to existing
`headless_startup_challenge.rs` is a private child-module declaration for
`messages`. That child may reuse its parent's exact context structs, context
validators/digests, map-only deserializer and digest-text helper. Native/release
helpers remain private within that child subtree. Existing challenge functions,
profile/native/daemon/store/contracts/Phase 11 source, dependencies and features
are unchanged. There is no generic public dispatcher or successful observer
constructor.

The parent declaration is exactly
`#[path = "headless_startup_messages.rs"] mod messages;`. Inside that new file,
use `#[path = "headless_startup_native.rs"] mod native;` and
`#[path = "headless_startup_release.rs"] mod release;`, plus
`#[cfg(test)] #[path = "headless_startup_messages_tests.rs"] mod tests;`.
These explicit relative paths select the four owned root-level source files;
there is no default nested directory, exported module or `lib.rs` edit.

Four separate private entrypoints take a complete borrowed frame:
`decode_action_observation`, `decode_preparation_observation`,
`decode_action_release` and `decode_action_result`. Each returns its own sealed
unverified result, with typed context/payload, canonical frame, recomputed
context digest and message commitment. Outputs have no `Debug`, `Clone`, public
constructor, serialization or authority conversion. Internal closed DTOs may
serialize solely for canonicalization. Input-derived retained strings, canonical
frames, patch bytes and temporary commitment buffers use zeroizing owners.
Borrowed input, serde scratch and temporary allocations inside the unchanged
shared execution-request parser are outside that erasure claim. No raw input,
request, environment, target path or parser error may be logged or returned.

No I/O, native read, clock, randomness, thread, process, network, store or
credential operation is permitted. A successful parse proves representation
and internal commitment consistency only. In particular, a release parser is
not an authenticated release: it has no trusted expected context, consumed
attempt, channel or audit provenance. Before a future adapter invokes any
request-decoding method, its independently reviewed sequence/channel/context
barrier must admit that exact release. This source candidate supplies none of
that barrier and must stay disconnected from a runnable adapter.

### Common bounds and deterministic errors

Observation and result frames have an inclusive 65,536-byte ceiling; the release
ceiling is 8,388,608 bytes, including its single terminal LF. Reject excess
before copying/parsing. Require one final LF and no earlier literal LF or CR.
Escaped newlines inside the approved patch/commit message remain ordinary JSON
string content. Validate strict UTF-8 and an allocation-free JSON preflight
before owned typed decoding. Reject BOM, trailing values, incomplete values,
malformed JSON numbers/escapes/surrogates and raw string controls.

Preflight bounds decoded keys to 1..256 UTF-8 bytes, ordinary string values to
4,096 bytes, object depth to 32 with the root at one, each object to 64 members,
total object members to 4,096 and each array to 128 elements. The sole larger
string path is `payload.execution_request.action.arguments.patch` in the release
entrypoint: at most 1,048,576 decoded UTF-8 bytes. Recognize decoded keys through
fixed bounded storage; escaped equivalents get the same limit. Wrong path,
case, extra nesting or array substitution must not inherit it. Apply all caps
before growing an owned value, even in branches that later fail shape checks.
No generic retained JSON tree, dynamic parsing stack or recursive skip accepts
unmodeled fields.

Typed decoding requires closed maps at every object position, including every
execution-request child. Reject unknown/missing/duplicate/escaped-duplicate
keys, positional arrays, wrong types and null except the named required-null
fields. Use explicit presence for nullable target, device link target and
result digest. Every integer uses the specified unsigned Rust width and exact
unsigned decimal spelling; negative zero, signs, fractions, exponents and
overflow deny. No defaults or implicit presence conversions are allowed.

Private fixed errors use `headless_message.` with this ordered staging:

1. `input_too_large`: entrypoint byte ceiling;
2. `framing`: exact LF/CR rules;
3. `json_syntax`: UTF-8 and lexical/structural JSON syntax;
4. `json_limits`: preflight bounds;
5. `json_shape`: complete typed shape, presence, duplicate, type and numeric
   spelling/range failures;
6. `family`: exact entrypoint contract/version/schema/message tuple;
7. `context`: parent context predicates plus outer payload digest/release-UUID
   syntax; embedded native/request identity syntax belongs to payload validation;
8. `payload`: native representation constraints, probe-check set, release Git
   grammar and result outcome/null relationship;
9. `binding`: recomputed startup/observation, target, patch or tool-argument
   commitment mismatch;
10. `canonical`: serialization failure or inequality with typed compact
    ASCII-key-sorted encoding plus one LF.

Within preflight the first left-to-right syntax/limit failure wins, after UTF-8
validation. Later stages run only after earlier stages pass. The entrypoints
return no partial result and no raw field names, values, offsets or retry advice.
A wrong-type Git child is shape failure; a well-typed invalid Git field is payload
failure; a well-formed but wrong digest is binding failure. Fixed errors do not
imply that a released action did or did not execute.

### Observations and native representation

Use the exact action/preparation envelope and contexts above. Action accepts
only `startup_observation`; preparation accepts only `probe_observation`.
Both validate payload startup digest against the parent context commitment.
Native DTOs contain every field in the existing exact-native-payload table;
all nested keys serialize in ASCII order. Apply its field widths/counts and
these lexical rules without reading or resolving a path:

- PID/start ticks, namespace/target/cgroup inode, target/mount/cgroup mount ID,
  CPU quota/period, memory maximum and task maximum are positive as already
  specified. Remaining u32/u64 facts retain their stated representation range;
  parsing does not enforce selected UID, actual kernel state or a profile.
- UID/GID arrays have exactly four elements. Namespace map has exactly eight
  named objects. Capability masks have exactly 16 lowercase hex digits.
  Groups, inherited FDs, controller/interface names and mount option arrays
  are strictly sorted and duplicate-free; mounts are strictly increasing by
  mount ID and devices by path. Mapping rows have exactly three integers with
  first/second u32 and third u64; each map has at most eight rows. Mapping
  coverage and the exact identity-map predicate remain later native comparison.
- Linux absolute paths start with `/`, have no backslash, NUL/control byte,
  empty interior component, trailing slash, `.` or `..` component. Root `/` is
  allowed for mount root/mount point and cgroup membership only. Use the existing
  256/4,096-byte field ceilings; target mount path is non-root and at most 256.
  Mount strings are already decoded wire facts: do not interpret procfs escapes
  again. Mount source has at most 4,096 UTF-8 bytes and no NUL/control characters.
- ASCII names/options are nonempty printable bytes `0x21..0x7e` within their
  respective 32/256-byte ceilings. AppArmor label allows bounded UTF-8 without
  NUL/control characters. Boot UUID is lowercase hyphenated 8-4-4-4-12 hex;
  its syntax alone supplies no boot association or randomness proof.
- Device `type` is exactly `character` or `symlink`. Character link target is
  explicitly null. Symlink has zero major/minor and a nonempty target: a
  canonical relative path, or exactly `/proc/self/fd`, `/proc/self/fd/0`,
  `/proc/self/fd/1`, `/proc/self/fd/2` or `/proc/kcore`. Path-to-target inventory,
  node ownership/mode and current type remain later recipe comparisons.
- Environment preserves observed order; at most 16 entries, total at most 4,096
  UTF-8 bytes, unique keys matching `[A-Z][A-Z0-9_]{0,63}` and values at most
  1,024 bytes without NUL/control characters. Empty values are permitted.
- Preparation requires explicit native target null; action requires its closed
  non-null target object. `descriptor_access` is a nonempty printable ASCII
  string at most 32 bytes. The selected `read_only_metadata` value, CLOEXEC and
  cross-observer identity still need actual native comparison.

Preparation checks have exactly the five ordered closed `id,errno` records in
[the existing probe recipe](realized-recipe-source-spec.md#finite-non-destructive-preparation-probes).
Errno is u32: `1,1,1,13|30,101` respectively. No missing, extra, duplicate or
reordered record passes. Synthetic matching values remain unverified assertions;
the parser never calls any sentinel or reports that it observed a denial.

Recompute the exact existing action/preparation observation domains and ordered
arrays above, compare the supplied observation digest, and retain the computed
commitment. Do not perform recipe acceptance, mount association, privileged
state inference, present/absent ACL classification or authentic observation
construction. Empty bounded collections can be representation fixtures without
being feasible selected-recipe positives.

### Release request representation and legacy compatibility

Release accepts only the action contract and `action_release`. Payload fields
and release commitment array are exactly the existing table. Release ID is UUID
v4, release audit digest is syntactically bounded, and startup digest must equal
the context commitment. Observation digest remains an unverified asserted link;
this standalone parser has no trusted prior observation. Repository mount path
uses the non-root Linux lexical rule above, with a 256-byte ceiling. Profile,
actual mount, audit and attempt binding remain integration requirements.

`execution_request` must use the unchanged closed execution-request envelope in
`lnsat_contracts::parse_canonical_execution_request_v1`. Decode its complete
shape into private typed zeroizing DTOs first, including packet/policy/approval
references, action, target, adapter and commit metadata; canonicalize that typed
object in zeroizing storage and call the existing pure parser. It supplies
request/target/action/configuration/executable commitments and generic identity,
reference, schema and timestamp checks; it proves no approved chain. References
also retain the common 256-byte wire ceiling. Do not retain a generic caller
map or accept a generic action/target grammar. Temporary shared-parser output
must be dropped before return; no raw error escapes.

The selected private release requires adapter ref
`adapter:docker-local:git-commit`, version `v2`, audience
`audience:gateway:local`, and action kind `git.commit`. The existing
`phase7_git_tool_arguments_digest_v1` cannot validate this directly: its internal
Git parser requires adapter `v1`. Preserve that helper and all legacy dispatch
source. Do not rewrite a v2 request to v1 or reinterpret a v1 request as v2.
Instead this private source implements the same finite Git field predicates and
length-framed tool-argument digest below, against the syntactically valid typed v2 request.

Action arguments are exactly `schema_id`, `base_commit_oid`, `head_ref`,
`allowed_paths`, `patch_sha256`, `patch`, `expected_tree_oid`, `commit_metadata`.
Require schema `lnsat.git_commit_action.schema.v1`. Unlike the optional
out-of-band-patch legacy branch, an immutable v2 adapter has no separate patch
input: `patch` is a required nonempty UTF-8 string of at most 1,048,576 bytes,
whose SHA-256 must equal `patch_sha256`. No host patch read is introduced.
OIDs are exactly 40 lowercase hex digits. Head ref starts `refs/heads/`, is at
most 256 bytes, uses ASCII alphanumeric or `/-_.`, contains no `..`, and ends
with neither `.` nor `/`. Allowed paths are 1..64 strictly sorted unique
canonical relative Linux paths, each at most 512 bytes, with no backslash, NUL,
control byte, empty/`.`/`..` component or trailing slash, and never the exact
`.lnsat-disposable-git-fixture-v1` marker. This is the canonical selected Linux
subset; no filesystem observation or legacy-validator widening follows.

Commit metadata has exactly message, author_name, author_email, author_time,
committer_name, committer_email, committer_time. Message is nonempty, at most
4,096 UTF-8 bytes, ends LF and contains no NUL. Names/emails are 1..256 bytes
without LF/CR/NUL/`<`/`>`; emails contain `@`. Times are 1..12 ASCII decimal
seconds, one space and exact `+0000`. Retain these exact legacy content
predicates; no OS clock or process execution is involved.

Target identity is exactly `schema_id`, `repository_path`, `git_dir_path`,
`object_format`, `head_ref`, `base_commit_oid`, `fixture_marker_sha256`.
Require schema `lnsat.disposable_git_repository.schema.v1`, `object_format=sha1`,
non-root canonical absolute Linux paths at most 4,096 bytes, syntactic marker
digest, and head/base equality with the action. Target resource ref must equal
the request resource ref. Shared request parsing retains its schema/reference/
time rules. Neither path is opened, nor does this establish target custody.

Tool-argument digest uses exact domain
`lnsat.git-reference-adapter.tool-arguments.v1`, one NUL byte, then each field
as a four-byte big-endian byte length followed by its UTF-8 bytes, in this order:
repository path, Git-dir path, object format, head ref, base OID, marker digest,
expected tree OID, allowed paths joined by one NUL with no terminal NUL, patch
digest, message, author name/email/time and committer name/email/time. All
lengths must fit u32; no saturated conversion is accepted. This is the existing
domain/algorithm, not the newline/canonical-JSON convention used by startup
message commitments. Require supplied target and tool-argument digests to equal
the recomputed values. The v2 request retains its real request digest throughout.

### Result representation and source evidence

Result accepts only the action contract and `action_result`; its payload has
exactly release ID, release audit digest, outcome and required result digest.
UUID/digest syntax applies. `completed` requires non-null digest;
`outcome_unknown` requires explicit null. Reject other outcomes or missing/null
substitutions. Derive startup digest from context for the result-domain array;
there is no extra payload startup-digest field. Retain the resulting message
commitment separately from the payload consequence digest. Neither is a receipt
or proof of consequence, cleanup, delivery or authorized release.

Independent canonical vectors must cover action observation, both permitted
probe errno variants, synthetic v2 closed-request release, completed result and
unknown result. Independently reconstruct existing action-observation/result
commitments. The older release example in startup-golden-vectors is retained as
a hash-only example and explicit decoder-negative: its local/v1 adapter,
noncanonical packet ID and generic action/target are not this release grammar.
Do not relabel its digest as a v2 acceptance positive. A v1 counterpart of a new
synthetic v2 request may be independently constructed in tests solely to compare
the unchanged shared tool-digest algorithm; production never rewrites versions.

Tests must cover each nested map's every required member, unknown/duplicate/
escaped duplicate/null/type/positional-array denial; all family/context changes;
all required-null distinctions; numeric spelling/width and positive endpoints;
all native count/order/uniqueness/path/environment boundaries; probe-check order
and errno set; exact release grammar and every Git field predicate; patch hash,
target/tool/context/observation drift; both result outcomes; whole-frame
truncation, malformed UTF-8/escapes/numbers, terminal framing and canonical
ordering/escape differences. Every valid changed context/payload must change the
appropriate recomputed commitment; a self-consistent replacement stays an
unverified declaration, not detected replay or a trusted state transition.

Exercise byte/depth/member/array/key/string limits at and above their inclusive
caps with no earlier cap masking the intended assertion. Include secret canaries
and deterministic error-precedence cases. No padded invalid frame is called a
successful limit positive. Preserve all existing challenge tests. Focused pinned
host tests, format, strict Clippy, full `npm run check`, scoped installed scanners,
docs/public/inventory/history/diff checks and fresh exact source/direct-child
review are required. Actual source freeze, native/probe/daemon evidence, store
release/revocation, shared budget, replay resistance and complete runtime sequence
remain separate mandatory work. LNSAT remains neutral; Rangoon uses the same
engine contracts.
