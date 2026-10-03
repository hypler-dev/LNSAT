# HCFG-6 Docker Transport and Immutable Recipe Source Specification

Status: proposed supporting source contract. Independent complete-freeze review
is still required. [Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design)
owns acceptance and implementation; the Phase 11 packet owns runtime truth.
This defines private source behavior. It executes no Docker operation and does
not provide component, kernel or image artifact pins.

## Exact primary source

The accepted tuple is Engine 29.8.2, API 1.56, bundled containerd 2.3.6 and runc
1.5.2. Moby tag `docker-v29.8.2` resolves to commit
`8af9fe3a36bab3e039862a2ab1cef1880c9b4d03`. Its
[daemon configuration](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/config/config.go)
explicitly sets `MaxAPIVersion=1.56`, and its
[API schema](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/swagger.yaml)
has base path `/v1.56`. The general documentation matrix's conflicting 1.55
row is not used to override these exact source facts. The
[official release notes](https://docs.docker.com/engine/release-notes/29/)
identify the bundled containerd/runc versions. Source identities do not
authenticate installed artifacts or the current daemon.

## Private request enum

Every path below is prefixed `/v1.56`. The private renderer accepts only the
listed enum variant and its already checked opaque ID. No public caller can
construct an HTTP request, choose a verb/query, substitute a name or obtain
the connected stream. No environment discovery, redirect, negotiation,
Docker CLI, build, pull, exec, prune, registry, volume or network API exists.

| Operation                        | Exact method/path/query                                                            | Required success                |
| -------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------- |
| Version                          | `GET /version`                                                                     | 200 JSON                        |
| Engine facts                     | `GET /info`                                                                        | 200 JSON                        |
| Image                            | `GET /images/{config_image_id}/json`                                               | 200 JSON                        |
| Create                           | `POST /containers/create?name={private_name}`                                      | 201 JSON                        |
| Inspect own object               | `GET /containers/{container_id}/json?size=0`                                       | 200 JSON                        |
| Inspect exact preparation orphan | `GET /containers/lnsat-hcfg6-probe-{preparation_id}/json?size=0`                   | 200 JSON or exact current 404   |
| Attach                           | `POST /containers/{container_id}/attach?logs=0&stream=1&stdin=1&stdout=1&stderr=1` | 101 upgraded multiplexed stream |
| Start once                       | `POST /containers/{container_id}/start`                                            | 204 empty                       |
| Wait                             | `POST /containers/{container_id}/wait?condition=not-running`                       | 200 JSON                        |
| Kill owned running object        | `POST /containers/{container_id}/kill?signal=SIGKILL`                              | 204 empty                       |
| Remove inspected own object      | `DELETE /containers/{container_id}?v=0&force=0&link=0`                             | 204 empty                       |

Image selectors are exact `sha256:` config ImageIDs. Other IDs are complete
64-lowercase-hex values, never prefixes. Names contain only fixed ASCII plus
a private 64-hex draw: preparation names above; action names
`lnsat-hcfg6-action-{channel_id}`. An action name is never a retry selector.
No other query is sent, including `platform`, detach keys or manifest-list
options. A current 404 is absence evidence only under retained endpoint and
journal/object custody; it is never independently success. 304 start, 409
conflict, 200 delete, all redirects and every unexpected status deny. A
transport failure after request bytes might have arrived is ambiguous.

Each control request uses HTTP/1.1, `Host: localhost`, exact `Content-Length`,
`Content-Type: application/json` and `Connection: close`. GET and bodyless
operations have length zero. Create is the sole JSON request body, at most
64 KiB. Attach instead uses `Connection: Upgrade` and `Upgrade: tcp`, length
zero. Reconnect only through the same private socket/peer verifier; all control
streams and the held attach stream must match the same manifest instance.
No pipelining, cookies, bearer, proxy or forwarded header is admitted.

Headers are bounded by 16 KiB, 64 fields and 4 KiB per line. Names are ASCII
case-insensitive, values have no folding/control bytes, and duplicate fields
deny. Require one supported content type and unambiguous framing. JSON uses
either one bounded decimal Content-Length or exact sole `Transfer-Encoding:
chunked`, never both. Chunk extensions, trailers, nonterminal partial chunks,
extra body bytes and close-delimited JSON deny. A chunk is at most 64 KiB and
aggregate decoded body at most 1 MiB; charge framing bytes/deadline before
allocation. Empty responses have no body and absent/zero length. Other interim
responses are forbidden. Header metadata is discarded after validation.

Attach's exact 101 response requires `Connection: Upgrade`, `Upgrade: tcp`,
`Content-Type: application/vnd.docker.multiplexed-stream`, no HTTP body
length/transfer encoding, and no extra interim response. This is the exact
[tagged handler's API >=1.42 non-TTY upgrade branch](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/server/router/container/container_routes.go).
Do not accept its alternative 200/raw-stream branch or a WebSocket endpoint.
Adapter stdin is the unframed private canonical wire stream. Daemon output
has eight-byte headers: stdout ID 1 or stderr ID 2, three zero reserved bytes,
then big-endian u32 payload length. A payload is at most 64 KiB; arbitrary
transport fragmentation and multiple mux chunks may carry one bounded JSON
frame. Empty chunks may be skipped within the byte/deadline budget. ID 0,
system-error ID 3, nonzero reserved bytes, incomplete header/payload and any
nonempty stderr deny. A JSON frame is validated independently after bounded
reassembly; mux boundaries are not JSON frame boundaries. All headers, mux
bytes and startup output count toward the uninterrupted budget.

## Exact private create body

Create is built from verified private state, not deserialized caller JSON.
The top-level fields are exactly:

```text
Hostname, Domainname, User, AttachStdin, AttachStdout, AttachStderr,
ExposedPorts, Tty, OpenStdin, StdinOnce, Env, Cmd, Healthcheck, ArgsEscaped,
Image, Volumes, WorkingDir, Entrypoint, NetworkDisabled, OnBuild, Labels,
StopSignal, StopTimeout, Shell, HostConfig, NetworkingConfig
```

Fixed values: hostname `lnsat`, empty domain, decimal selected `uid:gid`, all
three attach flags true, no ports, TTY false, OpenStdin true, StdinOnce true,
empty Cmd/OnBuild/Shell, ArgsEscaped false, no image volume and
`Healthcheck={"Test":["NONE"]}`. Image is the independently verified exact
local config ImageID. Entrypoint is a singleton immutable probe or adapter
path. WorkingDir is `/` for preparation and the verified profile target for
action. NetworkDisabled is false with NetworkMode none; this preserves the
private network namespace. StopSignal is `SIGKILL`, StopTimeout is 1.
NetworkingConfig is exactly `{"EndpointsConfig":{}}`.

Numeric `uid:gid` is mandatory, never an image username/group name. The tagged
Moby `getUser` still seeds OCI AdditionalGids with that primary GID even when
GroupAdd is empty; runc applies the list with setgroups before setgid. Thus
the workload's observed Groups must be exactly `[selected_primary_gid]`,
not empty. No distinct supplementary GID is accepted. Host controller groups
remain empty. This repeats the existing effective file-access GID and adds
no distinct group authority; the complete freeze must review this correction
to the accepted design's technically infeasible empty-workload-list wording.

Config.Env is the fixed ordered [realized image-recipe list](realized-recipe-source-spec.md#fixed-image-and-actual-process-environment). Docker adds runtime
PATH/HOSTNAME defaults separately; the complete process-environment recipe
must account for them without mistaking Config.Env for the actual environment.
No host/agent environment is merged. The exact list, helper/Git artifacts, labels and image configuration
must be independently frozen with the immutable image recipe; this proposal
does not invent their actual bytes. Labels are a closed private object for
contract version, role, owner UID, candidate/profile/recipe digest, challenge
digest and preparation ID or original operation/authorization/attempt binding.
Labels carry opaque values, no path or credential, and never authorize cleanup.

HostConfig explicitly fixes:

```text
Privileged=false, ReadonlyRootfs=true, NetworkMode="none", IpcMode="none",
CgroupnsMode="private", PidMode="", UTSMode="", UsernsMode="",
CapAdd=[], CapDrop=["ALL"], SecurityOpt=["no-new-privileges:true"],
GroupAdd=[], Binds=[], VolumesFrom=[], Devices=[], DeviceRequests=[],
DeviceCgroupRules=[], Tmpfs={}, Sysctls={}, StorageOpt={}, Annotations={},
Dns=[], DnsOptions=[], DnsSearch=[], ExtraHosts=[], Links=[], PortBindings={},
PublishAllPorts=false, AutoRemove=false, Init=false, Runtime="runc",
LogConfig={"Type":"none","Config":{}}, ShmSize=67108864, Ulimits=[],
RestartPolicy={"Name":"no","MaximumRetryCount":0},
MaskedPaths=null, ReadonlyPaths=null
```

Null MaskedPaths/ReadonlyPaths select the pinned daemon's defaults; empty arrays
would disable them and are forbidden. The root manifest must freeze actual
defaults and all remaining daemon resource/cgroup-parent defaults. The proposed
deterministic first recipe fixes daemon DefaultUlimits empty; an empty request
alone does not suppress daemon defaults. This remains a complete-freeze review
item, not an observed host configuration.
No user-selected sysctl, annotation, port, device, restart policy or runtime
is accepted. Empty Sysctls does not mean no effective sysctls: exact Moby
`WithSysctls` injects `net.ipv4.ping_group_range=0 2147483647` and, when the
kernel exposes it, `net.ipv4.ip_unprivileged_port_start=0` for private network
namespaces. Freeze these conditional values in the realized root recipe and
observe them; CapDrop ALL alone does not deny ICMP sockets or low-port binds.
Explicit cgroup request fields are `Memory=memory_bytes`,
`MemorySwap=memory_bytes`, `PidsLimit=pids`, `CpuPeriod=100000`,
`CpuQuota=cpu_millis*100`, `NanoCpus=0`, `CpuRealtimePeriod=0`,
`CpuRealtimeRuntime=0`, `MemoryReservation=0`, `OomKillDisable=false`.
Checked arithmetic must fit signed API int64. Do not use shares/weights as
a ceiling. Current cgroupfs observations independently verify all controls.
The fixed period cannot enforce less than ten millicores because the kernel
minimum CPU quota is 1,000 microseconds. A smaller narrowed budget denies before
create; it is never rounded up or widened. Supporting another period is a
separate exact recipe change, not an implicit fallback.

Preparation has Mounts empty. Action has exactly one Mount:
`Type=bind`, Source equal the currently held verified canonical Git root,
Target equal the profile target, ReadOnly false, Consistency empty,
`BindOptions={"Propagation":"rprivate","NonRecursive":true}`; no Volume,
Image or Tmpfs options. The source is rechecked immediately before/after create
and before release. No other owner bind, inherited volume or source-selector
override exists. Docker resolves this pathname under the trusted daemon/root
boundary; a configured pathname alone does not prove the actual target inode.

## Closed response projections

Every JSON response is bounded UTF-8, depth <=32, <=4,096 object fields total,
with duplicate/escaped-duplicate keys rejected at every depth. Security fields
are typed and compared; unknown fields are rejected. Known informational
fields from the exact pinned API schema may be bounded and discarded only on
an explicit path allowlist. There is no recursive "ignore unknown" operation.
JSON response bytes, error text, host paths and native metadata never enter
public diagnostics. Errors use fixed static denial codes.

Required security projections are:

| Response | Private required comparisons                                                                                                                                                                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version  | Version 29.8.2, ApiVersion 1.56, Linux OS, selected architecture, exact current build/component identities from manifest.                                                                                                                                                                                |
| Info     | ServerVersion, OSType/Architecture, CgroupDriver systemd, CgroupVersion 2, finite-controller availability, exact SecurityOptions for seccomp/AppArmor/cgroupns and no rootless/userns, default runc runtime and exact runtime/component build tuple. No proxy address or arbitrary diagnostic is echoed. |
| Image    | Id equal config ImageID; exact config/manifest/optional-index association and platform; immutable Entrypoint/Cmd/User/Env/WorkingDir/Volumes/Healthcheck/OnBuild/Shell/labels matched to recipe. Tags or RepoDigests alone do not authenticate association.                                              |
| Create   | Exactly one Id and Warnings empty; returned ID then undergoes full own-object inspection.                                                                                                                                                                                                                |
| Inspect  | Id, Name, Image, Path/Args, State, Config, HostConfig, Mounts, AppArmorProfile, ProcessLabel/MountLabel, NetworkSettings, RestartCount and image-manifest descriptor match recipe/current object. Host PID/start ticks and cgroup/native namespace associations are independently observed.              |
| Wait     | Normal completion is exactly `{"StatusCode":0}`. The tagged response omits a nil Error pointer; present/null Error or another exit status denies success. Termination/uncertainty never produces success.                                                                                                |

The [root manifest/OCI companion](root-manifest-source-spec.md) defines the
authenticated raw config/manifest/optional-index parent-link comparison that
the fixed Image Inspect call cannot supply. Exact source's
[image response type](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/image/image_inspect.go)
makes `Descriptor` conditional on the multi-platform store; `Manifests` also
requires an option this private request never sends. Do not require those
fields unconditionally, or reconstruct a config ImageID from API Config JSON.
Image RootFS layer DiffIDs and platform/config projections must agree with the
held raw config and complete reviewed image recipe. Tags/RepoDigests remain
non-authoritative. Root/daemon trust and later actual image proof still apply.

The [closed response companion](docker-response-source-spec.md) specifies
exact nested paths/types, typed informational dictionaries, forbidden branches
and source-normalized empty/null/omitted forms. Its source inventory is not an
acceptance allowlist. Complete realized recipe values, actual pins and coherent
full-freeze review still gate behavioral integration.

### Exact Inspect construction facts

The tagged [Wait response](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/wait_response.go)
has required int64 StatusCode and an omitempty Error pointer. Parse error
objects only through the closed Message field, bound/discard their text and
deny success; an Error field containing null is not the positive nil encoding.

The tagged [Inspect builder](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/inspect.go)
copies current Config/HostConfig/State, merges daemon Ulimits into HostConfig,
allocates Ports and Networks maps, and copies non-null endpoint configurations.
Thus Ports is an object, not null; an empty create-time network map must not be
invented for this request. The tagged
[create path](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/create.go)
calls `updateContainerNetworkSettings`, whose
[implementation](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/container_operations.go)
inserts a non-null empty EndpointSettings object under NetworkName. The
[Linux helper](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/hostconfig_unix.go)
maps `none` to the `none` predefined network. Before first start, Networks
contains exactly that placeholder; SandboxID/SandboxKey are empty. The
[start path](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/start.go)
creates the sandbox and sets its IDs before OCI spec construction. After start,
endpoint operational fields follow the response companion: generated IDs are
nonempty after null-driver join, while its IP/MAC/gateway fields remain empty.
Do not require Networks `{}` or guess empty IDs. Native private-network/
loopback observations remain necessary.

Inspect `Mounts` comes from
[`GetMountPoints`](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/container/container_unix.go),
which allocates a non-null empty slice and enumerates only tracked MountPoints.
Preparation therefore expects `[]`; action expects exactly the tracked owner
bind. Generated `/etc/hosts`, `/etc/hostname`, `/etc/resolv.conf` and built-in
OCI mounts are absent from that array. The same source's NetworkMounts builds
the generated metadata mounts readonly for this readonly-root/no-override
recipe. Their actual rows, sources and flags require native observation.
MountPoint has no response flag proving requested NonRecursive; actual mount
inventory must exclude inherited submounts.

Most [HostConfig/Resources fields](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/api/types/container/hostconfig.go)
have no omitempty. Nil arrays/pointers serialize null; zero Windows-specific
scalars still serialize on Linux. Do not forbid their keys by platform or
accept missing/null/empty interchangeably. The tagged
[Linux create normalization](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/create_unix.go)
fills nil MaskedPaths/ReadonlyPaths with OCI defaults. Inspect merges daemon
Ulimits even if the request list is empty. Exact selected normalization and
daemon defaults must be accounted for before the complete projection passes.

Info SecurityOptions uses exact tagged strings, including
`name=apparmor,profile=default` when the daemon has no custom AppArmor path,
plus `name=seccomp,profile=<selected source value>` and conditional cgroupns.
The [constructor](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/info.go)
also conditionally emits SELinux/userns/rootless/no-new-privileges entries;
the entire ordered array must match the reviewed recipe. Info's Architecture
and Version's Go Arch need the exact selected mapping. Runtime options,
authorization/CDI/NRI hooks and storage mode cannot be discarded as generic
informational maps; their explicit closed paths remain a full-freeze item.

State inspection before start requires created/not running, positive fixed
object association and no health/restart/exec activity. After start require
running, not paused/restarting/dead/OOM-killed, positive host PID, and one inert
expected entrypoint. Created objects and exited objects have different PID
rules; an all-states positive-PID requirement would be infeasible. Cleanup
requires exact association, kill only if running, wait/inspect not running,
remove once and inspect exact current absence under the same endpoint. Missing
object after ambiguous create follows journal quarantine/recovery rules.

## Built-in mount and device facts

The exact
[Moby default OCI spec](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/pkg/oci/defaults.go)
contains proc, dev tmpfs, devpts, sysfs, cgroup, mqueue and shm mounts. Its
[Linux transformations](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/oci_linux.go)
remove `/dev/shm` for IpcMode none, apply readonly root, and add readonly to
non-user mounts except proc/dev/devpts/mqueue/shm. Therefore the positive
recipe has writable private synthetic proc/dev/devpts/mqueue, readonly sysfs
and cgroup, and readonly generated `/etc/hosts`, `/etc/hostname` and
`/etc/resolv.conf`. These generated metadata binds are not owner resources.
They must be associated with exact inspected root-owned daemon metadata paths.
No extra writable metadata bind is introduced.

Use the [generated metadata custody proposal](docker-metadata-source-spec.md)
for the rootful `0710` ancestry. Compare `Info.DockerRootDir` with the current
root-manifest directory record, construct only this attempt's three exact
generated paths, and observe inherited ACLs/held host identities before comparing
challenged container bind identities. Requested file mode `0644` is distinct
from the proposed ACL-derived observed `0640`. Configured or Inspect paths
alone do not establish reachability or actual mount association.

Default masked paths are exactly the tagged source's fixed list plus its
host-dependent thermal-throttle paths for possible CPUs. The root run manifest
must freeze that current finite list; no absent path is invented as a mount.
Readonly proc paths are `/proc/bus`, `/proc/fs`, `/proc/irq`, `/proc/sys`,
`/proc/sysrq-trigger`. Runc's realized file-vs-directory masks, kernel-generated
options and mount aliases must be defined as a finite conditional recipe
before full freeze. Every actual row is accounted for; comparing only Docker
Mounts would miss synthetic and mask mounts.

[Runc 1.5.2 spec conversion](https://github.com/opencontainers/runc/blob/v1.5.2/libcontainer/specconv/spec_linux.go)
adds standard `/dev/null` (1:3), random (1:8), full (1:7), tty (5:0), zero (1:5)
and urandom (1:9), root-owned mode 0666, plus PTY rules. It also adds wildcard
mknod and tun device rules. Do not claim its default device cgroup denies every
host device. No supplied host device node/mount, zero capabilities, immutable
image inventory and actual finite device/mount observations are all necessary.
Non-TTY execution has no supplied host console. Exact devpts/ptmx and stdio
symlinks are specified by the [realized recipe companion](realized-recipe-source-spec.md#exact-device-and-symlink-inventory).

The tagged Moby default includes a time namespace and removes it only when
the host reports unsupported. The selected kernel recipe requires it; new
native wire fields observe it. Rootful without daemon remapping shares the
host user namespace; mount/PID/IPC/network/UTS/cgroup/time are private. No
generic "all namespaces private" claim is made.

## Remaining full-freeze evidence

This source contract resolves routes, framing, positive create controls and
exact-source namespace/device assumptions. The root companion now specifies
the proposed manifest field/anchor/provenance and raw OCI parent-link grammar.
Neither completes the full freeze. The response companion now defines the
closed nested path/type proposal; synthetic vectors define profile/wire
encoding examples. The realized companion adds finite mount/device/environment
predicates and five non-destructive probe procedures. Remaining items include
the complete registry/actual artifact pins, literal selected-kernel/snapshotter
mount normalization, image/helper inventory, current root-attested mask layout,
resource-pressure procedures and coherent independent review. Proposal closure
does not supply a live parser, verifier or actual resource proof.
Any unset artifact/recipe/anchor blocks activation and runtime proof. No
behavioral integration starts by treating this proposed companion as PASS.

Fixed negative probes are finite regression sentinels, not proof that every
ambient open, socket, process or shell operation is impossible. Docker default
seccomp permits ordinary socket creation and process creation required by Git;
do not require those ordinary calls to return EPERM. Only exact prohibited
namespace/privilege/mount calls, absent image artifacts, isolated network
behavior and controlled cgroup-limit probes can be selected. ENOSYS never
counts as a denied operation. Source tests cannot supply actual syscall results.
The immutable image's no-action preparation executable and any fixed limit
helper must be independently frozen; no caller-selected command or action
parser is admitted.
