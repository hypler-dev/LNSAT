# HCFG-6 Root Manifest Bootstrap Source Contract

Status: private Stage-A source contract under the accepted
[source-order amendment](source-freeze-staging-decision.md#a-reviewed-inert-candidate-source).
[Project Status](../../PROJECT_STATUS.md#stage-a-root-manifest-bootstrap-contract)
owns implementation and review disposition. This is the next acquisition and
lifetime prerequisite for the existing [held artifact reader](native-artifact-source-spec.md).
It does not implement the complete root/daemon bridge or turn observed bytes
into authority.

## Outcome and exact future ownership

The private candidate must open the one explicitly selected root manifest,
retain its original file and all directory ancestors on the existing native
worker, and read its bounded bytes through the existing artifact read schedule.
The coordinator receives bounded unverified facts and an opaque lifetime ticket,
never a native descriptor. Native open, metadata sampling and final close may
block; none runs on the coordinator or while holding the lane's slot mutex.

A later source packet owns exactly:

- `crates/lnsatd/src/headless_native_root_bootstrap.rs` and its sibling
  `headless_native_root_bootstrap_tests.rs`, as private children of the procfs lane;
- the existing `headless_native_procfs.rs` and its tests for three closed jobs,
  worker-owned retained custody, completion matching and cleanup accounting;
- `headless_native_artifact.rs` and its tests only for the fixed worker-local
  read reuse, failed-read post-call checkpoint correction and bounded borrowed
  unverified facts;
- `headless_native_readable.rs`, `headless_native_acl.rs` and their existing
  tests only for a fixed root-manifest present-ACL predicate;
- the canonical documentation and review/inventory records for that packet.

No journal-store helper is exported or repurposed. Its selected-store borrow,
directory creation and append rules belong to a different lifetime. No new
worker, callback, observer trait, public field, trusted constructor, general
filesystem service, product caller or protocol version is added. Procfs and
already-held artifact callers keep their existing behavior and regression tests.
The fixed root jobs use the same single control word, nonreusable job tokens,
permanent join custody, nonwaiting coordinator and terminal lane semantics.

## Private inputs and outputs

`RootManifestAnchor` contains the canonical absolute manifest path and the
independently selected nonzero controller UID/GID. Its private constructor
checks only input grammar: UTF-8 length 1..4096, no controls/NUL, exactly one
leading slash, no trailing slash, and no empty, dot or dot-dot component.
`/` is not a file anchor. Every component is 1..255 bytes. There are at most
128 components, giving at most 128 retained directories including `/`.
`RootManifestAnchor::parse(path, controller_uid, controller_gid)` returns
`Result<RootManifestAnchor, RootBootstrapError>` before an observation starts.
Malformed grammar returns `invalid_input`; no budget exists at this preflight
step and no unrelated observation is invalidated. It is an unverified request,
not proof of profile, current identity or root.
There is no path search, environment fallback, home expansion or automatic
provisioning. Final composition must derive it from the independently held
schema-3 profile and actual controller, not from response JSON or the manifest.

`RootManifestAttempt::try_prepare(&anchor, &budget)` uses the existing non-Clone
`ArtifactReadBudget`, created once before this operation. No deadline, byte
counter or manifest claim is reset. Busy returns `Ok(None)` without claiming a
manifest read, allocating native handles, invalidating the observation or
spinning. Unsupported platform or expired/invalid budget returns a fixed denial and
invalidates that supplied budget. Admission receives an already parsed immutable
anchor. Claim the one manifest read only when the closed begin job wins the
`IDLE -> ACTIVE` admission transition, before dispatch/native work.
The existing held-reader entry cannot claim the same budget again.

Closed jobs are `RootManifestBegin`, `RootManifestRecheck` and
`RootManifestRetire`; each has a distinct request and completion variant.
The request payload determines kind. Existing public/native error families are
unchanged; new private errors use `headless_root_bootstrap.` followed by exactly
`unsupported_platform`, `invalid_input`, `budget_exhausted`,
`association_rejected`, `native_denied`, `unstable`, `limit_exceeded`, or
`cleanup_uncertain`. Never include paths, IDs, xattr bytes or OS error text.

`dispatch` and `poll` retain the existing Pending/one-result protocol. Before
moving a completion, check job token, job kind, cleanup accounting and the same
live budget allocation. Wrong kind/token terminalizes without coordinator
extraction or disposal of owned native state. Any denial invalidates the whole
observation before READY publication. Cancellation, timeout, poison, unwind,
late publication and cleanup uncertainty do the same.

Success returns `UnverifiedRootManifestCustody`, a non-Clone, non-serializable
private ticket containing the existing zeroizing bounded manifest body/raw
digest and unverified metadata. Ticket fields are private: the original begin token and
shared observation allocation identity. It contains no `File`, `OwnedFd`, raw
fd, path handle, native close function or transferable permit. Context-checked
borrowed access requires that exact live budget and ticket; disposed, mismatched,
retired or invalidated observations expose no prior bytes as current evidence.
A successful parser or expected digest comparison alone cannot promote it.

The exact coordinator-facing private methods are:

| Receiver                        | Method and result                                                                                                                                                                                                                                                | Lifetime and effect                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RootManifestAttempt`           | `try_prepare(&RootManifestAnchor, &ArtifactReadBudget) -> Result<Option<Self>, RootBootstrapError>`; `dispatch(&mut self) -> Result<DispatchStatus, RootBootstrapError>`; `poll(&mut self) -> Result<Option<UnverifiedRootManifestCustody>, RootBootstrapError>` | A successful poll transfers only the opaque ticket and bounded unverified data; the attempt disarms.                                                  |
| `UnverifiedRootManifestCustody` | `facts<'a>(&'a self, &'a ArtifactReadBudget) -> Result<RootManifestFacts<'a>, RootBootstrapError>`                                                                                                                                                               | Borrowed body/digest/metadata only; mismatch invalidates the ticket's own observation. No native call or file access is exposed.                      |
| `UnverifiedRootManifestCustody` | `try_recheck<'a>(&'a self, &'a ArtifactReadBudget) -> Result<Option<RootRecheckAttempt<'a>>, RootBootstrapError>`                                                                                                                                                | Keeps the ticket borrowed until its attempt ends; Busy has no new native work.                                                                        |
| `RootRecheckAttempt<'a>`        | `dispatch(&mut self) -> Result<DispatchStatus, RootBootstrapError>`; `poll(&mut self) -> Result<Option<UnverifiedRootStability>, RootBootstrapError>`                                                                                                            | Result binds begin token, current recheck job token and same budget; fixed unverified stability only. Armed Drop invalidates/cancels its own job.     |
| `UnverifiedRootManifestCustody` | `try_retire<'a>(&'a mut self, &'a ArtifactReadBudget) -> Result<Option<RootRetireAttempt<'a>>, RootBootstrapError>`                                                                                                                                              | Mutable borrow prevents concurrent fact/recheck use through that ticket. Accepted retirement invalidates facts; Busy does not.                        |
| `RootRetireAttempt<'a>`         | `dispatch(&mut self) -> Result<DispatchStatus, RootBootstrapError>`; `poll(&mut self) -> Result<Option<RootRetirement>, RootBootstrapError>`                                                                                                                     | Cleanup-only receipt on exact complete accounting; success disarms the borrowed ticket. Armed Drop cancels its own job and retains uncertain cleanup. |

`UnverifiedRootStability` is non-Clone and non-serializable with private fields.
Its exact accessor is `facts(&self, &RootRecheckAttempt<'_>,
&ArtifactReadBudget) -> Result<RootStabilityFacts<'_>, RootBootstrapError>`.
The attempt retains its immutable Begin-ticket borrow and exact Recheck job
token after a successful poll, with an internal completed flag set only by
that poll. The accessor requires that completed attempt, matching Begin and
Recheck tokens, the same live budget allocation and unchanged absolute
deadline; mismatch invalidates the result's own observation. It cannot accept
a caller-supplied integer or merely compare the result's token to itself.
No accessor exists after dropping the matching attempt/context. Borrowed facts
remain unverified snapshots: final composition must recheck the shared gate
before using them and cannot convert an earlier borrow into a live permit.

`RootManifestFacts` and `UnverifiedRootStability` expose no file/path handle or
root/ACL/mount validity Boolean. Their access stays bound to the same live
observation. `RootRetirement` records only disposal of this fixed retained set;
it is not process shutdown, kernel-reference exhaustion or action cleanup proof.
No public visibility, caller-defined expected state or generic result extractor
is introduced.

## One worker owns the retained descriptors

Add one `Option<RootManifestCustodyState>` local to the existing worker body,
outside `Slots`. It owns the original root/ancestor descriptors, original leaf
`OwnedArtifactCustody`, exact component chain, initial native observations and
same observation budget. No native owner enters a coordinator-visible result
or the slot mutex. The maximum retained set is 128 directory descriptors plus
one leaf. One worker-local prospective descriptor may exist while checking an
open before it is admitted to that set. Reserve bounded metadata/path storage
before opening; allocation failure denies without losing descriptor custody.

The first begin job's nonreusable token identifies the retained set. Recheck
and retirement carry that ticket and the same budget allocation, plus their
own distinct job token. No caller selects a slot, recreates a ticket from an
integer, swaps a file, resets the deadline or replaces an existing set. A
second begin while any retained set exists is Busy and does not consume a
second observation's manifest claim. Existing procfs/held-file work may still
use the lane serially; a failure that terminalizes the lane also invalidates
the retained root observation. No concurrent native use is introduced.

### Admission marker and linearization

`Slots` gains one **non-owning** `root_lease` record with closed states
`Reserved`, `Held` or `Retiring`. It contains only the original begin token,
same `Arc<ArtifactBudgetState>` identity and, for `Retiring`, its exact retirement
job token. No native descriptor, cleanup callback or native owner enters it.
This is occupancy and association bookkeeping under the existing slot mutex;
the existing SeqCst control word remains the sole job-admission/terminal authority.
There is no second token allocator or independently authorizing atomic gate.

Perform the following under one slot lock, with no native call or allocation:

- Begin requires empty request/completion, normal cleanup state and `root_lease`
  absent. A present lease returns Busy before claiming a manifest. Win the
  existing `IDLE -> ACTIVE` CAS, then claim the shared one-use manifest flag,
  install its `Reserved` lease marker and typed request with `dispatched=false`,
  and complete preparation in the existing sequence. `Reserved` here is only
  a lease name; the control-word phase is ACTIVE. Claim/setup failure after
  winning admission denies and terminalizes; it cannot return Busy with a
  consumed claim. Losing CAS has no manifest claim. The request's bounded owned
  memory is prepared before locking.
- Before Begin READY, the worker installs its complete retained state outside
  the lock, then under the lock requires the exact `Reserved` marker and updates
  it to `Held` while publishing the matching completion. Marker mismatch or
  failed publication invalidates/terminalizes and leaves native disposal to the
  worker. A marker alone never constructs custody.
- Recheck requires the exact `Held` begin token and budget, then wins the usual
  job reservation. The marker remains `Held`; one control word excludes any
  simultaneous native job. Wrong ticket/budget invalidates that retained
  observation and denies before native work.
- Retire requires the exact live `Held` lease and wins its job reservation.
  Change the marker to `Retiring` with that new job token and invalidate its
  shared budget before dispatch. Its typed cleanup request retains the marker
  identity even though observation reads are now forbidden. No other root job
  can admit against `Retiring`.
- Only exact complete worker retirement may clear the matching marker; do so
  while the retirement job is still ACTIVE and before its cleanup-only READY.
  Admission remains closed until normal result/RETIRING/IDLE completion. A
  stale ticket drop only invalidates its own already-invalid budget and wakes
  the worker; it never changes another lease or terminalizes a new observation.
- Terminal drain closes its own retained state independent of whether the
  marker is Reserved/Held/Retiring. A poisoned/mismatched marker permits no
  success receipt or new observation. Unfinished or uncertain cleanup never
  clears terminal admission or permits a replacement worker.

### Exact control-word flow for root jobs

Do not overload the existing control-word `RESERVED` phase. It remains the
post-READY result reservation used by `reserve_ready`. The non-owning lease's
`Reserved` label is a different Rust enum, never a control-word value.

| Event                                                     | Control-word transition                              | Root request/lease requirements                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Successful prepare for Begin/Recheck/Retire               | `IDLE(previous_token) -> ACTIVE(new_job_token)`      | Hold the slot lock, verify kind-specific lease preconditions, win CAS, install the typed request with `dispatched=false`; Begin installs its Reserved lease and claims once, Recheck preserves Held, Retire records its new job token and invalidates only that Held budget.                                     |
| Dispatch                                                  | `ACTIVE(token) -> ACTIVE(token)` strong-CAS recheck  | Require exact typed undispatched request, lease/ticket/budget association, and original deadline under a successful nonblocking slot lock. Observation jobs require a valid budget; Retire uses only its exact cleanup exception. Set `dispatched=true` only after those checks, release lock, then wake worker. |
| Native work                                               | remains `ACTIVE(token)`                              | Worker takes only the matching dispatched request. An undispatched ACTIVE request performs no native work and parks without resetting any retained deadline.                                                                                                                                                     |
| Successful worker publication                             | `ACTIVE(token) -> READY(token)`                      | Exact kind/token/accounting and original deadline; observation outcomes need a live budget and Held lease; Retire needs complete cleanup and its deliberately invalidated original budget. Failure invalidates and terminalizes.                                                                                 |
| Coordinator accepts result                                | `READY(token) -> RESERVED(token) -> RETIRING(token)` | Check typed completion and cleanup before moving bounded non-native results; keep existing `reserve_ready` / `retire_reserved` semantics.                                                                                                                                                                        |
| Worker retires result slot                                | `RETIRING(token) -> IDLE(token)`                     | Request/completion empty and exact job cleanup complete. A Held root lease may survive; a successfully retired lease is absent.                                                                                                                                                                                  |
| Cancel, timeout, stop, poison or failed setup/publication | matching phase gains TERMINAL; never clears          | No success extraction or new admission. Worker drains its own request and retained native state; BODY_RETURNED is not clean-disposal proof.                                                                                                                                                                      |

A root-specific non-native admission guard is armed immediately after winning
`IDLE -> ACTIVE` and remains armed through manifest claim, lease/request install
and facade construction. Claim failure, cancellation/stop observed before
install, or unwind invalidates that budget, terminalizes and wakes the worker;
never leave ACTIVE with an unowned untracked request. Under the still-held slot
lock, recheck the exact nonterminal token and deadline before installation.
Install the preallocated payload and lease without a fallible native operation,
then perform the final state/deadline check before returning the armed attempt.
A stop racing the final check still leaves the complete request slot-owned for
terminal drain; it must not resurrect ACTIVE or be reported as dispatched.
An undispatched request has acquired no native descriptor. Its coordinator
cleanup therefore drops only bounded memory; retained native disposal remains
worker-owned. Existing procfs/artifact state transitions are unchanged.

Tests must place cancel/stop/expiry/unwind before and after admission CAS,
manifest claim, marker/request install, dispatch CAS/flag update, READY CAS,
result reservation and slot retirement. No test may pass merely because a
root request can never reach dispatch.

Job input retirement and observation cleanup are distinct. Root jobs carry
zero coordinator-owned file references; their accounting must not claim the
one artifact or two procfs input references. The begin job temporarily clones
its worker-owned original leaf only for the existing fixed artifact reader and
retires that clone on the worker. The original stays in the retained set.
Do not count a retained original as a closed temporary descriptor.

Root cleanup accounting is separate from the existing procfs/artifact input
reference counts. For Begin require retained-before=0, retained-after equal to
the exact chain-plus-leaf count, one retired worker-local read reference, and
all other opened handles either transferred to that retained set or consumed
by one close attempt. Recheck requires unchanged retained count/identities and
no leaked temporaries. Retire requires retained-after=0 and exactly one close
attempt per original retained descriptor, with zero failures and zero extra
references. Terminal or failed work supplies no successful accounting witness.
Derive expected counts from the actual fixed operation and retained set, not
caller scalars, and verify these per-kind fields before publication.

Track each acquired native descriptor exactly once as either a temporary,
retained original, or consumed close attempt. Use checked counters large enough
for the fixed 130-descriptor maximum. No saturating arithmetic, implicit Drop
success, numeric close retry or cleanup default may establish completion.
Safe consuming `nix::unistd::close` runs only on the worker, outside `Slots`.
A close error, unexpected shared file reference or unwinding invalidates and
terminalizes; no clean retirement result is returned. A blocked close remains
under the permanent worker/join custody while the coordinator denies on time.

Ticket Drop invalidates its shared budget and wakes the existing worker. It
performs no native work, join or blocking wait. Retained-state invalidation or
expiry also must be noticed while no job is ACTIVE: the worker parks only until
the retained absolute deadline, checks invalidation before/after park and every
job, and never treats an unrelated wake as a fresh deadline. On invalidation,
terminalize admission before retiring the retained set, except for the exact
accepted `Retiring` lease/job whose typed cleanup transition deliberately
invalidated this budget. That exception permits only its own dispatched cleanup
operation, never another observation. While such a job is ACTIVE but not
dispatched, park only until the same deadline; cancellation or expiry removes
the exception and enters terminal cleanup. Existing terminal drain
must explicitly dispose that set on the worker before any clean body-return accounting;
a generic successful request-retirement count is insufficient. If native work
or unwind cleanup has not returned, keep that state uncertain; do not restart
the lane or release its join ownership.

For deliberate successful disposal, `try_retire` admits the fixed retirement
job while the ticket is live. Invalidate the observation before native close,
then close the leaf and reverse ancestry exactly once. Only exact complete
worker accounting returns a non-authorizing retirement receipt and disarms the
ticket. Retire polling must accept that expected invalidated budget for cleanup
only; it must never restore access to observation facts or bypass token/kind/
deadline checks for a successful receipt. Busy keeps custody live until the unchanged deadline; Drop is
the fail-closed abandonment path. Do not silently close a new observation when
an old ticket is dropped after successful retirement.

### Cleanup after invalidation

Observation checkpoints govern open/stat/xattr/read/hash and reject invalid,
expired or terminal observations. They are **not** close authorization. A fixed
worker-only `retire_root_state` routine takes the actual owned retained state;
it may only consume those descriptors in reverse order and update accounting.
It has no pathname, read, reopen, callback, observation-result or grant operation.
For deliberate retirement it binds the exact `Retiring` marker and job token;
for cancellation, timeout, poison or unwind, terminal admission is closed first
and the worker disposes its own retained state without requiring a live budget.
It must not wait for expiry to become valid or skip required disposal because a
checkpoint correctly reports expiry.

Before/after each close, observe the original deadline and control/token/lease
state solely to determine whether a cleanup-only receipt is still publishable.
Those observations cannot authorize reads or prevent worker disposal of already
owned handles. Expiry, cancellation or terminal state forbids READY/success but
allows cleanup to finish later under retained worker custody. A close that has
not returned remains uncertain. An early close error terminalizes admission and
continues one consuming attempt for each other owned descriptor; never retry the
failed numeric fd. Unwind cleanup stays on the worker and never supplies a clean
receipt. A later unrelated ticket can neither choose nor replace this owned set.

## Fixed native bootstrap schedule

Only Linux with the selected atomic support has a native path. Other hosts deny
before path I/O. Pinned safe `nix 0.31.3` and `rustix 1.1.5` supply the syscall
wrappers; no unsafe application code, libc FFI, subprocess, fd duplication or
`/proc/self/fd` reopen is added. Every observation syscall, including error
returns and each internal ACL-sampler call, is bracketed by the existing typed
checkpoint using the uninterrupted shared deadline. Close uses only the
worker-only retirement rule above. A post-call clock check is not bounded-return
proof; the retained worker supplies independent coordinator denial.

1. Open fixed `/` on the worker with `O_PATH|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW`.
   It is the process root observation, not yet proof of genuine host-root or
   namespace association. Require directory kind, UID 0, no group/other mode
   write, ext4 type and exact descriptor/status flag predicates. Retain it.
2. Walk each single directory component relative to its held parent using
   `openat2`, `O_PATH|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW`, and
   `RESOLVE_BENEATH|RESOLVE_NO_SYMLINKS|RESOLVE_NO_MAGICLINKS`.
   The manifest-bootstrap phase deliberately surveys ancestor mount edges;
   it does not retry an `EXDEV` failure with weaker flags. This fixed phase is
   the only provisional mount-crossing exception described below. Require the
   same directory/UID/mode/ext4/flag predicates at every prefix. `O_PATH` can
   return a final symlink despite no-follow flags; directory-kind validation is
   mandatory. Do not enumerate directories.
3. Observe the final name without following it, relative to its held parent.
   Before data-open, require a regular UID-0/GID-0 file, one link, positive size
   at most 64 KiB, no group/other write and exact identity/metadata. Then open
   that same single name using `O_RDONLY|O_CLOEXEC|O_NOFOLLOW` and the preceding
   resolution flags. Any leaf mount transition is recorded under the same
   provisional survey rule; it is not silently discarded. Check descriptor type, size,
   flags, ext4, identity and named/opened equality before reading. Do not use a
   newer-kernel regular-only flag absent from Linux v6.8, or open a named device,
   FIFO, socket, directory or symlink as if it were a regular manifest.
4. Require the present root-manifest access ACL, exactly
   `USER_OBJ:rw-, USER:<selected_controller_uid>:r--, GROUP_OBJ:---,
MASK:r--, OTHER:---`, with observed mode `0640`, GID 0, no additional entry
   and no default ACL. Use the existing bounded readable sampler; absent access
   ACL never passes. The sampler's default-ACL absence marker is retained as
   unclassified until the later authenticated kernel/filesystem rule; it does
   not independently prove absence or authorize bootstrap completion. Add only
   a fixed `ParsedAcl::matches_root_manifest_controller(uid)` predicate and
   `ReadableSample::check_root_manifest_controller(uid)` wrapper inside their
   owning modules; keep entries, bytes and sample fields private. The wrapper
   requires a present matching access ACL and retains unclassified default
   no-data; any present default ACL denies. This is an unverified shape check,
   not the future effective-ACL or kernel-provenance classifier.
5. Construct the worker-local original leaf custody and use the existing fixed
   `RootManifest` artifact read schedule exactly once. Expected size is the
   just-observed bounded native size, not a caller's length. Preserve positional
   reads, actual-byte charging, no EOF probe/retry, stable ACL/metadata samples,
   zeroizing buffers/digest and the same manifest claim. A worker-local reuse
   entry must not claim again or admit an unclaimed read.
6. Repeat held and named observations for root, every prefix edge and leaf after
   reading, root-to-leaf, with every syscall checkpointed. Require all recorded
   identity and stability fields to match. Only then publish the bounded
   unverified result; retain every original descriptor on the worker.

At the precode checkpoint, the existing artifact `read_content` mapped a failed
`pread` to its error before its post-call checkpoint. Coordinator/publication checks still
reject late success, but that path does not satisfy the stronger per-call error
ordering promised here. Before rooted reuse, the owned artifact source must
capture the raw syscall result, charge every successful actual byte count even
if late, execute the post-call typed checkpoint on both success and failure,
then map a failed result or apply short-read denial. Preserve the current
no-retry behavior, invalidation and deterministic terminal/deadline precedence.
An exact focused regression for a failed read whose deadline has elapsed is
required; a synthetic error-order test is not native blocked-operation proof.
This correction needs its own focused/full source validation and independent
review; the prior PHR-0060 receipt does not attest it. PHR-0062 now attests that
prerequisite correction and its host regression tests; Linux blocked-operation
proof remains separate.

For every retained descriptor, capture held `fstat`/`fstatfs`/flag facts and
`statx` with `AT_EMPTY_PATH`, `STATX_BASIC_STATS|STATX_MNT_ID`; require all used
mask bits and a nonzero mount ID. Named `statx` uses the exact held parent and
single component with `AT_SYMLINK_NOFOLLOW`. Compare kind, device, inode, UID,
GID, permission/special bits, link count, size, mtime/ctime seconds/nanoseconds
and mount ID between named and held observations and against the recorded
baseline. Directory size/link/time drift denies even if unrelated to the leaf.
No `STATX_MNT_ID_UNIQUE` or later-kernel-only substitute is assumed. Mount IDs
are live namespace tokens, never persistent identity or proof of no idmapping.
Reobserve fixed `/` by name to detect process-root drift; no `chroot`, namespace
change or platform fallback occurs in this candidate.

## Provisional crossings and the later trust barrier

The root manifest contains current mount records; using those records to
preapprove its own first descent would be circular. The bootstrap survey above
therefore permits directory and final regular-file mount transitions only while collecting
unverified ancestry for this one exact manifest. It records each parent's and
child's path, device and mount ID; every prefix remains ext4, UID 0 and not
writable through group/other mode bits. It opens no artifact or arbitrary path
from decoded manifest content. No error-driven flag relaxation is permitted.
This is not an authenticated host mount-policy match or a new live admission
exception. It refines bootstrap observation order, not the final predicate. Outside this
closed bootstrap survey, retain `NO_XDEV` within selected resources and require
explicitly authenticated ancestor transitions; do not generalize this exception.

Before artifact acquisition or any trusted root/owner guard, composition must
verify the manifest's canonical commitment against the independently held
profile; authenticate actual controller identity, current host root, boot and
namespace/peer association through the accepted root bridge; match **every**
retained prefix and observed crossing against the committed current mount
records and independently reviewed recipe; authenticate kernel/LSM/ext4
provenance; and recheck every held/named prefix under the full effective-ACL
rules. Unlisted, replaced, idmapped, wrong-namespace or wrong-root edges deny.
A self-consistent mount list or matching manifest digest is insufficient.
`ENODATA` never approves its own provenance. Search-only `O_PATH` prefix ACL
observation is bounded by the separate
[root-prefix ACL contract](native-root-prefix-acl-source-spec.md), whose candidate
implementation and Linux proof remain pending. This bootstrap packet does not
pretend `fgetxattr` works on those descriptors.

Artifact/OCI path acquisition after bootstrap is a separate exact contract.
It must use the already authenticated bounded mount policy, not reuse the
provisional survey phase. Complete recipe/pins, named prefix ACL observation,
current peer/pidfd, host-root/namespace proof and their shared lifetime remain
explicit prerequisites before composition can produce a trusted holder.

## Recheck, denial and review evidence

`RootManifestRecheck` repeats the named/held chain and present leaf ACL schedule
without rereading content or consuming another manifest claim. It compares to
the original begin baseline and returns only unverified stability facts. It
cannot refresh paths, replace descriptors or extend the budget. Byte stability
has the accepted trusted-root before/after metadata meaning; it is not a
snapshot guarantee against a malicious administrator. Final release still
requires its separate store/generation/epoch/stop serialization and live checks.

The source packet must cover:

- canonical path, component/depth/allocation bounds, preflight without a budget
  and data-free error precedence;
- Busy without claim/invalidation, one admitted manifest read, wrong ticket or
  budget, old ticket after retirement, and no second retained set;
- every request/completion kind and token mismatch, denial-before-READY,
  completion/cancel/timeout races and stale publication;
- retained custody across begin, unrelated serial procfs work, recheck and
  retirement; explicit temporary/reference/original accounting and close errors;
- idle deadline expiry, ticket Drop, poisoned slots and worker unwind, including
  cleanup not finished when coordinator denial completes, invalid-budget close
  progress, and no successful receipt after expiry/cancellation;
- symlink/magic-link, nonregular leaf before open, wrong owner/mode/ACL/link/size,
  prefix/leaf/name/root replacement and mount/namespace mismatch;
- provisional directory and leaf crossings represented as unverified, rejected
  by later association when unlisted, and missing required statx fields;
- failed `pread` post-call checkpoint ordering and successful-byte charging
  before late/short denial;
- existing procfs and held-artifact regression matrices without changed authority.

Deterministic custody/state models cannot fabricate a successful native holder.
Linux positive tests need a separately supplied disposable root-provisioned
ext4 anchor with exact ACLs and readable non-root controller access; tests do not
create a root-owned ancestor or modify host permissions to make themselves pass.
Unsupported-host tests prove denial only. Genuine blocked-open/read/close and
unfinished-cleanup evidence remains separate from simulated scheduling and from
the existing procfs proof. Full source validation, installed scanners, exact
independent source review and direct-child attestation follow implementation.
Precode review grants none of those later results.

## Source references and limits

The Linux [openat2 manual](https://man7.org/linux/man-pages/man2/openat2.2.html)
defines descriptor-relative resolution, final `O_PATH` symlink behavior and
mount-crossing restrictions. The [open manual](https://man7.org/linux/man-pages/man2/open.2.html)
defines the restricted operations on `O_PATH` descriptors. The
[statx manual](https://man7.org/linux/man-pages/man2/statx.2.html) defines returned
mask bits, empty-path observation and mount IDs. These manuals may describe newer
kernels; Linux v6.8 and the pinned cached wrapper source govern this candidate.
No successful Linux compile, root anchor, current host association, native
unfinished-operation proof, runtime, package or support claim is made here.
