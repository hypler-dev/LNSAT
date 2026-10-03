# HCFG-6 Realized Mount, Device, Environment and Probe Recipe

Status: proposed supporting source contract. [Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design)
owns acceptance and implementation; the Phase 11 operator packet owns runtime
truth. This closes bounded recipe predicates and non-destructive probe
procedures, not the complete source freeze. Actual artifact pins, the selected
snapshotter/kernel option table, immutable image inventory, pressure-test
procedures and coherent independent freeze review remain blocking. No Docker,
image build, provisioning, activation or runtime proof is performed.

## Source and commitment boundary

Use Moby commit `8af9fe3a36bab3e039862a2ab1cef1880c9b4d03` and runc v1.5.2
peeled commit `29dd3dc2b13b4123162e5fe132504bb4b15569f1`. The runc annotated
tag object is `b622a5992f0ba88fda05f2fd037d151b4fc5cc88`, not its source
commit. These identify researched source, not installed artifacts.

The future closed registry must contain a complete, reviewed immutable recipe.
It is selected by the schema-3 profile and root manifest; neither file may
register predicates or choose a weaker recipe. No expression language,
regular-expression path allowance, plugin, wildcard mount or unknown-field
fallback is allowed. Dynamic values are limited to already authenticated
current object associations: container ID, daemon metadata paths, host and
container mount/namespace tokens, cgroup association, exact UID/GID and action
target. Those values do not change the immutable predicate program.

The full recipe commitment uses domain `lnsat.hcfg_immutable_recipe.v1`, one
LF, and the complete compact recursively ASCII-key-sorted recipe JSON, without
a final LF. It must cover the exact source/artifact/provenance tuple, kernel
and daemon policy, image inventory/configuration, environment, all mount and
device predicates, probe code/procedures and budgets. Its closed field layout
and actual values are still a full-freeze item; a hash of this prose, a partial
recipe or an unset/synthetic artifact is not a valid registry entry.

The wire's `kernel_recipe_digest` and `security_recipe_digest` identify reviewed
policy, not a kernel-observed executable/filter hash. The host must compare
them with its own registry and authenticate actual host provenance separately.
Their exact nested commitment inputs remain to be frozen with the complete
registry. Do not embed a full recipe/image/self-executable digest in the image
whose bytes it hashes: that would create a circular build dependency. Immutable
image labels below contain no such digest; container labels may bind the
already computed recipe. Copying a digest never replaces native observation.

## Fixed image and actual process environment

The proposed image has distinct immutable paths:

| Purpose                 | Exact path                           |
| ----------------------- | ------------------------------------ |
| Action adapter          | `/usr/local/bin/lnsat-hcfg6-adapter` |
| Resource-free probe     | `/usr/local/bin/lnsat-hcfg6-probe`   |
| Selected Git executable | `/usr/bin/git`                       |

The existing legacy `lnsat-git-reference` executable does not implement the new
inert barrier and cannot be relabeled as this adapter. Exact bytes, build
provenance, Git version/exec-path and all runtime libraries remain unselected
artifact inputs. The immutable inventory must enumerate every image path,
type, ownership/mode, regular-file digest and symlink target with a bounded,
reviewed no-follow method. No writable image volume, set-ID file, file
capability, shell, credential helper, package manager, SSH/HTTP client, home
credential file or unexpected executable is admitted. Git's required helpers
and libraries must be individually justified by the bounded action; deleting
unreviewed dependencies and assuming Git still works is not feasibility proof.

Proposed raw OCI Config: `User=""`, `WorkingDir="/"`, singleton action
Entrypoint above, empty Cmd/OnBuild/Shell, absent volumes/ports, disabled
healthcheck and exactly `Labels={"io.lnsat.image-role":"hcfg6-git-reference"}`.
Numeric create User and the role-specific entrypoint override only the fields
named by the Docker request contract. The final config/manifest/index and
RootFS DiffIDs must satisfy the root/OCI companion; re-encoded API Config
cannot authenticate the raw config.

Config.Env is exactly this ordered list:

```text
PATH=/usr/bin
LANG=C
LC_ALL=C
HOME=/nonexistent
GIT_CONFIG_NOSYSTEM=1
GIT_CONFIG_GLOBAL=/dev/null
GIT_TERMINAL_PROMPT=0
GIT_NO_REPLACE_OBJECTS=1
GIT_ATTR_NOSYSTEM=1
```

Moby [CreateDaemonEnvironment](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/container/container.go)
starts with PATH and HOSTNAME, replaces matching Config.Env keys in place,
then appends the rest. TTY is false and linked environment is empty. Therefore
the actual initial process environment is the list above with `HOSTNAME=lnsat`
inserted immediately after PATH. TERM, proxy variables, locale overrides,
credentials and all host/agent variables are absent. Native code observes the
initial ordered process environment before mutating it or spawning anything;
the host compares the wire's bounded `process.environment` array with this
exact list. Inspect's Config.Env alone is insufficient. Later Git invocation
uses absolute executable paths and its separately frozen exact per-command
environment; this initial list is not permission for a generic child executor.

