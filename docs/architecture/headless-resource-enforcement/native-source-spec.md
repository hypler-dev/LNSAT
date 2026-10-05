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

The next inert Stage-A native candidate is the private
[readable-object ACL parser/sampler](native-acl-candidate-source-spec.md).
It borrows a real readable file/directory and observes bounded ACL bytes and
metadata without opening a named resource or producing authority. ENODATA
remains unclassified. Selected-store, socket, O_PATH ancestry, kernel/LSM trust
and complete native integration remain separate work.

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
peer credentials. The reviewed private ACL candidate adopts the Linux-only
dependency exactly as
`rustix = "=1.1.5"`, default features disabled, `std,alloc,fs` enabled. Its exact
lock delta, backend and
local vulnerability evidence receive independent review. Its module contract
is [readable-object ACL sampling](native-acl-candidate-source-spec.md). The
candidate returns untrusted native samples only; it supplies no authenticated
absence classification, named-path custody or behavioral integration. No raw
libc FFI,
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
entries, required mask for extended ACLs and no trailing bytes. For access ACLs,
base owner/other entries exactly equal the corresponding inode
permission triplets; the inode group triplet equals the mask when present,
otherwise the group-object entry. Named/group-object effective rights are their
raw permissions intersected with the mask; masked-off raw rights are valid.
Default ACLs use the same grammar but do not describe the containing directory's
mode. Unsupported, unreadable, malformed, overflowing or ambiguous ACLs deny.

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

The exact Stage-A [private mountinfo byte candidate](native-mountinfo-candidate-source-spec.md)
is a separate inert representation prerequisite. It reads no procfs, authenticates
no mounted object or option absence, and completes none of the genuine reader,
association or complete-freeze requirements below. Project Status owns its
implementation and evidence.

#### Stage-A self-process procfs and held-mount reader proposal

