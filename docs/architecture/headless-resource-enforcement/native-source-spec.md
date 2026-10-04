# HCFG-6 Native Source Specification

Status: proposed supporting source freeze; independent feasibility and source
review are required before behavioral integration. The accepted HCFG-6 intent
is unchanged. [Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design)
owns acceptance and implementation truth. This document and the linked
[preparation/store specification](preparation-store-source-spec.md),
[startup wire specification](startup-wire-source-spec.md),
[Docker recipe specification](docker-source-spec.md), its
[closed response grammar](docker-response-source-spec.md), the
[realized mount/device/environment/probe predicates](realized-recipe-source-spec.md) and the
[root manifest/OCI custody specification](root-manifest-source-spec.md), together with
[generated daemon metadata custody](docker-metadata-source-spec.md), form one freeze. No
companion independently opens activation or runtime execution.

## Source ownership and integration order

The primary controller owns this complete freeze and integration. Exact later
source ownership is:

| Module                                              | Responsibility                                                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `lnsat-contracts/headless_config/resource_bindings` | Existing S1 unverified input; no observation or authority.                                                              |
| `lnsatd/headless_native`                            | Private Linux handle, ACL, procfs, mount and cgroup observation; no public constructor or injected successful observer. |
| `lnsatd/headless_runtime_profile`                   | Separate schema-3 decoder, stable loader, authority/recipe commitments.                                                 |
| `lnsatd/headless_adapter_protocol`                  | Separate protocol-2 frames and immutable adapter startup state; no old-protocol fallback.                               |
| `lnsatd/headless_docker_observer`                   | Private socket/peer custody, finite HTTP allowlist, own-object inspection and cleanup.                                  |
| `lnsat-store/headless_preparation`                  | Strict inert journal codec and held-directory durable revision custody.                                                 |
| `lnsat-store/headless_installation`                 | Migration 18, transaction-local atomic bootstrap and binding readback.                                                  |
| `lnsat-store/headless_release`                      | Installation-wide serialization and private one-use release guard.                                                      |

Integrate only after independent review resolves every P1/P2 and demonstrates
a feasible non-root positive recipe. Implement codecs first, then actual native
observation, then store and startup integration. The codec and private Linux
journal custody are inert Stage-A source candidates; their file fixtures do
not supply the full native/profile feasibility freeze. None of
these steps may turn fixtures into a live permit. Existing profiles, D3/D4A
frames, schema-17 APIs and the locked Phase 11 driver remain unchanged. Existing
stores cannot acquire headless authority through a legacy open or initializer.

