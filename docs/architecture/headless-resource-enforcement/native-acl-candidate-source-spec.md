# Stage-A Private Readable-Object ACL Candidate

Status: exact inert candidate contract under the human-accepted source-order
amendment. Project Status remains the sole implementation and acceptance
record. This contract does not complete the native source/pin/feasibility freeze.

## Outcome and ownership

Implement the first private `lnsatd/headless_native` prerequisite: strict Linux
POSIX ACL byte parsing and finite descriptor-bound ACL sampling of an already
held readable regular file or directory. The primary controller owns security
implementation and integration judgment. Fresh independent review gates this
exact contract before implementation and the exact resulting source afterward.

Owned source: `crates/lnsatd/src/headless_native.rs`, its private ACL and
readable-object children and tests, and the private declaration in `lib.rs`.
Dependency scope: one Linux-only exact `rustix = "=1.1.5"` dependency with default
features disabled and `std,alloc,fs`; the resulting lock delta is reviewed.
Native build-policy ownership also includes `scripts/sqlite-native-build-policy.mjs`
and its exact regression tests. Supporting docs are this contract, native
specification, plan, README, docs
index, Product Build Sequence and Project Status. Inventory and direct-child
source review evidence follow existing repository gates.

## Data is not authority

The sampler borrows an actual `File`; it neither opens a named path nor takes a
raw numeric descriptor. It never duplicates or closes the borrowed descriptor.
The private result contains observed inode metadata and parsed ACL bytes, not
an ownership/resource/absence permit. It is not public, serializable, injectable
as a successful observer, or consumed by an initializer, CLI, route, adapter or
store. Selected SQLite descriptors, sockets and search-only O_PATH handles are
excluded. The future associated-path/ancestry observer must acquire and bind
eligible descriptors under its separately reviewed custody contract.

No sample authenticates a filesystem, kernel, LSM, mount, namespace, root
manifest or controller identity. Absence is retained only as
`UnclassifiedNoData`: it is never converted into an empty ACL, effective mode
rights, or successful activation. No caller Boolean or fabricated recipe token
can classify it. The authenticated ordinary-object absence classifier remains
unimplemented. Default ACLs describe inheritance; they are not checked against
the containing directory's mode. This slice computes no final access policy.

## Strict ACL grammar

- Little-endian version 2: four-byte header, eight-byte entries; 3 through
  1,024 entries, at most 8,196 bytes, exact length and no trailing bytes.
- Order: exactly one USER_OBJ, zero or more USER, exactly one GROUP_OBJ, zero
  or more GROUP, optional MASK, exactly one final OTHER. Named entries require
  MASK. Duplicate base tags, reordered/unknown tags and missing entries deny.
- Permission values are 0 through 7. Base entries use ID `0xffffffff`.
  Named IDs must be defined and strictly increasing within their own class.
  USER and GROUP ID spaces are independent. This sorted/unique/capped grammar
  is stricter LNSAT policy, not an upstream Linux validation claim.
- For an access ACL, USER_OBJ and OTHER exactly match the inode's owner/other
  permission triplets. The inode group triplet equals MASK when present,
  otherwise GROUP_OBJ. Raw named/group-object permissions may exceed MASK:
  their effective permissions are intersected with MASK. A masked-off raw grant
  is not itself a mode mismatch. Interpretation never grants action authority.
- Default ACL parsing uses the same grammar without an inode-mode comparison.
  A present default ACL on a regular file rejects.
- Missing/unclassified input is a distinct observation, not a valid encoded ACL.
  Empty values, header-only values, wrong endian/version, overflow, malformed
  IDs/permissions/order and mode inconsistencies deny.

## Finite actual read method

Linux-only implementation uses pinned safe nix descriptor/stat operations and
rustix `fgetxattr`; application unsafe code remains forbidden. Existing flags
must show read-only access, close-on-exec and no O_PATH. `fstat` must show a
regular file or directory. No descriptor flag or inode-mode mutation occurs.

