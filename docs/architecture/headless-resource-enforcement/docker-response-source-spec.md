# HCFG-6 Closed Docker Response Source Specification

Status: proposed supporting private source contract. This closes response field
coverage and records exact source normalization; it does not complete the full
native freeze. [Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design)
owns acceptance and implementation. The Phase 11 operator packet owns runtime
truth. No parser, verifier, Docker operation or activation is implemented here.

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

## Info response

Root keys are exactly system.Info, subject to these classifications:

| Class      | Exact root paths                                                                                                              | Rule                                                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compare    | ID, ServerVersion, OSType, Architecture, KernelVersion, OSVersion, OperatingSystem, DockerRootDir                             | Exact root-attested current daemon/host recipe. Informational claims do not authenticate themselves. DockerRootDir alone never supplies a trusted path. |
| Compare    | Driver, CgroupDriver, CgroupVersion, DefaultRuntime, Runtimes                                                                 | Selected storage backend, `systemd`, `2`, `runc` and the exact stock runtime set/shape below.                                                           |
| Compare    | MemoryLimit, SwapLimit, CpuCfsPeriod, CpuCfsQuota, PidsLimit                                                                  | True, plus actual native controls. Availability booleans do not prove the workload limits.                                                              |
| Compare    | SecurityOptions, Plugins, Debug, ExperimentalBuild, LiveRestoreEnabled, Isolation, CDISpecDirs, Containerd                    | Exact root recipe, selected no rootless/remap/SELinux/NRI/CDI/additional authorization/runtime plugins; private seccomp/AppArmor/cgroupns expectations. |
| Compare    | ContainerdCommit, RuncCommit, InitCommit, InitBinary                                                                          | Closed Commit `{ID:string}` objects and exact reviewed component recipe. No legacy Expected member.                                                     |
| Compare    | Swarm                                                                                                                         | Exact inactive served shape below.                                                                                                                      |
| Discard    | Containers, ContainersRunning, ContainersPaused, ContainersStopped, Images, NFd, NGoroutines, NEventsListener, NCPU, MemTotal | Nonnegative bounded integers; NCPU/MemTotal must also meet the selected finite preparation/action recipe's host requirements.                           |
| Discard    | CPUShares, CPUSet, IPv4Forwarding, OomKillDisable                                                                             | Booleans only. OomKillDisable availability may be false on cgroup v2; HostConfig false and native observation remain required.                          |
| Discard    | SystemTime, LoggingDriver, IndexServerAddress, HttpProxy, HttpsProxy, NoProxy, Name, ProductLicense                           | Bounded strings; SystemTime is RFC3339. These cannot change the private request enum or selected container LogConfig.                                   |
| Discard    | DriverStatus, FirewallBackend, RegistryConfig, DefaultAddressPools, Labels, Warnings                                          | Closed typed child rules below; no interpretation of warning text as proof.                                                                             |
| Forbid     | SystemStatus, NRI, DiscoveredDevices                                                                                          | Omitted for the selected first recipe; even present null denies.                                                                                        |
| Empty only | GenericResources                                                                                                              | Required null or empty array as fixed by the root daemon recipe; any resource element denies before accepting its unmodeled alternatives.               |

SecurityOptions is a finite unique string array whose exact set equals the
realized recipe. A string can include a profile suffix: the stock AppArmor
entry is `name=apparmor,profile=default`, not merely `name=apparmor`.
Seccomp's actual source-specific profile entry must also be frozen. Absence
of a denial name alone does not prove a required positive control.

Runtimes has exactly `runc` and `io.containerd.runc.v2` for the selected stock
source recipe. Each is a closed system.RuntimeWithStatus object. `path` is the
exact reviewed runc path; runtimeArgs/runtimeType/options are omitted, never
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
is optional. It is exactly optional nonempty Address plus required Namespaces,
which is exactly Containers and Plugins strings. Presence/values equal the
root recipe; no alternate endpoint is opened from these strings.

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
`48b2946ba394372a3ba21d67b7e1418c53e4b8d67996509a2aa9ca962f244caa`.

| Go field   | Go type    | JSON tag |
| ---------- | ---------- | -------- |
| `Name`     | `string`   | —        |
| `Mirrors`  | `[]string` | —        |
| `Secure`   | `bool`     | —        |
| `Official` | `bool`     | —        |

### registry.ServiceConfig

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/registry/registry.go#L10) · snapshot SHA-256
`48b2946ba394372a3ba21d67b7e1418c53e4b8d67996509a2aa9ca962f244caa`.

| Go field                | Go type                 | JSON tag                |
| ----------------------- | ----------------------- | ----------------------- |
| `InsecureRegistryCIDRs` | `[]netip.Prefix`        | `InsecureRegistryCIDRs` |
| `IndexConfigs`          | `map[string]*IndexInfo` | `IndexConfigs`          |
| `Mirrors`               | `[]string`              | —                       |

### swarm.Info

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/swarm/swarm.go#L200) · snapshot SHA-256
`253023debb7e06788d759a317c154d5976f44324098118d39ed1e1df88681140`.

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
`253023debb7e06788d759a317c154d5976f44324098118d39ed1e1df88681140`.