This is the bounded reader contract proposal following the reviewed byte
candidate. It is **not ready for reader implementation**: retained-worker
construction/custody and genuine unfinished-operation feasibility remain
unproved. [Project Status](../../PROJECT_STATUS.md#stage-a-self-process-procfs-reader-contract)
owns the owner's explicit acceptance of contract investigation, readiness,
review and implementation. That limited acceptance adds to the original HCFG-6
and Stage-A decisions; none supplies precode PASS or runtime authority.
The broader native reads in the table below remain separate contracts.

The proposed candidate observes only its own process and one caller-owned held
regular file or directory at a time. The investigated inputs are shared ownership
of the same existing procfs-root and resource `File`, plus the existing private
absolute monotonic budget. This supersedes the synchronous proposal's promise
that work cannot outlive the caller's borrow; it does not permit descriptor
duplication or reopening. No pathname, PID, numeric FD, raw bytes or success flag is accepted from
an agent/API/config caller. The resource must have `(st_mode & S_IFMT)` exactly `S_IFREG` or `S_IFDIR`,
and `F_GETFD` exactly `FD_CLOEXEC`; unknown descriptor-flag bits deny. Classify
`F_GETFL` in this order: with `O_PATH`, require access-mode bits `O_RDONLY`
(zero) and allow only `O_PATH`, `O_DIRECTORY`, `O_NOFOLLOW`; without `O_PATH`,
require access-mode bits `O_RDONLY` and allow only `O_LARGEFILE`, `O_DIRECTORY`,
`O_NOFOLLOW`. Every other returned status bit denies, including append,
nonblocking, direct/synchronous I/O and async flags. `O_DIRECTORY` requires a
directory kind. These masks govern observed flags, not proof of historical
creation flags or permission authority. The narrow policy excludes a writable
SQLite main descriptor; later actual selected-store custody needs a separately
reviewed extension. Never read, seek, write, duplicate, explicitly close or
reopen the shared resource. SQLite's selected descriptor retains its existing
store lifetime; this proposal creates no SQLite borrow or custody API.
Reader-owned proc/namespace handles are distinct. Final custody-reference and
temporary-handle destruction belong to the worker/retainer cleanup contract,
including when the original caller has gone away. Shared ownership prevents
ordinary owner close/reuse while held, not hostile raw close, namespace/root
changes or a malicious host; those are not new guarantees.

##### Filesystem origin and finite lookup operations

Require directory kind, genuine `PROC_SUPER_MAGIC` and stable device/inode and
mount ID for the procfs root. Its `F_GETFD`/`F_GETFL` must meet the same exact
CLOEXEC and readable/O_PATH masks above, with directory kind required. Obtain descriptor mount IDs using pinned safe
`rustix::fs::statx` with an empty path, `AtFlags::EMPTY_PATH`, requested basic
identity fields and `StatxFlags::MNT_ID`; require every used result-mask bit and
reject a mount ID outside the reviewed old mountinfo-ID range. Filesystem magic
is a necessary local origin check, not installed-kernel provenance, host-root
manifest authentication, complete namespace identity or authority.

| Operation                              | Exact proposed restriction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `self`                                 | One bounded `rustix::fs::readlinkat_raw` into an 11-byte fixed buffer. Reject a full buffer, empty value, noncanonical/nonpositive decimal or a value different from `std::process::id()`. This reads link text; it does not follow the link or accept a caller PID. Repeat for drift. A different procfs PID view denies; matching numbers alone prove no host PID-namespace identity.                                                                                                                          |
| Numeric self directory, `fdinfo`, `ns` | Open each generated/fixed component relative to its held parent using safe `nix::fcntl::openat2`. Combine `O_RDONLY`, `O_DIRECTORY`, `O_CLOEXEC`, `O_NOFOLLOW`; combine `RESOLVE_BENEATH`, `RESOLVE_NO_SYMLINKS`, `RESOLVE_NO_MAGICLINKS`, `RESOLVE_NO_XDEV`. Require procfs and the held proc-root mount/device at every step. No path concatenation from untrusted strings, enumeration, absolute-path fallback or weakened flags.                                                                             |
| `fdinfo/{held_fd}` and `mountinfo`     | Canonical decimal FD comes only from the still-held resource; open its generated component relative to held `fdinfo`. Open fixed `mountinfo` relative to held numeric self. Use the same resolve flags and combine `O_RDONLY`, `O_CLOEXEC`, `O_NOFOLLOW`; require regular procfs records on the same held proc mount. No `/proc/self/fd` or resource reopening. Open fresh records for each read; no seek/replay fallback.                                                                                       |
| `ns/mnt` and `ns/user`                 | The only namespace-link following exceptions: fixed single components opened from the verified held `ns` directory with safe `openat`, combining `O_RDONLY`, `O_CLOEXEC`, intentionally following the genuine kernel link. Require `NSFS_MAGIC` and retain owned namespace descriptors for device/inode comparison. Fixed-name following `statx` queries repeat current device/inode checks against those handles. No arbitrary name, `setns`, `unshare`, privilege escalation or resource magic-link exception. |
| Numeric self `root`                    | The only resource-link metadata exception: safe `statx` of fixed `root` relative to verified held numeric self, following its kernel link for basic identity/mount metadata only. It creates no descriptor and reads no target bytes. Compare before/after; this does not authorize reopening a held resource through that link.                                                                                                                                                                                 |

Opening numeric self rather than resolving `self/...` permits the ordinary
no-link/no-cross-mount rules to stay exact. The finite namespace/root exceptions
are proposed explicitly because `NO_MAGICLINKS` and `NO_XDEV` cannot be claimed
for operations which intentionally cross those kernel links. Kernel-origin
checks precede exceptions and every lookup error denies without retry or fallback.
A whole procfs root bind is still kernel procfs; authenticating its selected
host-recipe placement is a separate integration/root-manifest obligation.

##### fdinfo grammar, EOF and storage

For this first candidate the complete fdinfo record is exactly four LF-terminated
lines in upstream v6.8 order: `pos`, `flags`, `mnt_id`, `ino`. Each field name is
followed by one colon and one tab; values contain no whitespace. `pos` is
canonical nonnegative decimal through `i64::MAX`; `flags` is a leading `0`
followed by one through 11 octal digits, bounded by `u32::MAX`; `mnt_id` is
canonical decimal from zero through `i32::MAX`; `ino` is canonical decimal
through `u64::MAX`. Decimal leading zeroes other than `0`, signs, overflow,
missing/reordered/duplicate fields, CR/NUL, missing terminal LF and every extra
line deny. Upstream fdinfo may append lock or type-specific records. Rejecting
them is this candidate's narrow policy, not a universal procfs grammar. A locked
SQLite descriptor is not silently admitted; its later custody/integration needs
its own reviewed lock-tail contract. The read position is representation only;
compare mount/inode/flags, not mutable `pos`, across samples. Compare fdinfo inode
and flags against current `fstat`/`F_GETFL`/`F_GETFD`, with `FD_CLOEXEC` translated
to the emitter's `O_CLOEXEC` bit; no ACL or permission classification follows.

Read fdinfo to actual terminal EOF with an inclusive 4,096-byte cap. Read each
mountinfo table to actual terminal EOF with the unchanged inclusive 1,048,576-byte,
4,096-row and 8,192-byte-per-row decoder policy. For each record, fallibly reserve
its cap plus one sentinel byte once before I/O. A positive short read advances
within the buffer; a zero result establishes EOF only after a nonempty complete
record; the sentinel distinguishes exact cap plus EOF from overflow. At most
cap-plus-one positive reads and one terminal EOF call are allowed. An error,
including `EINTR` or `EAGAIN`, denies immediately; do not use an auto-retrying
`read_to_end`, retry interrupted calls, accept a prefix or parse a truncated read.
The mountinfo decoder's fixed errors and fallible allocation policy are unchanged.

Read before and after tables sequentially. Compare their complete immutable byte
buffers before decoding the retained table; drop the first buffer and do not
create a self-referential struct. The eventual private observation owns retained
mountinfo bytes and fixed numeric identities; any decoded table borrows those
bytes transiently. No derived Debug, serde, raw-input diagnostic, external
serialization, success constructor or injected successful observer is allowed.
Reader denials use only private fixed codes with the `native_procfs.` prefix:
`unsupported_platform`, `invalid_descriptor`, `origin_rejected`, `read_rejected`,
`invalid_fdinfo`, `limit_exceeded`, `storage_unavailable`, `budget_exhausted`,
`object_changed`, `association_rejected`. Existing mountinfo parser denials retain
their reviewed private codes; no errno text, descriptor number, PID, path, raw
line, mount option or namespace token enters a diagnostic. There is no partial
successful observation. Logical buffer/requested work bounds do not bound allocator/kernel memory,
scheduler delay or syscall return.

##### Separately reviewed Stage-A fdinfo byte prerequisite

The accepted Stage-A amendment also permits a disconnected supplied-byte
prerequisite under its own exact contract and precode review. This subsection
opens only that pure representation lane; it does not implement any operation,
input-descriptor check, deadline, EOF observation, worker or successful native
reader described above. The genuine reader remains NOT_READY. No material
custody/trust amendment is accepted by adding this parser.

Owned source is `crates/lnsatd/src/headless_native_fdinfo.rs`, its adjacent
`headless_native_fdinfo_tests.rs` and one private module declaration in
`headless_native.rs`. The parser takes one immutable supplied byte slice and
returns one private record with `position: u64`, `flags: u32`, `mount_id: u32`
and `inode: u64`. These integers are untrusted representation, including zero;
no flag interpretation, descriptor association, EOF/freshness/origin evidence,
mount/namespace/ACL/idmapping classification or authority follows. Record fields
and parser are private; no Debug, serializer, public constructor, observer
injection or product caller is added. No dependency, feature, lock or existing
mountinfo/ACL parser change is permitted.

Use the four-line grammar immediately above exactly. Decimal `position` is
bounded by `i64::MAX`, `mount_id` by `i32::MAX`, inode by `u64::MAX`; flags consume
one literal leading zero followed by one through eleven octal digits whose
value fits `u32`. Additional leading zeroes in the octal payload are accepted
within that fixed width, as already permitted by the proposed grammar; decimal
leading zeroes remain forbidden except the single `0`. This is a finite byte
policy, not an assertion of canonical kernel flags or native provenance.

The error order is exact: reject input above 4,096 bytes first; then preflight
nonempty input, terminal LF, exactly four nonempty lines, and bytes limited to
ASCII graphic/space plus TAB/LF. Reject all other control bytes, DEL and high
bytes. Then check each exact ordered prefix (`pos:` plus TAB, `flags:` plus TAB,
`mnt_id:` plus TAB, `ino:` plus TAB), followed by the field's numeric grammar.
No leading/trailing/repeated whitespace, sign, decimal separator or normalization
is admitted by numeric parsing. Missing/extra lines fail framing; reordered,
duplicate or unknown names in a four-line frame fail the field check. The first
invalid ordered field/number determines the result after successful preflight.
No partial record escapes failure.

Four fixed data-free errors are `native_fdinfo.limit_exceeded`,
`native_fdinfo.invalid_framing`, `native_fdinfo.invalid_field` and
`native_fdinfo.invalid_number`. Only the error enum may derive Debug/Eq for
fixed-code tests; no supplied integer or byte enters its code. Parsing performs
no heap allocation, text conversion, syscall, descriptor operation, clock,
thread, retry, recursion or input mutation. A bounded preflight plus four field
passes is linear in at most 4,096 bytes, with constant stack storage and checked
arithmetic. Allocation failure injection is unnecessary for this allocation-free
module; this supplies no wall-clock guarantee for native observation.

Focused vectors must cover zero/maxima, ordinary flags, permitted octal padding,
all numeric overflows and width excess, decimal leading zeroes, wrong radix,
signs, empty values, exact prefixes/order, duplicate/unknown/missing/extra fields,
lock/type tails, empty lines, all forbidden controls/high bytes, every truncated
prefix of a valid record, and unchanged input. At 4,096 bytes an invalid padded
record must produce a grammar error, while 4,097 bytes must produce the limit
error: there is no valid cap-sized record under four bounded fields, so tests
must not invent one. Exercise every single-byte substitution of a representative
record for panic freedom and field-domain invariants; successful mutations remain
untrusted numbers. Tests use synthetic bytes only and never read procfs or inject
a successful native observer. Run focused pinned tests, strict Clippy/format,
full `npm run check`, public/inventory/history checks, installed scanners and
fresh independent exact source/direct-child reviews. A source revert removes
this private prerequisite without migration or runtime changes.

##### Current association and drift

For the resource, compare only device/inode, kind/mode, UID/GID, link count,
ctime, filesystem magic, mount ID and current descriptor/status flags. For
proc directories compare device/inode, kind, procfs magic and mount ID; do not
compare dynamic root link counts or access times. Process-root comparison is
device/inode/mount ID; namespace comparison is retained NSFS device/inode.
The finite candidate resource filesystem mapping is `EXT4_SUPER_MAGIC` to
`ext4` and `TMPFS_MAGIC` to `tmpfs`; every other resource filesystem denies.
Temporary tmpfs fixtures prove untrusted candidate association only and do not
satisfy the selected ext4 host recipe. Proc-root magic maps only to `proc`.
No opaque filesystem name is interpreted as an authenticated mapping.

One proposed attempt brackets reads with resource/proc-root `fstat`, `fstatfs`,
`statx` mount ID, descriptor flags, the self-link, current process-root metadata
and fresh namespace-link metadata compared to retained namespace handles. It
reads resource and proc-root fdinfo before and after two fresh mountinfo tables.
Require unchanged fixed identities/flags, equal complete tables, exactly one
row for each fdinfo mount ID, agreement with descriptor `statx` mount ID, matching
row device major/minor and filesystem type, and current root/namespace equality.
The proc-root row must be `proc`; the resource row must match the finite
filesystem mapping above, not a caller Boolean. Missing or hidden/outside-root rows,
duplicates, detached mounts, unavailable fields and drift deny the whole sample.
Retain at most one resource borrow, proc root, numeric-self, fdinfo directory,
namespace directory, two namespace handles and one open record per attempt.

This is bracketed current evidence, not an atomic namespace snapshot or proof
that no ABA change occurred between samples. Mount option bytes establish no
trusted `idmapped=false`, ACL absence, active LSM list or continuous effective
permissions. Subsequent integration still needs the accepted root manifest,
actual pins and grant/use invalidation/linearization contract. Live mount and
namespace tokens remain separate from persistent resource identity. No generic
host-root, daemon or adapter association is inferred from matching self data.

##### Blocking precode gate: native return and retained custody

The absolute result-acceptance deadline remains no later than five seconds
from observation start and no later than the enclosing uninterrupted
preparation/action deadline. Acquisition, metadata/lookup, reads, decoding and
owned-handle cleanup remain attributable to that attempt; no per-file reset is
permitted. The owner has accepted investigating retained custody when native
work outlives this deadline. A late completion must deny. This does not establish
that the syscall, cleanup or delivery of denial finishes by the deadline.

In reviewed upstream v6.8, `seq_read_iter` acquires a mutex; the mount iterator
acquires the namespace read semaphore; mount emission calls filesystem/security
hooks. Read readiness and `O_NONBLOCK` do not add a completion deadline to these
paths. The inspected synchronous recipe therefore has **no proved enforceable
native return bound**. A timer notification, async wrapper, byte/read cap,
`RESOLVE_CACHED`, detached borrowed thread or signal is not an accepted substitute.
Kernel time/allocation are not bounded by userspace storage limits. There is no
new claim that all possible Linux implementations are infeasible.

Before source, a separate exact decision must define how bounded caller return,
held-descriptor/store lifetime, late-result rejection, at-most-one unfinished
observation, resource retention/quarantine and eventual cleanup work together.
The retained-worker investigation has explicit owner acceptance; its exact
construction and native feasibility still need independent precode review.
It must preserve a genuine non-root positive case, safe APIs, no resource
duplication/reopen, no privileged helper and no authority-bearing IPC. It does
not authorize worker implementation. Extending result acceptance, claiming
cancellation from polling, or always denying the intended positive case cannot
open reader source. Until the gate is resolved, all proposed
operation/storage details above remain unimplemented and precode readiness fails.

##### Retained-lane containment contract investigation

**Accepted for exact contract/feasibility investigation; not implemented or
precode-approved.** The [canonical owner decision](../../PROJECT_STATUS.md#stage-a-self-process-procfs-reader-contract)
binds the reviewed proposal at `f1510a0e2241bd61c170c244b2dee6b6112e0845`.
Investigate replacing the synchronous borrowed reader with one private non-root
observer lane which owns lifetime-safe resource custody and contains unfinished
native work. This does not establish a hard wall-clock guarantee that a kernel
syscall, thread destructor or process termination finishes in five seconds.
No API, worker, process, native read or new mutation is added by this contract
investigation. The original stronger hard-completion claim remains unsupported;
it is no longer an owner-choice blocker for this accepted investigation.

The decision distinguishes three obligations. The observation may be accepted
only before the original absolute deadline; the coordinator must perform no
native observation or unbounded join/drop in its request path; an unfinished
worker retains custody and permanently closes the lane until separately verified
recovery. Coordinator scheduling and kernel progress remain host assumptions;
a scheduling pause may delay delivery of the denial. A timeout is evidence of
nonacceptance, never evidence of syscall cancellation, cleanup or nonexecution.
A five-second hard real-time response/cleanup guarantee remains unsupported.

| Choice                                                               | Decision and reason                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Synchronous reads with checks, nonblocking flag or readiness polling | Rejected as a solution to bounded native return; a blocked syscall does not reach the next check.                                                                                                                                                            |
| Scoped borrowed thread                                               | Rejected: Rust scope return joins all scoped threads, so a stuck syscall retains the caller. Dropping an ordinary JoinHandle detaches rather than cancels; it loses the required cleanup owner.                                                              |
| Per-request worker, retry or detached timeout                        | Rejected: repeated timeouts can accumulate unfinished work; borrowed resource lifetime and late-result authority are unresolved.                                                                                                                             |
| Separate observer process                                            | Deferred: parent/self identity, descriptor inheritance/transfer, SQLite custody, authenticated fixed protocol, crash/reaping and inherited authority require a different exact contract. No helper executable or FD transfer is selected.                    |
| One retained in-process observer lane                                | Recommended for an independently reviewed amendment: fixed private operations, ownership retained through completion, one unfinished job, immutable deadline, permanent timeout latch and no blocking join on the coordinator. Implementation remains gated. |

**Custody.** The proposed first reader lane accepts only private owned read-only
or O_PATH regular-file/directory custody and owned proc-root custody. The owner
creates an `Arc<File>` custody object once by moving the existing `File`; Arc
references share that same handle and never call `dup`, `try_clone` or reopen.
The coordinator retains custody while the worker holds its own reference.
The worker receives a fixed request, not an arbitrary closure, public observer,
path/PID/FD argument or caller-controlled callback. All native opens, metadata
checks, reads and temporary-handle destruction happen on that worker. The
coordinator does not perform a preliminary `fstat`, `statx`, proc-root open or
other potentially blocking filesystem operation before offloading. Allocation,
worker startup and acceptance of the custody object belong to the separately
bounded lane-construction contract; construction itself supplies no observation
or deadline success. It cannot be hidden outside the overall preparation limit.

The owner accepted investigating this change to input borrow/retention semantics;
exact construction and cleanup proof remain precode requirements.
A `&File`, an SQLite raw descriptor, or an unsafe fabricated `'static` borrow
cannot be converted into this custody object. Selected SQLite custody remains
excluded: the real store connection/lifetime, its writable and locked descriptor,
release/stop concurrency and selected-write contract must be reconciled in their
own exact freeze. No Arc around an unrelated reopened file substitutes for it.
The first lane's positive resource case is a held read-only ext4 file/directory;
synthetic/tmpfs fixtures remain untrusted prerequisites.

**Single slot and deadline.** One private lane is constructed under the eventual
installation custody/daemon lease. At most one job can be outstanding; there is
no backlog, pool expansion or automatic replacement worker. Its nonreusable
attempt token, absolute deadline and original custody set are fixed before
dispatch. The deadline is the earlier of observation-start plus five seconds and
the enclosing uninterrupted preparation/action deadline. No per-read reset,
renewal, retry, deadline extension or fresh token for a timed-out operation is
allowed. Every native step and decoding stage checks expiry before starting
and after returning; expiry prevents all later optional work.

The coordinator alone decides acceptance after receiving the complete private
result and checking the current monotonic time against that original deadline.
Worker-reported completion time cannot admit a late-delivered result. Deadline
arrival, disconnect, worker panic, unknown outcome or incomplete cleanup selects
denial and the terminal lane latch. A simultaneous completion/timeout race has
one serialized coordinator decision: if its acceptance check occurs at or after
the deadline, denial wins. Expiry detected by the worker is also terminal.
No result published after terminal denial can reset the lane or become a permit.
Acceptance still returns only an untrusted native sample, never action authority.

**Unfinished work and cleanup.** Timed-out work retains its resource/proc-root
custody, the single slot and the join handle in the private lane owner. The
coordinator does not synchronously join it, run its destructors or release the
last custody reference. There is no new job while retention is unresolved.
Once the syscall returns, the worker rejects its result, stops further optional
reads, disposes of its temporary native handles and reports only completion for
quarantine accounting. The terminal admission latch remains closed even if
cleanup later finishes. A fixed private result slot cannot enqueue more than one
completion or carry a serialized permission. Publication alone is not thread
termination: thread-local destructors and join completion also belong to the
retained cleanup responsibility. No use of `is_finished` is promoted into a
hard bounded-join proof.

The lane owner must outlive the worker and cannot silently drop/detach its handle
on a normal error path. Shutdown uses the same closed admission state; it does
not report clean shutdown while custody is retained. Process termination or a
signal is not a five-second cleanup proof. A restarted process must honor the
existing durable preparation quarantine and exclusive installation lease; it
cannot erase an unresolved record or treat process absence as verified resource
cleanup. Before integration, an exact crash/durability contract must bind this
new local uncertainty to existing journal/store recovery without adding a new
competing authority record. That cross-module contract is still required.

**Bounds and proof obligations.** The exact source contract must fix worker count,
stack size, one request/result slot, allocation/failure behavior, native handle
count and the requested buffer/parser bounds already listed. These are not a
kernel allocation or scheduler guarantee. No native callback may hold a mutex
needed by deadline rejection, stop or revocation. No success or cleanup path may
accidentally join/drop retained work on the coordinator. The installation-wide
closed-lane check must eventually participate in every affected admission and
release path under the accepted serialization contract; a private worker test
alone cannot prove that integration.

**Evidence ordering under accepted Stage A.** Precode review specifies an exact
feasible recipe for timely genuine non-root positive observations, expiry before
dispatch, expiry during an unfinished native operation, late delivery,
completion-at-deadline, panic/disconnect, retained ownership, no second job,
destructor/join delay, shutdown and restart/quarantine. It reviews the complete
private ownership/synchronization/resource contract and the interface/invariants
required of the future crash bridge. It does not require results from a worker
that has not yet been implemented or completion of canonical store integration.

| Gate                                    | Required evidence and scope                                                                                                                                                                                                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Private reader precode                  | Exact safe operations, permanent custody and construction, synchronization/cleanup, requested resource limits, denial/positive cases, feasible test methods, and explicit integration dependencies. Fresh independent PASS is required before assigning source ownership.          |
| Private candidate source completion     | Actual implementation, genuine disposable Linux positives and unfinished-native-operation/late-cleanup evidence, focused/full source checks and fresh exact source/direct-child review. Unexecuted or unavailable tests remain missing; the candidate cannot be declared complete. |
| Complete freeze and product integration | Implemented canonical journal/store schema and crash recovery, installation-wide admission/stop/revocation, whole-boundary review, exact artifact pins/provenance and feasible positive recipe under accepted Stage C. A private module PASS cannot satisfy this gate.             |
| Test construction/execution and runtime | Each experiment must have its own permitted environment and exact authorization. Stage-A self-process fixture permission does not authorize kernel instrumentation, host changes, Docker, package/image construction or runtime proof.                                             |

This corrects an ordering conflict with the already accepted
[source-order amendment](source-freeze-staging-decision.md#a-reviewed-inert-candidate-source):
prior wording demanded completed native tests and the full durable bridge before
the private source needed to produce them. No evidence requirement is waived.
Deterministic models remain insufficient for native unfinished-operation proof;
synthetic success or an always-denying implementation cannot establish feasibility.
Host mutation/negative kernel probes remain closed. Reader precode is still
**NOT_READY** while exact module and test-method decisions remain unresolved.

The owner has accepted this single-lane contract investigation with explicit
late-denial and retained-cleanup semantics. Continue exact contract/review work
without seeking the same decision again. Acceptance does not establish a proved
implementation or authorize product integration, Docker operation, artifact
construction or runtime proof. The supplied-byte fdinfo prerequisite remains
independent source evidence and cannot close the following construction or
native-feasibility gaps.

This investigation does not extend the separate preparation, administrative,
startup/action or cleanup budgets elsewhere in this specification. An unfinished
observer cannot be reported as successful cleanup under those budgets. Its
retained uncertainty must deny the enclosing transition and participate in the
existing quarantine/admission contract; that integration bridge is still open.

##### Construction and feasibility findings after acceptance

This is the next exact investigation boundary, not an implemented worker or a
precode PASS. The existing safe libraries are Rust 1.97.1, nix 0.31.3 with
`fs,poll,socket,user` and rustix 1.1.5 with `std,alloc,fs`. Existing readable
observation borrows `&File`; no native retained-lane owner, queue, result slot or
quarantine implementation exists. Reusing daemon/server threads or ordinary
temporary-file tests does not establish these new invariants.

**Lifetime candidate.** Investigate one private process-lifetime retention root
for a single persistent worker. A request-scoped owner is insufficient: safe
ordinary destruction can detach its `JoinHandle`, and a scoped-thread owner can
block while joining. The root would retain the unique join capability and all
pending custody after every requester/session/temporary controller handle is
dropped. Rust statics do not run `Drop` at process exit, but that fact alone does
not prove correct construction, recoverability or clean process termination.
This is a proposed private retention mechanism, not an accepted process-global
installation API or a restriction on the final embedding product.

Construction must irreversibly claim the one lane before spawning; a concurrent
constructor, failed spawn or panic cannot permit another worker. The exact
recipe must prove the interval between successful native spawn and permanent
handle retention, including every unwind/early-return path. The worker must not
begin native observation before retention is established. No resettable lazy
initializer, forgotten local handle, detached error path or automatic replacement
can satisfy this proof. An unfinished constructor must remain visibly unavailable
and cannot hide its time outside the enclosing preparation budget. This proof
is still open; source is not authorized merely by naming a static owner.

An exact next construction recipe must acquire the empty retention slot before
spawn, give the worker only the permanent root and a closed start gate, then
move a returned handle into that already-owned empty slot before opening the
gate. The post-return transfer must contain no allocation, formatting, callback,
assertion, replaced value with a destructor or other unwind point. On a reported
spawn failure, construction becomes terminal; it never resets for a retry.
The library-return question is narrower than the application handoff.
Pinned Rust 1.97.1 performs parent spawn hooks, Thread/Arc/closure/ThreadInit
allocation and pthread-attribute setup before native creation. After successful
creation, its Unix backend destroys the valid attribute object and moves the
native/thread/packet values into the returned handle. No ordinary post-success
allocation or parent user callback was identified in that return path. Worker
execution can already have begun, so the closed start gate remains necessary.

The attribute-destruction assertion is not an observed normal Linux failure.
The constructor may rely on the pinned safe API and valid-object, conforming
supported-target Rust/libc/pthread semantics; an ABI/library violation or memory
corruption is outside that trust assumption. Ordinary spawn failure leaves the
lane terminal. Constructor panic/abort supplies no readiness or cleanup claim.
This resolves the alleged ordinary library-return gap conditionally; it does
not close the application-owned permanent-retention/start-gate proof, ambient
spawn-hook assumptions, stack/TLS accounting or crash semantics. Actual selected
library/platform provenance remains part of the full freeze, not a fabricated pin.
No unsafe wrapper, interposed pthread function or helper is introduced.

Research: exact Rust 1.97.1
[thread lifecycle](https://github.com/rust-lang/rust/blob/1.97.1/library/std/src/thread/lifecycle.rs#L27-L110),
[Unix thread creation](https://github.com/rust-lang/rust/blob/1.97.1/library/std/src/sys/thread/unix.rs#L43-L98)
and [safe builder](https://github.com/rust-lang/rust/blob/1.97.1/library/std/src/thread/builder.rs#L140-L185),
with the [POSIX attribute lifecycle contract](https://pubs.opengroup.org/onlinepubs/9699919799/functions/pthread_attr_destroy.html).
These establish source assumptions, not measured construction latency or an
installed-runtime support claim.

**Custody transfer.** Investigate borrowing the owner's already-held
`Arc<File>` values during admission and taking only bounded shared references
after the lane claim. The held file objects remain identical; cloning an Arc
must never call `dup`, `File::try_clone` or reopen a path. Before ownership is
transferred, the original borrowed owners must keep any rejected temporary
reference from becoming the last reference on the coordinator. After transfer,
the request slot or worker owns the custody until accounted cleanup. A timed-out
caller may disappear. No reference to its stack, cancellation token lifetime or
SQLite connection may become a hidden retention requirement. The actual API
and constructor for these private custody objects remain to be frozen.

**Synchronization candidate.** One fixed request slot and one fixed result slot
are sufficient; a channel backlog is not. Investigate an atomic terminal latch
independent of the slot lock, with coordinator slot access using a non-waiting
operation. Native calls, resource destruction and callbacks must run outside
any slot lock. Lock contention may delay a read attempt but cannot block the
deadline/stop denial path or become a retry that extends the original budget.
Poison, worker exit and incomplete cleanup close admission. Exact memory
ordering, token publication and the acceptance/stop race still need one reviewed
linearization proof; separate atomics are not themselves that proof.

The intended state transitions are uninitialized -> constructing -> idle ->
running(token) -> completed(token) -> idle, with the final transition allowed
only after the coordinator's timely acceptance or timely completed denial and
worker cleanup accounting. Expiry, panic, disconnected ownership, stop,
uncertain cleanup or token exhaustion instead enter terminal quarantine. A late
completion can update cleanup accounting but never return to idle. The token
must not wrap or be reused. These are private observer states, not installation
authority or a serialized permit. Worker shutdown/TLS destruction is distinct
from completion of one job in a persistent thread.

**Requested-storage derivation.** The finite lookup schedule can retain two
input descriptors, three proc directories (numeric self, fdinfo and ns), two
namespace descriptors and at most one open record: eight simultaneous descriptor
identities including the inputs, with no duplication. Open/read/close records
sequentially; an exact source trace must verify this proposed peak. Requested raw
record capacity is two 1,048,577-byte mountinfo buffers plus one 4,097-byte fdinfo
buffer, reused across bracketing reads. The 11-byte self-link buffer is additional.
These are requested userspace capacities, not bounds on kernel allocation.

The existing private mountinfo decoder permits a tighter aggregate calculation
than multiplying every field maximum by every row. For input length `I <=
1,048,576` and row count `N <= 4,096`, it requests one `N`-element row vector, one
`N`-element `u32` ID vector, and four decoded byte vectors per row. Each decoded
vector reserves exactly its encoded token length before decoding. Those tokens
are disjoint spans of the one bounded input; the sum of all requested decoded
byte capacities is therefore at most `I`, including a partially parsed row on
failure. Escapes cannot expand that sum. There are at most `4N + 2` decoder
allocation requests. The ID vector is temporary; row values retain the four
vectors and borrow option fields from the input. Row tokenization uses a fixed
42-element slice array, not another heap collection. The fdinfo decoder adds
no heap allocation.

With all three raw buffers conservatively retained during decoding, the
requested buffer/decoder payload is at most `3,149,827 + 4,096 * (R + 4)` bytes,
where `R = size_of::<MountInfoRow>()` for the selected compiled target. The
11-byte self-link array, stack token array, vector/control structures, two Arc
allocations, request/result slots, thread stack/TLS and library/native thread
bookkeeping remain additional. This formula neither assumes an unverified Rust
layout nor counts mutually exclusive phases as a measured process peak. Existing
[`headless_native_mountinfo.rs`](../../../crates/lnsatd/src/headless_native_mountinfo.rs)
implements these decoder bounds; no decoder source change is required.

Rust 1.97.1's [`Vec::try_reserve_exact` contract](https://github.com/rust-lang/rust/blob/1.97.1/library/alloc/src/vec/mod.rs#L1508-L1524)
allows allocator rounding beyond the requested capacity. The calculation closes
the logical decoder-request accounting only. It does not establish a heap/RSS
ceiling, allocation latency, fully fallible construction, stack sufficiency or
cleanup deadline. Allocation failure must deny; an allocator abort or stack
failure is a process failure requiring the still-open crash/recovery contract.
No memory-pressure experiment is authorized to manufacture that evidence.

An explicit `Builder::stack_size` request would avoid reliance on the ambient
default, but the platform may allocate more. `Builder::spawn` reports OS creation
failure; it does not provide bounded construction latency or make all allocation
fallible. The exact stack request, allocation failure/unwind/abort disposition
and pinned implementation accounting remain open. Do not advertise fixed total
memory or a hard return bound before that review.

**Finite Linux fixture investigation.** Read-only review of upstream Linux
v6.8 identifies the following candidates. No native operation or experiment was
run. A future ordinary positive fixture would require a verified genuine held
procfs root and an already-held read-only, unlocked ext4 file/directory in the
same process; it must pass every origin, flags, four-line grammar, association
and bracketing check. This is an unexecuted recipe, not a positive result or a
claim that the eventual pinned host satisfies it.

| Candidate                                                      | Source-derived result and remaining boundary                                                                                                                                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A second procfs record read                                    | `seq_open` creates a private per-open mutex. The candidate's freshly opened, unshared record does not contend on another open's mutex. Sharing its record with a second reader would change the exact schedule.                                                          |
| Mountinfo namespace semaphore                                  | `m_start` takes `namespace_sem` for reading. This is a genuine possible wait, but no allowed mechanism was identified to hold the writer side with a deterministic rendezvous. A controlled mount operation or kernel test hook would require a separate scope decision. |
| Held ext4 file lock                                            | `fdinfo` prints file-lock state instead of waiting for the user lock to be granted; ext4 has no `show_fdinfo` hook. Lock tails also fail the candidate's four-line grammar. Internal spin-lock contention is not a controlled fixture.                                   |
| Self link, fixed directory/namespace/root/statx operations     | Internal allocation or contention is possible; the inspected paths supply no reproducible, non-mutating userspace rendezvous. Forcing reclaim/pressure or adding a fault-injection facility remains forbidden.                                                           |
| Userspace in-flight flag or task syscall snapshot              | A pre-call flag cannot prove kernel entry. A task syscall snapshot would add unapproved `task/TID/syscall` leaves and needs its own identity/deadline association proof; it is not an accepted substitute.                                                               |
| Sleeping closure, barrier, fake clock, slow destructor or FIFO | These test an abstract containment path or a different operation. They do not prove that an allowed procfs operation remains unfinished at timeout.                                                                                                                      |

Primary sources are Linux v6.8
[`seq_open` / `seq_read_iter`](https://github.com/torvalds/linux/blob/v6.8/fs/seq_file.c#L53-L80),
[`mountinfo_open`](https://github.com/torvalds/linux/blob/v6.8/fs/proc_namespace.c#L222-L265),
[`m_start` / namespace locking](https://github.com/torvalds/linux/blob/v6.8/fs/namespace.c#L1365-L1406),
[`fdinfo` emission](https://github.com/torvalds/linux/blob/v6.8/fs/proc/fd.c#L21-L70),
[`show_fd_locks`](https://github.com/torvalds/linux/blob/v6.8/fs/locks.c#L2689-L2705),
[ext4 file operations](https://github.com/torvalds/linux/blob/v6.8/fs/ext4/file.c#L872-L890)
and [task syscall sampling](https://github.com/torvalds/linux/blob/v6.8/fs/proc/base.c#L603-L627).
These are research references, not captured installed-kernel pins.

The inspected candidate set yields no compliant unfinished-operation fixture;
this is not a general impossibility result. One concrete missing test capability
would be a separately reviewed disposable Linux mechanism that proves a
mountinfo read has reached the held namespace semaphore and keeps it there
through the coordinator's original deadline, then releases it for late-result
and cleanup checks. Holding the writer alone is insufficient: reader arrival
must also be evidenced. Host/namespace changes, helpers, tracing/fault injection,
target pressure and tool installation remain closed. Do not repeatedly replace
this missing evidence with another parser or generic scheduling test.

**Stop/deadline ordering investigation.** Two split-decision designs are
insufficient. A clock sample before a later acceptance commit can become stale
across scheduling; a separate open-latch read can precede stop while the later
commit follows it. An exact implementation must reject both schedules.

A bounded abstract candidate reserves a ready result by compare/exchange on the
same control word that carries a sticky terminal bit, then samples the current
monotonic clock. A result can be accepted only if that subsequent sample is
strictly before the original deadline and stop has not already been observed.
The reservation can then be its logical linearization point: monotonicity proves
it preceded the timely sample. Stop before reservation prevents reservation;
stop afterward permanently closes future admission, and retirement must use a
conditional transition that cannot clear the terminal bit. A late sample denies
and closes the lane. Reservation alone publishes no sample or permission.
This candidate retains late-delivery denial and makes no response-time promise.

A finite external evidence model enumerated 420 orderings of cleanup/publication,
reservation/clock/retirement, stop and deadline arrival; six allowed a timely
sample, with no acceptance reservation after stop or expiry. That result assumes
atomic sequentially consistent control steps and prior complete worker cleanup.
It checks one attempt only. It does not prove Rust memory ordering, result-slot
ownership, token reuse/exhaustion, next admission, panic, destruction, construction,
crash recovery or genuinely unfinished native work. Those are still required
before selecting actual primitives or implementing a worker. The model is an
investigation aid outside the product repository, not an authority fixture.

**Existing journal boundary and required crash bridge.** The current
[preparation journal contract](preparation-store-source-spec.md#private-preparation-directory-and-journal)
and private codec have only `pending`, `probe_created`, `cleanup_verified`,
`bound` and `quarantined` phases. Their record identity binds preparation,
candidate, store, recipe, owner, challenge, container and revision. It does not
bind an observer lane/attempt, process incarnation, original deadline, retained
custody or unresolved syscall. `quarantined` can conservatively deny a preparation,
but cannot truthfully identify or prove cleanup of a native worker. The current
custody implementation deliberately defers persistent observation quarantine
and offline recovery; a valid record after reopening remains untrusted evidence.

Before product integration, extend this same canonical preparation authority
under a separately reviewed schema/compatibility decision; do not add a second
completion ledger or reinterpret `probe_created`/`cleanup_verified` as native
observation states. The exact bridge must bind the attempt and owning process
incarnation to preparation/resource/lease identity, persist observation intent
before dispatch, define which acknowledged durable transition permits a clean
resolution, and treat timeout, crash or ambiguous persistence as unresolved.
No dispatch or retry follows a failed/ambiguous intent write. A restarted owner
must recover under the exclusive installation lease and deny new observation
until the prior attempt is conservatively reconciled; process absence, a PID
match, a parseable journal or late worker completion alone cannot clear it.

The deadline path must close admission in memory without waiting for journal
I/O or an owned-file destructor. Pre-dispatch durable intent must therefore be
sufficient for conservative restart denial even if a later quarantine append
never completes. Unresolved persistence and retained work must also prevent a
clean shutdown/release claim. Exact phase/field names, identity freshness,
write/flush ordering, journal budgets, compatibility and reconciliation evidence
remain part of the later coherent store/daemon freeze. No journal codec, schema,
writer, recovery action or selected-store operation is changed here.

##### Proposed instrumented Linux timeout fixture

**Proposed evidence method only; not owner-accepted, implementation-ready or
execution-authorized.** The new decision is whether a deliberately instrumented
native syscall may supply the retained-worker timeout-containment test row.
It does not reopen the already accepted retained-worker investigation or change
the production kernel recipe. The proposal permits no operation in this task.

Prefer one test-only, task/record-bound wait inside the actual mountinfo read
path over holding the global mount namespace semaphore. The latter can stall
unrelated mount readers/writers throughout a disposable guest and still needs
arrival instrumentation. A dedicated gate can establish that this particular
syscall is unfinished without modifying mount state or claiming a naturally
occurring stock-kernel stall. This remains a proposed laboratory fault-injection
method requiring a separate owner decision and exact build/run packet.

**Identity and hook boundary.** Linux v6.8 shares `m_start` across mount views.
The proposed test-only open hook therefore tags one `proc_mounts` record only
when its opener is the enrolled worker task object, its retained namespace is
the enrolled mount-namespace object, and its `show` function is `show_mountinfo`.
Enrollment retains kernel object references, not a reusable numeric PID/TID.
The tag binds one generation to that already-opened record without duplicating
or reopening the resource or procfs descriptor. Unrelated tasks, namespaces,
`mounts` and `mountstats` records bypass the facility.

On the first tagged `m_start` entry, consume the one-shot tag, publish arrival
under the fixture state lock, and wait on a private fixture wait queue before
the normal `down_read(&namespace_sem)`. The actual procfs read is already in
kernel with its record's ordinary private seq mutex held. No global namespace
semaphore or mount write lock is held by this gate. Sequence iteration may
restart after buffer growth or later reads: subsequent starts on the consumed
record bypass the gate, as do later records. They are not protocol errors or
new injection opportunities. Normal mountinfo behavior resumes after release.

These boundaries follow the existing Linux v6.8
[mountinfo open/emitter selection](https://github.com/torvalds/linux/blob/v6.8/fs/proc_namespace.c#L222-L312),
[sequence-read retries](https://github.com/torvalds/linux/blob/v6.8/fs/seq_file.c#L160-L278),
[mount iterator](https://github.com/torvalds/linux/blob/v6.8/fs/namespace.c#L1365-L1406)
and [wait-queue synchronization](https://github.com/torvalds/linux/blob/v6.8/include/linux/wait.h#L299-L320).
The hooks described here do not exist in current LNSAT or the unmodified kernel.

**Control and required evidence.** One isolated disposable test guest would
permit one generation. The fixture controller receives separate enrollment and
release/status capabilities. The worker enrolls before native dispatch; only the
controller can arm or release. No general operation, arbitrary PID/path, memory
address, resource descriptor or native-result payload belongs in that protocol.
The exact transport, safe harness APIs and capability construction are not yet
selected; this is a reviewable method decision, not a runnable operator packet.

| Stage             | Required observation and failure rule                                                                                                                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enroll and arm    | Retain exact task/namespace identities and one generation; start an independent test watchdog. Duplicate enrollment/arm or invalid control capability fails the fixture. No source dispatch exists here today.                                                                     |
| Dispatch and bind | Coordinator fixes the original absolute deadline before dispatch. The test open hook binds only the first matching mountinfo record. Failure to bind or arrive before the deadline cannot pass this test.                                                                          |
| Arrive and hold   | The first tagged iterator entry publishes `ARRIVED`. A synchronized state snapshot must show the same generation remains unreleased through the timeout observation. All status transitions use one fixture state lock and the kernel wait-queue wakeup contract.                  |
| Timeout denial    | Require the original deadline reached, no worker result, terminal lane quarantine, retained custody and second-job denial while the kernel gate is still unreleased. A watchdog or premature release invalidates the proof.                                                        |
| Explicit release  | Only after timeout evidence does the matching controller release the wait. The real mountinfo read continues; its late result cannot reopen admission or become an accepted sample.                                                                                                |
| Teardown          | Forced release, controller loss, protocol error, watchdog expiry or missing accounting marks the fixture failed. Retained references are not silently freed while the gate/read is live. Guest disposal is containment of a failed test, never successful worker cleanup evidence. |

Arrival, release and watchdog disposition must be recorded consistently under
the fixture lock; a userspace in-flight flag is insufficient. Watchdog release
must be independent of the blocked reader and must always fail the experiment.
Its exact budget, clock domain, controller-loss handling and reference lifetime
are required in the future packet. A scheduler or kernel stall can still prevent
a watchdog or teardown from progressing; no hard real-time cleanup is claimed.

`GATE_EXITED` means only that the test wait returned into `m_start`.
`READ_RETURNED`, temporary-handle cleanup, retained-custody accounting and thread
termination are different observations. A persistent worker normally survives
job cleanup. None may be inferred from an earlier state or from VM disappearance.
The instrumented-negative artifact must bind exact test kernel source/patch/
configuration, harness and candidate revisions, run generation, chronological
evidence, release reason and each distinct cleanup observation, without exporting
raw procfs data, paths, descriptors, addresses or credentials.

**Claim and decision boundary.** If implemented as specified, unreleased kernel
arrival would establish an actual procfs syscall still in progress, with genuine
native handles and the caller's timeout path running independently. This is a
stronger containment experiment than a userspace barrier, fake clock, FIFO or
sleeping closure. It would establish only behavior under deliberate test-kernel
instrumentation. It would not prove that an unmodified kernel naturally stalls
there, that native work is cancelable or bounded, or that the selected production
kernel/build is supported. Ordinary positive evidence must separately use the
unmodified reviewed Linux recipe; a dormant hook is still an instrumented build.
Neither test supplies Docker runtime or certification authority.

The owner may accept or reject this narrow evidence-method proposal. Acceptance
would authorize completing its exact test contract, not kernel/harness source,
unsafe application code, tool installation, artifact construction, guest/host
provisioning, native experiments or product integration. Exact transport,
isolation, safe harness interface, state/record lifetime, watchdog and provenance
must first pass independent review. Any later construction/execution request
must name concrete inputs, outputs, isolation, privileges, cleanup and permitted
commands. Until those decisions are complete, the fixture remains **NOT_READY**
and the existing no-instrumentation/no-host-action restrictions remain in force.

**Precode disposition.** The retained-worker owner decision permits contract
investigation. The ordinary library-return concern is narrowed under explicit
trusted-target assumptions; application construction/drop ownership, complete
resource/synchronization rules and an accepted feasible genuine-native test
method remain unresolved. The private contract must also specify its future
crash-bridge interface and invariants, without claiming canonical recovery is
implemented. Reader/worker implementation remains **NOT_READY**. Completed
native test results gate source completion; the complete durable bridge gates
integration. Neither may be reported as complete by reviewing this proposal.

##### Required evidence and later source ownership

A ready contract must receive fresh independent read-only precode review of
every native operation, timeout/lifetime/cleanup path and feasible non-root
positive recipe. The later isolated source would own
`crates/lnsatd/src/headless_native_procfs.rs`, its focused test companion and the
private declaration in `headless_native.rs`; no ownership or source permission
is assigned before the blocking gate passes. Existing decoder/ACL/journal and
Cargo versions/features/lock remain unchanged in this documentation slice.

Future tests need genuine disposable Linux self-process/held regular-file and
directory positives (including O_PATH only if its exact custody passes), known
record origin and descriptor association, exact EOF/sentinel/short-read bounds,
strict fdinfo/extra-tail failures, unsupported-platform denials, fixed data-free
errors and deterministic change at every bracketing stage. Test-only hooks may
force denial/change/short reads, never fabricate a successful native origin or
permit. Deadline proof must cover a genuinely unfinished native operation,
late completion and retained-resource cleanup; advancing a fake clock around
an already returned syscall is insufficient. No test changes mount/namespace,
permissions or a selected host, invokes Docker, duplicates SQLite's FD, performs
a target action or establishes runtime/support/certification authority.

Future source needs focused pinned Linux tests, formatting/strict Clippy,
`npm run check`, docs/public/inventory/history checks and exact source/direct-child
attestations. Documentation checks and independent approval of this accurate
gate record do not approve reader implementation. The complete coherent
native/wire/daemon/store/pin/positive-feasibility freeze, separate artifact
capture, product integration, runtime operator proof and V1/release remain open.

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

The reviewed upstream Linux v6.8 mountinfo emitter includes `idmapped` in the
per-mount options when `is_idmapped_mnt` is true. Its position is the mount
options field before the tagged optional fields and `-` separator. No
`idmapped` tagged optional field is defined. That upstream source observation
does not authenticate the installed kernel or a caller-supplied mount record;
absence from an untrusted record supplies no idmapping proof. The root manifest
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
- [Linux v6.8 proc namespace source](https://raw.githubusercontent.com/torvalds/linux/v6.8/fs/proc_namespace.c)
  emits `idmapped` in `show_mnt_opts`, called by `show_mountinfo` for the
  per-mount options field. The
  [upstream proc documentation](https://raw.githubusercontent.com/torvalds/linux/v6.8/Documentation/filesystems/proc.rst)
  distinguishes that field from the later tagged optional fields. An exact
  installed-kernel recipe and current authenticated association remain required.

- [Linux v6.8 self link](https://github.com/torvalds/linux/blob/v6.8/fs/proc/self.c)
  derives its numeric target from the current task in the procfs PID view;
  [fdinfo source](https://github.com/torvalds/linux/blob/v6.8/fs/proc/fd.c)
  emits four base fields and may append lock/type-specific data.
- [Linux v6.8 sequential reads](https://github.com/torvalds/linux/blob/v6.8/fs/seq_file.c)
  and [mount iterator](https://github.com/torvalds/linux/blob/v6.8/fs/namespace.c)
  expose the inspected synchronous locking paths, not a five-second return promise.
  [Namespace links](https://github.com/torvalds/linux/blob/v6.8/fs/proc/namespaces.c)
  are kernel magic links, distinct from ordinary no-follow descent.
- Exact safe [nix 0.31.3 openat2](https://docs.rs/nix/0.31.3/nix/fcntl/fn.openat2.html),
  [read](https://docs.rs/nix/0.31.3/nix/unistd/fn.read.html) and
  [poll](https://docs.rs/nix/0.31.3/nix/poll/fn.poll.html), plus
  [rustix 1.1.5 fixed-buffer readlinkat](https://docs.rs/rustix/1.1.5/rustix/fs/fn.readlinkat_raw.html)
  and [statx](https://docs.rs/rustix/1.1.5/rustix/fs/fn.statx.html), provide
  selected primitives under existing features, not native read cancellation.
  [Rust process ID](https://doc.rust-lang.org/std/process/fn.id.html) avoids adding
  nix's currently disabled `process` feature.
- Rust's [scoped-thread lifetime contract](https://doc.rust-lang.org/std/thread/fn.scope.html),
  [join/detach behavior](https://doc.rust-lang.org/std/thread/struct.JoinHandle.html)
  and [shared ownership](https://doc.rust-lang.org/std/sync/struct.Arc.html)
  explain the proposed custody alternatives. A timeout on a
  [receiver](https://doc.rust-lang.org/std/sync/mpsc/struct.Receiver.html)
  does not cancel native work or authenticate cleanup. These stable APIs do not
  provide a hard real-time scheduler guarantee.
- Exact Rust 1.97.1 [join-handle source](https://raw.githubusercontent.com/rust-lang/rust/1.97.1/library/std/src/thread/join_handle.rs)
  preserves the distinction between main-function completion and thread
  termination; [thread builder source](https://raw.githubusercontent.com/rust-lang/rust/1.97.1/library/std/src/thread/builder.rs)
  documents OS spawn errors and a requested stack size that the platform may
  exceed. The [Rust Reference on statics](https://doc.rust-lang.org/reference/items/static-items.html)
  states that statics do not run destruction at program exit. These facts inform
  the retention investigation; they do not prove the proposed constructor,
  memory ceiling, native fixture or crash recovery.
- Pinned Rust 1.97.1 [thread lifecycle](https://raw.githubusercontent.com/rust-lang/rust/1.97.1/library/std/src/thread/lifecycle.rs)
  and [Unix thread creation](https://raw.githubusercontent.com/rust-lang/rust/1.97.1/library/std/src/sys/thread/unix.rs)
  locate the allocation, native creation and attribute-guard steps for the
  constructor audit. Successful public API return is later than native thread
  creation; the investigated custody handoff must cover that interval.

These source-derived recipe choices are LNSAT design inferences. Research does
not provide owner acceptance of a material design change or runtime evidence.
