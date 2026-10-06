# HCFG-6 Closed Docker Response Source Specification

Status: proposed supporting private source contract. This closes response field
coverage and records exact source normalization; it does not complete the full
native freeze. [Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design)
owns acceptance and implementation. The Phase 11 operator packet owns runtime
truth. The bounded Stage-A Version-only decoder contract below is a private
source prerequisite. The separate Info-only prerequisite below is still a
precode contract; no daemon verification, Docker operation or activation
follows from either contract.

## Source and interpretation

The engine source is Moby commit `8af9fe3a36bab3e039862a2ab1cef1880c9b4d03`,
Engine 29.8.2/API 1.56. Its Go module pins Docker image-spec 1.3.1 and OCI
image-spec 1.1.1. The exact field/type appendix below is a mechanical source
inventory, not permission to accept every branch. The predicates in this
document, the [transport/create contract](docker-source-spec.md), the
[root/OCI custody contract](root-manifest-source-spec.md) and the still-required
reviewed realized recipe determine positive acceptance. Unknown fields at any
object depth deny; a field listed below can still be forbidden for this recipe.

Go tags describe encoding, not default values. A nil slice with no omission
tag emits null; a nonnil empty slice emits `[]`. A nil map emits null; an empty
allocated map emits `{}`. Empty slices/maps with `omitempty` are omitted. A nil
pointer with `omitempty` is omitted, not emitted as null. A value struct such
as Version.Platform or image.Metadata.LastTagTime is not omitted merely because
its contents are zero under the pinned legacy Go JSON encoder. Explicit null
never substitutes for an omitted optional field. Raw OCI bytes keep the
separate grammar and hash rules in the root/OCI companion.

The served API path matters. For API 1.56 the
[system router](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/server/router/system/system_routes.go)
applies none of its older-version field insertion/removal branches; it does
replace backend Swarm with current cluster information. Legacy `Expected`,
bridge booleans and registry artifact exception fields are unknown and deny.
Do not derive the served response from backend structs alone.

## Bounded parsing and classification

Retain the transport limits: 1 MiB decoded body, depth 32 and 4,096 total object
members, including dictionary entries. Reject duplicate decoded keys, escaped
duplicates, invalid UTF-8, trailing data and numeric coercion. Integers must
fit the named signed or unsigned Go width; no fractions, exponent spelling,
negative unsigned values or overflow. Boolean values are JSON booleans.

Unless an explicit path-specific rule overrides it below, a string has at most
4,096 UTF-8 bytes, an array
has at most 128 elements, and a dictionary has at most 64 entries with keys of
1..256 bytes and bounded string values. A pair row is exactly two strings.
Charge bytes, elements and depth before allocation. Empty permitted dictionary
values are strings; dictionaries never accept arbitrary nested JSON. Bounds are
private parser limits and can deny a larger daemon response; no retry with
larger limits occurs.

Every reachable path belongs to one of these classes:

1. **Compare:** parse the exact closed type and compare to held identity,
   current custody, immutable reviewed recipe or the phase-specific state.
2. **Discard:** parse the exact closed type and bounds, then discard. The
   explicit path tables below authorize only that typed informational use.
   No discarded string supplies a path to open, cleanup selector, identity,
   policy, authority, subprocess argument or public diagnostic.
3. **Forbid:** deny if the key or nonempty branch appears as specified. No
   generic recursive skip is used to accept an unmodeled child. Full-body and
   syntax bounds still apply before a fixed static denial is returned.

Required untagged members must be present with their prescribed type, including
explicit null only where a selected nil slice/map/pointer is allowed below.
Optional members follow exact Go omission plus the reviewed recipe; absent,
null, empty and nonempty forms are never interchangeable. Security comparisons
have no null-or-default fallback. Unset expected recipe values are blocking,
not wildcards. This contract freezes parsing paths while actual recipe values
and artifact pins remain `UNSET_BLOCKING` until independently supplied/reviewed.

## Version response

Root keys are exactly system.VersionResponse. Compare Version `29.8.2`,
ApiVersion `1.56`, Os `linux`, Arch to the selected Go build target, MinAPIVersion
to the root-attested daemon recipe, KernelVersion to the current trusted kernel
tuple, and GitCommit/GoVersion/BuildTime to the exact reviewed engine build.
Experimental is omitted for false; a true value denies this first recipe.
Platform is exactly `{Name:string}`, compared to the selected product build.

Components is required by this positive recipe despite its omission tag:
1..8 objects, each exactly Name, Version and optional Details. Names are unique
and the complete set is exactly `Engine,containerd,runc,docker-init` for the
selected stock init path. Version/build values equal the reviewed tuple;
missing components, `N/A` or unexpected components deny. Compare all
reviewed identity detail pairs. Other Details entries are an explicitly
permitted bounded string dictionary at `Components[].Details.*` and are
discarded. Details is never an arbitrary JSON object or independent artifact
attestation. Top-level deprecated build fields must agree with Engine details
when both are present; the realized recipe fixes required presence.

The complete source path calls `fillPlatformVersion`, which appends containerd,
the configured default runtime name (`runc`) and the basename of the selected
init executable (`docker-init`) after Engine. The
[Unix version population](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/info_unix.go)
defines these relations. An Engine-only slice is not this recipe's positive
case; rootless components and renamed init artifacts are not accepted here.

The [version builder](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/info.go)
uses Go `runtime.GOARCH`. Info.Architecture instead uses
[Linux uname](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/internal/platform/platform_linux.go).
Freeze both exact strings for the selected platform; do not compare these two
fields directly or silently translate an arbitrary architecture.

## Stage-A private Version decoder contract

