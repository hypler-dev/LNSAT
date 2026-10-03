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

Environment is the fixed ordered image-recipe list, with Docker's predictable
`HOSTNAME=lnsat` contribution accounted for. No host/agent environment is
merged. The exact list, helper/Git artifacts, labels and image configuration
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
LogConfig={"Type":"none","Config":{}},
RestartPolicy={"Name":"no","MaximumRetryCount":0},
MaskedPaths=null, ReadonlyPaths=null
```

Null MaskedPaths/ReadonlyPaths select the pinned daemon's defaults; empty arrays
would disable them and are forbidden. The root manifest must freeze actual
defaults and all remaining daemon resource/ulimit/cgroup-parent defaults.
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
| Wait     | Exactly StatusCode plus Error (absent/null or exact documented nullable Message shape). Normal completion requires 0 and no error; termination/uncertainty never produces success.                                                                                                                       |

The exact API-schema informational-path allowlist, daemon-normalized nullable
shapes, image-manifest/index readback and nested NetworkSettings/resource
defaults remain review items. This table does not silently treat the entire
schema as harmless metadata or claim those remaining projections are frozen.

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
symlinks are part of the still-required realized recipe.

The tagged Moby default includes a time namespace and removes it only when
the host reports unsupported. The selected kernel recipe requires it; new
native wire fields observe it. Rootful without daemon remapping shares the
host user namespace; mount/PID/IPC/network/UTS/cgroup/time are private. No
generic "all namespaces private" claim is made.

## Remaining full-freeze evidence

This source contract resolves routes, framing, positive create controls and
exact-source namespace/device assumptions. It does not complete the full
freeze. Remaining items are the closed nested response-path allowlist,
root-manifest field/anchor/provenance grammar, complete realized mount/device
and environment recipe, fixed negative-probe procedures, independent golden
profile/wire bytes, actual artifact pins and coherent independent review.
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