| Go field | Go type  | JSON tag |
| -------- | -------- | -------- |
| `NodeID` | `string` | —        |
| `Addr`   | `string` | —        |

### system.Commit

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L140) · snapshot SHA-256
`79fbfde7a547bd14538b429659b89273e417fb5f531d372de99e077d58010115`.

| Go field | Go type  | JSON tag |
| -------- | -------- | -------- |
| `ID`     | `string` | —        |

### system.ComponentVersion

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/version_response.go#L47) · snapshot SHA-256
`0d3eed498ed406989f3d3eb5d1627640a362fd0e815023cb8c862a8d8b3643aa`.

| Go field  | Go type             | JSON tag     |
| --------- | ------------------- | ------------ |
| `Name`    | `string`            | —            |
| `Version` | `string`            | —            |
| `Details` | `map[string]string` | `,omitempty` |

### system.ContainerdInfo

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L89) · snapshot SHA-256
`79fbfde7a547bd14538b429659b89273e417fb5f531d372de99e077d58010115`.

| Go field     | Go type                | JSON tag     |
| ------------ | ---------------------- | ------------ |
| `Address`    | `string`               | `,omitempty` |
| `Namespaces` | `ContainerdNamespaces` | —            |

### system.ContainerdNamespaces

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L105) · snapshot SHA-256
`79fbfde7a547bd14538b429659b89273e417fb5f531d372de99e077d58010115`.

| Go field     | Go type  | JSON tag |
| ------------ | -------- | -------- |
| `Containers` | `string` | —        |
| `Plugins`    | `string` | —        |

### system.DeviceInfo

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L160) · snapshot SHA-256
`79fbfde7a547bd14538b429659b89273e417fb5f531d372de99e077d58010115`.

| Go field | Go type  | JSON tag |
| -------- | -------- | -------- |
| `Source` | `string` | `Source` |
| `ID`     | `string` | `ID`     |

### system.FirewallInfo

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L152) · snapshot SHA-256
`79fbfde7a547bd14538b429659b89273e417fb5f531d372de99e077d58010115`.

| Go field | Go type       | JSON tag         |
| -------- | ------------- | ---------------- |
| `Driver` | `string`      | `Driver`         |
| `Info`   | `[][2]string` | `Info,omitempty` |

### system.Info

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L13) · snapshot SHA-256
`79fbfde7a547bd14538b429659b89273e417fb5f531d372de99e077d58010115`.

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
`79fbfde7a547bd14538b429659b89273e417fb5f531d372de99e077d58010115`.

| Go field | Go type       | JSON tag         |
| -------- | ------------- | ---------------- |
| `Info`   | `[][2]string` | `Info,omitempty` |

### system.NetworkAddressPool

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L146) · snapshot SHA-256
`79fbfde7a547bd14538b429659b89273e417fb5f531d372de99e077d58010115`.

| Go field | Go type        | JSON tag |
| -------- | -------------- | -------- |
| `Base`   | `netip.Prefix` | —        |
| `Size`   | `int`          | —        |

### system.PlatformInfo

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/version_response.go#L40) · snapshot SHA-256
`0d3eed498ed406989f3d3eb5d1627640a362fd0e815023cb8c862a8d8b3643aa`.

| Go field | Go type  | JSON tag |
| -------- | -------- | -------- |
| `Name`   | `string` | —        |

### system.PluginsInfo

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/info.go#L127) · snapshot SHA-256
`79fbfde7a547bd14538b429659b89273e417fb5f531d372de99e077d58010115`.

| Go field        | Go type    | JSON tag |
| --------------- | ---------- | -------- |
| `Volume`        | `[]string` | —        |
| `Network`       | `[]string` | —        |
| `Authorization` | `[]string` | —        |
| `Log`           | `[]string` | —        |

### system.Runtime

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/runtime.go#L4) · snapshot SHA-256
`4259b834ec17b890b3e963568071a6f648b17b4f922335cf776c65ad1cee0644`.

| Go field  | Go type          | JSON tag                |
| --------- | ---------------- | ----------------------- |
| `Path`    | `string`         | `path,omitempty`        |
| `Args`    | `[]string`       | `runtimeArgs,omitempty` |
| `Type`    | `string`         | `runtimeType,omitempty` |
| `Options` | `map[string]any` | `options,omitempty`     |

### system.RuntimeWithStatus

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/runtime.go#L17) · snapshot SHA-256
`4259b834ec17b890b3e963568071a6f648b17b4f922335cf776c65ad1cee0644`.

| Go field       | Go type             | JSON tag           |
| -------------- | ------------------- | ------------------ |
| `` (flattened) | `Runtime`           | —                  |
| `Status`       | `map[string]string` | `status,omitempty` |

### system.VersionResponse

[Exact source](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/system/version_response.go#L5) · snapshot SHA-256
`0d3eed498ed406989f3d3eb5d1627640a362fd0e815023cb8c862a8d8b3643aa`.

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
