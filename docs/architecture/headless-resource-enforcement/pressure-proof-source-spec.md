# HCFG-6 Controlled Resource-Pressure Proof Source Specification

Status: proposed private conformance procedure; no implementation or run approval.
[Project Status](../../PROJECT_STATUS.md#hcfg-6-resource-and-runtime-enforcement-design)
owns work and acceptance. The Phase 11 packet remains runtime authority with
`PREPARED_SOURCE_ONLY_NOT_EXECUTION_READY`. This proposal specifies the missing
CPU, memory and task-pressure cases; it does not complete native source freeze.

## Separate conformance lane

Normal preparation retains its single PID-1 thread, fixed five sentinels and
no-helper/no-pressure boundary. Neither preparation nor an admitted target
action runs these cases. No bootstrap transaction creates a process. Existing
profile 3, startup protocol 2 and preparation journal phases gain no pressure
message, command, result or successful permit from this document.

Future implementation needs an exact independently reviewed private helper/
driver seam under the still-pending source-order decision. A test-only artifact
and its recipe cannot enter the product action/preparation registry. Actual
execution requires a new human-authorized disposable conformance packet naming
the exact source, kernel/build/configuration, daemon/runtime, image/helper and
driver pins, selected host, run window, inputs, observation and cleanup. All
actual pins remain `UNSET_BLOCKING`. No tool/image construction or run opens here.

The immutable helper has only three compile-time case selectors: `cpu`,
`memory`, `pids`. It accepts no command, executable/path, workload, resource,
allocation count, duration, limit or environment override. Each invocation
rejects an absent/unsupported private conformance context before pressure.
It must first establish the pinned resource-free container/native context,
then wait for the private driver to confirm current daemon/PID/start/cgroup
association and issue that case's one-use start. Bare-host invocation denies.
No action parser, release, grant, target mount, credential, network, host
socket/device or writable host resource is present.

## Fixed bounded experiment

The future driver creates one fresh own container/cgroup per case, sequentially;
it never reuses a case's lifetime or resets a failed attempt. No case uses a
normal action's budget. The proposed conformance limits deliberately match the
existing resource-free preparation ceilings but constitute separate test runs:

| Bound                           | Exact proposed value                                                            |
| ------------------------------- | ------------------------------------------------------------------------------- |
| Live cgroup CPU                 | `cpu.max = 25000 100000`; `cpu.max.burst = 0`; fair scheduler                   |
| Live cgroup memory              | `memory.max = 67108864`; `memory.swap.max = 0`; `memory.oom.group = 0`          |
| Live cgroup tasks               | `pids.max = 16`; initial helper has exactly one thread/task                     |
| Case lifetime                   | Ten seconds from first create request through final result; no reset at start   |
| Pressure phase                  | At most two seconds, inside that same case deadline                             |
| Administrative/native operation | At most five seconds, clipped to remaining case deadline                        |
| Stream                          | At most 64 KiB cumulative stdout, zero stderr; existing bounded framing applies |
| Cleanup                         | Separate five seconds; exact own-object kill/wait/delete/absence proof          |
| Whole series                    | Three cases, at most 45 seconds including cleanup; stop on first non-PASS       |

No driver or helper writes controller files, alters limits, migrates a task,
creates a nested cgroup, raises an RLIMIT, adjusts OOM scores or requests
privilege to manufacture a result. The later accepted run recipe provisions
the selected finite parent controls; unavailable access or insufficient
conditions make the test ineligible. A smaller normal runtime profile is not
widened by these conformance constants.

## Independent observations and attribution

The non-root host observer uses the existing authenticated daemon association,
genuine held cgroupfs and same-host PID/start identity. Before and after each
pressure phase it binds the exact leaf path, filesystem/mount/inode identity,
boot, container ID and helper start identity and rechecks all controller limits.
It reads the finite controller/event files independently of helper output.
Counter decreases, leaf recreation, process migration, changed limits, missing
reads, unexpected task/thread or lost association invalidate the result.

Each selected leaf is an ordinary domain with no child cgroup and no unrelated
task. The exact artifact must establish the helper's single-thread baseline;
no runtime/library thread is silently excluded. Own process/thread membership
observations are bounded by 16 entries and the existing procfs/cgroup bounds;
an unstable or larger observation denies, never truncates to a plausible set.
New test-only native reads and framing need their exact decoder/module review
before source implementation; ordinary product enumeration is not expanded.

The run packet requires an exclusive disposable test environment with adequate
global and ancestor headroom and no concurrent pressure or limit changes.
Every non-root ancestor through the genuine hierarchy is checked within a
64-level bound. An ancestor's `max` means no ancestor limit; it never satisfies
the required finite leaf limit. Before pressure and after workers are reaped,
finite CPU ancestors must permit at least 1,000 millicores, finite memory
ancestors have at least 128 MiB of unused headroom, and finite PID ancestors
have at least 16 unused slots. These parent prerequisites do not widen the
leaf's fixed limits; the PID peak may consume 15 of those free slots.
The exclusive host has at least 256 MiB `MemAvailable` before and after the
case; its exact bounded native read also needs source review. Ancestor
baseline/end local OOM, throttle and PID-denial events must not increase.
Parent contention, ancestor OOM, unexpected events or unverifiable
headroom produce `INCONCLUSIVE`, never a leaf-enforcement PASS. No privileged
observer, host kernel-log read or automatic root configuration is substituted.
The accepted trusted-root/kernel boundary still applies; this is controlled
conformance, not forensic attribution against a hostile administrator.

The Linux v6.8 [controller documentation](https://www.kernel.org/doc/html/v6.8/admin-guide/cgroup-v2.html)
defines bandwidth, local memory events and task-count limits. Event deltas
belong to one observed cgroup lifetime. Sampled usage, a configuration echo or
an errno alone cannot establish controller enforcement.

## CPU case

After baseline/control association, PID 1 creates one immutable single-thread
worker that performs only a fixed integer computation until the two-second
phase ends. PID 1 waits without a busy loop; there are at most two tasks and
no filesystem/network IO or helper exec. The host deadline independently ends
the phase; the helper's clock cannot extend it.

PASS requires a positive small-work result, the worker's bounded successful
exit, positive deltas in `cpu.stat.nr_periods`, `nr_throttled` and
`throttled_usec`, unchanged exact quota/burst and coherent same-leaf membership.
Missing throttling under an overloaded parent is not success: the artifact/run
must demonstrate the intended positive case, otherwise the case is inconclusive.
The [CFS bandwidth implementation](https://github.com/torvalds/linux/blob/v6.8/kernel/sched/fair.c)
maintains these period/throttle counters. Do not infer a cumulative CPU-time
ceiling or exact wall-window usage inequality; quota is period bandwidth.

## Memory case

First, one child maps and touches 1 MiB of ordinary private anonymous memory,
then releases it and exits successfully. The independently observed positive
baseline must fit the 64 MiB leaf without new max/OOM/kill events. This avoids
passing an allocator that simply always fails.

Only after that result, one child reserves at most 96 MiB of ordinary anonymous
virtual memory and touches each native base page once, sequentially, within the
two-second phase. At most one worker lives with PID 1 at a time. No HugeTLB,
locked memory, shared-memory store, file cache stress, recursive allocation,
retry after failure or deliberately stressed PID 1 is allowed. The 96 MiB
virtual reservation is a finite stimulus, not permission to exceed the live
64 MiB charged-memory ceiling.

Expected negative evidence is that this tracked worker dies with SIGKILL while
PID 1 survives, with positive same-leaf `memory.events.local` deltas for `max`,
`oom` and `oom_kill`; `oom_group_kill` remains unchanged. Host observation,
the immutable worker's identity and its exact reaped status must agree.
`ENOMEM`, failed mmap, a dead PID 1, a generic signal or a sampled
`memory.current <= memory.max` alone never passes. The kernel permits temporary
usage overshoot; there is no invented never-exceeded sampled-usage claim.

The [memory controller source](https://github.com/torvalds/linux/blob/v6.8/mm/memcontrol.c)
provides local and hierarchical events. In particular, `oom_kill` alone does
not identify the OOM source. The exclusive/headroom/ancestor checks above and
paired local max/OOM evidence are mandatory. If the selected artifact cannot
reliably preserve PID 1 and establish this controlled outcome, it is not a
feasible positive recipe; privilege, group killing and relaxed evidence are
not fallback solutions. This case establishes only the selected controlled
local-pressure behavior within the stated trust/environment boundary.

## PID case

PID 1 first creates, confirms and reaps one idle child successfully. After that
positive result it reestablishes an independently observed one-task baseline.
It then makes at most 16 sequential single-thread child-creation attempts;
each admitted child waits on a finite private in-container synchronization
handle, does no work and creates no descendant. Child IDs are retained exactly;
no PID/group broadcast, helper exec or fork bomb is allowed.

PASS requires exactly 15 admitted live children, an independently observed
16-task peak including PID 1, and `EAGAIN` on the next attempt, paired with a
positive delta in the same leaf's `pids.events.max`. Stop at the first failed
attempt. Earlier failure, unknown threads, missing event or unexplained task
count does not pass. The [PID controller](https://github.com/torvalds/linux/blob/v6.8/kernel/cgroup/pids.c)
checks ancestors and records failures on the forking task's cgroup even when
an ancestor caused them; event/errno alone is insufficient. Exact baseline,
own-child/peak evidence and ancestor eligibility prevent that substitution.

After the event, release all 15 children through their private synchronization
handle, reap each exact child and independently observe the one-task baseline
again. Failure to return to it is a non-PASS with exact-object cleanup, not a
successful test followed by ignored leftovers. Organizational migration or a
lowered limit can make current task counts exceed the limit; this procedure
performs neither and never treats a sampled count as complete fork-denial proof.

## Result, failure and cleanup

The private conformance report binds case/order, one random case ID/challenge,
source/helper/image/driver/recipe/kernel/daemon pins, current own-object and
counter baseline/end identities, bounded helper exit/status, controller values,
deadline/output consumption and cleanup outcome. Its eventual exact closed
grammar and durable no-clobber record are part of the helper/driver source
review, not an extension of the normal preparation journal or public API.
Only bounded metadata leaves the environment; no raw resource, process-command,
credential, host path, arbitrary logs or memory payload is exported.

Classify each case `PASS`, `FAIL`, or `INCONCLUSIVE`. Both non-PASS states stop
the series and withhold its conformance evidence. No result authenticates
current action resources, generates a permit or admits a registry entry.
Failed expected negatives, positive-anchor failures and contradictory evidence
are FAIL; unavailable/ambiguous attribution is INCONCLUSIVE. Neither is waived.

Record durable own-case identity before a single create attempt. An ambiguous
create never resends; exact own-object inspection precedes cleanup. Confirm
absence and no live own tasks; a cleanup timeout, conflicting identity or
uncertain disappearance quarantines the series. Do not mark cleanup verified,
enumerate/delete by label, clear stop/revocation or repeat a failed case.
Fresh source review must reconcile this future test-only custody with the
existing lost-create/quarantine invariants before implementing its driver.

## Source review and remaining proof

After the required gate decisions, focused source tests cover fixed selector/
budget bounds, absent-context denial before pressure, exact counter grammar,
checked deltas, ancestor interference, positive/negative classification,
PID/thread identity, deadline/output limits and lost-create/cleanup quarantine.
Fixtures and injected counters supply parser/control-flow evidence only; no
host source test performs CPU exhaustion, OOM, PID pressure or negative syscall
sentinels. Existing toolchains compile candidate source without installation.

Actual three-case evidence remains a later separately authorized run. It does
not replace normal non-destructive preparation, live pre-release controls,
action budget/revocation serialization, the real same-attempt reference
workflow, or selected-target package/Phase 13/14 assurance. Full recipe pins,
kernel/snapshotter normalization, image/Git/library inventory and coherent
native/wire/daemon/journal/store review remain open. Passing these three cases
would support only their explicit resource-control claims, never all syscalls,
complete enforcement, enterprise/government certification or V1 readiness.