The first Stage-A custody candidate is now scoped to the private preparation
journal seam described in the [preparation/store specification](preparation-store-source-spec.md#stage-a-private-linux-journal-custody-contract).
It uses an actual selected-store lifetime borrow and held-directory descriptor
custody for bounded immutable revisions. Project Status records exact candidate
implementation, validation and independent review. The complete source/pin/
positive-feasibility freeze remains open. This does not open native observation, schema-18 SQL,
the B6 writable connection, a caller, initializer, CLI, route, activation, or
runtime integration.

## One explicit Linux recipe

The accepted Engine 29.8.2/API 1.56, bundled containerd 2.3.6/runc 1.5.2,
rootful same-host identity mapping and default AppArmor/seccomp remain exact.
No current host is claimed to satisfy them. The implementation recipe adds
these narrow native prerequisites:

- A reviewed exact upstream Linux v6.8 source/build/configuration and provenance
  digest. `CONFIG_EXT4_FS`, `CONFIG_EXT4_FS_POSIX_ACL` and `CONFIG_FS_POSIX_ACL`
  are enabled. Provenance must cover ext4's registered ACL getter, inode-body,
  EA-block and EA-inode xattr read paths: no reachable `ENOSYS` producer is
  admitted. Ext4's getter deliberately maps `ENOSYS` to a null ACL, so checking
  the VFS alone is insufficient. A version prefix or unreviewed distribution
  patch denies. Time namespaces are enabled and observed.
- Ext4 with POSIX ACL support for the selected store, bindings, repository,
  profile, manifest, socket and their observed ancestry; no idmapped mount,
  network/FUSE filesystem, overlay-backed owner object or filesystem fallback.
- Genuine procfs and cgroup v2 with systemd-managed finite CPU/memory/PIDs
  controls. The controller shares the daemon's host user and mount namespaces;
  procfs must expose the required same-host process records. No private procfs
  substitute, hidepid workaround, ptrace capability or privileged helper.
- The active LSM list and exact kernel build must establish that reads of
  `system.posix_acl_access` and `system.posix_acl_default` cannot disguise a
  permission denial as `ENODATA`. The researched candidate list is capability,
  yama, apparmor and landlock; each has no `inode_get_acl` hook in the selected
  source. Read the exact active list from genuine held securityfs and compare
  it with the root-attested recipe. Additional/modified LSMs, BPF LSM programs
  and unproved hooks deny. This classification requires review, not caller flags.
- The nonzero real/effective/saved UID and GID agree with the owner-selected
  controller identity; supplementary groups are empty. All controller native
  reads run under that unchanged identity.

Actual component, template, kernel and immutable image artifact digests remain
`UNSET_BLOCKING` until the separately reviewed exact run recipe supplies them.
Source tests cannot fill these with sample digests, and no CLI or initializer
may activate this backend while any pin is unset. No host configuration is
changed automatically. A feasible future provisioned recipe is necessary for
source freeze; a current selected host and runtime proof are later gates.

## Safe native APIs and held identity

The store candidate enables the `dir` feature of the existing exact
`nix 0.31.3` dependency without a version or lock change. Its private safe
conversion handles that pinned source's error-path descriptor ownership.
Common custody logic compiles on macOS, but construction/descent denies there;
no portable filesystem fallback or macOS support claim is added.

Unsafe application code remains forbidden. Use pinned safe `nix 0.31.3` APIs
for Linux `openat2`, owned close-on-exec descriptors, `fstat`, `fstatfs` and Unix
peer credentials. The proposed Linux-only ACL dependency is exact
`rustix = "=1.1.5"`, default features disabled, `std,alloc,fs` enabled. Its lock delta,
transitive backend and local vulnerability evidence require source review
before adoption; no dependency is added by this document. No raw libc FFI,
unsound ACL wrapper, dynamic plugin or shell utility supplies proof.

Open the canonical root and each component with owned descriptor-relative
descent. Require `NO_SYMLINKS`, `NO_MAGICLINKS` and `BENEATH`; within the selected
resource use `NO_XDEV`. Explicit ancestor mount transitions must match the
frozen host mount policy; `NO_XDEV` cannot simply be omitted when inconvenient.
Retain at most 128 ancestor handles; depth or canonical path overflow denies.
Never reopen a resource through `/proc/self/fd`, duplicate SQLite's main
descriptor, or expose native descriptors to the adapter. Readable regular-file
and directory handles use `O_RDONLY|O_CLOEXEC|O_NOFOLLOW`; repository root custody
remains metadata-only and permits only the accepted bounded identity scan.

Observe `(type, dev, ino, uid, gid, mode, nlink, ctime_sec, ctime_nsec)` before
and after each read. Require a stable named/opened association and permissions.
Timestamps are live drift checks, not persistent resource identity. Every
regular owner file has one link; directories have the filesystem's normal
directory link count. Bindings/profile/declaration limits remain 64 KiB/16 KiB/
their existing exact decoder bound respectively. Resource identity uses only
the accepted `lnsat.hcfg_resource_identity.v1` tuples. Mount/namespace numbers
are live tokens, never restart freshness.

### Effective ACL proof

For held readable files/directories call safe `fgetxattr` with one fixed 8,196
byte buffer for each exact POSIX ACL name. Do not size-query, grow, or retry on
`ERANGE`. Parse little-endian Linux ACL xattr version 2, a four-byte header and
eight-byte entries, at most 1,024 entries. Require exact standard tag order,
unique sorted named UIDs/GIDs, permissions 0..7, undefined IDs only for base
entries, required mask for extended ACLs and no trailing bytes. Check base
owner/other and masked group/named entries against inode mode. Unsupported,
unreadable, malformed, overflowing or ambiguous ACLs deny.

Only after the exact authenticated kernel/filesystem/LSM recipe above is
established may `ENODATA` mean a genuinely absent POSIX ACL and mode bits supply
its effective access for ordinary regular files/directories with the ext4
getter installed. Authenticate the no-reachable-`ENOSYS` source predicate;
`ENODATA` is not itself that proof. Generic `getxattr` absence never passes.
`ENOSYS`, `ENOTSUP`, `EOPNOTSUPP`, permission/read errors and all other errors
deny. An absent default ACL is classified by the same
recipe; an existing default ACL must not grant untrusted access to descendants.

Owner-private objects permit effective read/write/search only to the exact
owner and trusted root. Root-controlled ancestors may allow public read/search,
but no untrusted write. A socket must permit connect/write only to root,
explicitly trusted administrator UIDs and the exact controller UID; reject
effective group grants rather than guessing group membership. Administrator
UIDs are a sorted root-manifest list of at most 16 nonzero entries. Owner-only
file modes and ACLs remain strict; ACLs cannot widen them.

A pathname Unix socket cannot be opened as a readable regular descriptor.
Use safe `lgetxattr` on its one exact canonical pathname under retained,
root-controlled non-writable ancestors, bracketed by matching named socket
device/inode/UID/mode/ctime observations and current `SO_PEERCRED`. Recheck the
same ACL and ancestry after connection and immediately before each call.
This is a path observation under the explicit trusted-root boundary, not a
descriptor-bound socket ACL claim. Any drift denies. Root-mediated replacement
between samples is outside the accepted trusted-root anti-tamper claim.
The socket's access ACL must be present: `ENODATA` always denies for the socket,
even when the narrow absence classifier is available for ordinary objects.
Its named controller entry has effective read/write, masked by read/write;
group and other entries grant no effective access. Compare the raw access ACL
bytes as well as interpreted rights before/after connect and each exchange.

For the selected database, observe the existing SQLite descriptor through the
accepted custody seam. ACL inspection uses the stable exact named path under
the already held owner-private parent and verifies association with that same
descriptor before/after. It must never open, duplicate or close a database
alias; doing so can release process-associated record locks.
This is named-path ACL evidence associated with the existing SQLite descriptor,
not an fd-bound ACL read. The explicit trusted-owner/root boundary applies.

The three exact rootful daemon metadata directory classes use the separate
[metadata custody predicate](docker-metadata-source-spec.md): `O_PATH` held
directory identity with bounded named `lgetxattr`, under root-controlled
search-only inherited ACLs. `O_PATH` cannot supply `fgetxattr`; do not pretend
these are readable directory handles. Only the three own-container generated
regular files use readable handles and fd-bound ACL reads. This exception
belongs to the proposed complete freeze; it opens no arbitrary named resource
read or current provisioning. Existing owner/resource custody is unchanged.

### Procfs, mount and cgroup bounds

Open genuine procfs and cgroupfs once, verify filesystem magic and held mount
association against the reviewed host recipe, and use descriptor-relative
no-follow reads. Procfs intentional `self`/namespace kernel links are handled
only by exact allowlisted operations and validated filesystem origin; they
are not resource resolution exceptions. Procfs and cgroupfs must not be
writable by an untrusted host user. Each observation has a five-second
monotonic deadline within the uninterrupted action/preparation budget.

| Read                                                | Bound and grammar                                                                                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `self/fdinfo/{held_fd}`                             | 4 KiB; exactly one unsigned `mnt_id`; required fields unique; no resource reopen.                                                                          |
| `self/mountinfo`, adapter `self/mountinfo`          | 1 MiB, 4,096 rows, 8 KiB per row; exact separator, numeric IDs/devices, bounded octal path escapes and options; duplicate IDs/ambiguous rows deny.         |
| `self/status`, adapter `self/status`                | 64 KiB, 256 lines; exactly one required UID/GID/groups/capability/NoNewPrivs/Seccomp field; duplicate or unknown required-security variant denies.         |
| `{peer_pid}/stat`, `{adapter_host_pid}/stat`        | 4 KiB; parse parenthesized comm safely, positive PID and start ticks, bounded fields; compare before/after. No process command string reaches diagnostics. |
| `self/uid_map`, `self/gid_map`, adapter equivalents | 4 KiB, 8 rows; exact host identity map for selected UID/GID, no user namespace remapping.                                                                  |
| `{adapter_host_pid}/cgroup`, adapter `self/cgroup`  | 4 KiB, exactly one unified `0::` membership; canonical relative association through genuine cgroupfs.                                                      |
| Required cgroup controller file                     | 4 KiB; exact bounded unsigned decimal grammar and terminal LF; reject `max`, overflow, duplicate or unsupported field.                                     |
| Kernel boot ID / namespace identity                 | 4 KiB per exact query; canonical boot UUID; namespace device/inode from genuine kernel link metadata, retained for current comparison only.                |

The held host root `fdinfo` mount ID must resolve to one live mountinfo row.
Bracket that relationship with descriptor and mount-record checks. Scan the
marked Git tree without following links: at most 100,000 entries and 16 MiB
total relative path bytes; reject a submount, symlink escape, external hard
link, alternate Git directory/worktree/object path or incomplete scan. Do not
run Git during bootstrap. At actual use, reuse the closed semantic Git verifier
on the same held/path identity without changing its disposable-only scope.

Mountinfo does not report whether a mount is idmapped. Do not invent an
`idmapped` optional field or treat its absence as proof. The root manifest
explicitly attests `idmapped=false` for each selected ext4 mount, bound to the
current boot, host user/mount namespaces, held mount ID, device, mount root and
mount point. Current fdinfo/mountinfo/fstatfs observations associate that
attestation with the exact live object. This is trusted-root attestation, not
an independent kernel query for idmapping. No generic ext4 `noacl` mount option
is inferred; selected upstream config/source establish ACL support.

After exact daemon create/inspect, associate its positive host PID/start ticks
with genuine host cgroup membership. The immutable adapter reports its own
genuine procfs, namespace, mapping, target device/inode and descriptor mount
records over the single live challenged attach channel. It reports facts;
the private host observer compares them with its own current host resources,
daemon inspection and approved recipe. No agent/caller frame may substitute
for that channel. Native mode/privilege observations must come from the pinned
adapter, not copied Docker configured fields. Denied/unavailable native reads
deny startup; no fabricated or cached positive fallback.

Require exactly one nonrecursive private writable repository bind matching
host/adapter device/inode. All actual mount rows must match the frozen built-in
proc/sys/dev/tmpfs/engine metadata recipe plus that one repository. The recipe
enumerates individual writable synthetic mounts and device nodes; unexplained
writable host paths, image volumes, propagated mounts, additional resources or
Docker endpoints deny. Container mount IDs need not equal host mount IDs.
UID/GID match, all capability sets are zero, workload groups contain exactly
one copy of its primary GID and no distinct GID, NoNewPrivs is 1,
Seccomp is 2, private execution namespaces with the explicitly shared host user
namespace, network none and only loopback interfaces.
Seccomp mode is not a filter hash; manifest origin and negative behavior remain
necessary. Live cgroup ceilings are finite and within the narrowed action
budget: checked `quota*1000 <= millicores*period`, `cpu.max.burst=0`, finite
`memory.max` and `pids.max`, `memory.swap.max=0`, fair scheduler. Controller
files and membership are rechecked before release; usage/weights do not pass.

The [realized recipe companion](realized-recipe-source-spec.md) distinguishes
readonly directory masks from possible writable private `/dev/null` file
masks, shared mask-tmpfs aliases, runc device-bind fallback and actual initial
process environment. Observe the latter with bounded native environment
iteration before any mutation/child, reject invalid UTF-8, excess bytes,
duplicate/unexpected keys, and compare its exact ordered wire array. Fixed
non-destructive preparation sentinels do not prove every syscall or cgroup
pressure behavior. The complete registry, kernel/snapshotter normalization,
image inventory, safe probe methods and actual pins remain blocking. The
[pressure proof companion](pressure-proof-source-spec.md) specifies a proposed
separate test-only lane; its new ancestor/event/membership reads need exact
private decoder review and never widen ordinary native observation or startup.

## Root implementation manifest and current daemon association

The [root manifest companion](root-manifest-source-spec.md) owns the exact
envelope, canonical commitment, artifact records, current-instance tokens and
raw OCI custody/parent-link grammar. This section owns the native observation
method. Both must agree; neither caller bytes nor a profile digest authenticates
root provenance. Its strict registry and actual artifact pins remain unset.

Manifest bootstrap cannot use the ACL-absence classifier it is about to
authenticate. Start from the separately reviewed explicit root-manifest anchor,
hold the no-follow prefix chain and check root ownership, type, mode and mount
association without treating prefix `ENODATA` as a positive. The manifest
itself requires a present parsed ACL with root write, exact controller read and
no untrusted write. Verify anchored bytes/current-instance association, then
authenticate kernel/LSM/mount provenance and recheck the entire prefix chain
using full effective-ACL rules. No selected-store/resource/native guard exists
during bootstrap. Root `/` need not have an extended ACL. Missing provisioning
or an unset anchor denies; LNSAT never provisions it.

One explicit absolute root-provisioned regular single-link manifest, at most
64 KiB, is stable, read-only to the controller and under held root-controlled
non-writable ancestry. Strict fields bind its schema/version, exact kernel and
component/template/probe/image artifact digests and provenance, sorted trusted
administrator UIDs, exact engine version/API and the current boot UUID, daemon
PID/UID/GID, daemon start ticks, daemon executable device/inode and named
endpoint device/inode. The listener kind is exactly `direct_dockerd_unix`.
Reject inherited listeners, `fd://`, systemd socket activation and proxies.
Root performs the
provisioning as a separately authorized host operation; LNSAT cannot generate
or refresh an attestation to make verification pass.

Compare the manifest's current-instance tuple with genuine host boot ID,
`SO_PEERCRED` root UID/GID and PID, genuine procfs start ticks, and stable named
socket identity at connection and before every call. Obtain the private owned
peer pidfd using safe pinned Nix `PeerPidfd` (`SO_PEERPIDFD`, Linux 6.5+); poll
it through the exchange and before release. Unsupported/dead peer or a lost
pidfd association denies. Recheck the tuple after every bounded exchange.
Hash the actual readable
root-controlled installed component artifact files with before/after custody,
matching provenance and immutable recipe digests. The root attestation is the
explicit bridge from these exact artifacts to this current daemon instance.
PID alone, a version response, installed bytes alone or caller JSON is not
that bridge. Daemon restart, socket replacement, boot change, attestation
drift or missing provenance denies and requires explicit root reprovisioning.
Artifact hashing is bounded by 256 MiB per file, 1 GiB total and the remaining
observation deadline; read overflow/unstable bytes deny. Installed daemon
device/inode and artifact hashes must match the attestation too.

Non-root dereferencing of a root daemon's `/proc/{pid}/exe` is ptrace-gated;
this design must not pretend that it independently hashes the running root
executable. Trust is the accepted root/kernel/daemon boundary plus a fresh
root-controlled instance attestation. Independent OpenAI Terra xhigh native
feasibility review on 2026-10-02 found this bridge consistent with the accepted
trusted-root model when the direct listener, kernel instance tokens and pidfd
are required. This closes that design question without claiming direct
executable observation, actual host evidence or full source-freeze approval.

## Separate profile 3 and protocol 2

The [startup wire companion](startup-wire-source-spec.md) defines every field,
nullable value, bound, domain and commitment array. It is the sole field-layout
definition within this freeze. Schema 3 has separate `engine` and `headless`
objects and no Docker-CLI `supervisor`; the old schemas stay unchanged. New
profile/protocol objects use recursively sorted ASCII keys. Journal objects
retain their independently specified struct-order codec; do not share encoders.
Private paths and native facts never enter public audit/diagnostics. The live
guard remains private, nonserializable and consumable exactly once. Complete
golden bytes and independent review still precede protocol implementation.

## Private Docker transport and finite preparation

Only the accepted `/v1.56` endpoints exist. An internal enum renders fixed
paths; exact checked 64-lowercase-hex container IDs and config ImageIDs are the
only interpolated selectors. The deterministic preparation name is admitted
only for orphan inspection. No arbitrary URL/query/verb, redirect, environment
endpoint discovery, API negotiation, executable Docker CLI or generic executor.

Use a private connected Unix stream with pinned peer/endpoint custody.
HTTP/1.1 request headers are fixed, Host is `localhost`, JSON Content-Length is
exact, no pipelining or redirect; responses require bounded complete framing.
Headers: 16 KiB/64 fields/4 KiB per line, reject duplicate security/framing
headers, transfer-encoding/content-length ambiguity, interim statuses and
unexpected trailers. JSON body: 1 MiB/depth 32/4,096 fields; strict required
security projections and duplicate detection, exact documented extension
allowlist, never silently ignore a new security field. Attach upgrade is the
one documented hijack flow; TTY false, stdin/stdout/stderr selected explicitly,
attached before start. Docker stream mux header is eight bytes, reserved bytes
zero, stream IDs stdout=1/stderr=2, per-frame length at most 64 KiB. Count total
bytes/deadline before allocation; stderr must be empty. No log replay input.

Each finite administrative call has a five-second deadline. Preparation has
10 seconds total startup/probe time plus a separate five-second cleanup bound,
64 MiB memory, 16 tasks, 250 millicores, 64 KiB stdout and zero stderr. Every
positive process ceiling must fit the exact runtime profile; a smaller profile
denies. The probe uses no resource binding, host socket/device, action frame, credentials
or host environment. It may run only the frozen immutable native observation
and negative-control checks. No borrowed zero action budget or widened limit.

Create is attempted once per preparation/consumed action attempt. An ambiguous
create never resends. Require exactly one checked ID, expected name/image/
complete recipe/challenge/owner-candidate labels and current daemon identity.
Removal only after exact own-object inspection; kill/wait/delete result is
followed by exact confirmed absence. Conflict, lost association, ambiguous
404, unexpected status or cleanup timeout quarantines and preserves consumed
evidence. No global enumeration or deletion by labels. Preparation journal and
release serialization are specified in the linked companion document.

## Required review and evidence

The full freeze is pending until the root-instance attestation bridge, kernel/
LSM absence classification, every wire/native nested field and immutable
mount/device/security recipe are reviewed as a coherent feasible positive
case. A merely fail-closed implementation that can never pass the intended
non-root supported case is insufficient.

Later source validation covers malformed and bounded native inputs, actual
held descriptor/path/ACL drift, mount membership and cgroup arithmetic, hostile
protocol/mux/HTTP framing, lost-create quarantine, atomic rollback and every
invalidating writer's serialization. Fresh independent read-only review and
the broad proportional repository check are mandatory. Source fixtures never
claim actual Linux Docker isolation. The unchanged Phase 11 operator packet
continues to own runtime truth; runtime/package/publication remain closed.

## Primary research

- [Safe rustix 1.1.5 filesystem APIs](https://docs.rs/rustix/1.1.5/rustix/fs/index.html)
  provide fd and no-follow path xattr reads; the application remains unsafe-free.
- [Linux 6.8 POSIX ACL implementation](https://raw.githubusercontent.com/torvalds/linux/v6.8/fs/posix_acl.c),
  [security hooks](https://raw.githubusercontent.com/torvalds/linux/v6.8/security/security.c),
  [AppArmor hooks](https://raw.githubusercontent.com/torvalds/linux/v6.8/security/apparmor/lsm.c)
  and [ext4 ACL implementation](https://raw.githubusercontent.com/torvalds/linux/v6.8/fs/ext4/acl.c)
  support researching a narrow absence classification; they do not authenticate
  a selected installed kernel or every active hook.
- [Linux proc executable permissions](https://man7.org/linux/man-pages/man5/proc_pid_exe.5.html)
  explain why a non-root root-daemon executable read cannot be assumed.
- [Ext4 xattr reads](https://github.com/torvalds/linux/blob/v6.8/fs/ext4/xattr.c),
  [inode reads](https://github.com/torvalds/linux/blob/v6.8/fs/ext4/inode.c)
  and [block reads](https://github.com/torvalds/linux/blob/v6.8/fs/ext4/super.c)
  complete the reviewed stock-source no-`ENOSYS` predicate. Authentication of
  exact installed provenance is still required.
- [Linux mountinfo](https://man7.org/linux/man-pages/man5/proc_pid_mountinfo.5.html)
  defines live mount association without an idmapped-mount flag.

These source-derived recipe choices are LNSAT design inferences. Research does
not provide owner acceptance of a material design change or runtime evidence.
