# Native procfs fixture source packet

Status: proposed source-only implementation packet; no source, build or native
execution authorization. [Project Status](../../PROJECT_STATUS.md#native-procfs-fixture-source-packet)
owns acceptance and implementation truth. The already selected
[instrumented fixture contract](native-source-spec.md#selected-instrumented-linux-timeout-fixture)
owns kernel roles, wire bytes, lifetime, watchdog and evidence semantics. This
packet makes its source ownership and test seams concrete; it does not reopen
the accepted method choice or replace that contract.

## Outcome and separate decisions

Produce a reviewable Linux v6.8 test patch and private Rust harness capable of
measuring the real retained reader's timeout, late return and cleanup. Ordinary
file/directory positives use the separate unmodified Linux recipe. Neither
synthetic traces nor an instrumented positive satisfy those native positives.
The full V1 native/wire/daemon/store/revocation freeze remains open.

The decision requested after independent review is **source implementation
only**: write the exact files below and run ordinary host source validation,
whose native tests remain ignored. Kernel application/build, Linux test-binary
construction, guest provisioning, device access and genuine native execution
need a later exact authorization. No compiler, toolchain or package install is
included. No Docker, selected target, pressure test, credential/provider access,
host permission change, integration, migration, activation or release is opened.

## Exact future source ownership

The primary controller owns integration and security decisions. One assigned
native implementation worker may own the new patch/configuration and harness;
the primary alone integrates overlapping changes to the existing reader.
Fresh independent source review follows implementation. No source path below
is created or modified by this documentation packet.

| LNSAT path                                                         | Permitted change                                                                                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crates/lnsatd/tests/fixtures/native-procfs/linux-v6.8-gate.patch` | One textual patch against exact upstream v6.8. Its internal paths are limited to the seven kernel files listed below. No vendored kernel tree or executable.                                |
| `crates/lnsatd/tests/fixtures/native-procfs/gate.config`           | Test-only configuration fragment. It is not a complete `.config`, captured artifact or build authorization.                                                                                 |
| `crates/lnsatd/src/headless_native_procfs_fixture_tests.rs`        | Private pure protocol/trace tests plus separately ignored Linux native tests and fixed fixture helpers. No public library or product entrypoint.                                            |
| `crates/lnsatd/src/headless_native_procfs.rs`                      | A `#[cfg(test)]` child-module declaration and the fixed Linux test hooks below. Existing native schedule, deadline, state transitions, cleanup, errors and non-test behavior are preserved. |

No Cargo manifest/lock, dependency, feature, exported constructor, existing byte
grammar, successful sample injector, generic observer, callback or alternate
native backend is owned. A necessary change outside this list returns to the
controller for an explicit scope revision and review. Source evidence updates
belong in Project Status and normal exact PHR/inventory metadata.

## Kernel patch boundary

The public upstream `v6.8` tag object is
`90d1f30371ae3337beb01666b226320728d35c70`, peeled to commit
`e8f897f4afef0031fe618a8e94127a0934896aba`. These exact public references were
checked while preparing this packet. The future patch targets that commit;
source identity does not supply build provenance or a running-kernel pin.

The patch may change only these upstream paths:

- `fs/Kconfig`: add `LNSAT_PROCFS_GATE_TEST`, a built-in-only boolean, default
  `n`, depending on `EXPERT`, `DEBUG_KERNEL` and `PROC_FS`. It is not a module.
- `fs/Makefile`: compile the new fixture object only for that symbol.
- `fs/mount.h`: forward-declare the static fixture-root type and conditionally
  add its nullable tag to `struct proc_mounts`.
- `fs/proc_namespace.c`: bind the tag after successful ordinary record setup;
  detach it before ordinary release and report closure after release returns.
- `fs/namespace.c`: invoke the selected wait at the start of `m_start`, before
  the existing namespace semaphore acquisition.
- `fs/lnsat_procfs_gate_test.h`: private hook declarations and disabled no-op
  stubs. No UAPI, exported symbol, ioctl or userspace pointer interface.
- `fs/lnsat_procfs_gate_test.c`: one static root, fixed device operations,
  retained identities, synchronization and the existing one-shot watchdog.

The new kernel files retain an appropriate GPL-2.0-only SPDX declaration; the
patch preserves upstream notices. The LNSAT Rust test remains under its existing
repository licensing. Artifact/license distribution review remains separate.

Use the existing successful `seq_open_private` and complete `proc_mounts`
initialization before attaching a tag. Existing pre-initialization error branches
remain unchanged and hold no tag. Place binding immediately before the ordinary
successful return; add no later fallible work. If the implementation needs a
post-binding error path, it must detach the tag, mark the fixture failed and
balance temporary references before returning, under separate exact review.
Boot-lifetime fixture references are not released by an ordinary record error.

The private hook API is fixed to these responsibilities:

| Hook                                    | Call-site rule                                                                                                                                                                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lnsat_gate_bind(record, is_mountinfo)` | `mounts_open_common` passes the actual `show == show_mountinfo` comparison after assigning `ns`, `root` and `show`. Only the enrolled current task, retained namespace and first eligible record may acquire the tag. No userspace-supplied identity is accepted. |
| `lnsat_gate_wait(record)`               | First tagged `m_start` publishes arrival, waits on the private queue and publishes gate exit before the ordinary semaphore acquisition. Later iterator retries retain ordinary behavior and do not rearm.                                                         |
| `lnsat_gate_detach(record)`             | At `mounts_release` entry, save the static-root pointer and clear the tag while the record remains valid. An early record close follows the existing sticky-failure rule.                                                                                         |
| `lnsat_gate_record_closed(root)`        | Call through the saved pointer only after `path_put`, `put_mnt_ns` and `seq_release_private` have returned. Preserve the ordinary release return value; never dereference the freed record.                                                                       |

The upstream [record layout](https://github.com/torvalds/linux/blob/v6.8/fs/mount.h#L118-L122),
[open/release sites](https://github.com/torvalds/linux/blob/v6.8/fs/proc_namespace.c#L222-L282)
and [iterator site](https://github.com/torvalds/linux/blob/v6.8/fs/namespace.c#L1365-L1406)
are the source anchors. The selected contract's queue, file-cleanup and hrtimer
references remain applicable. These are inspected source relationships, not a
compiled patch or measured kernel result.

Use a built-in `miscdevice` with fixed name `lnsat_test_procfs_gate`, dynamic
minor and mode `0600`; registration failure leaves the fixture unavailable.
The later guest packet supplies exact device identity and restricted test-user
ownership. Initialization creates the static lock, queue and monotonic timer
before device registration. There is no unload, reset or diagnostic backdoor.
The [upstream interface](https://github.com/torvalds/linux/blob/v6.8/include/linux/miscdevice.h)
supplies the registration surface; dynamic device numbers are not artifact pins.

The configuration fragment enables only the named test option and its explicit
prerequisites. A later complete kernel configuration must separately satisfy
the accepted ext4/ACL/procfs/time-namespace recipe. Both the unmodified positive
kernel and instrumented negative kernel need their own exact source, full
configuration and built-artifact identities. Disabling a hook in the patched
tree does not turn that tree into the unmodified positive kernel.

All existing eight-byte commands, 32-byte snapshots, caller-role checks,
monotonic facts, first reasons, one generation per boot, reference retention,
IRQ-safe lock discipline and 15-second absolute watchdog remain unchanged.
No allocation, userspace copy, wait or reference destruction occurs under the
fixture lock. No global namespace semaphore is held at the injected wait.
The source review must check every error and close path against those rules;
an apparently successful userspace call does not replace them.

## Private Rust harness and fixed hooks

The test module's pure byte/trace helpers compile under `cfg(test)` on ordinary
supported source-check hosts. Native helpers and every reader hook require
`cfg(all(test, target_os = "linux", target_has_atomic = "64"))`. No hook, fixture
state or environment read exists in a non-test build. Normal tests never install
the native fixture state, spawn its worker or open procfs/device resources.

Native tests are individually `#[ignore]`, selected by exact name in a fresh
test process. They fail if the production `LANE` is not virgin. They cannot
reset it, borrow the existing synthetic roots or run multiple native scenarios
in one process. Unsupported/missing setup is a failed native case, never a
skipped result counted as PASS. The test output may report synthetic checks
separately; it must not translate those checks into native success.

### Bindings and held inputs

The native harness accepts only two non-secret test bindings: a run identifier
of exactly 32 lowercase hexadecimal characters and an expected device `rdev`
of exactly 16 lowercase hexadecimal characters, through fixed variables
`LNSAT_PROCFS_RUN_ID` and `LNSAT_PROCFS_GATE_RDEV`. The latter is required only
for instrumented cases. Parse once before any native fixture open; reject
missing, non-Unicode, malformed, oversized or all-zero placeholder values. They
are labels supplied by the later run packet, not proof of current kernel
provenance or permission.
No supplied resource path, PID/TID, deadline, address, native result or command
is accepted.

Fixed paths are `/dev/lnsat_test_procfs_gate`, `/proc`, and the pre-existing
`/var/lib/lnsat-procfs-fixture/resource-file` and `resource-dir`. The future
isolated guest packet provisions the latter on ext4 and fixes their identity,
ownership and ACL context. The harness never creates, modifies, mounts or
replaces them. Open fixed resources once with safe no-follow/CLOEXEC APIs and
retain them in the existing `OwnedProcfsCustody`. Verify the non-root unchanged
UID/GID and empty supplementary-group preconditions; unavailable evidence fails.
No temporary-directory filesystem fallback is allowed.

For the instrumented case, open exactly two independent read/write device
descriptions in the controller thread with no-follow and CLOEXEC. Check both
held descriptions are the expected character device, have matching identity,
and have owner/group equal to the non-root test UID/GID with exact permission
bits `0600` before installing the enrollment
description. Merely finding the pathname or matching `rdev` does not authenticate
the test kernel; the later provenance packet supplies that separate binding.
Failure consumes no candidate job and closes/accounts for both fixture handles.

### Enrollment, dispatch and native return

The new module may hold one permanent test-only installation cell containing
the enrollment `File`, fixed atomic observations and close coordination. A
single controller installation must precede `construct_once`. No overwrite,
reset, descriptor clone or function pointer is accepted. A second installation
fails. Fixture setup I/O never enters the engine coordinator path.

The fixed worker-entry hook takes that single `File`, sends ENROLL once and
retains the enrollment role in a worker-local owner around the existing
`worker_body`. If no fixture is installed, the hook has no native effect.
An enrollment failure terminalizes the candidate lane and fails the test; it
cannot continue through an unenrolled native attempt. Keep the existing exit
guard and panic containment; a test owner must not silently replace their role.

The controller explicitly constructs the worker without creating a request,
observes enrollment and sends ARM. Only after successful ARM may it call the
unchanged `Attempt::try_prepare`, thereby fixing the original deadline after
setup, and call `dispatch`. It records the returned attempt token/deadline once.
There is no alternate `prepare_in` deadline, early job, shortened deadline,
replacement worker or second action budget.

The only native-read observation hook is immediately after the actual first
`rustix::io::read` for `self/mountinfo`, before the following `self.check` can
return a timeout. It records return through fixed atomics without allocation,
I/O, locking, logging payload bytes or changing the read result. Its selection
uses the existing fixed record call site; it accepts no callback or alternate
path. The kernel snapshot separately establishes that this same read reached
the tagged wait. A userspace entered/in-flight flag is never arrival evidence.

### Timeout, cleanup and role close

Follow the selected contract's arrival-before-deadline, denial-while-unreleased,
second-job rejection, explicit RELEASE and late-return ordering. Keep the
2,000-read limit, 10 ms minimum unsuccessful-poll interval and 20-second evidence
cutoff starting before ARM. The 15-second kernel watchdog stays independent.
Neither cutoff guarantees syscall return, cleanup or scheduling latency.

After release, require the independent kernel `GATE_EXITED` and `RECORD_CLOSED`
facts plus the actual read-return flag. Inspect the real `LANE.slots` through
nonwaiting `try_lock`: require cleanup for the original token with
`CleanupAccounting::complete()`, no pending request/completion, and the exact
original token with phase `BODY_RETURNED` plus the `TERMINAL` bit. Generic
terminal state is insufficient: timeout can set it before worker cleanup.
No new cleanup injector or synthetic successful sample is introduced.
Observation times are when facts were read, not exact kernel event timestamps.

This accounting retires the job's shared references; it does not close the
original owner's descriptors. After those checks, separately use
`Arc::try_unwrap` and consuming safe close for both original custody handles.
Unexpected shared references or either close error fails PASS. Attempt both
closes even if the first fails. Device handles are accounted separately from
the candidate's native handles and owner-held inputs.

The worker-local enrollment owner remains retained after terminal worker-body
return until the controller takes its final clean snapshot and permits role
close. That wait is test-only teardown, outside coordinator deadline/stop work.
The controller stores the permanent close-release flag, then unparks the actual
retained worker. Its loop rechecks the flag before and after each bounded park;
a notification is only a wakeup hint and cannot replace the predicate.
It has a fixed evidence cutoff; panic, failed coordination or expiry fails the
test and permits only failure cleanup. The worker consumes/closes enrollment
once; the controller must observe `ENROLLMENT_CLOSED` through its remaining role
before consuming/closing control. Do not report observed `CONTROL_CLOSED`,
because no reader remains. A role-close error, missing observation or watchdog
release invalidates success. No blocking join is added to the coordinator.
Lexical owners must close/drop enrollment before the existing `WorkerExitGuard`;
the test guard cannot suppress that production exit guard on any return/unwind.

Every failed run keeps the first failure and may attempt one best-effort ABORT
if its control role is usable, then retains ownership/accounting through the
same cleanup path. It sets close-release and wakes the worker even when clean
accounting cannot be obtained, so a returned worker cannot wait forever for an
abandoned controller. Early role close remains a failed kernel observation.
There is no read/write retry, resend, rearm or replacement.
A still-blocked native worker remains a failed retained case for the separately
authorized guest-disposal procedure; process exit or VM destruction is not
successful reader cleanup.

Use fixed atomic flags and at most 16 fixed controller observation records;
record only required facts/transitions, not every poll. Overflow or ambiguous
ordering denies PASS. Export only the run binding, original token and relative
deadline/observation times, fixed outcome/reason codes and cleanup facts. No raw
procfs, resource path, FD/address, environment value dump or credential appears.
The later run packet separately binds this record to exact reviewed source,
kernel/configuration/patch, harness executable and unique guest identities.

## Required tests and permitted commands

Ordinary source-only tests must cover exact command encoding, every snapshot
field/reserved bit/reason, truncated/oversized input, immutable first-failure
handling, missing/bad test bindings, record capacity and positive/negative
trace ordering. Synthetic traces test the validator only. They never call the
native fixture, instantiate a successful `NativeSample` or provide a native
test verdict.

The ignored native cases are `linux_positive_file`, `linux_positive_directory`
and `linux_gate_late_cleanup` under
`headless_native::procfs::fixture_tests`. The first two run on the unmodified
recipe without device enrollment; each must return a genuine sample through
the unchanged reader and prove cleanup/owner-handle close. The third must prove
the selected unfinished-operation and late-cleanup chain and reject any sample
after deadline. Each needs a fresh process; the gate case also needs a fresh
instrumented guest boot. Missing native results remain missing, even if source
compilation and all pure checks pass.

Each positive case explicitly constructs the real worker before preparing its
single attempt, accepts a sample only through the unchanged timely `poll`
path, and checks the held resource's observed filesystem is ext4 and its type
matches the named case. It then observes retirement to `IDLE` for that token,
requests the existing terminal stop/wakeup, waits for `BODY_RETURNED | TERMINAL`
with the same complete cleanup entry, and consumes/closes both original owner
handles. No device role is created. The process-lifetime join handle remains
retained; this case does not claim joined-thread or zero-global-state cleanup.

After source-only implementation is explicitly authorized, ordinary checks are:

```sh
cargo test -p lnsatd --lib headless_native::procfs::fixture_tests::wire_
cargo test -p lnsatd --lib headless_native::procfs::fixture_tests::binding_
cargo test -p lnsatd --lib headless_native::procfs::fixture_tests::trace_
npm run check
npm run docs:direction:check
npm run public:check
npm run legacy:inventory:check
npm run public-history:review:check
git diff --check
```

Use the existing pinned offline toolchain/cache, with automatic installation
disabled. This source-only allowance uses the current `aarch64-apple-darwin`
validation host; Linux cross-compilation or a new sysroot is not included.
Verify default tests leave every native case ignored and never open
the fixture. Static review must prove disabled kernel configuration removes
all device/hook code and non-test Rust builds contain no fixture path. Host
validation does not compile an unavailable Linux target. Kernel patch application
checks, kernel compilation and ignored native selectors remain outside this
source-only command allowance.

## Later construction and execution packet

Before any build or native run, a separate concrete packet must bind the exact
reviewed LNSAT commit/patch digest and peeled upstream Linux v6.8 commit; full
kernel configurations, compiler/linker/sysroot and Rust toolchain inputs; guest
image/rootfs/boot recipe; permitted offline inputs/network policy; exact build
commands and artifact locations/digests; and provenance/verification procedures.
The textual v6.8 tag or fragment is not a binary identity. No executable/image
hash is supplied by this source packet; actual pins stay `UNSET_BLOCKING`.

That packet must also fix non-root test UID/GID, device `rdev`/ownership/mode,
ext4 fixtures/ACLs, absence of host mounts/credentials/Docker/targets, run IDs,
exact ignored-test selectors, external monitoring and guest disposal. Provisioning
privileges are confined to that disposable guest; the harness itself is not
root and cannot mount, alter ACLs or obtain capabilities. Unexpected artifact,
identity, platform or prerequisite denies the run. No guessed build or guest
command is approved here.

Kernel negative checks must separately cover wrong caller/role, extra open,
bad frame/copy fault, pre-arrival release, duplicate transition, premature role
or record close, watchdog expiry and close after explicit release. Every case
needs the exact expected sticky failure and a fresh boot where state is consumed;
no failure case can be substituted for the nominal containment trace. The later
packet must provide feasible exact procedures, including copy-fault injection
without unsafe Rust, before executing those cases. Unavailable procedures remain
unverified coverage; source review cannot fill them with invented results.

This packet does not close the reader's remaining construction/panic/close-failure
tests, durable crash bridge, other native observers, authenticated daemon/root/OCI
custody, protocol/transport, transactional store/revocation or complete freeze.
It supplies no Docker, support, certification, packaging or publication proof.
Rollback of a future source-only change is a reviewed revert of its owned paths;
running-kernel rollback and guest cleanup belong only to the later runtime packet.
