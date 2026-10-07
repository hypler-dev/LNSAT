# Stage-A versioned root host-layout declaration

Status: implemented private Stage-A source contract; synthetic evidence only.
[Project Status](../../PROJECT_STATUS.md#stage-a-versioned-root-host-layout-declaration)
owns acceptance and implementation truth; Phase 11 owns runtime proof.
This specifies one necessary representation prerequisite, not the
complete immutable recipe, independent installation selector, native association,
whole-boundary freeze, runtime or V1 completion.

## Gap and compatibility

The realized recipe requires current daemon-cached thermal masks and original
path types. The implemented root declaration v1 has no such record. Its
recipe digest selects static predicates; it cannot authenticate an unrepresented
current cache. The exact pinned Moby defaults use a once-per-process value,
append thermal paths in PossibleCPU order and silently omit every failed Stat.
PossibleCPU itself can fall back to a runtime CPU count. Neither failure branch
is permitted by the selected positive recipe below.

Preserve the current v1 decoder, body, commitment, errors and golden vectors.
Do not accept a layout member in v1. The new supplied-body candidate has a
distinct private entrypoint and exact family; there is no automatic dispatch,
version range, downgrade, fallback or product caller. Future composition must
choose the expected family from independently selected policy before decode.

## Exact family and body

New family: `lnsat.hcfg_root_implementation_manifest.v2`, `schema_version=2`.
The top-level body has exactly the existing v1 fields plus mandatory
`host_layout`. Existing common records and value grammars remain identical.
All v1 optionality remains unchanged: only `image.index` is explicitly nullable.
No host-layout field accepts null, omission, unknown or duplicate member,
positional array, alternate number syntax or trailing data.

`host_layout` has exactly these six members:

| Member          | Exact representation and validation                                                                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cpu_source`    | String exactly `sysfs_possible`. Root asserts the current daemon's cached PossibleCPU value came from a successful parse of `/sys/devices/system/cpu/possible`, without the runtime.NumCPU fallback.                                                                   |
| `lookup_policy` | String exactly `present_directory_or_enoent`. Root asserts every possible-CPU thermal lookup when the daemon cache was established either found the selected genuine directory or returned actual ENOENT. Other omitted Stat errors are ineligible.                    |
| `possible_cpus` | Array of 1..64 u32 IDs, each 0..65535, strictly increasing. It is the cached successful expansion in source order, including offline-but-possible CPUs. No gaps are filled, range text interpreted, truncation, deduplication or reordering performed by this decoder. |
| `readonly_proc` | Exactly five PathType records in the fixed source order below.                                                                                                                                                                                                         |
| `fixed_masks`   | Exactly twelve MaskType records in the fixed source order below.                                                                                                                                                                                                       |
| `thermal_masks` | Array of 0..64 ThermalType records in strictly increasing cpu_id order, every ID appearing in possible_cpus. Zero entries is a real supported declaration shape, not evidence that lookups succeeded.                                                                  |

PathType has exactly `path,source_type`. `path` is compared with its fixed
position's literal below, not admitted by a generic path matcher. `source_type`
is exactly `absent`, `regular_file`, `directory`, `character_device`,
`block_device`, `fifo` or `socket`. It describes the original no-follow object
class before masking/remount, never the masked result. These declaration classes
do not admit special objects as supported kernel layout; independently selected
policy must subsequently approve exact presence/type. Permission/I/O/lookup
errors are not absence. Symlinks are explicitly unsupported for this selected
no-symlink source recipe; root must not label a followed link as its target type.

MaskType has exactly `path,source_type,mask_kind`. Path/type use the grammar
above. `mask_kind` is exactly `absent` for absent sources, `directory_tmpfs`
for directories, and `null_device_bind` for every remaining admitted class.
Every type/operation mismatch denies in this decoder. The last branch names the
fixed container null-device operation, never access to the original special
object. Native source/null-device association and selected-recipe permission
remain mandatory; no special host object is opened by declaration acceptance.

ThermalType has exactly `cpu_id,source_type`. `cpu_id` uses the bounds above;
`source_type` is exactly `directory`. The path is deterministically generated
as `/sys/devices/system/cpu/cpu` + canonical decimal ID + `/thermal_throttle`.
No path string is supplied. The full thermal vector is the exact thermal suffix
of this daemon's cached default mask list, including all successful lookups,
in original source order. Current hardware enumeration cannot replace the cache.

The readonly_proc order is:

```text
/proc/bus
/proc/fs
/proc/irq
/proc/sys
/proc/sysrq-trigger
```

The fixed_masks order is:

```text
/proc/acpi
/proc/asound
/proc/interrupts
/proc/kcore
/proc/keys
/proc/latency_stats
/proc/sched_debug
/proc/scsi
/proc/timer_list
/proc/timer_stats
/sys/devices/virtual/powercap
/sys/firmware
```

These arrays are declaration facts. They do not choose the immutable policy's
allowed kernel paths, row normalization, readonly descendants, tmpfs fallback
or null-device source association. Complete recipe must independently supply
those predicates and deny mismatches. Its complete expected mount accounting
must remain within the existing 128 rows/64-KiB wire bound; this decoder does not
claim that every syntactically accepted 64-CPU declaration fits that accounting.

## Root statement and live association

The new canonical body binds these facts to the same root current-instance
attestation: boot, daemon PID/start ticks, executable identity, endpoint, host
namespaces, selected recipe and kernel provenance. The thermal vector is a
trusted-root statement about the actual named daemon cache, not a signature,
remote measurement or inference from the current sysfs path set.

Root must establish and preserve the cache-source/lookup assertion and actual
types; a newly collected list that merely resembles the cached value is
insufficient. An inability to establish that assertion requires a separately
authorized reprovisioning/run recipe; the engine never initializes or restarts
the daemon to manufacture it. Source shape tests cannot establish this fact.
The exact future provisioning/capture method remains a full-freeze feasibility
requirement, so this contract grants no successful registry/native admission.

For fixed masks and readonly paths, source_type states attest the current
source layout that the selected kernel/daemon construction will use before
masking; they do not claim that a future container already exists. The selected
recipe must establish the correspondence between these source paths and the
new private namespace's pre-mask paths. Types/presence must then be matched to
the challenged workload's genuine mount/device observations. That exact
correspondence and source-type acquisition remain native/full-freeze gates.
The lifetime and read rules below invalidate a root statement on drift; they
do not make facts immutable across daemon use or eliminate future native checks.

The worker must compare genuine current boot, namespaces, direct peer credentials,
owned peer pidfd and daemon start ticks with the retained declaration. Decode
success performs none of these observations. Existing bootstrap-only manifest
reads precede full root/peer/mount/kernel/ACL association; all separate artifact
and OCI acquisition follows it. Preserve the original lease, custody, deadline
and shared budget. No additional path acquisition, sysfs enumeration, daemon
request, or record injected by a caller is opened by the layout representation.

Every pre/post exchange recheck uses the same canonical root declaration bytes
and current-instance association. Changed declaration, cache, type, peer,
boot/namespace or daemon restart invalidates the complete observation; no
in-place refresh, old-list reuse, partial positive or retry under reset budget.
Actual realized rows must account for exactly the approved masks and readonly
descendants; container-reported rows cannot select this expected list.

## Private source ownership and implementation contract

Only `crates/lnsatd/src/headless_root_manifest.rs` and its existing
`headless_root_manifest_tests.rs` are the only source owners. No new module,
crate export, dependency, feature, filesystem reader, runtime profile family,
store/CLI/route or locked Phase11 change. Exact source and direct-child attestations require fresh independent review
and broad source validation.

Private entrypoint:

```rust
fn decode_root_manifest_layout_claim(
    input: &[u8],
) -> Result<UnverifiedRootManifestLayout, RootManifestError>
```

Output owns the complete new typed RootManifestLayout body, zeroizing canonical
bytes and zeroizing 32-byte commitment. All retained strings use existing
Zeroizing storage. No Clone, Serialize public output, owned DTO export, public
constructor, trust conversion, selected recipe, native witness or permit.

Reuse the existing bounded lexical preflight, closed map-only object macro and
common child record types. Declare the v2 top-level fields in ASCII key order
and retain every accepted value. Common claim validation may use a private
borrowed CommonRootFields view of v1/v2 records without copying/mutating the
zeroizing owner. The existing v1 family check still runs before common claims;
the new v2 family check runs before common claims/layout. Do not deserialize
through serde_json::Value, unchecked flattening, untagged variants or a v1
fallback. The new layout types also use the closed map-only visitor.

Keep current global body limits: 65,536 bytes, depth16, key256/string4096,
object32, total members2048, array128 and aggregate arrays256. New local
CPU/mask bounds are additional limits. The 256 cap counts every array element
across the complete document, not array containers. Local maxima are not
guaranteed to fit jointly; reject aggregate overflow before shape/family/claims.
No canonical output exceeding the
body limit is accepted. No I/O, clock, native call, thread, allocation retry,
unbounded iteration or state registration. Each list is scanned once plus
bounded subset comparison; checked arithmetic and preflight bound all input
work. Allocation failure handling remains the existing decoder contract.

Commitment is SHA-256 of `lnsat.hcfg_root_implementation_manifest.v2`, one LF,
and the entire compact recursively ASCII-key-sorted JSON body, no final LF.
Arrays preserve exact order. host_layout participates in full; no side-record
hash or omitted field. Profile's expected implementation-manifest digest must
match this domain-specific commitment only under separately reviewed future
composition. Kernel/security/recipe/OCI digests are different domains.

Error order is existing input-bounds/syntax/limits/shape, then exact family,
common claims, new layout claims, canonical serialization/bounds. Add only
private `Layout` with code `headless_root_manifest.layout`. Existing v1 error
codes and behavior remain byte-for-byte. Errors contain no input values.

## Exact source evidence

Tests must preserve every existing v1 golden/denial. New synthetic bodies use
both null/present index and empty/nonempty thermal vectors. The published
vectors below are derived from the existing synthetic NULL_VECTOR with the
v2 family/version, capability/yama/apparmor/landlock syntax list and mandatory
host_layout; all artifact bytes/pins and current tuples remain synthetic.

| Vector                  | Canonical bytes | Full v2 commitment, hex without sha256 prefix                    |
| ----------------------- | --------------- | ---------------------------------------------------------------- |
| NONEMPTY_THERMAL_VECTOR | 6168            | 1dc2c0abf8ac9b46edf6985307698d3b6465edd51379a4eb9c038a1287ba1b9a |
| EMPTY_THERMAL_VECTOR    | 6128            | 7d6c82ddc497a981aa856b1cb37653f6fa68a8629c5458e36d90e36f59546521 |

Exact golden construction: use the committed v1 NULL_VECTOR at base9dbe5d9;
change only family/version, replace active_lsms with the ordered four strings
capability,yama,apparmor,landlock and add host_layout. Both vectors set cpu_source
and lookup_policy to their fixed literals; readonly_proc's first four records
are directory and the fifth regular_file; all twelve fixed_masks are absent
with mask_kind absent. NONEMPTY has possible_cpus[0,2] and one thermal directory
record for ID2. EMPTY has possible_cpus[0] and no thermal record. Serialize with
recursive ASCII-key sorting, compact separators and no trailing LF.

Independent review must reproduce canonical bodies and digests. These positives
prove grammar/retention/commitment only; no real cache, eligible kernel, pin,
CompleteRecipe, current host, holder or executable inclusion is proved.

Denial matrix: every new mandatory key missing/duplicate/unknown/escaped-duplicate;
wrong member type/null/map-to-array; wrong family/version; v1-with-layout and
v2-without-layout; all global bounds and local CPU count/ID bounds; empty CPU
list; unordered/duplicate CPU IDs; reordered/missing/extra fixed path; invalid
source_type; thermal ID not in possible CPUs; duplicate/unordered thermal;
thermal type/path injection; each allowed source class and type/mask-kind mismatch;
unsupported symlink class; fallback CPU source; unreviewed lookup policy;
claim-only mutated cache/types changing the commitment. Test the joint 256-element
positive and 257-element early json_limits negative as specified below. Cover zero and maximum
valid IDs/counts, sparse CPU sets, all allowed PathType states, both index
presence states, whitespace/escaped-key equivalent representations and mixed
v1/v2 digest substitution. Shared-common-field regression must still deny all
existing v1 invalid tuples. No claimed native-positive test.

Validate focused root decoder tests, strict Clippy, rustfmt, meaningful broad
`npm run check`, docs direction, public readiness, inventory/history and
whitespace. Require fresh immutable source and direct-child attestations.
Actual kernel/source cache provenance, independent installation selection,
complete recipe/pins, Linux/native feasibility, integration, runtime and
packaging remain separate outstanding work.

Joint-array synthetic vector: possible_cpus has IDs0..62 then65535; thermal_masks
has all64 directory entries. readonly_proc has5 records, fixed_masks12, components5,
active_lsms4, administrators16 (1001..1016), and mounts86. Each mount copies the
old syntactic mount record with strictly increasing IDs11..96 and distinct
canonical synthetic paths /synthetic/mount0 through /synthetic/mount85.
The total is64+64+5+12+5+4+16+86=256. No other arrays are present in the null-index
base. Add one otherwise valid mount97 at /synthetic/mount86 to reach257; it must
fail preflight json_limits while every local array remains within its own cap.
These records are parser positives only, never real mount/custody evidence.