This exact inert prerequisite follows the accepted
[source ordering](source-freeze-staging-decision.md#a-reviewed-inert-candidate-source).
It decodes only supplied Version JSON body bytes. It is not an HTTP parser,
recipe admission, daemon authenticator or generic four-family response decoder.
The other response families and all product callers remain unchanged.
[Project Status](../../PROJECT_STATUS.md#stage-a-private-daemon-version-decoder)
owns current implementation and review evidence.

### Source evidence and ownership

The three Version type entries in the appendix now bind the raw 2,014-byte
`api/types/system/version_response.go` at the source commit above to SHA-256
`4a6c532645f9eaaddcc0ffb3ab1e7942047e931bb2cf1ac28e58c27238c313a3`.
The previous `0d3eed498ed406989f3d3eb5d1627640a362fd0e815023cb8c862a8d8b3643aa`
value did not match fetched bytes. Raw and base64-decoded GitHub content responses
agree, including recomputation of Git blob
`61cd1b6e2fed5e609565f3491155b1945997dcd8`. The listed types/fields are unchanged.
This correction supplies source provenance only, not an installed artifact pin.

Owned source paths are `crates/lnsatd/src/headless_daemon_version.rs`, its sibling
`headless_daemon_version_tests.rs`, and the private module declaration in
`crates/lnsatd/src/lib.rs`. The single private entrypoint is
`decode_version_claim(&[u8]) -> Result<UnverifiedVersion, VersionDecodeError>`.
No public/exported constructor, caller, feature or dependency change is opened.
Fresh independent review of this exact contract precedes implementation.

### Bounded JSON body and errors

The body is at most 1,048,576 bytes inclusive and must contain exactly one JSON
object, with optional JSON whitespace before and after it. Unlike startup
challenge frames, there is no canonical-order or terminal-LF requirement here.
UTF-8 is strict; BOM, raw controls in strings, malformed escapes/surrogates,
invalid JSON numbers, trailing values/data and incomplete values deny.

An allocation-free lexical/structural preflight must finish before typed owned
JSON decoding. It bounds decoded strings, including escaped Unicode, before any
input-derived string allocation. Object keys are 1..256 decoded UTF-8 bytes;
string values are at most 4,096 decoded UTF-8 bytes. Count container depth with
the root at one: at most 32. Every object has at most 64 members; total object
members, including Details entries, are at most 4,096. Components is the only
accepted array type; this Version-only preflight caps every encountered array
at eight elements, including branches that later fail shape checks. Check caps
before entering an additional container/member/element or growing a string.
Preflight does not retain a syntax tree, allocate a dynamic stack or skip
unbounded unknown subtrees. JSON scalar syntax may be scanned without numeric
conversion; every accepted leaf in this family is a string. There is no numeric
coercion or accepted numeric/Boolean/null leaf.

Typed decoding then requires maps at every object position. Reject duplicate
decoded keys, including escaped duplicates, unknown/missing keys, null,
positional arrays, wrong case and wrong types. Extra Details keys are the sole
explicitly permitted dynamic dictionary. No generic recursive value/skip may
accept an unmodeled child.

The private fixed data-free error codes are:

1. `headless_version.input_too_large` before inspecting oversized input;
2. `headless_version.json_syntax` for UTF-8 or preflight JSON syntax failures;
3. `headless_version.json_limits` for preflight bounds;
4. `headless_version.json_shape` for typed/closed-map/presence/duplicate failures;
5. `headless_version.recipe` for fixed predicates, empty or unavailable identity
   claims and component-set failures;
6. `headless_version.inconsistent` for disagreement between accepted Engine
   detail claims and their top-level counterparts.

UTF-8 validation precedes the allocation-free scan. Syntax and limit failures
within that scan use the first encountered left-to-right failure, not a second
full scan to reprioritize competing failures. Later stages run only after the
preceding stage passes. Raw input, field names, values, offsets and provider
errors never appear in error output. A failed parse returns no partial result.

### Exact presence and retained projection

The root requires exactly Platform, Version, ApiVersion, MinAPIVersion, Os,
Arch, Components, GitCommit, GoVersion, KernelVersion and BuildTime. This
selected candidate deliberately requires nonempty identity/build claims even
where the Go tag permits omission. Experimental must be absent; a present key
of any type, including false or null, fails the closed shape. Platform is a
non-null map containing exactly Name. Components is a non-null array; every
component is a non-null map with exactly Name, Version and Details. Details is
a non-null map of bounded strings; omitted/null/empty Details cannot supply its
required identity pairs. Optional Go omissions never become defaults.

After shape checks, every compared identity/build string, including duplicated
Engine claims, must be nonempty and
not the exact unavailable sentinel `N/A`. Version is exactly `29.8.2`,
ApiVersion exactly `1.56` and Os exactly `linux`. Component names are unique and
the set is exactly Engine, containerd, runc and docker-init, in any order.
Their fixed versions are Engine `29.8.2`, containerd `2.3.6` and runc `1.5.2`;
docker-init's version remains a bounded unverified claim for the later exact
recipe comparison. No selected architecture or artifact identity is inferred.

Engine Details requires these eleven keys:
`GitCommit`, `ApiVersion`, `MinAPIVersion`, `GoVersion`, `Os`, `Arch`,
`BuildTime`, `KernelVersion`, `Module`, `ModuleVersion`, `Experimental`.
Module is exactly `github.com/moby/moby/v2`; Experimental is the string `false`.
ApiVersion, MinAPIVersion, GoVersion, Os, Arch, BuildTime, KernelVersion and
GitCommit must equal their root counterparts byte for byte. Each other component
requires Details.GitCommit. Each Details map independently has at most 64 total
entries, including required keys and extra informational pairs. Counts are not
pooled across components: Engine permits its eleven required pairs plus at most
53 extras; each other component permits its one required pair plus at most
63 extras. All four maps may simultaneously contain 64 entries (256 Details
entries in aggregate), subject also to the body and total-object-member caps.
Extra pairs are parsed, checked for duplicates and bounds, then discarded. They never become paths,
selectors, identity, policy, arguments or public diagnostics. Missing required
detail keys fail the recipe stage, while non-string values fail shape.

The private sealed output retains only the unverified platform name, Go
architecture, minimum API version, kernel version, engine Git/Go/build/module
version tuple, and each named component's version/Git claim. Fixed predicates
are implicit in the decoder; duplicate Engine claims are not retained twice.
BuildTime remains a compared build claim and is retained. Extra detail pairs
and raw JSON are not retained. All module-owned input-derived strings, including retained fields and
intermediate/discarded Details keys and values, use zeroizing storage. The
output has no Debug, Clone, Serialize, public constructor or authority-bearing
conversion. Caller-owned input, external copies and JSON-library scratch are outside
that scrubbing claim; it is not universal memory erasure. No canonical body or identity digest is minted by this decoder.

### Mandatory source and integration evidence

Synthetic positive fixtures must reproduce the pinned source shape, all eleven
Engine details and all four components. They are not copied live observations
or provenance evidence. Test valid whitespace/key/component order and escaped
representation without changing the retained projection; all four-component
permutations must agree. Independently construct expected retained fields and
prove that additional informational Details never enter the output.

For root, Platform, each component and Details, cover every required member's
omission, null, wrong type, duplicate/escaped duplicate and positional-array
substitution, plus unknown keys outside Details. Exercise every retained field
and fixed predicate; each of the eight duplicated root/detail pairs must deny
one-sided substitution and retain a self-consistent changed unverified pair
when it does not change a fixed predicate. Test duplicate/missing/extra/wrong-
case components, missing/empty/unavailable build details, fixed version drift,
Experimental presence and string mismatch, empty/oversized dictionary keys,
wrong extra-detail value types and all private error codes/precedence.

Exercise body size, decoded string/key byte bounds with raw UTF-8 and escaped
Unicode, depth, per-object and total-member caps, array caps, every truncation
of a valid fixture, BOM, raw controls, malformed/surrogate escapes, invalid
UTF-8, invalid numeric syntax and trailing bytes/values. Bound tests must reach
the intended preflight limit without a smaller unrelated bound masking it.
Accept a positive fixture with all four Details maps at 64 total entries each,
including the required keys. Independently add a 65th member to each map and
require `headless_version.json_limits`; also move one extra from another map
so the aggregate stays 256 while the selected map has 65, and require the same
denial. This proves that required entries count and an unused slot in another
map does not widen a local cap. Meaningful positive byte-boundary fixtures remain
unverified syntax claims.
Run focused tests, strict pinned host lint/format, full repository checks,
scoped installed scanners and fresh independent source/direct-child review.

Future comparison must bind every retained field to the complete reviewed
recipe/build/kernel tuple and authenticated current root/daemon/endpoint
custody. The selected Go architecture is not Info's uname architecture. Current
pins, artifact provenance, native observations, held associations, profile and
remaining-budget enforcement, HTTP/status/framing, live endpoint custody and
full source freeze remain separate. The decoder cannot produce a permit,
installation, cleanup selector, release, receipt or runtime/support evidence.
No Docker, host change, credential intake, registration, initializer or active
product integration is opened. LNSAT remains the standalone authority engine;
Rangoon is an optional standard-contract consumer.

## Info response

Root keys are exactly system.Info, subject to these classifications:

| Class      | Exact root paths                                                                                              | Rule                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compare    | ID, ServerVersion, OSType, Architecture, KernelVersion, OSVersion, OperatingSystem, DockerRootDir             | Exact root-attested current daemon/host recipe. DockerRootDir equals `instance.metadata_roots.daemon_root.path`; held identity and ACL custody still apply. Informational claims do not authenticate themselves. |
| Compare    | Driver, CgroupDriver, CgroupVersion, DefaultRuntime, Runtimes                                                 | Selected storage backend, `systemd`, `2`, `runc` and the exact stock runtime set/shape below.                                                                                                                    |
| Compare    | MemoryLimit, SwapLimit, CpuCfsPeriod, CpuCfsQuota, PidsLimit                                                  | True, plus actual native controls. Availability booleans do not prove the workload limits.                                                                                                                       |
| Compare    | SecurityOptions, Plugins, Debug, ExperimentalBuild, LiveRestoreEnabled, Isolation, CDISpecDirs, Containerd    | Exact root recipe, selected no rootless/remap/SELinux/NRI/CDI/additional authorization/runtime plugins; private seccomp/AppArmor/cgroupns expectations.                                                          |
| Compare    | ContainerdCommit, RuncCommit, InitCommit, InitBinary                                                          | Closed Commit `{ID:string}` objects and exact reviewed component recipe. No legacy Expected member.                                                                                                              |
| Compare    | Swarm                                                                                                         | Exact inactive served shape below.                                                                                                                                                                               |
| Compare    | NCPU, MemTotal                                                                                                | Retain positive bounded capacity claims for the selected finite preparation/action recipe's host requirements; these claims do not prove available resources.                                                    |
| Compare    | FirewallBackend presence and FirewallBackend.Driver                                                           | Retain optional presence and the driver claim for exact root-recipe comparison; parse and discard only its informational pairs.                                                                                  |
| Discard    | Containers, ContainersRunning, ContainersPaused, ContainersStopped, Images, NFd, NGoroutines, NEventsListener | Nonnegative bounded integers.                                                                                                                                                                                    |
| Discard    | CPUShares, CPUSet, IPv4Forwarding, OomKillDisable                                                             | Booleans only. OomKillDisable availability may be false on cgroup v2; HostConfig false and native observation remain required.                                                                                   |
| Discard    | SystemTime, LoggingDriver, IndexServerAddress, HttpProxy, HttpsProxy, NoProxy, Name, ProductLicense           | Bounded strings; SystemTime is RFC3339. These cannot change the private request enum or selected container LogConfig.                                                                                            |
| Discard    | DriverStatus, FirewallBackend.Info, RegistryConfig, DefaultAddressPools, Labels, Warnings                     | Closed typed child rules below; no interpretation of warning text as proof.                                                                                                                                      |
| Forbid     | SystemStatus, NRI, DiscoveredDevices                                                                          | Omitted for the selected first recipe; even present null denies.                                                                                                                                                 |
| Empty only | GenericResources                                                                                              | Required null or empty array as fixed by the root daemon recipe; any resource element denies before accepting its unmodeled alternatives.                                                                        |

SecurityOptions is a finite unique string array whose exact ordered contents
equal the realized recipe, as required by the transport/create contract. A
string can include a profile suffix: the stock AppArmor
entry is `name=apparmor,profile=default`, not merely `name=apparmor`.
The pinned default seccomp profile entry is `name=seccomp,profile=builtin`.
Absence
of a denial name alone does not prove a required positive control.

Runtimes has exactly `runc` and `io.containerd.runc.v2` for the selected stock
source recipe. Each is a closed system.RuntimeWithStatus object. `path` is the
literal `runc` for both stock entries; this is not the held absolute executable
path or proof of the selected artifact. runtimeArgs/runtimeType/options are omitted, never
empty/null placeholders. Optional status is a string dictionary with only
`org.opencontainers.runtime-spec.features`; its value is a UTF-8 string of at
most 64 KiB, not recursively accepted JSON. Parse/bound/discard that string;
native observations, not the features claim, prove controls. The source
[runtime builder](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/runtime_unix.go)
registers both stock names. Additional configured runtimes deny.

Plugins is exactly Volume, Network, Authorization, Log, each a bounded string
array or the precise recipe's nil encoding. Compare unique name sets to the
root recipe; registration order is not treated as stable. Authorization is
empty under the selected no-hook recipe. CDISpecDirs is an allocated array;
the selected disabled CDI recipe fixes its value and forbids discovered
devices. Disabled
[NRI](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/internal/nri/nri.go)
returns a nil info pointer, so NRI must be omitted.

Containerd is required for this selected backend even though its pointer tag
is optional. It is exactly required nonempty Address plus required Namespaces,
which is exactly Containers and Plugins strings. Presence/values equal the
root recipe; no alternate endpoint is opened from these strings. The pinned
builder omits Containerd when its address is empty, so a required positive
Containerd object cannot legitimately omit Address.

Swarm is exactly NodeID `""`, NodeAddr `""`, LocalNodeState `"inactive"`,
ControlAvailable false, Error `""`, RemoteManagers null. Nodes, Managers,
Cluster and Warnings are omitted. The
[cluster Info](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/cluster/swarm.go)
and [nil node runner](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/cluster/noderunner.go)
establish this served inactive state. Backend zero-state `LocalNodeState:""`
is not the positive served shape. Null Cluster is not an omission encoding.

The remaining explicit informational children are:

- DriverStatus: null or an array of at most 64 exact string pairs.
- FirewallBackend: omitted or a non-null closed `{Driver,Info?}` object;
  Driver is a bounded string, Info if present is a nonempty array of exact
  pairs. The selected root recipe fixes whether it must be present and Driver.
- RegistryConfig: non-null object exactly InsecureRegistryCIDRs, IndexConfigs,
  Mirrors. CIDRs is null or a bounded array of valid IP-prefix strings; Mirrors
  is null or a bounded string array. IndexConfigs is null or a dictionary of
  at most 64 registry keys to non-null IndexInfo objects, exactly Name, Mirrors,
  Secure, Official, with string/list/Boolean types. Its keys are explicitly
  dynamic dictionary keys; no arbitrary child JSON is accepted. These records
  authorize no registry endpoint or image operation.
- DefaultAddressPools: omitted or 1..64 non-null objects exactly Base and Size;
  Base is an IP-prefix string, Size a nonnegative bounded integer.
- Labels/Warnings: required null or bounded string arrays. Warnings are neither
  echoed nor interpreted as enforcement success; actual required observations
  and all security comparisons remain mandatory.

## Stage-A private Info decoder contract

This is the next separate inert prerequisite under the accepted
[Stage-A source order](source-freeze-staging-decision.md#a-reviewed-inert-candidate-source).
It decodes supplied Info JSON body bytes without HTTP, Docker, native access,
clock, recipe lookup or product integration. The Version decoder stays unchanged.
[Project Status](../../PROJECT_STATUS.md#stage-a-private-daemon-info-decoder-contract)
owns implementation and review truth. Fresh independent review of this exact
contract must pass before its named source implementation begins.

### Info source evidence and ownership

The exact pinned raw type files and SHA-256 values are:

| Pinned file                      | Raw bytes | SHA-256                                                            |
| -------------------------------- | --------- | ------------------------------------------------------------------ |
| `api/types/system/info.go`       | 5,707     | `1a56684bb26042b2db36b834d69776e2e9252ce8f0bd5e2e2714defb5f2253da` |
| `api/types/system/runtime.go`    | 578       | `b5ec2f7d0d632ae758f26f3874d8045b6947874d290813e46e66a6b920e01054` |
| `api/types/registry/registry.go` | 1,957     | `9c52d25141374c205fd15800b8042fc912b06420b00c6d128d3233cea98136e9` |
| `api/types/swarm/swarm.go`       | 7,059     | `26768a857f33ef68d246f83377fba3d7176a441e98497f9261a409c6e2df29c5` |

Raw and base64-decoded GitHub content responses agree; recomputed Git blobs
agree with the pinned contents API. Fifteen prior appendix SHA references across
these four files did not match fetched bytes and are corrected. Their listed
fields/types/tags match the exact source and remain unchanged. Other type-family
hashes are outside this refresh. This verifies source snapshots, not installed
artifact pins or genuine response observations.

The root type contains 63 fields: 55 untagged and eight with omission tags.
The pinned Info builder, Unix population, system router, stock runtime builder,
cluster inactive state and configuration constants establish the selected
shapes below. Default seccomp uses `builtin`; both stock runtime paths are
`runc`; Containerd is populated only with a nonempty address. Those source
facts do not authenticate any received body.

Owned source paths are `crates/lnsatd/src/headless_daemon_info.rs`, its sibling
`headless_daemon_info_tests.rs`, and one private module declaration in
`crates/lnsatd/src/lib.rs`. The private entrypoint is
`decode_info_claim(&[u8]) -> Result<UnverifiedInfo, InfoDecodeError>`.
No new dependency, shared-parser refactor, exported constructor, caller, feature
or change to the Version decoder/tests is in scope.

### Info bounds and fixed errors

The body cap is 1,048,576 bytes inclusive. Validate strict UTF-8, then complete
an allocation-free JSON lexical/structural preflight before typed owned decoding.
Accept one JSON object with optional JSON whitespace. Reject BOM, trailing
data/values, incomplete values, malformed numbers/escapes/surrogates and raw
string controls. Root container depth is one; maximum depth is 32. Each object
has at most 64 members, with at most 4,096 members across the complete body.
Keys have 1..256 decoded UTF-8 bytes. Arrays have at most 128 elements, except
DriverStatus and FirewallBackend.Info have at most 64 rows, each row at most
two elements, and DefaultAddressPools has at most 64 elements. Exact pair length
is a later shape requirement. These preflight caps apply even inside branches
that will subsequently fail shape checks.

Every string value is at most 4,096 decoded UTF-8 bytes, with one exception:
`Runtimes.<stock-name>.status.org.opencontainers.runtime-spec.features` permits
at most 65,536 decoded UTF-8 bytes. `<stock-name>` is exactly `runc` or
`io.containerd.runc.v2`. Recognize this path through decoded object keys using
bounded fixed storage. Escaped equivalent keys get the same cap; wrong case,
unknown runtime names, extra nesting and array substitutions do not. Never
extend the exception to all strings under Runtimes. The feature value remains
an opaque string, never recursively decoded JSON. Preflight has no retained
syntax tree, dynamic stack or generic recursive skip. Charge limits before
entering an extra member/element/container or growing an owned string.

Typed decoding uses map-only visitors for every object. No positional struct
arrays, case folding, coercion, duplicate decoded keys or unknown keys are
accepted. RegistryConfig.IndexConfigs is the only accepted dynamic dictionary;
its keys have the same key bounds and decoded-duplicate checks. Required
nullable fields distinguish missing, null and allocated empty values. Optional
fields distinguish omission from null; explicit null is never an optional
omission. No arbitrary recursive value may accept an unmodeled child.

All Go `int` leaves use the private nonnegative cap 2,147,483,647 inclusive;
this intentionally narrower bound fits both 32-bit and 64-bit Go integers and
does not select or prove a platform. MemTotal is a nonnegative signed-64-bit
quantity capped at 9,223,372,036,854,775,807. Reject fractional, exponent, signed
negative (including `-0`), string, Boolean or overflowing encodings. JSON's
lexical number grammar is checked in preflight; the exact integer spelling and
range belong to typed shape. NCPU and MemTotal must additionally be positive
at the recipe stage and remain unverified capacity claims.

The five fixed, data-free errors are:

1. `headless_info.input_too_large` before inspecting oversized input;
2. `headless_info.json_syntax` for strict UTF-8 or preflight syntax failures;
3. `headless_info.json_limits` for preflight bounds;
4. `headless_info.json_shape` for typed/map/presence/unknown/duplicate/null
   failures, forbidden fields and integer spelling/range failures;
5. `headless_info.recipe` for fixed-value/set/order failures, zero required
   capacity, empty/unavailable compared strings, empty present omission-tagged
   collections/strings, and invalid IP-prefix or timestamp content.

Size precedes UTF-8; UTF-8 precedes preflight. Within preflight use the first
encountered left-to-right syntax/limit failure. Shape must finish before recipe
checks. Wrong types/null are shape failures even where a correctly typed value
would fail recipe. In a string array that must be empty, a string element fails
recipe but a non-string element fails shape. GenericResources elements are
always unmodeled and fail shape regardless of type. No raw input, field name,
value, offset, private path or provider message appears in errors. Failure
returns no partial output.

### Info exact presence and predicates

All 55 untagged root fields are required. CgroupVersion and Containerd are
also required by this positive candidate despite their omission tags.
ProductLicense, DefaultAddressPools and FirewallBackend may be omitted, but
may not be null. SystemStatus, NRI and DiscoveredDevices are forbidden even
when null. Thus 57 root members are required and at most 60 are accepted.

ServerVersion is exactly `29.8.2`, OSType `linux`, CgroupDriver `systemd`,
CgroupVersion `2`, DefaultRuntime `runc`, and Isolation the empty string.
MemoryLimit, SwapLimit, CpuCfsPeriod, CpuCfsQuota and PidsLimit are true.
Debug, ExperimentalBuild and LiveRestoreEnabled are false. These are unverified
claims, not proof that any positive native control exists. Every compared
identity/build string is nonempty and not the exact sentinel `N/A`.

SecurityOptions is exactly this ordered array:
`name=apparmor,profile=default`, `name=seccomp,profile=builtin`,
`name=cgroupns`, optionally followed by `name=no-new-privileges`.
No duplicate, reordering, extra name or missing required name is accepted.
Retain whether the optional fourth entry was present for later exact recipe
comparison. This reconciles the earlier set wording with the transport
contract's ordered comparison and the pinned constructor's order. It does not
select an actual daemon setting or infer workload no-new-privileges enforcement.

Runtimes is a map with exactly `runc` and `io.containerd.runc.v2`. Each value is
a map requiring `path` with literal `runc`. It may have `status`, a non-null,
nonempty map with exactly `org.opencontainers.runtime-spec.features`, whose
value is a nonempty bounded string. Omitted status is allowed; `{}` violates
its omission tag. runtimeArgs, runtimeType and options are forbidden even as
empty/null placeholders. Parse and discard the status string. It never proves
runtime features, artifact identity or executable custody.

Plugins is exactly Volume, Network, Authorization and Log. Each is required
and is either null or a bounded array of strings. For Volume/Network/Log,
values are unique, nonempty and not `N/A`; preserve null versus an allocated
array and normalize allocated values by bytewise sort for later exact set
comparison. Authorization is only null or `[]`, preserving which encoding was
supplied. Any string element fails the no-hook recipe. GenericResources is
only null or `[]`, preserving the encoding; any element is an unmodeled branch
and fails shape. CDISpecDirs is exactly `[]`, as the pinned builder promotes
nil to an allocated array. Strings in a nonempty array fail the disabled CDI
recipe; null or non-string elements fail shape.

Containerd is a non-null map requiring exactly Address and Namespaces.
Namespaces is a non-null map requiring exactly Containers and Plugins.
All three strings are nonempty, not `N/A`, and retained for later exact recipe
comparison. They are opaque claims; decoding never opens an endpoint or path.
ContainerdCommit, RuncCommit and InitCommit are non-null maps requiring exactly
ID, a nonempty string other than `N/A`; legacy Expected is forbidden.

Swarm is a non-null map with exactly NodeID `""`, NodeAddr `""`, LocalNodeState
`"inactive"`, ControlAvailable false, Error `""`, RemoteManagers null. The
optional Nodes, Managers, Cluster and Warnings keys are forbidden, even when
zero/empty/null. An allocated empty RemoteManagers array fails shape. This is
the served inactive shape; a zero-value empty LocalNodeState fails recipe.

### Info informational children and retained projection

DriverStatus is required null or at most 64 exact two-string rows.
FirewallBackend, when present, is a closed map requiring nonempty Driver other
than `N/A`; optional Info is a non-null, nonempty array of at most 64 exact
two-string rows. Retain FirewallBackend presence and Driver; discard Info.
This prevents the earlier discard classification from losing a claim required
for later exact root-recipe comparison.

RegistryConfig is required non-null with exactly InsecureRegistryCIDRs,
IndexConfigs and Mirrors, all required. CIDRs is null or a string array; Mirrors
is null or a string array. IndexConfigs is null or a map of at most 64 bounded
dynamic keys to non-null maps requiring exactly Name (string), Mirrors (null or
string array), Secure (Boolean) and Official (Boolean). Null and `{}` dictionary
encodings are both permitted and discarded after validation. No registry key,
URI, proxy or network prefix can authorize or select an operation.

DefaultAddressPools, if present, is a non-null, nonempty array of at most 64
maps requiring exactly Base (IP-prefix string) and Size (bounded nonnegative
Go-int representation above). Both CIDRs and Base require a valid IPv4 or IPv6
address, one slash, and canonical unsigned decimal prefix length within the
address family's 32/128-bit range. No zone, sign, whitespace, leading-zero
prefix length except `0`, DNS lookup or outbound address policy is used. Host
bits need not be masked. This is pure prefix syntax, not network reachability
or pool suitability proof. These values are discarded.

SystemTime must be a calendar-valid RFC3339 timestamp beginning with
`YYYY-MM-DDTHH:MM:SS`, followed by an optional decimal point and 1..9 fractional
digits, then exactly `Z`, `+HH:MM` or `-HH:MM`, with year 0001..9999,
actual month/day/leap-year validity, hour 00..23, minute/second 00..59, and
offset hour/minute 00..23/00..59. No leap-second encoding or lowercase separator
is accepted. This bounded subset needs no time library, clock or freshness
claim. The timestamp is discarded. Other informational strings may be empty,
except ProductLicense must be nonempty if present to obey its omission tag.
Labels and Warnings are required null or bounded string arrays and are
discarded without echoing or interpreting their contents as controls.

The sealed private output retains only unverified daemon ID, uname architecture,
kernel/OS version and operating-system description, daemon root, storage driver,
init binary, three component commit IDs, Containerd address and both namespaces,
plugin sets with exact null/allocated distinctions, Authorization and
GenericResources empty encodings, optional firewall driver, NCPU/MemTotal,
and presence of the daemon no-new-privileges claim. Fixed predicates are implicit.
Every retained claim must be accounted for by the later complete recipe and
native/custody comparison; parsing creates no identity or authority digest.

All module-owned input-derived strings, including dynamic keys and intermediate
or discarded values, use zeroizing storage. The result has no Debug, Clone,
Serialize, public constructor or authority conversion. Caller input, external
copies and JSON-library scratch are outside this scrubbing claim. Discarded
strings do not become public diagnostics, paths, cleanup selectors or arguments.

### Info required source evidence and later gates

Construct a synthetic complete positive body from the pinned source types and
an independently specified expected projection. Cover both nullable empty
encodings, all optional positive branches, alternate unverified claims and
plugin registration order. Prove that discarded data never enters the result.
Cover every required member's omission/null/wrong type, each optional member's
absence/null/empty/nonempty forms, all map positions as positional arrays,
unknown/wrong-case/duplicate/escaped keys, every retained field and each fixed
predicate. Cover SecurityOptions permutations, no-hook denial, both stock
runtime maps, all forbidden root/child branches and inactive Swarm shape.

Exercise per-object and total-member caps independently; required keys count.
Test body/depth/array/row/key/string limits at and above each cap, including
raw UTF-8 and escaped Unicode. The 65,536-byte feature exception must pass at
both exact paths and deny over-cap, wrong-path, wrong-case, extra nesting and
array-substitution attempts without broadening other string bounds. Verify
fixed error precedence with competing syntax/limit/shape/recipe defects.
Include every truncation of a valid body, malformed escapes/numbers/UTF-8,
trailing bytes, integer extrema/overflow/fraction/exponent/negative-zero,
calendar/leap/offset and IPv4/IPv6 prefix boundary vectors, plus secret canaries.
Boundary fixtures must reach the intended limit without an earlier unrelated
cap masking it. Source tests must have a nonempty positive result.

Run focused tests, pinned host format/strict lint, full repository checks,
scoped installed scanners and fresh independent source/direct-child review.
No Linux or genuine Docker result follows from host/synthetic tests. Future
complete source/pin freeze must bind the fixed recipe assumptions and every
retained claim to actual selected daemon/build/native/endpoint custody, other
response families, HTTP/status/framing and remaining-budget enforcement before
integration. Info parsing grants no permit, registration, initializer, cleanup,
receipt, runtime, support, certification or release authority. LNSAT owns these
neutral contracts; Rangoon remains an optional standard-contract consumer.

## Image response

Root keys are exactly image.InspectResponse. Compare Id, Architecture, Os,
optional Variant, Config and RootFS to held raw OCI config and immutable recipe.
OsVersion is omitted for this first Linux recipe. Config is non-null with the
flattened DockerOCIImageConfig/ImageConfig fields in the appendix; no wrapper
key named ImageConfig or DockerOCIImageConfigExt is admitted. Exact raw
optional-field presence can differ from API omission: compare the semantic
image values using this source encoder, while raw custody separately checks
the committed bytes and presence. Omission never becomes a guessed value.

RootFS is exactly Type `layers` and a nonempty ordered Layers array of 1..16
full SHA-256 DiffIDs matching raw config. Metadata is exactly LastTagTime as a
bounded RFC3339 timestamp, including the valid Go zero timestamp; discard it.
Size is a nonnegative signed int64 and bounded by the reviewed image/storage
recipe. RepoTags/RepoDigests are required null or bounded string arrays,
discarded. Optional Comment/Created/Author are bounded nonempty strings;
Created is RFC3339. They cannot authenticate origin.

GraphDriver is omitted or exactly `{Name,Data}`; Name is a bounded string,
Data is null or a bounded string dictionary. Presence, selected storage name
and relationship to the container storage backend are fixed by the root
recipe. Data paths are parsed/discarded and never opened. Manifests is omitted
because the private image request does not request it. Identity is omitted
for this first plain OCI recipe; image-signature/DHI identity branches need a
separately reviewed typed recipe and are not recursively skipped.

Descriptor, when the selected image store supplies it, is a non-null closed
OCI Descriptor compared to the held target manifest or optional index.
ImageManifestDescriptor in container Inspect uses the same bounded descriptor
grammar and matches the selected manifest; the builder may add Platform.
Required descriptor keys are mediaType, digest, size; optional annotations
and platform must equal the reviewed recipe. urls, data and artifactType are
forbidden. Platform is exactly architecture, os and optional variant;
os.version/os.features are forbidden. Digest and size match held raw blobs,
not RepoDigests. Presence for both descriptor fields is fixed by the selected
storage/recipe; absent descriptors do not replace raw OCI parent-link proof.

## Create and Inspect response

Create is exactly `{Id:<64 lowercase hex>,Warnings:[]}`. The
[create builder](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/create.go)
normalizes successful nil warnings to an allocated empty slice. Null warnings,
an omitted member, nonempty warning or unknown key denies. Persist returned
ID under existing exact custody before accepting a subsequent operation;
the ID alone is not an ownership/cleanup permit.

Inspect root keys are exactly container.InspectResponse. Required pointer
objects State, Config, HostConfig, NetworkSettings are non-null. Compare Id,
Name, Image, Path, Args, Platform, Driver, AppArmorProfile, MountLabel,
ProcessLabel, RestartCount, Config, HostConfig, Mounts, NetworkSettings and
conditional ImageManifestDescriptor. Names include the source leading slash
plus exact private generated name. Path is the selected singleton entrypoint;
Args is exactly `[]`. Platform is `linux`. Selected SELinux-disabled labels
are empty; AppArmorProfile equals the required realized profile. No health,
restart, unreviewed process or execution is inferred as harmless metadata.

Created is bounded RFC3339. ResolvConfPath, HostnamePath and HostsPath are
bounded strings compared to the exact trusted root-generated metadata recipe
and associated native held objects. LogPath is empty for selected `none`
logging. ExecIDs is the exact nil/empty encoding of an empty set; any ID
denies. SizeRw/SizeRootFs are omitted because the request sets size=0.
GraphDriver and Storage are mutually exclusive selected storage branches:

- Legacy graph branch: GraphDriver non-null exactly Name/Data as above,
  Storage omitted.
- Snapshotter branch: Storage non-null exactly RootFS, itself non-null exactly
  Snapshot, itself non-null exactly Name. The selected Name equals Driver;
  GraphDriver omitted. Optional tags do not permit these required positive
  nested objects to disappear. Snapshot name is an identifier, not proof of
  actual workload root mount.

### State phases

State has exactly Status, Running, Paused, Restarting, OOMKilled, Dead, Pid,
ExitCode, Error, StartedAt, FinishedAt; Health is omitted under `Test:["NONE"]`.
Times are bounded RFC3339 including the Go zero timestamp. Fixed positive
created state has Status `created`, all flags false, Pid 0, ExitCode 0,
Error empty, both times zero. The held startup state has Status `running`,
Running true, other flags false, positive Pid, ExitCode 0, Error empty,
positive StartedAt and zero FinishedAt. Native peer PID/start ticks, namespace,
cgroup and channel association must match; API state does not authenticate it.
Normal completion additionally requires Status `exited`, Running false,
Pid 0, all exceptional flags false, ExitCode 0, Error empty and valid completed
times with custody-preserving ordering. Other states deny admission/success;
cleanup/reconciliation handles their uncertainty under its separate contract.

### Config and HostConfig normalization

Config's required scalar/array/label values equal the private request after
the pinned image merge. User, entrypoint, workdir and environment are explicit.
An explicit singleton Entrypoint prevents image Cmd inheritance in the
[merge](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/commit.go).
Empty nonnil Cmd stays `[]`; the
[constructor](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/container.go)
derives nonnil Args `[]` separately. Config.Env is the merged fixed image
list; runtime defaults such as HOSTNAME/PATH are added separately by
CreateDaemonEnvironment and require the complete process-environment recipe.
No claim that Config.Env alone describes actual process environment is made.

Config omission rules are explicit: empty ExposedPorts omitted; ArgsEscaped
false omitted; NetworkDisabled false omitted; empty OnBuild/Shell omitted;
Healthcheck is non-null exactly Test `["NONE"]`, other health fields omitted;
StopSignal is `SIGKILL`, StopTimeout is 1. Volumes is required null or `{}`
according to the exact raw image config and pinned merge; any entry denies.
Labels is the exact closed request plus reviewed immutable image labels.
No unexpected image label/env/health/default survives comparison.

HostConfig's embedded Resources fields are flattened at HostConfig. Compare
all controls, including every requested finite ceiling, to the normalized
private request and root daemon defaults. The following full response tuple
is fixed, with no null/default substitution:

```text
LogConfig={Type:"none",Config:{}}, NetworkMode="none",
RestartPolicy={Name:"no",MaximumRetryCount:0}, AutoRemove=false,
Privileged=false, PublishAllPorts=false, ReadonlyRootfs=true,
CgroupnsMode="private", IpcMode="none"
```

LogConfig and RestartPolicy are non-null closed objects with exactly those
members; no options, restart modes or inherited logging configuration are
accepted. These response values equal the explicit request and are not
rewritten under the selected pinned daemon path. The mutation/omission rules
below cover the fields whose response representation differs from that
request. Explicit ShmSize is 67,108,864;
Ulimits is explicitly `[]` with root-attested daemon DefaultUlimits empty.
This is a proposed deterministic recipe choice; actual default provenance and
complete native resource observations still require review. Empty request
Ulimits alone does not disable daemon defaults. MemorySwap is already explicit
and equal to Memory, preventing the daemon's double-memory default. Nil
OomKillDisable is normalized to a false pointer; positive output is false,
not null. MemorySwappiness is null. PidsLimit is positive and exact.

Required empty list fields explicitly initialized by the request stay `[]`
except Links: the Inspect builder clears Links to nil before merging legacy
children, so selected no-link output is null. Binds, VolumesFrom, CapAdd,
GroupAdd, Dns, DnsOptions, DnsSearch, ExtraHosts, Devices, DeviceRequests and
DeviceCgroupRules are empty arrays. PortBindings is `{}`. CapDrop is exactly
`["ALL"]`; SecurityOpt exactly `["no-new-privileges:true"]`; no generated
SELinux option is expected for the selected disabled recipe. HostConfig
Annotations/StorageOpt/Tmpfs/Sysctls empty maps are omitted, not `{}`/null;
Mounts omitted for preparation and the exact one-bind array for action.
Init false is a non-null pointer value and is present. Runtime `runc` is
present. Umask is omitted. ContainerIDFile/VolumeDriver/Cgroup/PidMode/UTSMode/
UsernsMode/Isolation/CpusetCpus/CpusetMems are empty strings; ConsoleSize `[0,0]`;
OomScoreAdj, CpuShares, BlkioWeight and every unused integer control are zero.
CgroupParent equals the exact root recipe; no unreviewed parent selection.
Unused block-device throttle lists are null because the renderer does not
allocate them. Nonempty devices, requests, ports, sysctls, annotations,
storage options or tmpfs deny; their unselected nested types are not skipped.

MaskedPaths/ReadonlyPaths are nonempty exact default arrays after create;
they are not null simply because the request uses null. The
[create OS helper](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/create_unix.go)
populates them from OCI defaults. Masked paths include conditional existing
per-CPU thermal paths; the root realized recipe fixes the complete list and
native current observations verify it. ReadonlyPaths is exactly
`/proc/bus,/proc/fs,/proc/irq,/proc/sys,/proc/sysrq-trigger` in source order.

### Mounts and network children

Top-level Mounts is allocated `[]` for preparation, or exactly one closed
container.MountPoint for action: Type `bind`, exact held Source/Destination,
Mode `""`, RW true, Propagation `rprivate`; Name/Driver omitted. Structured
mount parsing does not populate the legacy Mode string. HostConfig.Mounts has
one non-null closed mount.Mount: Type/Source/Target plus BindOptions exactly
Propagation `rprivate`, NonRecursive true. ReadOnly/Consistency and the other
false bind options are omitted under their tags. VolumeOptions/ImageOptions/
TmpfsOptions/ClusterOptions are forbidden, including null placeholders.
Tracked API mounts do not enumerate generated metadata or built-in OCI mounts.
The full native mount inventory remains mandatory.

NetworkSettings is non-null exactly SandboxID, SandboxKey, Ports, Networks.
Ports is `{}`; Networks exactly `{none:<non-null EndpointSettings>}`. Every
EndpointSettings field in the appendix is present. IPAMConfig/Links/Aliases/
DriverOpts/DNSNames are null; GwPriority and prefix lengths are zero;
gateway/address/MAC strings empty. Before start NetworkID/EndpointID/SandboxID/
SandboxKey are empty. After successful start, IDs are actual full generated
64-hex identifiers; SandboxKey matches the trusted native network namespace
association. IDs must remain stable under held custody; no separate network
API is opened. The
[null driver](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/libnetwork/drivers/null/null.go)
creates no address/MAC/gateway, while endpoint join and the daemon builder
populate the generated IDs. Native private namespace/loopback-only checks
are independent requirements. Any operational address, alias, link, priority,
driver option or additional network denies.

The positive state comparison is phase-specific. After a normal completed
no-restart exit, NetworkID retains the previously held network ID, EndpointID
is empty, and SandboxID/SandboxKey are empty. Other configuration/zero-address
fields remain as above, and Inspect still allocates Ports `{}` even though
internal cleanup resets its source map to nil. The
[releaseNetwork/cleanOperationalData helpers](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/container_operations.go)
define these mutations. The
[exit handler](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/monitor.go)
holds the container lock and invokes Cleanup before SetStopped; the Inspect
builder holds the same lock. Do not require running endpoint/sandbox IDs on
the positive stopped response. API reset fields do not prove sandbox deletion:
cleanup errors can remain, so durable custody and native cleanup/absence
proof are still required before closing the preparation/action record.

## Wait, errors and complete-freeze gate

Normal Wait success is exactly `{StatusCode:0}`. Error is omitted when nil.
Present Error, including null, denies success; a non-null negative Error object
can only have bounded Message and is discarded. Nonzero exit, malformed body,
unexpected status, timeout or lost custody never becomes successful execution.
Other HTTP error bodies are bounded and discarded without interpreting text
as absence/ownership. A 404 establishes absence only through the separately
retained same-instance endpoint, journal and inspected-object custody.

The appendix and branch rules eliminate a generic unknown-field allowance;
they do not supply missing immutable recipe values. Complete source-freeze
review still requires actual component/kernel/image pins, realized default
mask/readonly/mount/device/environment/security recipe, meaningful negative
probe procedures, coherent native/daemon/wire/store synchronization and a
feasible supported positive case. Before implementation, recheck all omission
predicates against the complete selected renderer→merge→create→start→served
Inspect path, not an isolated struct. No fixture or Go catalog proves a live
kernel control. Enterprise/government deployment additionally retains the
[security requirements](../ENTERPRISE_GOVERNMENT_SECURITY_REQUIREMENTS.md)
and Phase 13/14 evidence gates.

## Exact field/type appendix

The following mechanically extracted inventory covers only the listed reachable
types. Imported types on forbidden nonempty branches are deliberately not
accepted. `—` means an untagged exported Go field name; tags retain source
case and omission options. Anonymous embedded fields are flattened, never
additional JSON keys. This inventory is supporting evidence, not a competing
acceptance record. Each source link is pinned; the copied source SHA-256 guards
the mechanical extraction snapshot, not an installed artifact.

### container.Config

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/config.go#L25) · snapshot SHA-256
`4c974b6b028baed3d7246e28abe1cbf032cd30b12fe1da6269744e00a8676713`.

| Go field          | Go type               | JSON tag     |
| ----------------- | --------------------- | ------------ |
| `Hostname`        | `string`              | —            |
| `Domainname`      | `string`              | —            |
| `User`            | `string`              | —            |
| `AttachStdin`     | `bool`                | —            |
| `AttachStdout`    | `bool`                | —            |
| `AttachStderr`    | `bool`                | —            |
| `ExposedPorts`    | `network.PortSet`     | `,omitempty` |
| `Tty`             | `bool`                | —            |
| `OpenStdin`       | `bool`                | —            |
| `StdinOnce`       | `bool`                | —            |
| `Env`             | `[]string`            | —            |
| `Cmd`             | `[]string`            | —            |
| `Healthcheck`     | `*HealthConfig`       | `,omitempty` |
| `ArgsEscaped`     | `bool`                | `,omitempty` |
| `Image`           | `string`              | —            |
| `Volumes`         | `map[string]struct{}` | —            |
| `WorkingDir`      | `string`              | —            |
| `Entrypoint`      | `[]string`            | —            |
| `NetworkDisabled` | `bool`                | `,omitempty` |
| `OnBuild`         | `[]string`            | `,omitempty` |
| `Labels`          | `map[string]string`   | —            |
| `StopSignal`      | `string`              | `,omitempty` |
| `StopTimeout`     | `*int`                | `,omitempty` |
| `Shell`           | `[]string`            | `,omitempty` |

### container.CreateResponse

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/create_response.go#L13) · snapshot SHA-256
`0bb39c935a3c4395b71350a1ac671a4057a760eff1a4ee81d8136fd2be454135`.

| Go field   | Go type    | JSON tag   |
| ---------- | ---------- | ---------- |
| `ID`       | `string`   | `Id`       |
| `Warnings` | `[]string` | `Warnings` |

### container.HostConfig

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/hostconfig.go#L418) · snapshot SHA-256
`9aadf7f6da56bca39ccd5712c75f4d0ea540ba990fb63b8d6f3729b6c9229cd9`.

| Go field          | Go type             | JSON tag     |
| ----------------- | ------------------- | ------------ |
| `Binds`           | `[]string`          | —            |
| `ContainerIDFile` | `string`            | —            |
| `LogConfig`       | `LogConfig`         | —            |
| `NetworkMode`     | `NetworkMode`       | —            |
| `PortBindings`    | `network.PortMap`   | —            |
| `RestartPolicy`   | `RestartPolicy`     | —            |
| `AutoRemove`      | `bool`              | —            |
| `VolumeDriver`    | `string`            | —            |
| `VolumesFrom`     | `[]string`          | —            |
| `ConsoleSize`     | `[2]uint`           | —            |
| `Annotations`     | `map[string]string` | `,omitempty` |
| `CapAdd`          | `[]string`          | —            |
| `CapDrop`         | `[]string`          | —            |
| `CgroupnsMode`    | `CgroupnsMode`      | —            |
| `DNS`             | `[]netip.Addr`      | `Dns`        |
| `DNSOptions`      | `[]string`          | `DnsOptions` |
| `DNSSearch`       | `[]string`          | `DnsSearch`  |
| `ExtraHosts`      | `[]string`          | —            |
| `GroupAdd`        | `[]string`          | —            |
| `IpcMode`         | `IpcMode`           | —            |
| `Cgroup`          | `CgroupSpec`        | —            |
| `Links`           | `[]string`          | —            |
| `OomScoreAdj`     | `int`               | —            |
| `PidMode`         | `PidMode`           | —            |
| `Privileged`      | `bool`              | —            |
| `PublishAllPorts` | `bool`              | —            |
| `ReadonlyRootfs`  | `bool`              | —            |
| `SecurityOpt`     | `[]string`          | —            |
| `StorageOpt`      | `map[string]string` | `,omitempty` |
| `Tmpfs`           | `map[string]string` | `,omitempty` |
| `UTSMode`         | `UTSMode`           | —            |
| `UsernsMode`      | `UsernsMode`        | —            |
| `ShmSize`         | `int64`             | —            |
| `Sysctls`         | `map[string]string` | `,omitempty` |
| `Runtime`         | `string`            | `,omitempty` |
| `Umask`           | `*uint32`           | `,omitempty` |
| `Isolation`       | `Isolation`         | —            |
| `` (flattened)    | `Resources`         | —            |
| `Mounts`          | `[]mount.Mount`     | `,omitempty` |
| `MaskedPaths`     | `[]string`          | —            |
| `ReadonlyPaths`   | `[]string`          | —            |
| `Init`            | `*bool`             | `,omitempty` |

### container.InspectResponse

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/container.go#L117) · snapshot SHA-256
`35510018abc7ff47a580a4ec12bdd567900365e7e1f75455ce61fb253d6b00ba`.

| Go field                  | Go type               | JSON tag                            |
| ------------------------- | --------------------- | ----------------------------------- |
| `ID`                      | `string`              | `Id`                                |
| `Created`                 | `string`              | —                                   |
| `Path`                    | `string`              | —                                   |
| `Args`                    | `[]string`            | —                                   |
| `State`                   | `*State`              | —                                   |
| `Image`                   | `string`              | —                                   |
| `ResolvConfPath`          | `string`              | —                                   |
| `HostnamePath`            | `string`              | —                                   |
| `HostsPath`               | `string`              | —                                   |
| `LogPath`                 | `string`              | —                                   |
| `Name`                    | `string`              | —                                   |
| `RestartCount`            | `int`                 | —                                   |
| `Driver`                  | `string`              | —                                   |
| `Platform`                | `string`              | —                                   |
| `MountLabel`              | `string`              | —                                   |
| `ProcessLabel`            | `string`              | —                                   |
| `AppArmorProfile`         | `string`              | —                                   |
| `ExecIDs`                 | `[]string`            | —                                   |
| `HostConfig`              | `*HostConfig`         | —                                   |
| `GraphDriver`             | `*storage.DriverData` | `GraphDriver,omitempty`             |
| `Storage`                 | `*storage.Storage`    | `Storage,omitempty`                 |
| `SizeRw`                  | `*int64`              | `,omitempty`                        |
| `SizeRootFs`              | `*int64`              | `,omitempty`                        |
| `Mounts`                  | `[]MountPoint`        | —                                   |
| `Config`                  | `*Config`             | —                                   |
| `NetworkSettings`         | `*NetworkSettings`    | —                                   |
| `ImageManifestDescriptor` | `*ocispec.Descriptor` | `ImageManifestDescriptor,omitempty` |

### container.LogConfig

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/hostconfig.go#L358) · snapshot SHA-256
`9aadf7f6da56bca39ccd5712c75f4d0ea540ba990fb63b8d6f3729b6c9229cd9`.

| Go field | Go type             | JSON tag |
| -------- | ------------------- | -------- |
| `Type`   | `string`            | —        |
| `Config` | `map[string]string` | —        |

### container.MountPoint

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/container.go#L32) · snapshot SHA-256
`35510018abc7ff47a580a4ec12bdd567900365e7e1f75455ce61fb253d6b00ba`.

| Go field      | Go type             | JSON tag     |
| ------------- | ------------------- | ------------ |
| `Type`        | `mount.Type`        | `,omitempty` |
| `Name`        | `string`            | `,omitempty` |
| `Source`      | `string`            | —            |
| `Destination` | `string`            | —            |
| `Driver`      | `string`            | `,omitempty` |
| `Mode`        | `string`            | —            |
| `RW`          | `bool`              | —            |
| `Propagation` | `mount.Propagation` | —            |

### container.NetworkSettings

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/network_settings.go#L8) · snapshot SHA-256
`307d67438b1a7ef337468303360e1395e7854866273fcc9d5b6145826689db72`.

| Go field     | Go type                                | JSON tag |
| ------------ | -------------------------------------- | -------- |
| `SandboxID`  | `string`                               | —        |
| `SandboxKey` | `string`                               | —        |
| `Ports`      | `network.PortMap`                      | —        |
| `Networks`   | `map[string]*network.EndpointSettings` | —        |

### container.Resources

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/hostconfig.go#L370) · snapshot SHA-256
`9aadf7f6da56bca39ccd5712c75f4d0ea540ba990fb63b8d6f3729b6c9229cd9`.

| Go field               | Go type                      | JSON tag             |
| ---------------------- | ---------------------------- | -------------------- |
| `CPUShares`            | `int64`                      | `CpuShares`          |
| `Memory`               | `int64`                      | —                    |
| `NanoCPUs`             | `int64`                      | `NanoCpus`           |
| `CgroupParent`         | `string`                     | —                    |
| `BlkioWeight`          | `uint16`                     | —                    |
| `BlkioWeightDevice`    | `[]*blkiodev.WeightDevice`   | —                    |
| `BlkioDeviceReadBps`   | `[]*blkiodev.ThrottleDevice` | —                    |
| `BlkioDeviceWriteBps`  | `[]*blkiodev.ThrottleDevice` | —                    |
| `BlkioDeviceReadIOps`  | `[]*blkiodev.ThrottleDevice` | —                    |
| `BlkioDeviceWriteIOps` | `[]*blkiodev.ThrottleDevice` | —                    |
| `CPUPeriod`            | `int64`                      | `CpuPeriod`          |
| `CPUQuota`             | `int64`                      | `CpuQuota`           |
| `CPURealtimePeriod`    | `int64`                      | `CpuRealtimePeriod`  |
| `CPURealtimeRuntime`   | `int64`                      | `CpuRealtimeRuntime` |
| `CpusetCpus`           | `string`                     | —                    |
| `CpusetMems`           | `string`                     | —                    |
| `Devices`              | `[]DeviceMapping`            | —                    |
| `DeviceCgroupRules`    | `[]string`                   | —                    |
| `DeviceRequests`       | `[]DeviceRequest`            | —                    |
| `MemoryReservation`    | `int64`                      | —                    |
| `MemorySwap`           | `int64`                      | —                    |
| `MemorySwappiness`     | `*int64`                     | —                    |
| `OomKillDisable`       | `*bool`                      | —                    |
| `PidsLimit`            | `*int64`                     | —                    |
| `Ulimits`              | `[]*Ulimit`                  | —                    |
| `CPUCount`             | `int64`                      | `CpuCount`           |
| `CPUPercent`           | `int64`                      | `CpuPercent`         |
| `IOMaximumIOps`        | `uint64`                     | —                    |
| `IOMaximumBandwidth`   | `uint64`                     | —                    |

### container.RestartPolicy

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/hostconfig.go#L275) · snapshot SHA-256
`9aadf7f6da56bca39ccd5712c75f4d0ea540ba990fb63b8d6f3729b6c9229cd9`.

| Go field            | Go type             | JSON tag |
| ------------------- | ------------------- | -------- |
| `Name`              | `RestartPolicyMode` | —        |
| `MaximumRetryCount` | `int`               | —        |

### container.State

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/container.go#L75) · snapshot SHA-256
`35510018abc7ff47a580a4ec12bdd567900365e7e1f75455ce61fb253d6b00ba`.

| Go field     | Go type          | JSON tag     |
| ------------ | ---------------- | ------------ |
| `Status`     | `ContainerState` | —            |
| `Running`    | `bool`           | —            |
| `Paused`     | `bool`           | —            |
| `Restarting` | `bool`           | —            |
| `OOMKilled`  | `bool`           | —            |
| `Dead`       | `bool`           | —            |
| `Pid`        | `int`            | —            |
| `ExitCode`   | `int`            | —            |
| `Error`      | `string`         | —            |
| `StartedAt`  | `string`         | —            |
| `FinishedAt` | `string`         | —            |
| `Health`     | `*Health`        | `,omitempty` |

### container.WaitExitError

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/wait_exit_error.go#L11) · snapshot SHA-256
`06b9eaf565c5a8a21a4cf12d6aab0bff54160015cc4d21f5a992ba005f6ec7e7`.

| Go field  | Go type  | JSON tag            |
| --------- | -------- | ------------------- |
| `Message` | `string` | `Message,omitempty` |

### container.WaitResponse

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/wait_response.go#L13) · snapshot SHA-256
`efca9bdb26fa2d35e376ed05fe618f2ceb68fc9b76cf9c48f1ab917fb562fc1d`.

| Go field     | Go type          | JSON tag          |
| ------------ | ---------------- | ----------------- |
| `Error`      | `*WaitExitError` | `Error,omitempty` |
| `StatusCode` | `int64`          | `StatusCode`      |

### image.InspectResponse

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/image/image_inspect.go#L17) · snapshot SHA-256
`1e553c587dc2bfba1010a2abe92a8499520d0413104a7e2d59db7abd912743da`.

| Go field       | Go type                            | JSON tag                |
| -------------- | ---------------------------------- | ----------------------- |
| `ID`           | `string`                           | `Id`                    |
| `RepoTags`     | `[]string`                         | —                       |
| `RepoDigests`  | `[]string`                         | —                       |
| `Comment`      | `string`                           | `,omitempty`            |
| `Created`      | `string`                           | `,omitempty`            |
| `Author`       | `string`                           | `,omitempty`            |
| `Config`       | `*dockerspec.DockerOCIImageConfig` | —                       |
| `Architecture` | `string`                           | —                       |
| `Variant`      | `string`                           | `,omitempty`            |
| `Os`           | `string`                           | —                       |
| `OsVersion`    | `string`                           | `,omitempty`            |
| `Size`         | `int64`                            | —                       |
| `GraphDriver`  | `*storage.DriverData`              | `GraphDriver,omitempty` |
| `RootFS`       | `RootFS`                           | —                       |
| `Metadata`     | `Metadata`                         | —                       |
| `Descriptor`   | `*ocispec.Descriptor`              | `Descriptor,omitempty`  |
| `Manifests`    | `[]ManifestSummary`                | `Manifests,omitempty`   |
| `Identity`     | `*Identity`                        | `Identity,omitempty`    |

### image.RootFS

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/image/image_inspect.go#L10) · snapshot SHA-256
`1e553c587dc2bfba1010a2abe92a8499520d0413104a7e2d59db7abd912743da`.

| Go field | Go type    | JSON tag     |
| -------- | ---------- | ------------ |
| `Type`   | `string`   | `,omitempty` |
| `Layers` | `[]string` | `,omitempty` |

### moby.api.types.image.Metadata

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/image/image.go#L8) · snapshot SHA-256
`5283b17b5529f119fad533a911128837a90cd7f64bf91f728f495a70794ae2cc`.

| Go field      | Go type     | JSON tag     |
| ------------- | ----------- | ------------ |
| `LastTagTime` | `time.Time` | `,omitempty` |

### moby.api.types.mount.BindOptions

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/mount/mount.go#L87) · snapshot SHA-256
`efb639220953d8176dd7b3a1fdd52dcd016669a59094d6585010a982ec4a1806`.

| Go field                 | Go type       | JSON tag     |
| ------------------------ | ------------- | ------------ |
| `Propagation`            | `Propagation` | `,omitempty` |
| `NonRecursive`           | `bool`        | `,omitempty` |
| `CreateMountpoint`       | `bool`        | `,omitempty` |
| `ReadOnlyNonRecursive`   | `bool`        | `,omitempty` |
| `ReadOnlyForceRecursive` | `bool`        | `,omitempty` |

### moby.api.types.mount.Mount

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/mount/mount.go#L27) · snapshot SHA-256
`efb639220953d8176dd7b3a1fdd52dcd016669a59094d6585010a982ec4a1806`.

| Go field         | Go type           | JSON tag     |
| ---------------- | ----------------- | ------------ |
| `Type`           | `Type`            | `,omitempty` |
| `Source`         | `string`          | `,omitempty` |
| `Target`         | `string`          | `,omitempty` |
| `ReadOnly`       | `bool`            | `,omitempty` |
| `Consistency`    | `Consistency`     | `,omitempty` |
| `BindOptions`    | `*BindOptions`    | `,omitempty` |
| `VolumeOptions`  | `*VolumeOptions`  | `,omitempty` |
| `ImageOptions`   | `*ImageOptions`   | `,omitempty` |
| `TmpfsOptions`   | `*TmpfsOptions`   | `,omitempty` |
| `ClusterOptions` | `*ClusterOptions` | `,omitempty` |

### moby.api.types.storage.DriverData

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/storage/driver_data.go#L12) · snapshot SHA-256
`37dc67a62ff5cc873bd38d6f66c075844eafa9b19f9644491d6af9a558656584`.

| Go field | Go type             | JSON tag |
| -------- | ------------------- | -------- |
| `Data`   | `map[string]string` | `Data`   |
| `Name`   | `string`            | `Name`   |

### moby.api.types.storage.RootFSStorage

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/storage/root_f_s_storage.go#L11) · snapshot SHA-256
`ab6dab1f46602cbf1c24c64284688d14ae61b1879f465c00624068f2867baf0d`.

| Go field   | Go type                  | JSON tag             |
| ---------- | ------------------------ | -------------------- |
| `Snapshot` | `*RootFSStorageSnapshot` | `Snapshot,omitempty` |

### moby.api.types.storage.RootFSStorageSnapshot

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/storage/root_f_s_storage_snapshot.go#L11) · snapshot SHA-256
`d7ea4a7388c81e645ddc1a4927ee40efe4994c1509de7f2d54655ce696563454`.

| Go field | Go type  | JSON tag         |
| -------- | -------- | ---------------- |
| `Name`   | `string` | `Name,omitempty` |

### moby.api.types.storage.Storage

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/storage/storage.go#L11) · snapshot SHA-256
`2a3fce37668a0f4fdcda47b675e87ccb412e33da858358894b6c5c6572b990a4`.

| Go field | Go type          | JSON tag           |
| -------- | ---------------- | ------------------ |
| `RootFS` | `*RootFSStorage` | `RootFS,omitempty` |

### moby.docker-image-spec.v1.DockerOCIImageConfig

[Exact source](https://github.com/moby/docker-image-spec/blob/v1.3.1/specs-go/v1/image.go#L20) · snapshot SHA-256
`e94a05acb57fb873dffe0c7ffeda0b7bcc287feefc946d1d6fa0e269e49c9a93`.

| Go field       | Go type                   | JSON tag |
| -------------- | ------------------------- | -------- |
| `` (flattened) | `ocispec.ImageConfig`     | —        |
| `` (flattened) | `DockerOCIImageConfigExt` | —        |

### moby.docker-image-spec.v1.DockerOCIImageConfigExt

[Exact source](https://github.com/moby/docker-image-spec/blob/v1.3.1/specs-go/v1/image.go#L27) · snapshot SHA-256
`e94a05acb57fb873dffe0c7ffeda0b7bcc287feefc946d1d6fa0e269e49c9a93`.

| Go field      | Go type              | JSON tag     |
| ------------- | -------------------- | ------------ |
| `Healthcheck` | `*HealthcheckConfig` | `,omitempty` |
| `OnBuild`     | `[]string`           | `,omitempty` |
| `Shell`       | `[]string`           | `,omitempty` |

### moby.docker-image-spec.v1.HealthcheckConfig

[Exact source](https://github.com/moby/docker-image-spec/blob/v1.3.1/specs-go/v1/image.go#L35) · snapshot SHA-256
`e94a05acb57fb873dffe0c7ffeda0b7bcc287feefc946d1d6fa0e269e49c9a93`.

| Go field        | Go type         | JSON tag     |
| --------------- | --------------- | ------------ |
| `Test`          | `[]string`      | `,omitempty` |
| `Interval`      | `time.Duration` | `,omitempty` |
| `Timeout`       | `time.Duration` | `,omitempty` |
| `StartPeriod`   | `time.Duration` | `,omitempty` |
| `StartInterval` | `time.Duration` | `,omitempty` |
| `Retries`       | `int`           | `,omitempty` |

### network.EndpointIPAMConfig

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/network/endpoint.go#L60) · snapshot SHA-256
`beaa06129a8b501538f6c82f3c171224ad905c9866c812912dca03caa1620494`.

| Go field       | Go type        | JSON tag                 |
| -------------- | -------------- | ------------------------ |
| `IPv4Address`  | `netip.Addr`   | `IPv4Address,omitzero`   |
| `IPv6Address`  | `netip.Addr`   | `IPv6Address,omitzero`   |
| `LinkLocalIPs` | `[]netip.Addr` | `LinkLocalIPs,omitempty` |

### network.EndpointSettings

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/network/endpoint.go#L10) · snapshot SHA-256
`beaa06129a8b501538f6c82f3c171224ad905c9866c812912dca03caa1620494`.

| Go field              | Go type               | JSON tag |
| --------------------- | --------------------- | -------- |
| `IPAMConfig`          | `*EndpointIPAMConfig` | —        |
| `Links`               | `[]string`            | —        |
| `Aliases`             | `[]string`            | —        |
| `DriverOpts`          | `map[string]string`   | —        |
| `GwPriority`          | `int`                 | —        |
| `NetworkID`           | `string`              | —        |
| `EndpointID`          | `string`              | —        |
| `Gateway`             | `netip.Addr`          | —        |
| `IPAddress`           | `netip.Addr`          | —        |
| `MacAddress`          | `HardwareAddr`        | —        |
| `IPPrefixLen`         | `int`                 | —        |
| `IPv6Gateway`         | `netip.Addr`          | —        |
| `GlobalIPv6Address`   | `netip.Addr`          | —        |
| `GlobalIPv6PrefixLen` | `int`                 | —        |
| `DNSNames`            | `[]string`            | —        |

### oci.image-spec.v1.Descriptor

[Exact source](https://github.com/opencontainers/image-spec/blob/v1.1.1/specs-go/v1/descriptor.go#L22) · snapshot SHA-256
`15a2dd7bcee754aba53090539b304e06fad2b7809d0ba66cee4eb043ef2912f6`.

| Go field       | Go type             | JSON tag                 |
| -------------- | ------------------- | ------------------------ |
| `MediaType`    | `string`            | `mediaType`              |
| `Digest`       | `digest.Digest`     | `digest`                 |
| `Size`         | `int64`             | `size`                   |
| `URLs`         | `[]string`          | `urls,omitempty`         |
| `Annotations`  | `map[string]string` | `annotations,omitempty`  |
| `Data`         | `[]byte`            | `data,omitempty`         |
| `Platform`     | `*Platform`         | `platform,omitempty`     |
| `ArtifactType` | `string`            | `artifactType,omitempty` |

### oci.image-spec.v1.ImageConfig

[Exact source](https://github.com/opencontainers/image-spec/blob/v1.1.1/specs-go/v1/config.go#L24) · snapshot SHA-256
`27a0ba54e5c90533ce58bd84756d9bded3c7335c3609cac3295fe2381cf87935`.

| Go field       | Go type               | JSON tag                 |
| -------------- | --------------------- | ------------------------ |
| `User`         | `string`              | `User,omitempty`         |
| `ExposedPorts` | `map[string]struct{}` | `ExposedPorts,omitempty` |
| `Env`          | `[]string`            | `Env,omitempty`          |
| `Entrypoint`   | `[]string`            | `Entrypoint,omitempty`   |
| `Cmd`          | `[]string`            | `Cmd,omitempty`          |
| `Volumes`      | `map[string]struct{}` | `Volumes,omitempty`      |
| `WorkingDir`   | `string`              | `WorkingDir,omitempty`   |
| `Labels`       | `map[string]string`   | `Labels,omitempty`       |
| `StopSignal`   | `string`              | `StopSignal,omitempty`   |
| `ArgsEscaped`  | `bool`                | `ArgsEscaped,omitempty`  |

### oci.image-spec.v1.Platform

[Exact source](https://github.com/opencontainers/image-spec/blob/v1.1.1/specs-go/v1/descriptor.go#L53) · snapshot SHA-256
`15a2dd7bcee754aba53090539b304e06fad2b7809d0ba66cee4eb043ef2912f6`.

| Go field       | Go type    | JSON tag                |
| -------------- | ---------- | ----------------------- |
| `Architecture` | `string`   | `architecture`          |
| `OS`           | `string`   | `os`                    |
| `OSVersion`    | `string`   | `os.version,omitempty`  |
| `OSFeatures`   | `[]string` | `os.features,omitempty` |
| `Variant`      | `string`   | `variant,omitempty`     |

### registry.IndexInfo

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/registry/registry.go#L45) · snapshot SHA-256
`9c52d25141374c205fd15800b8042fc912b06420b00c6d128d3233cea98136e9`.

| Go field   | Go type    | JSON tag |
| ---------- | ---------- | -------- |
| `Name`     | `string`   | —        |
| `Mirrors`  | `[]string` | —        |
| `Secure`   | `bool`     | —        |
| `Official` | `bool`     | —        |

### registry.ServiceConfig

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/registry/registry.go#L10) · snapshot SHA-256
`9c52d25141374c205fd15800b8042fc912b06420b00c6d128d3233cea98136e9`.

| Go field                | Go type                 | JSON tag                |
| ----------------------- | ----------------------- | ----------------------- |
| `InsecureRegistryCIDRs` | `[]netip.Prefix`        | `InsecureRegistryCIDRs` |
| `IndexConfigs`          | `map[string]*IndexInfo` | `IndexConfigs`          |
| `Mirrors`               | `[]string`              | —                       |

### swarm.Info

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/swarm/swarm.go#L200) · snapshot SHA-256
`26768a857f33ef68d246f83377fba3d7176a441e98497f9261a409c6e2df29c5`.

| Go field           | Go type          | JSON tag     |
| ------------------ | ---------------- | ------------ |
| `NodeID`           | `string`         | —            |
| `NodeAddr`         | `string`         | —            |
| `LocalNodeState`   | `LocalNodeState` | —            |
| `ControlAvailable` | `bool`           | —            |
| `Error`            | `string`         | —            |
| `RemoteManagers`   | `[]Peer`         | —            |
| `Nodes`            | `int`            | `,omitempty` |
| `Managers`         | `int`            | `,omitempty` |
| `Cluster`          | `*ClusterInfo`   | `,omitempty` |
| `Warnings`         | `[]string`       | `,omitempty` |

### swarm.Peer

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/swarm/swarm.go#L218) · snapshot SHA-256
`26768a857f33ef68d246f83377fba3d7176a441e98497f9261a409c6e2df29c5`.

| Go field | Go type  | JSON tag |
| -------- | -------- | -------- |
| `NodeID` | `string` | —        |
| `Addr`   | `string` | —        |

### system.Commit

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L140) · snapshot SHA-256
`1a56684bb26042b2db36b834d69776e2e9252ce8f0bd5e2e2714defb5f2253da`.

| Go field | Go type  | JSON tag |
| -------- | -------- | -------- |
| `ID`     | `string` | —        |

### system.ComponentVersion

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/version_response.go#L47) · snapshot SHA-256
`4a6c532645f9eaaddcc0ffb3ab1e7942047e931bb2cf1ac28e58c27238c313a3`.

| Go field  | Go type             | JSON tag     |
| --------- | ------------------- | ------------ |
| `Name`    | `string`            | —            |
| `Version` | `string`            | —            |
| `Details` | `map[string]string` | `,omitempty` |

### system.ContainerdInfo

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L89) · snapshot SHA-256
`1a56684bb26042b2db36b834d69776e2e9252ce8f0bd5e2e2714defb5f2253da`.

| Go field     | Go type                | JSON tag     |
| ------------ | ---------------------- | ------------ |
| `Address`    | `string`               | `,omitempty` |
| `Namespaces` | `ContainerdNamespaces` | —            |

### system.ContainerdNamespaces

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L105) · snapshot SHA-256
`1a56684bb26042b2db36b834d69776e2e9252ce8f0bd5e2e2714defb5f2253da`.

| Go field     | Go type  | JSON tag |
| ------------ | -------- | -------- |
| `Containers` | `string` | —        |
| `Plugins`    | `string` | —        |

### system.DeviceInfo

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L160) · snapshot SHA-256
`1a56684bb26042b2db36b834d69776e2e9252ce8f0bd5e2e2714defb5f2253da`.

| Go field | Go type  | JSON tag |
| -------- | -------- | -------- |
| `Source` | `string` | `Source` |
| `ID`     | `string` | `ID`     |

### system.FirewallInfo

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L152) · snapshot SHA-256
`1a56684bb26042b2db36b834d69776e2e9252ce8f0bd5e2e2714defb5f2253da`.

| Go field | Go type       | JSON tag         |
| -------- | ------------- | ---------------- |
| `Driver` | `string`      | `Driver`         |
| `Info`   | `[][2]string` | `Info,omitempty` |

### system.Info

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L13) · snapshot SHA-256
`1a56684bb26042b2db36b834d69776e2e9252ce8f0bd5e2e2714defb5f2253da`.

| Go field              | Go type                        | JSON tag                    |
| --------------------- | ------------------------------ | --------------------------- |
| `ID`                  | `string`                       | —                           |
| `Containers`          | `int`                          | —                           |
| `ContainersRunning`   | `int`                          | —                           |
| `ContainersPaused`    | `int`                          | —                           |
| `ContainersStopped`   | `int`                          | —                           |
| `Images`              | `int`                          | —                           |
| `Driver`              | `string`                       | —                           |
| `DriverStatus`        | `[][2]string`                  | —                           |
| `SystemStatus`        | `[][2]string`                  | `,omitempty`                |
| `Plugins`             | `PluginsInfo`                  | —                           |
| `MemoryLimit`         | `bool`                         | —                           |
| `SwapLimit`           | `bool`                         | —                           |
| `CPUCfsPeriod`        | `bool`                         | `CpuCfsPeriod`              |
| `CPUCfsQuota`         | `bool`                         | `CpuCfsQuota`               |
| `CPUShares`           | `bool`                         | —                           |
| `CPUSet`              | `bool`                         | —                           |
| `PidsLimit`           | `bool`                         | —                           |
| `IPv4Forwarding`      | `bool`                         | —                           |
| `Debug`               | `bool`                         | —                           |
| `NFd`                 | `int`                          | —                           |
| `OomKillDisable`      | `bool`                         | —                           |
| `NGoroutines`         | `int`                          | —                           |
| `SystemTime`          | `string`                       | —                           |
| `LoggingDriver`       | `string`                       | —                           |
| `CgroupDriver`        | `string`                       | —                           |
| `CgroupVersion`       | `string`                       | `,omitempty`                |
| `NEventsListener`     | `int`                          | —                           |
| `KernelVersion`       | `string`                       | —                           |
| `OperatingSystem`     | `string`                       | —                           |
| `OSVersion`           | `string`                       | —                           |
| `OSType`              | `string`                       | —                           |
| `Architecture`        | `string`                       | —                           |
| `IndexServerAddress`  | `string`                       | —                           |
| `RegistryConfig`      | `*registry.ServiceConfig`      | —                           |
| `NCPU`                | `int`                          | —                           |
| `MemTotal`            | `int64`                        | —                           |
| `GenericResources`    | `[]swarm.GenericResource`      | —                           |
| `DockerRootDir`       | `string`                       | —                           |
| `HTTPProxy`           | `string`                       | `HttpProxy`                 |
| `HTTPSProxy`          | `string`                       | `HttpsProxy`                |
| `NoProxy`             | `string`                       | —                           |
| `Name`                | `string`                       | —                           |
| `Labels`              | `[]string`                     | —                           |
| `ExperimentalBuild`   | `bool`                         | —                           |
| `ServerVersion`       | `string`                       | —                           |
| `Runtimes`            | `map[string]RuntimeWithStatus` | —                           |
| `DefaultRuntime`      | `string`                       | —                           |
| `Swarm`               | `swarm.Info`                   | —                           |
| `LiveRestoreEnabled`  | `bool`                         | —                           |
| `Isolation`           | `container.Isolation`          | —                           |
| `InitBinary`          | `string`                       | —                           |
| `ContainerdCommit`    | `Commit`                       | —                           |
| `RuncCommit`          | `Commit`                       | —                           |
| `InitCommit`          | `Commit`                       | —                           |
| `SecurityOptions`     | `[]string`                     | —                           |
| `ProductLicense`      | `string`                       | `,omitempty`                |
| `DefaultAddressPools` | `[]NetworkAddressPool`         | `,omitempty`                |
| `FirewallBackend`     | `*FirewallInfo`                | `FirewallBackend,omitempty` |
| `CDISpecDirs`         | `[]string`                     | —                           |
| `DiscoveredDevices`   | `[]DeviceInfo`                 | `,omitempty`                |
| `NRI`                 | `*NRIInfo`                     | `,omitempty`                |
| `Containerd`          | `*ContainerdInfo`              | `,omitempty`                |
| `Warnings`            | `[]string`                     | —                           |

### system.NRIInfo

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L169) · snapshot SHA-256
`1a56684bb26042b2db36b834d69776e2e9252ce8f0bd5e2e2714defb5f2253da`.

| Go field | Go type       | JSON tag         |
| -------- | ------------- | ---------------- |
| `Info`   | `[][2]string` | `Info,omitempty` |

### system.NetworkAddressPool

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L146) · snapshot SHA-256
`1a56684bb26042b2db36b834d69776e2e9252ce8f0bd5e2e2714defb5f2253da`.

| Go field | Go type        | JSON tag |
| -------- | -------------- | -------- |
| `Base`   | `netip.Prefix` | —        |
| `Size`   | `int`          | —        |

### system.PlatformInfo

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/version_response.go#L40) · snapshot SHA-256
`4a6c532645f9eaaddcc0ffb3ab1e7942047e931bb2cf1ac28e58c27238c313a3`.

| Go field | Go type  | JSON tag |
| -------- | -------- | -------- |
| `Name`   | `string` | —        |

### system.PluginsInfo

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L127) · snapshot SHA-256
`1a56684bb26042b2db36b834d69776e2e9252ce8f0bd5e2e2714defb5f2253da`.

| Go field        | Go type    | JSON tag |
| --------------- | ---------- | -------- |
| `Volume`        | `[]string` | —        |
| `Network`       | `[]string` | —        |
| `Authorization` | `[]string` | —        |
| `Log`           | `[]string` | —        |

### system.Runtime

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/runtime.go#L4) · snapshot SHA-256
`b5ec2f7d0d632ae758f26f3874d8045b6947874d290813e46e66a6b920e01054`.

| Go field  | Go type          | JSON tag                |
| --------- | ---------------- | ----------------------- |
| `Path`    | `string`         | `path,omitempty`        |
| `Args`    | `[]string`       | `runtimeArgs,omitempty` |
| `Type`    | `string`         | `runtimeType,omitempty` |
| `Options` | `map[string]any` | `options,omitempty`     |

### system.RuntimeWithStatus

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/runtime.go#L17) · snapshot SHA-256
`b5ec2f7d0d632ae758f26f3874d8045b6947874d290813e46e66a6b920e01054`.

| Go field       | Go type             | JSON tag           |
| -------------- | ------------------- | ------------------ |
| `` (flattened) | `Runtime`           | —                  |
| `Status`       | `map[string]string` | `status,omitempty` |

### system.VersionResponse

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/version_response.go#L5) · snapshot SHA-256
`4a6c532645f9eaaddcc0ffb3ab1e7942047e931bb2cf1ac28e58c27238c313a3`.

| Go field        | Go type              | JSON tag                  |
| --------------- | -------------------- | ------------------------- |
| `Platform`      | `PlatformInfo`       | `,omitempty`              |
| `Version`       | `string`             | —                         |
| `APIVersion`    | `string`             | `ApiVersion`              |
| `MinAPIVersion` | `string`             | `MinAPIVersion,omitempty` |
| `Os`            | `string`             | —                         |
| `Arch`          | `string`             | —                         |
| `Components`    | `[]ComponentVersion` | `,omitempty`              |
| `GitCommit`     | `string`             | `,omitempty`              |
| `GoVersion`     | `string`             | `,omitempty`              |
| `KernelVersion` | `string`             | `,omitempty`              |
| `Experimental`  | `bool`               | `,omitempty`              |
| `BuildTime`     | `string`             | `,omitempty`              |
