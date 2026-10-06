# HCFG-6 Held Artifact Read Source Contract

Status: private Stage-A source proposal under the accepted
[source ordering](source-freeze-staging-decision.md#a-reviewed-inert-candidate-source).
[Project Status](../../PROJECT_STATUS.md#stage-a-held-artifact-read-contract)
owns disposition. This is a real held-descriptor I/O prerequisite for the
[root/image custody boundary](root-manifest-source-spec.md#cross-module-image-association-and-custody-boundary),
not a supplied-byte decoder, trusted root holder or complete source freeze.

## Exact ownership and preserved lane

The next source slice owns `crates/lnsatd/src/headless_native_artifact.rs` and
`crates/lnsatd/src/headless_native_artifact_tests.rs`, the existing `headless_native_procfs.rs` and its tests,
and the minimum internal visibility change in `headless_native_readable.rs`.
The new artifact module is a private child of the existing procfs lane module.
Its only executable entry is that lane's closed worker dispatch. There is no
second static lane, thread, process, queue, restart, arbitrary closure, injected
reader, public trait, product caller, successful witness constructor or path I/O
on the coordinator. Preserve every existing procfs observation predicate.

The existing [retained-worker protocol](native-source-spec.md#exact-retained-worker-candidate-contract)
continues to own construction, its one SeqCst control word, nonreusable tokens,
permanent join custody, dispatch/acceptance linearization, stop, timeout and
worker-only cleanup. Extend its private request/result vocabulary with exactly
`Procfs` and `ArtifactRead`. This is an explicit new operation requiring fresh
whole-lane review; the old procfs review does not approve it by analogy.

Keep the existing procfs-facing `Attempt` methods and errors. Add a private
`ArtifactAttempt` facade over the same lane token/deadline state. Internally,
request and completion variants carry their fixed job kind. A facade checks
completion token and kind while the outcome is still in the slot, before moving
any owned value. A wrong kind terminalizes; worker cleanup retains the outcome.
Never remove a mismatched owned result merely to drop it on the coordinator.
Dispatch and retirement still permit only one job of either kind at a time.

The artifact request owns one reference to an original `Arc<File>`, one reference
to its observation budget, and fixed purpose/expected-length scalars. It has no
path, callback, expected digest, recipe entry or authority Boolean. The original
private custody owner is non-Clone and retains its file across all samples and
later association/use rechecks. Request publication clones that still-borrowed
owner's reference; it does not duplicate or reopen the descriptor. No owning
file wrapper is constructed or dropped on the coordinator path. Missing original
custody at integration is a failure, not permission to recreate it from a path.

The exact private types are `ArtifactReadPurpose`, `ArtifactReadBudget`,
`OwnedArtifactCustody`, `ArtifactAttempt`, `UnverifiedArtifactRead` and
`ArtifactError`. `ArtifactReadBudget::begin(enclosing_deadline)` fixes the shared
state once. `OwnedArtifactCustody::from_file(file, &budget)` moves a real File into
its original Arc owner and binds that same budget; it performs no native sample
and grants no provenance. Both remain private owner-preparation operations.
`ArtifactAttempt::try_prepare(&custody, purpose, expected_length)` returns
`Result<Option<ArtifactAttempt>, ArtifactError>`: `None` means the shared lane or
slot is temporarily busy, with no publication, root-read claim or new native
work. It never internally spins. Each later call keeps the same absolute budget.
The facade's `dispatch` and `poll` use the existing nonwaiting protocol, returning
Pending or its one typed result; no caller receives native handles.

`UnverifiedArtifactRead` retains the same private shared observation state and
its exact lane token, purpose, native identity, length, digest and optional body.
Private context-checked access compares live shared-state ownership, invalidation
and deadline against the original budget before exposing borrowed facts. Raw
facts remain unverified even while this check passes. Earlier decoding/comparison
work is discarded if a later read fails; final composition must recheck this
same gate under the separately required release/stop/store serialization.
This method is not that release check and exposes no successful permit.

Artifact requests retire exactly one input file reference; procfs requests still
retire exactly two. Cleanup completion derives its expected count from the
closed request kind, never a supplied count or a default value. Retire each file
reference with `Arc::into_inner`; consume a final File once with pinned safe
`nix::unistd::close`, on the worker, outside Slots. Any close error terminalizes;
no numeric close retry. Unwind supplies no clean witness. Do not discard the
existing procfs temporary-handle accounting or claim that descriptor accounting
proves all kernel references, original-owner close or thread shutdown finished.

## One observation budget

A private non-Clone `ArtifactReadBudget` owns shared fixed state created once
before the root manifest observation: an immutable monotonic deadline and two
actual-read counters, initially zero: all content and artifact/OCI content.
The same shared state owns a sticky invalid flag and a one-use manifest-read
flag, both initially clear. Internal Arc references do not clone/reset state. Fix the deadline once to the earlier of
observation start plus five seconds and the already-existing uninterrupted
preparation/startup deadline. Construction/owner acquisition consumes this same
window. Artifact requests copy that exact deadline; they do not call the procfs
helper to start a fresh five-second window for each file.

The one private observation owner passes this same live budget through manifest,
artifact, OCI and repeated stability reads. Budget identity is live ownership,
not a caller number or serialized deadline. It exposes no reset, refund, cloning
constructor or deadline extension. Creating a new owner is not a retry of an
expired or failed observation. Future composition must bind this owner to its
root/profile/recipe/peer context; the candidate has no such integrated caller.

All results and their consuming observation retain this same gate. Any artifact
failure invalidates it before error publication; timeout/cancel/drop of an armed
ArtifactAttempt invalidates it before token-conditional cancellation or returning
denial. Worker unwind has a guard that invalidates it; coordinator expiry remains
independent if unwinding itself is unfinished. A terminal lane discovered during
artifact admission/poll also invalidates it. Busy/Pending with no admitted work
is not failure. Every later admission, native checkpoint and context-checked
consumption requires the gate still valid and the original deadline unexpired.
The flag is SeqCst and only moves to invalid. It never cleans up, resets, cancels
an unrelated token or replaces the lane control word: the existing single
SeqCst word remains the sole native admission/stop/retirement authority. A clean
ordinary read denial may retire the lane, but cannot revive that observation.
An entirely new independently selected observation may own new budget state;
it cannot reuse the failed observation's results or bypass durable quarantine.

One observation admits at most one RootManifest request. After proving the slot
idle/empty and validating fixed inputs, claim the one-use flag with
`compare_exchange(clear, claimed, SeqCst, SeqCst)` before the lane admission CAS
and before publishing the request. The claim has one linearization point; a
loser denies and invalidates the observation without I/O. If stop wins or publication
cannot proceed, invalidate the budget; never clear the claim. A second request
denies before I/O and invalidates the observation. Partial/late first reads still
charge actual returned bytes. The later whole-custody procedure keeps the root
file and rechecks its metadata/ancestry; this primitive does not reread root bytes
under an old commitment. A necessary full refresh requires a new whole observation,
no reused results, and preserves the enclosing startup/preparation deadline.
Thus one 64-KiB manifest and the full 1-GiB artifact/OCI allowance both fit; a
second manifest is not an unmetered repeated job.

Charge all bytes actually returned by content reads, including a partial read
later rejected and any repeated read, to the shared all-content counter. Charge
artifact and OCI reads additionally to their shared counter, capped at exactly
1 GiB across the observation. Root manifest reads retain their separate 64-KiB
per-read bound; they are accounted but do not consume the artifact/OCI allowance.
Do not silently turn the accepted artifact/OCI cap into a stricter all-content
cap. Both counters use checked arithmetic and the same immutable deadline;
neither may reset between files or repeated observations. ACL and metadata calls
retain their finite native bounds and consume the same deadline. These counters
are not kernel I/O, page-cache, heap or device-pressure bounds.

Only the single worker advances the counters. Before each read, cap its
requested length to unread expected bytes and, for artifact/OCI kinds, their
remaining allowance. After return, add the actual count to the applicable
counters before handling timeout, hashing, copying or another call. No second
operation can consume this budget while a read is unfinished. A syscall cannot
return more than its requested length; an impossible wrapper result denies.
Zero artifact/OCI allowance before required artifact/OCI bytes are obtained
denies; it does not prevent a bounded manifest read. Counter overflow, errors,
stop or ambiguity invalidate the entire observation; a new budget cannot make
its earlier samples usable.

## Fixed input and output classes

The closed purpose is one of:

| Purpose                                 | Positive expected length | Owned result                                                |
| --------------------------------------- | ------------------------ | ----------------------------------------------------------- |
| Root manifest                           | at most 64 KiB           | Exact bytes, raw SHA-256, native sample and length          |
| OCI body                                | at most 1 MiB            | Exact bytes, raw SHA-256, native sample and length          |
| Artifact/provenance/executable snapshot | at most 256 MiB          | Raw SHA-256, native sample and length; no whole-file buffer |

Expected length is only an unverified read bound. Independently observed file
size must equal it. No digest supplied by a caller is reported as a native hash.
The manifest's raw file hash is distinct from its canonical LNSAT commitment;
the root decoder computes the latter. The native result does not authenticate
OCI links, installed image content, provenance assertions or a recipe pin.
The consuming observation must enforce the separate two/three OCI-body and
3-MiB retained-body limits before composition; no general image inventory opens.

Results are private, non-Clone, nonserializable and have no Debug display or
native handles. Their shared gate holds only fixed control/accounting data, not
a File or worker join handle. Owned body bytes, read buffers and digest storage use the
existing zeroizing storage. Enable only the pinned `sha2 0.11.0` `zeroize`
feature to cover its retained hash state; own that exact
`crates/lnsatd/Cargo.toml` and `Cargo.lock` delta without version changes, downloads
or new unreviewed dependencies. The installed `digest 0.11.3` feature routes to
its optional zeroize dependency and `block-buffer 0.12.1` zeroize support; the
current lock does not yet include those dependency edges. Verify the installed source feature path and exact
lock result before implementation review. Finalize directly into `Zeroizing<[u8; 32]>` with
`hash.finalize_into((&mut *digest).into())`, matching the existing raw-OCI
pattern. Do not first materialize a plain owned `finalize()`/`digest()` output
and wrap it afterward. Source tests include compile-time field custody and
known raw digest vectors. No custom cryptography is introduced.

## Deterministic private denials

`ArtifactError` is a closed data-free enum. Its codes are exactly
`native_artifact.unsupported_platform`, `invalid_descriptor`, `invalid_length`,
`read_rejected`, `object_changed`, `limit_exceeded`, `storage_unavailable`,
`budget_exhausted`, `observation_invalid`, `association_rejected` and
`cleanup_uncertain`, each using the same `native_artifact.` prefix. No path,
contents, hash, descriptor number, UID/GID, errno text or formatted native object
enters the result. Busy/Pending is distinct from denial and changes no budget
or one-use claim.

Preparation checks platform, observation validity/deadline, purpose/length, then
lane/slot state in that order. Native work follows the schedule below and keeps
the first encountered failure, except that expiry/stop/uncertain cleanup prevents
acceptance regardless of an earlier native outcome. A malformed/unavailable ACL
sample maps to read rejection, ACL/metadata drift to object change, bounded
allocation failure to storage unavailable, and any completion token/kind mismatch
to association rejection. The existing procfs error strings remain unchanged.
All artifact denials invalidate the observation as specified above; mapping a
code never replaces the required lane cleanup or token-conditional cancellation.

## Worker I/O schedule

Supported source targets remain Linux with native 64-bit atomics. Other targets
deny before thread construction or custody transfer. The worker uses the
existing pinned safe nix/rustix APIs; no raw FFI or unsafe application code.

1. Check the same lane token, stop bit and original deadline. On the worker,
   obtain `F_GETFL`, `F_GETFD`, `fstat` and `fstatfs`. Require a read-only,
   close-on-exec, non-O_PATH regular file, one link, ext4 filesystem and the
   exact positive expected length within its purpose limit. Require `F_GETFD` to equal `FD_CLOEXEC`. For `F_GETFL`, permit
   only read-only access plus optional `O_NOFOLLOW` and the native
   `rustix::fs::OFlags::LARGEFILE` bit, converted with checked arithmetic as in
   the existing procfs reader. Reject every other bit, including O_PATH,
   O_DIRECTORY, O_DIRECT, O_NONBLOCK, O_ASYNC and write/append flags. Do not use
   a libc LARGEFILE constant that can be zero on a 64-bit ABI.
2. Sample the existing finite readable-object access/default ACL representation.
   `ENODATA` stays unclassified; it is never silently positive root/ACL proof.
   Permit only the minimum `pub(super)` visibility for the opaque sample and
   sample function, plus equality comparison. No new field constructor or
   authenticated ACL-absence API is added.
3. Fix an initial identity containing device/inode, type, UID/GID, mode, nlink,
   size, mtime and ctime including nanoseconds, filesystem type and file flags.
   Ignore atime for stability because the observation itself may update it.
   All identity calls must be bracketed by token/deadline checks.
4. Read from offset zero with pinned safe `rustix::io::pread`, using one
   initialized zeroizing 64-KiB buffer and checked offsets. Never seek or mutate
   the shared open-file offset, duplicate the file, use mmap, invoke a helper,
   reopen through procfs, or fall back to direct/asynchronous I/O. Every successful chunk must fill the requested length. Charge a short positive
   return, then deny; zero before the expected end or any error also denies.
   There is no retry of short/EINTR/error results and no exact-read convenience
   routine with a hidden retry loop. Full chunks advance by their actual length.
5. Check token/deadline around every read, hash and copy step. Hash only returned
   bytes, in order, with ordinary raw SHA-256. Buffer only the two bounded body
   classes, reserving their complete bounded capacity before reading; stream
   artifact data into the digest. Allocation failure denies; allocator abort,
   scheduler delay and kernel memory are not bounded by this protocol.
6. After exactly the expected byte count, repeat identity, flags and ACL samples
   and require equality. The fixed-length read plus unchanged size is the
   accepted bracketed trusted-root stability method. It is not an atomic snapshot
   against concurrent malicious root, and it does not infer EOF from a short
   read. No extra byte is read beyond the admitted length. Named-path/ancestry
   association remains a separate mandatory held-custody check before authority.
7. Retire worker references, zeroize scratch/hash state, and publish only after
   complete per-kind descriptor accounting. The existing reservation and final
   clock check decide timely acceptance. Late results stay worker-owned and are
   rejected permanently; a native return after expiry never repairs the lane.

The input's open/file acquisition is outside this primitive. It must eventually
be performed under the same retained native custody/deadline design, not moved
onto a deadline-sensitive coordinator or excused by this sample. The primitive
performs genuine file I/O but proves only its held file's bracketed read facts.

## Blocking and evidence boundaries

Linux v6.8's [ext4 read path](https://raw.githubusercontent.com/torvalds/linux/v6.8/fs/ext4/file.c)
uses generic buffered reading, whose [folio population](https://raw.githubusercontent.com/torvalds/linux/v6.8/mm/filemap.c)
can wait for I/O and mapping locks. These interfaces carry no application
monotonic deadline. The selected inference is that a positional read, byte cap,
post-call timer or ordinary readiness flag cannot prove bounded native return.

The extended retained lane must keep the coordinator's stop/expiry decision
independent of a blocked read, metadata/ACL call, hash operation or final close.
It promises deadline-limited result acceptance and retained unfinished custody,
not syscall cancellation or wall-clock delivery/cleanup. This new operation
needs its own native evidence; existing procfs hook results do not cover it.
No additional native kernel/harness/fixture source, construction or run is
opened by this contract. Actual artifact read positive and unfinished-operation
proof stay separate from state-machine tests and source compilation.

## Required source tests and review

Obtain fresh independent review of this whole-lane extension before source.
At most one artifact job exists. It borrows one file descriptor and opens none;
the unchanged procfs operation still owns its existing eight-descriptor maximum.
Worker/thread/stack/control/request/result counts stay unchanged. An artifact
job requests one 64-KiB scratch buffer, one fixed SHA-256 state, fixed metadata,
and at most one 64-KiB or 1-MiB owned body allocation. ACL sampling remains
bounded by the existing 8,196-byte read buffer and 1,024-entry parser limit;
allow a conservative peak of eight raw ACL blocks and eight parsed entry arrays
across both comparison samples and sampler temporaries. No allocation scales
with a 256-MiB artifact size. The budget owner adds one fixed Arc allocation,
with one nonfinal increment per job. Previously accepted outputs and original
owners remain external retained objects whose total lifetime/size must be
bounded by the consuming observation; these are requested source storage bounds,
not a total-heap/RSS or scheduling guarantee.

The source packet must cover:

- every fixed denial code and native-error mapping, platform then gate/deadline
  then length then busy ordering, completion token/kind mismatch, and absence of
  path/content/hash/descriptor/UID/GID/errno details in all returned diagnostics;
- both request kinds on the same root; cross-kind busy rejection; no second
  worker/job after timeout, stop, panic, poison, failed cleanup or token exhaustion;
- token/kind substitution and wrong facade, before value extraction; stale
  cancellation and completion/stop/deadline races preserve existing linearization;
- procfs's exact two-reference cleanup and artifact's exact one-reference cleanup,
  including final/nonfinal Arc retirement, close uncertainty and late disposal;
- immutable shared deadline and both actual-read counters across multiple files,
  partial/error/late reads, exhausted budgets and no per-file refresh; one manifest
  plus the full 1-GiB artifact/OCI allowance, second-manifest pre-I/O denial,
  and two competing preparations with at most one successful manifest claim;
- earlier successful results invalid after a later error, cancel, timeout or
  unwinding failure; wrong/new observation gate rejection; no live gate or byte
  counter reset; busy preparation leaves the one-use manifest claim untouched;
- zero, oversized and mismatched lengths; wrong descriptor mode/type/filesystem,
  hardlink, changed size/mtime/ctime/flags/ACL and unsupported ACL results;
- exact raw hashing and byte retention, binary content, positional offset
  preservation, short/early-zero reads, purpose limits and streamed large files;
- genuine disposable Linux held-file positive/negative tests for actual I/O,
  with no root-attestation, ACL-absence or complete-custody claim; source models
  may test accounting, but may not inject a successful native sample into authority.

Run existing procfs/readable/fdinfo/mountinfo regressions, artifact-focused tests,
strict pinned lint/format, complete `npm run check`, docs/public/inventory/history
and diff checks, plus the installed source scanners. Unsupported-host denials
are not Linux positive evidence. Exact source/direct-child attestation remains
required. Full root ancestry, peer/pidfd association, immutable recipe/pins,
crash bridge, global integration freeze, runtime and packaging remain unfinished.