## Mount accounting algorithm

Read the bounded genuine mountinfo specified by the native/wire companions.
Parse into typed rows, sort by unique mount ID, and require each actual row to
match exactly one expected role. Every required role appears once unless a
specific source condition below permits absence; every conditional instance
has an authenticated finite source-derived path/type. Compare before/after
native reads and again immediately before release. The wire's 128-row/64-KiB
payload bounds still apply; overflow denies, without truncation.

Never use mount IDs as persistent identity. Join the held target descriptor's
device/inode and fdinfo mount ID with its actual mount row and the current host
identity. The one action bind is nonrecursive `rprivate`; preparation has none.
No descendant submount or second owner resource is accepted. Mount propagation
must match the selected actual recipe; shared/master/propagate-from fields
cannot be discarded merely because requested propagation was private.

| Role/destination                                  | Required realized predicate                                                                                                                                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                                               | Readonly container root, current daemon/image/snapshotter association. Exact filesystem/source/root/options must match the selected snapshotter recipe, still blocking below; owner-object ext4 rules do not imply an ext4 container root. |
| `/proc`                                           | Genuine procfs, private PID namespace, `rw,nosuid,nodev,noexec`; readonly/mask overlays below are separately accounted for.                                                                                                                |
| `/dev`                                            | Private tmpfs, `rw,nosuid`, strict-atime construction, mode 0755 and 64-MiB size construction; no host `/dev` bind. Device semantics require that this mount is not inferred `nodev`.                                                      |
| `/dev/pts`                                        | Private devpts new instance, `rw,nosuid,noexec`, ptmx mode 0666, PTY mode 0620 and GID 5; no supplied host PTY.                                                                                                                            |
| `/dev/mqueue`                                     | Genuine private-IPC mqueue, `rw,nosuid,nodev,noexec`.                                                                                                                                                                                      |
| `/sys`                                            | Genuine sysfs, `ro,nosuid,nodev,noexec`, plus only the finite masks below. Host-backed readonly sysfs visibility is within the accepted trusted-host boundary.                                                                             |
| `/sys/fs/cgroup`                                  | Genuine cgroup v2, `ro,nosuid,nodev,noexec`, private cgroup namespace associated with the exact host leaf; no writable host cgroup access.                                                                                                 |
| `/etc/hosts`, `/etc/hostname`, `/etc/resolv.conf` | Three readonly daemon-generated metadata file binds. Compare each exact Inspect path with its held current daemon metadata inode and the actual file bind association. These are not owner resource binds.                                 |
| Exact profile target                              | Action only: one writable nonrecursive private bind whose device/inode equals the verified host repository root. It overlaps no built-in/immutable path.                                                                                   |