Sample the tuple `(type,dev,ino,uid,gid,mode,nlink,ctime_sec,ctime_nsec)` and actual
filesystem type with safe `fstat`/`fstatfs`. Read only
`system.posix_acl_access` and `system.posix_acl_default` into one fixed 8,196-byte
scratch buffer. Bracket each call with matching stat observations. Perform two
complete access/default scans and compare their exact returned raw byte values,
absence classifications, inode tuples and filesystem-type observations. Retain
bounded copies only after length/grammar validation; return no partial sample.

There is no size query, buffer growth, retry (including EINTR/ERANGE), xattr list,
file-content read, shell utility, named-path fallback, procfs reopen or fd alias.
Only ENODATA becomes the explicitly unclassified observation. All other syscall
errors reject, including ENOSYS, ENOTSUP/EOPNOTSUPP and permission denial. Every
error has a fixed data-free code; no raw path, UID, ACL bytes or errno diagnostic
escapes. Unsupported platforms reject before native read.

Repeated finite comparisons detect sampled drift. They are not an atomic lock
against arbitrary same-UID/root mutation or a claim about changes after return.
A future trusted-root/owner custody and admission boundary remains mandatory.

## Validation and review

Pure parser positives include every base permission combination, sorted extended
ACLs, a mask without named entries, legitimate masked-off raw permissions and
independent default ACLs. Negatives cover every grammar transition, duplicate and
unsorted named IDs, missing masks, ID misuse, malformed lengths/version/perms,
entry/byte caps, trailing bytes and access-mode disagreement.

Actual Linux disposable source fixtures cover existing read-only file/directory
metadata association and unclassified no-data sampling, explicit O_WRONLY,
O_RDWR, missing FD_CLOEXEC, non-file/directory and O_PATH rejection, and
retained-inode drift comparisons. No ACL setter or host
permission/provisioning mutation is introduced, including in fixtures. Parser
positives are synthetic byte tests, clearly separate from actual read evidence.
A platform-denial test runs on macOS. Kernel/LSM absence classification, current
present-ACL fixture proof and named socket/SQLite/O_PATH custody remain later
source/proof work; no fixture is a permit.

Run pinned focused Rust tests and strict formatting/Clippy, docs direction,
public/inventory checks, complete `npm run check`, installed named Semgrep and
redacted Gitleaks, and OSV for the lock delta. Exact-head Linux CI provides Linux
compile/read fixture evidence; macOS cannot supply it. Fresh independent review
covers contract, dependency/backend source and exact implementation/diff. Stage-A
review does not approve integration, host changes or runtime execution.

## Dependencies, rollback and closed gates

Review the exact rustix safe fixed-buffer wrapper, Linux raw syscall backend,
transitive lock records, checksums, license and local vulnerability evidence.
On the source CI's x86_64 Linux target, freeze the normal `linux_raw` backend:
reject ambient `CARGO_CFG_RUSTIX_*`, `CARGO_CFG_MIRI`,
`CARGO_FEATURE_USE_LIBC` and `CARGO_FEATURE_RUSTC_DEP_OF_STD` before invoking
Cargo, including empty values. Existing Rust flag/config rejection remains.
The dependency graph requires exactly one registry rustix 1.1.5 node, features
`alloc,fs,std` only, and exactly one production Linux-only dependency from
lnsatd. This supplies source-build determinism, not installed-artifact proof.
Focused real-runner sentinel tests prove selector denial before tool invocation.
Download dependency source into an isolated temporary cache; install no tools.
A reviewed source revert removes the inert candidate without runtime or schema
migration. No existing profile/wire/journal authority or behavior changes.

Docker, privileged helpers, permission/ACL changes, actual recipe pins, artifact
construction, migration 18, initialization, activation, merge, signing, release,
deploy and production remain closed. Phase 11 packet status is unchanged.

## Primary source basis

- [Linux v6.8 ACL wire layout](https://github.com/torvalds/linux/blob/v6.8/include/uapi/linux/posix_acl_xattr.h).
- [Linux v6.8 ACL validation and mode mapping](https://github.com/torvalds/linux/blob/v6.8/fs/posix_acl.c).
- [rustix 1.1.5 safe fixed-buffer fgetxattr](https://docs.rs/rustix/1.1.5/rustix/fs/fn.fgetxattr.html).
