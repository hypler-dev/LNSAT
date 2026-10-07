# HCFG-6 Root-Prefix ACL Observation Contract

Status: private Stage-A precode contract under the accepted
[source-order amendment](source-freeze-staging-decision.md#a-reviewed-inert-candidate-source).
[Project Status](../../PROJECT_STATUS.md#stage-a-root-prefix-acl-observation-contract)
owns implementation and review disposition. This contract extends the existing
[root-manifest bootstrap](native-root-bootstrap-source-spec.md); it is not a
second acquisition lane, authenticated ACL classifier or complete native freeze.

## Outcome and ownership

The existing bootstrap retains search-only `O_PATH` root/ancestor descriptors
but observes ACLs only on its readable manifest leaf. Its next candidate must
observe each retained directory's two ACL attributes through its exact name,
associate those observations with the held chain, preserve raw bytes or an
explicit unclassified no-data result, and reject drift during Begin/Recheck.
The result remains unverified evidence for the later authenticated classifier.

Implementation owns only `crates/lnsatd/src/headless_native_root_bootstrap.rs`
and its existing test file. Reuse the existing `ParsedAcl` grammar and mode
comparison without changing the readable-descriptor sampler or its O_PATH
rejection. A narrowly scoped private parser accessor, if needed, must receive
separate exact ownership and review; no public representation is implied.
Documentation status, index and review metadata accompany the implementation.
No new job kind, worker, control word, store method, product caller, SDK method,
observer injection or trusted constructor is introduced.

## Exact objects and names

Let `D` be the number of retained bootstrap directories: one through 128,
including `/`, followed by every directory ancestor of the one manifest leaf.
The manifest leaf is excluded. The existing 128-component anchor grammar yields
at most 128 directory descriptors and one leaf descriptor; do not add another
independent ancestor allowance.

Derive each canonical absolute prefix from the already validated anchor's
owned path and component boundaries. Index zero is exactly `/`; index `i > 0`
ends after component `i - 1`, without a trailing slash. All boundaries are UTF-8
byte boundaries. The final manifest component is never included. Reject an
out-of-range index, inconsistent component count, noncanonical reconstruction,
overflow or a path exceeding 4,096 bytes before any named read. Do not accept a
second caller-supplied path, normalize a new path, resolve a symlink, enumerate
a directory, use a current working directory, or construct `/proc/self/fd` names.

For example, `/alpha/beta/manifest.json` has exactly three observed prefixes:
`/`, `/alpha`, `/alpha/beta`. `/manifest.json` has only `/`. This is the manifest
anchor chain, not Docker's three search-only metadata directory classes.
Their distinct ACL matrix and lifecycle remain in the
[metadata contract](docker-metadata-source-spec.md).

## Native API and association schedule

Use the already pinned safe `rustix 1.1.5` `lgetxattr` API on each exact absolute
prefix, for only `system.posix_acl_access` and `system.posix_acl_default`.
Use one initialized 8,196-byte scratch buffer; no zero-sized sizing query,
list operation, buffer growth, application retry, `getxattrat` replacement,
`fgetxattr` on O_PATH, descriptor duplication/reopen, subprocess, `chdir`, raw
FFI or application unsafe code. The named API does not follow the final symlink;
it is not an atomic descriptor-bound read and does not constrain intermediate
resolution like `openat2`.

Before and after **each** named ACL call, reobserve the entire retained directory
chain from `/` through the manifest parent using the bootstrap's existing
held and descriptor-relative named observations. This directory-only helper
must not recurse into ACL sampling or the leaf ACL helper. At each edge compare
to the original Begin baseline and compare held versus named observations.
Retain the existing exact directory/UID-0/non-group-or-other-write/ext4/flags
predicates and complete `RootObjectFacts` comparison: device major/minor,
inode, type/mode, UID/GID, link count, size, mtime/ctime seconds and nanoseconds,
and required nonzero mount ID. The root itself is reobserved by the fixed `/`
name as well as its held descriptor. No namespace/root authenticity is inferred
from equality within the current process view.

All individual native calls, including errors, use the existing typed job token,
shared budget allocation and unchanged absolute deadline at entry and return.
Capture the raw ACL-call result first. Run the typed post-call checkpoint before
mapping either success or error. If that checkpoint denies, perform no further
observation; invalidate the shared budget and follow existing worker cleanup.
If it passes, perform the closing directory association even when the ACL call
returned an error. Only then classify the retained syscall result. Association
or deadline failure cannot be hidden by `ENODATA` or another earlier result.
No application-level retry occurs even if the kernel performs internal lookup
revalidation. A deadline cannot interrupt a blocked syscall: existing terminal
publication and worker/join custody rules remain necessary.

This remains sampled named-path association under the accepted trusted-root
boundary. Stable samples do not exclude root-mediated transient replacement
between samples. The chain's no-write predicates and later authenticated
kernel/namespace/root association must not be replaced by a claim that
`lgetxattr` inherits the safety of the held descriptor.

## Closed ACL representation

Each attribute result is exactly one of:

- `UnclassifiedNoData`: the native result was `ENODATA`; it is not absence,
  an empty ACL, mode-only permission proof or an authenticated filesystem fact.
- `Present`: raw bounded bytes plus the existing strict parsed Linux ACL.
  Apply `ParsedAcl::check_access_mode` to access ACLs against the same observed
  directory mode. Parse default ACLs with the same closed grammar, but do not
  compare default ACL rights to the containing directory's mode.

Every other error denies, including `EACCES`, `EPERM`, `EINTR`, `ERANGE`,
`ENOSYS`, `ENOTSUP` and `EOPNOTSUPP`. A successful zero-length or malformed ACL
is an error, never equivalent to no-data. No present default ACL is silently
removed or treated as harmless. Retain it for later effective/inherited-rights
classification. Raw bytes and result tags must compare exactly across samples;
a present-to-no-data transition or different encoding denies even if an
interpretation appears equivalent.

Root `/` may return unclassified no-data; requiring an extended root ACL would
contradict the existing bootstrap contract. This candidate may collect such
unverified observations during provisional bootstrap, before provenance is
known. Only the later full authenticated classifier may interpret absence or
approve effective rights. Its no-reachable-ENOSYS/kernel/LSM/ext4 predicates,
current root/namespace/peer association, selected recipe and mount comparisons
remain mandatory. No boolean supplied by a caller enables that interpretation.

## Begin, Recheck, retained facts and finite work

Begin keeps the existing fixed descriptor acquisition and present leaf ACL
requirements. Once the complete directory chain and leaf are retained and
associated, collect access then default for each directory in root-to-leaf
order, before reading manifest content. Save this opening prefix baseline in
worker-owned state. After the existing bounded leaf read/hash, repeat the same
prefix sequence, compare every raw result to that baseline, and perform the
existing closing leaf identity/ACL checks before publication. Failure cannot
publish a partial baseline or a successful Begin result.

Recheck first verifies the exact live ticket/lease/budget and original baseline.
It performs two fresh root-to-leaf access/default sequences, each compared with
the original Begin results, together with the existing leaf checks. It neither
reads manifest contents nor consumes another manifest claim. The two sequences
must not be reduced to comparison of cached values. No baseline replacement,
repair or fresh attempt is inferred when drift occurs.

Each Begin or Recheck has exactly `4 * D` named ACL calls on its successful path,
at most 512. Each existing directory observation uses six native calls: one named statx,
two flag queries, fstat, fstatfs and held statx. Two complete chain observations
per ACL call therefore bound this ACL schedule at `48 * D * D + 4 * D` native
calls, at most 786,944; the existing leaf schedule is additional. Retain the
global five-second-or-earlier deadline. These maxima do not promise that every
maximum-length chain can finish within that deadline. Deny expiry; never weaken
association or reset the timeout per prefix or sequence.
Each call uses at most 8,196 bytes; at most 4,196,352 successful ACL bytes are
returned per job. Each retained baseline has at most 2,098,176 raw bytes across
`2 * D` attributes. Checked arithmetic bounds counts before allocation/copy.
Metadata bytes are separately bounded observations, not a second manifest read
or a debit that consumes the existing artifact/OCI content allowance.

Use bounded, fallible allocations for newly retained raw payloads and row
vectors; reuse the one scratch buffer. Existing held owners remain installed
before any such operation, so allocation failure follows ordinary worker
cleanup. Zeroize scratch and newly owned raw ACL bytes on disposal. Parsed
representations remain bounded by the existing 1,024-entry grammar. Closing
samples compare against the baseline and are discarded, rather than retaining
another full chain indefinitely.

The worker retains its own immutable baseline until Retire or terminal cleanup.
Coordinator facts may receive one bounded immutable copy associated with the
same Begin token, anchor, budget allocation and lifetime. Expose only borrowed
read-only views through the existing checked `RootManifestFacts` lifetime; no
Clone/serde/public constructor/owned raw extraction or filesystem handle escapes.
The copy is at most one additional baseline-sized raw payload plus bounded
parsed metadata. Ticket invalidation/drop/recheck/retirement rules are unchanged;
borrowed bytes alone cannot act as a current-fact or permission witness.

Retire performs no ACL sampling. It still invalidates observation state before
worker-only consuming close attempts, even after expiry or failure. A blocked
named read retains the one worker and its original descriptors. No coordinator
close, replacement worker, fresh deadline, success from Drop or discarded join
is permitted. Prefix ACL buffers do not own extra descriptors and must not
change original-owner/refcount cleanup accounting.

## Required proof before implementation closeout

Host tests must exercise production helpers for exact prefix derivation
(including `/`, multibyte components, limits and excluded leaf), tag/raw-byte
stability, strict access-mode association, default-versus-access interpretation,
malformed/empty/oversized bytes, checked allocation/count limits, and lifetime
association. Cover failed-call post-checkpoint ordering, expiry/cancellation
before and after sampling, partial Begin cleanup, original baseline preservation,
Recheck drift denial, zero ACL reads during Retire, cross-kind isolation, and
late publication denial. Do not manufacture a successful trusted-root object.

Tests of pure result or lifecycle models must be labelled accordingly; no
injected observation callback may enter production code merely to make them
pass. Unsupported-platform tests prove denial only. Required Linux tests use
only a separately supplied disposable root-provisioned ext4 anchor with exact
ACLs. They must distinguish search-only named observation from O_PATH fd-read
failure and exercise actual named/held association, present/default/no-data,
substitution, syscall errors and blocked-operation cleanup. Tests never set ACLs,
change ownership/modes, open a Docker endpoint or provision that environment.

Fresh independent contract review precedes candidate edits. Candidate source
then needs focused native tests, strict Clippy, full `npm run check`, installed
local audit checks and exact source/direct-child review. Actual Linux compile,
positive and unfinished-operation evidence, authenticated absence/effective-ACL
classification, complete freeze, integration, runtime and packaging are separate
unfinished gates. This contract itself implements no sampler or authority.

## Pinned API evidence

The installed pinned rustix source exposes safe `lgetxattr(path, name, buffer)`
and describes final-component no-follow behavior. Its source version is already
locked in this checkout; no dependency change or installation is needed.
[Linux v6.8 xattr source](https://github.com/torvalds/linux/blob/v6.8/fs/xattr.c)
implements `lgetxattr` through named lookup without `LOOKUP_FOLLOW`, routes POSIX
ACL names through `do_get_acl`, and may internally revalidate stale lookup.
This establishes the named-call distinction, not current-kernel provenance,
ACL absence, non-root feasibility or whole-chain atomicity.