Moby [defaults](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/pkg/oci/defaults.go)
and [Linux transformations](https://github.com/moby/moby/blob/8af9fe3a36bab3e039862a2ab1cef1880c9b4d03/daemon/oci_linux.go)
produce these construction choices. IpcMode none removes `/dev/shm`; any shm
mount denies. Construction options are not necessarily the literal spelling
of mountinfo super-options. A complete pinned kernel/snapshotter normalization
table must define those exact reported options before implementation; this
table does not permit arbitrary extra options or aliases.

### Readonly proc overlays

The exact ordered source list is `/proc/bus`, `/proc/fs`, `/proc/irq`,
`/proc/sys`, `/proc/sysrq-trigger`. Runc
[readonlyPath](https://github.com/opencontainers/runc/blob/29dd3dc2b13b4123162e5fe132504bb4b15569f1/libcontainer/rootfs_linux.go)
skips only missing paths and otherwise performs a recursive bind, then remounts
the selected path readonly. That second operation is not a recursive readonly
conversion of every descendant. An existing directory may produce descendant
mount rows; every such row must
match the finite selected procfs layout, readonly attributes and source
association. Missing paths require exact selected-kernel layout evidence;
permission/read errors are not absence. A guessed one-row-per-directory rule
must not reject a legitimate descendant or silently allow an unknown one.

### Mask overlays

The fixed source paths are:

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

Moby additionally appends existing
`/sys/devices/system/cpu/cpu<N>/thermal_throttle` paths for its finite possible
CPU set, caching the list once per daemon. The exact ordered current list and
the original path types must be root-attested with that daemon instance and
the selected kernel layout; it is not discovered by accepting whatever
mounts the container happens to report. Bounds must fit the wire. Masking
skips absent paths and duplicate paths; other lookup failures deny.

Runc [maskPaths/maskDir](https://github.com/opencontainers/runc/blob/29dd3dc2b13b4123162e5fe132504bb4b15569f1/libcontainer/rootfs_linux.go)
uses these distinct cases:

- Directory: readonly tmpfs, initially `nr_blocks=1,nr_inodes=1`. Runc's
  fallback uses two inodes; the selected unpatched kernel recipe must choose
  and prove its exact reported normalization. Subsequent directories may bind
  the first mask tmpfs; separate mask mount IDs may legitimately share one
  device/inode. Repeated device numbers alone are not drift or proof of a
  host bind. Source permits per-directory fallback, whose admitted behavior
  must be fixed by the selected actual recipe.
- Non-directory file: bind the container's verified `/dev/null` inode over
  the exact path. Runc does not add a readonly flag here; a writable mask
  row is possible. Admit only the standard private char device 1:3, root
  ownership/mode 0666, exact source mount/inode association and reviewed
  flags. It provides null-device behavior, not a writable host file. A blanket
  requirement that all masks are readonly is infeasible.

The adapter must obtain bounded no-follow metadata for these file masks; the
host compares exact rows/types and current associations. Default masked paths
alone and Docker Mounts cannot prove realization. No general writable-mount
exception follows from the null-device case.

## Exact device and symlink inventory

Runc [AllowedDevices/createDevices](https://github.com/opencontainers/runc/blob/29dd3dc2b13b4123162e5fe132504bb4b15569f1/libcontainer/specconv/spec_linux.go)
and [device setup](https://github.com/opencontainers/runc/blob/29dd3dc2b13b4123162e5fe132504bb4b15569f1/libcontainer/rootfs_linux.go)
establish the rootful positive construction:

| Character node  | Major:minor | UID:GID | Mode |
| --------------- | ----------- | ------- | ---- |
| `/dev/null`     | 1:3         | 0:0     | 0666 |
| `/dev/random`   | 1:8         | 0:0     | 0666 |
| `/dev/full`     | 1:7         | 0:0     | 0666 |
| `/dev/tty`      | 5:0         | 0:0     | 0666 |
| `/dev/zero`     | 1:5         | 0:0     | 0666 |
| `/dev/urandom`  | 1:9         | 0:0     | 0666 |
| `/dev/pts/ptmx` | 5:2         | 0:0     | 0666 |

The symlinks are `/dev/ptmx -> pts/ptmx`, `/dev/fd -> /proc/self/fd`,
`/dev/stdin -> /proc/self/fd/0`, `/dev/stdout -> /proc/self/fd/1` and
`/dev/stderr -> /proc/self/fd/2`, plus `/dev/core -> /proc/kcore` only when
the selected kernel exposes kcore. Symlink mode/owner and every directory
entry must match the selected realized inventory; a no-follow read never
opens the magic-link destination as a resource. No-TTY startup has no console,
allocated PTY, tun node or supplied host device. Reject extra character/block
nodes, FIFOs, sockets, links and unlisted directories, including additional
device aliases. Wire device rows represent character nodes and symlinks;
directory inventory is additionally checked privately, not silently dropped.

Runc can fall back from failed mknod to a host device bind even without a user
namespace. The selected positive recipe requires successful private mknod
construction, not that fallback; an extra device bind row denies. Parent stdio
may be reopened onto the container's `/dev/null`; startup allows only actual
FDs 0,1,2 before observer handles are opened and never receives a host directory,
Docker socket or resource descriptor.

Runc also appends wildcard char/block mknod, PTY and tun cgroup rules to Moby's
rules. This recipe does not claim a deny-all device cgroup. Zero capabilities,
no supplied host device, readonly immutable image, the complete inventory and
current mount association jointly constrain reachability. Linux inherited
stdio and private synthetic devices remain explicit exceptions.

## Finite non-destructive preparation probes

Run only after the private authenticated preparation challenge and native
identity/control checks. One PID-1 startup thread, no action parser, target
mount, credential, generic command, helper subprocess or host resource.
The whole existing preparation budget remains 10 seconds, 64 MiB, 16 tasks,
250 millicores, 64 KiB stdout, zero stderr; each call has at most a one-second
deadline within that budget, without retry or reset. Unexpected success denies
and triggers the existing exact-object cleanup/quarantine path.

The proposed exact ordered `negative_checks` array has five records. Each has
exactly `id` and `errno`; ID is one string below, errno is the positive Linux
errno number from the actual failed call. No success boolean, message,
caller result, optional check, duplicate or reordered record is accepted.

| ID                        | Fixed procedure                                                                                                                                                                           | Required result            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `mount_tmpfs_root`        | Safe native mount API: source `none`, target `/`, type `tmpfs`, the combined flags NOSUID, NODEV and NOEXEC, data `mode=0700`. This runs only inside the resource-free private container. | EPERM (1).                 |
| `unshare_mount_namespace` | Safe native unshare with exactly `CLONE_NEWNS`; no combined namespace flags.                                                                                                              | EPERM (1).                 |
| `setuid_root`             | Safe native setuid with exactly UID 0 from the selected non-root process.                                                                                                                 | EPERM (1).                 |
| `create_root_sentinel`    | No-follow close-on-exec exclusive create of `/.lnsat-hcfg6-denial`, mode 0600; immutable inventory proves that path absent.                                                               | EACCES (13) or EROFS (30). |
| `connect_test_net`        | One nonblocking IPv4 TCP socket, direct numeric `192.0.2.1:9`, no DNS/proxy. Immediate error or bounded completion via socket error query; no application payload.                        | ENETUNREACH (101).         |

Safe-library feature/API selection for these calls must be reviewed before
source adoption; no raw FFI, shell or install is implied. If the fixed connect
reports in-progress, only its bounded readiness/error query may finish it; a
timeout, zero socket error without failed completion, or another error denies.
Close all temporary FDs before the final genuine observation. Recheck UID,
namespace/cgroup/privilege and environment state; a successful privilege or
namespace call must never be followed by a positive probe frame.

These are regression sentinels for the composed controls. EACCES at a
root-owned path alone is not readonly-filesystem proof. EPERM alone does not
identify the particular seccomp filter, AppArmor policy or capability denial.
ENOSYS, EINVAL, an absent syscall or an unavailable route-query mechanism never
substitutes for the required result. Ordinary socket/process creation required
by Git is not expected to be denied. Only-loopback interface and route
observation, exact native controls and trusted template/code origin remain
necessary. This is no general proof that every syscall or ambient open fails.

## Resource ceilings and pressure-proof boundary

The legacy profile field `cpu_millis` denotes CPU bandwidth in millicores,
matching HCFG-3 `cpu_millicores`; it is not a cumulative CPU-time limit.
The closed request uses period 100,000 microseconds and quota
`cpu_millis * 100` microseconds. Compare current `cpu.max` using checked
`quota * 1000 <= millicores * period`; no rounding up. Budgets below ten
millicores deny under this period. A 250-millicore preparation quota is 25,000
microseconds, not 250 milliseconds of total permitted execution.

Live membership and finite CPU/memory/PIDs controller files, zero CPU burst,
zero swap and `memory.oom.group=0` remain mandatory. CPU weights, current
usage, process RLIMIT values or a configuration echo do not prove those
ceilings. The uninterrupted wall/output budget is enforced independently by
the host observer; release never resets startup consumption. Docker's
[resource constraint documentation](https://docs.docker.com/engine/containers/resource_constraints/)
also distinguishes quota/period bandwidth, soft weights and combined
memory/swap configuration.

Do not exhaust PIDs or deliberately OOM PID 1 in the preparation probe. Those
actions can destroy its evidence channel, taint OOM state or confuse cleanup
with successful preparation. Controlled CPU throttling, memory exhaustion and
PID-pressure procedures require separately frozen immutable helpers, finite
allocations/task counts, expected kernel events, independent host observation
and exact disposable runtime authorization. They are still blocking future
runtime/conformance work, not passed by the five sentinels above. An external
RLIMIT/allocation failure is not cgroup proof; a missing positive/negative
resource result must never be converted to PASS.

The [controlled pressure proof proposal](pressure-proof-source-spec.md)
defines three fixed future test-only cases, independent host/counter
observations, positive anchors, finite stimuli and own-object cleanup.
It leaves normal preparation and action protocols unchanged. Exact helper/
driver source review, immutable pins, feasible actual outcomes and explicit
disposable conformance authorization remain required; no pressure ran here.

## Remaining complete-freeze gates

This companion supplies a bounded target for implementation review. Before
behavioral integration, the one complete freeze still must resolve:

1. Actual component/kernel/template/image/Git artifacts and provenance, exact
   recipe/derived commitment layouts and a feasible independently reviewed
   provisioned positive case. All actual pins remain `UNSET_BLOCKING`.
2. Selected containerd snapshotter and source identity, literal mountinfo
   option/source/root normalization and private propagation, finite procfs/
   sysfs mask layout and exact current root-attested thermal path evidence.
3. Complete immutable image/library/helper inventory, executable predicates,
   Git compatibility, exact safe probe APIs and bounded native file-mask/
   environment/device-directory reads with their host comparisons.
4. Controlled resource-pressure helper/procedure contracts and coherent
   native/wire/daemon/journal/store/revocation review. Passing five sentinel
   checks does not waive any resource proof or grant an action.

The source freeze cannot be declared complete by making every positive case
deny, replacing native values with fixtures, or filling missing pins with
sample hashes. No accepted design or runtime gate is relaxed here.
