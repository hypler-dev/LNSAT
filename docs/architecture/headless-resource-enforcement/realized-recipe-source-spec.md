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
Independent owner/store/policy selection must retain that recipe before profile
or root-manifest declaration comparison, in the
[root-manifest custody order](root-manifest-source-spec.md#custody-shared-lifetime-and-invalidation).
The schema-3 profile and root manifest carry recipe references to compare with
that independently selected expectation; neither file selects authority,
registers predicates or chooses a weaker recipe. Expected declaration family
also comes from selected policy before decoding, as specified by the
[root-layout contract](root-layout-source-spec.md#gap-and-compatibility).
The selection and control-ownership direction below narrows that interface.
The complete entry schema, writable admission and whole-boundary precode freeze
remain open.

No expression language, regular-expression path allowance, plugin, wildcard
mount or unknown-field fallback is allowed. Dynamic values are limited to
already authenticated current object associations: container ID, daemon metadata
paths, host and container mount/namespace tokens, cgroup association, exact
UID/GID and action target. Those values do not change the immutable predicate
program. Independently held deployment bindings supply selected values where
the policy permits them; candidate declarations remain assertions to compare,
and actual native association remains a separate requirement. A product-wide
literal UID, host path or current mount token cannot substitute for that custody.

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

## Independent selection and control-side ownership

This subsection records controller design decisions within the accepted Stage-A
contract work. It is not a complete module precode PASS or an implemented API.
[Project Status](../../PROJECT_STATUS.md#stage-a-recipe-selection-and-control-custody-direction)
owns its state. The following names describe private future roles, not public
Rust APIs, wire contracts or supported configuration.

### One build-owned product slot

The initial distribution uses one private build-owned `InitialGitReference` slot.
Select it from compiled product policy before reading profile/root declarations;
there is no request, environment, CLI, adapter, response or discovery selector.
Exactly one internally complete reviewed product entry must match that slot.
Zero entries, duplicate entries, an incomplete entry, wrong platform/backend/
family or a recomputed commitment mismatch deny. No best-match, fallback,
automatic registration or weaker family is permitted. This decision fixes
selection direction, not the still-missing closed entry schema or real pins.

An incomplete preparation record and its finite missing-input reasons remain
separate from `CompleteExpectedRecipe`. Neither zero/sample hashes nor an
always-deny registry implements a supported recipe. The expectation can be
constructed before native observation once all genuine immutable inputs exist;
requiring host observation to construct its own comparison policy would be a
cycle. Conversely, selection is never evidence that the current host complies.
The expected root declaration family is a field of that independently selected
entry, fixed before decode; the thermal-cache requirement needs the v2 family.
The existing v1 parser remains a separate supplied-body candidate, not a
supported fallback for the initial product slot.

Keep three distinct inputs to comparison:

| Input                         | Owner and responsibility                                                                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Immutable recipe              | Reviewed source/artifact/provenance pins, nested kernel/security policy commitments, exact predicates, fixed container paths and budgets; excludes current deployment identities and pressure-driver inputs |
| Confirmed deployment bindings | Actual selected owner/store custody, held confirmed profile, distinct selected administrators, explicit host artifact/daemon locations and authenticated action resource; change no recipe predicate or pin |
| Genuine observations          | Worker-acquired current boot/task/peer/namespace/mount/object/LSM facts, exact actual bytes and daemon original cache associations; candidates cannot supply them                                           |

The binding roles are finite: selected profile, root-manifest anchor, controller,
administrators, host artifacts, daemon deployment and action resource. They are
not an extensible pathname map or caller assertion token. Each needs its exact
field/bounds/admission contract before source composition. The anchor comes
only from the held confirmed schema-3 profile and independently selected actual
controller. Resource-free preparation has no action bind. Per-install UID/GID,
host paths and live mount tokens must not become universal product constants.

Reuse the existing distinct profile/root codecs through their private typed
assertion views. Create those borrows where the decoded owner lives; no view,
borrow, SQL guard or fabricated static reference crosses the worker boundary.
Only owned immutable expectation and bounded owned unverified material may
cross in a closed typed request. Exact `Send` bounds and finite storage must
be proved for those owned types; getters do not constitute admission.

### Physical store retention belongs to the control root

The existing selected inspection opens SQLite read-only while holding an
**exclusive** OS `try_lock` on the daemon/offline-recovery shared lock-file
protocol. “Shared lease” in older comments names that protocol, not shared lock
mode. `SelectedPreparationParent` exclusively borrows `&mut SqliteStore`;
it is not a detached lifetime owner. Ordinary `SqliteStore::open` has no selected
custody. The current daemon has a separate database-lease field and
`Arc<Mutex<SqliteStore>>`; combining those existing handles by assertion does
not establish selected writable preparation.

Choose one fixed process-lifetime **control root**, separate from the native
lane. It owns the actual selected store with connection, parent and exclusive
lease retained as one physical owner. An operation registration lives beside
that owner under the same actual-store authority mutex. Never extract the
lease, return the last store owner to a caller ticket, open a second connection
for an operation, or release/reacquire custody during quarantine. Connection
closure precedes lease release. The native lane owns its own descriptors and
receives no store, SQLite transaction, store mutex guard, lease or credential.

The root retains the store across successful operations as well as denial,
timeout, caller cancellation, ticket drop and coordinator unwind. A caller
receives a non-Clone observation/cancellation ticket that cannot release the
physical owner. Registration contains one nonreusable operation identity,
original shared budget allocation, root-begin identity when assigned, current
job token when assigned and monotonic disposition. Root-begin and later job
identities are distinct. Token overflow, unknown identity, poisoned bookkeeping
or uncertain ownership denies and retains custody; it never silently resets.
There is one operation slot, no queue, replacement lane or retry budget.

This is a selected physical-owner requirement, not permission to wrap an
ordinary unbound store. The private API contract below refines method ownership
and visibility. Concrete writable construction, registry/confirmed-binding
constructors and lock/type proofs remain module-precode items. Read-only inspection cannot be upgraded
by changing a diagnostic flag. Pre-init has no installed UUID/generation/epoch;
atomic bootstrap creates them only after all preparation/cleanup rechecks.
Installed admission has separate fresh installation/generation/epoch/stop and
resource checks; it cannot reuse a cached pre-init result as action authority.

### Dispatch, denial and retirement are different events

The lock order is actual-store authority mutex, then **nonwaiting** native-slot
access. The worker never takes the store mutex. No native operation or worker
wait runs while the store mutex is held. All authority writers must use that
same mutex; exact writer call-site coverage is still required before integration.
Under it, recheck current owner/stop/revocation and publish matching operation/
job registration before making the request worker-visible. If native slots are
busy, dispatch nothing; any later admission repeats current authority checks.

A stop committed before admission prevents dispatch. Later stop first invalidates
the original budget, then requests matching lane cancellation/wake. These are
ordered steps, not one atomic multi-object event. The registration preserves
pending denial if native cancellation bookkeeping is busy. Every required
stage/call/exchange checks the original budget before and after use. A syscall
already entered cannot be interrupted by that flag; late result denies and
cannot advance to another stage. No second validity flag, deadline reset or
new-budget retry is allowed.

Future control-side retirement needs a distinct cleanup-only acknowledgment:
matching operation, original budget allocation, root-begin and last dispatched
job, no request/result awaiting disposal, and complete accounting for all
worker-owned temporary and original native descriptors. Failed/unknown closes,
panic, poisoned slots, token mismatch or missing accounting retain quarantine.
A stale acknowledgment cannot retire a newer registration. Observation polling
requires a live budget; consuming cleanup evidence may occur with an invalid
budget under separate Retiring predicates and supplies no successful observation.
The private API contract below bounds acknowledgment ownership and consumption;
its concrete storage and compiler proofs remain missing.

Current native `Slots.cleanup` accounts for a job; `BODY_RETURNED` records a
worker-body disposition. Neither alone proves whole-operation cleanup, thread
exit, durable recovery or actual store/probe cleanup. Wake, elapsed time,
`is_finished`, parsed journal phase and a completed response are also insufficient.
The control root remains owner when the ticket disappears; only a matched actual
native retirement plus separately verified store/journal/probe cleanup can
permit clean shutdown and store release. Terminal timeout never rearms the
native lane in that process. No bounded close, hard five-second native return
or scheduler-independent denial is promised.

After process death, fresh exclusive lease acquisition cannot prove old resources
are gone. Durable intent must precede future probe creation. Nonterminal,
malformed, partial or ambiguous recovery state denies new admission; failed
quarantine append preserves ambiguity. Actual recovery and atomic owner/root/
generation/audit/pointer composition remain missing, distinct from this design.

## Private control API contract

This is a controller-selected contract refinement within Stage A, not a Rust
implementation, complete module precode approval or source-placement migration.
[Project Status](../../PROJECT_STATUS.md#stage-a-private-control-api-contract)
owns its acceptance and implementation state. The names below denote future
private roles. No public SDK, adapter, wire type or CLI may construct these roles,
publish a native result, inject an observer or acquire execution authority from
an inspection response.

### Crate boundary and ownership

The future control root, selected writable owner, B2/C1 transaction helpers and
whole-operation native acknowledgment producer must share one trusted Rust crate
boundary. Select `lnsat-store` for that boundary: it already owns the actual
connection and private selected custody and credential helpers. Future native
implementation used by this root must be placed inside that boundary through a
separately reviewed move/reuse of existing private code, not copied observer
logic, a public proof-construction bridge or a store-to-daemon dependency cycle.
Current daemon modules and ordinary APIs remain unchanged by this contract.
Exact module placement, dependency changes and compilation are still required
before implementation. Rust visibility is an accidental-misuse boundary; it
does not establish protection against malicious code compiled into the process.

`ControlRoot` owns one mutex containing `StoreAuthority`. `StoreAuthority` owns
the selected writable wrapper's actual connection, credential scope, parent,
exclusive lease and preparation directory, plus the single operation record.
Select one private process-lifetime `OnceLock<ControlRoot>` anchor, initialized
without custody I/O before selected admission begins. It is never taken,
replaced or deallocated in-process. The supervisor borrows that root; it does
not hold its final owning reference. Supervisor/coordinator unwind invalidates
the original budget and preserves quarantine, without releasing root contents.
Only the explicit authorized close path may remove connection/custody contents;
the root stays anchored in Closed or Quarantined state afterward. Caller tickets
and workers never own the last root/store/lease reference. There is no `Clone`,
`Debug`, `Deref`, serialization, raw descriptor,
connection getter, caller transaction or public constructor for the wrapper.
No field ordering or destructor alone proves successful native cleanup.

The operation record contains a checked, nonzero, monotonically increasing
process-local operation ID; the original `Arc<ArtifactBudgetState>` allocation;
optional root-begin and last-dispatched job tokens with their kinds; and one
monotonic disposition. These process-local identities are not installation UUID,
generation or epoch. Overflow permanently quarantines this root; IDs are never
reset or reused. Allocation identity uses `Arc::ptr_eq` inside the trusted
boundary, not a caller-supplied number or serialized budget. Optional tokens are
absent only before the corresponding job was dispatched, not wildcards.

`OperationTicket` is non-Clone and exposes only bounded inspection/cancellation.
It contains the registered ID and original budget reference, never store custody.
Drop and coordinator unwind invalidate that original allocation without waiting
for the store mutex. They cannot close the store, consume cleanup evidence or
turn a pending operation into a reusable slot. The supervisor observes sticky
invalidation and advances bookkeeping; delayed bookkeeping cannot make a worker
result valid. If the supervisor itself fails, retained custody and admission
denial are required, not guaranteed recovery or a bounded return time.

### Closed private method vocabulary

The table specifies ownership, results and ordering for the future private
methods; it is not compilable Rust or approval of unspecified argument layouts.
`Busy`, `Denied`, `Pending`, `Retired` and `Quarantined` are finite internal
outcomes, not raw OS/SQLite errors. Public feedback must preserve their distinct
meaning through the existing error contract, without leaking paths, credentials
or native diagnostic payloads. Busy supplies no authority and no retry budget.

| Private method         | Input and owned result                                                                                                                                                      | Required effect                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admit_selected_store` | Internally selected complete expectation, held confirmed profile and bounded selected owner/path inputs; returns a borrowed root interface only after B6 physical admission | Acquire and retain exclusive lease before the selected writable open; use the actual native witnesses and connection. No caller proof, ordinary-store upgrade, create/URI open, migration fallback or second inspection connection. This is physical admission, not installation or action approval.                                                     |
| `try_begin`            | Closed preparation or installed-action intent; returns one ticket or Busy/Denied                                                                                            | Under the actual authority mutex, repeat current custody and the intent's eligibility checks, register one original budget and ID, and reserve the single slot. No native I/O or queue. Pre-init has no fabricated installed identifiers; installed intent requires current installation, generation, epoch, stop and authenticated resource predicates. |
| `try_dispatch`         | Matching ticket and one owned closed request; returns a matching job token or Busy/Denied                                                                                   | Under authority mutex then nonwaiting native-slot access, check the original budget and current authority, register token/kind before request visibility, then release locks. Busy publishes no request and cannot reset deadline, refund counters or authorize automatic retry.                                                                         |
| `poll_observation`     | Matching ticket and expected job kind; returns Pending, bounded unverified result or Denied                                                                                 | Check exact identities and original budget before taking a result and again before use. A result is never a permit. Late/mismatched results are disposed under native cleanup accounting; no later stage follows an invalid budget.                                                                                                                      |
| `cancel`               | Matching ticket; returns Denied/Pending or Quarantined                                                                                                                      | Invalidate the original budget first, preserve retiring disposition, then request matching lane cancellation/wake without waiting for worker completion. A busy native slot leaves cancellation pending; it never clears invalidation. Ticket drop follows the same invalidation rule without claiming durable stop.                                     |
| `try_retire_native`    | Matching operation record, including root-begin and last job if assigned; returns Pending, one cleanup acknowledgment or Quarantined                                        | Use cleanup-only native accounting after all outstanding request/result disposal and root-lease retirement. No live-budget requirement for consuming cleanup, no successful observation result, and no waiter holding the store mutex.                                                                                                                   |
| `try_finish`           | Root-owned acknowledgment plus separately verified durable/probe cleanup; returns Retired or Quarantined/Pending                                                            | Under authority mutex, compare all identities, consume acknowledgment once, repeat actual store and durable-state predicates, then retire the record. No outstanding transaction, statement, native handle or effectful frame may survive successful retirement. Keep the store and exclusive lease for the next independently admitted operation.       |
| `try_shutdown`         | Supervisor's private shutdown intent; returns Pending, Closed or Quarantined                                                                                                | Deny new admissions, invalidate any active budget, and retire it. Only a quiescent root with all actual cleanup confirmed can enter its single authorized close path. Release connection before lease; failure/uncertainty retains quarantine and available custody, without reopen or clean-success claim.                                              |

The anchor starts Unadmitted, with no lease/connection and admission disabled.
Only its private selected-admission path may enter Admitting. Store each held
lease and returned physical owner in anchored storage before the next fallible
verification; return only a borrowed root interface after physical admission.
Failed/unknown opening or unwinding retains the held lease and whatever custody
remains in Quarantined state; it cannot promise a failed native constructor left
a connection open. No admission retry, replacement anchor or drop-driven release
is permitted. Exact partial-owner initialization/storage and trait/lifetime
proofs remain precode gates. Do not substitute a supervisor-owned final `Arc`.

Closed requests reuse only `Procfs`, `ArtifactRead`, `RootManifestBegin`,
`RootManifestRecheck` and `RootManifestRetire`. Owned request fields must be
bounded and immutable except existing private budget/control accounting; no
borrowed assertion view, SQLite object, mutex guard, selected lease, password,
custom closure, `Any` payload or extensible path map crosses into the worker.
The current Procfs variant has no `ArtifactBudgetState`; it cannot be relabeled
as already bound to this whole-operation budget. Exact binding for every variant,
finite byte/object limits, request/result layout and `Send`/`Sync` compiler
proofs remain required. A table of names is not that complete type proof.

### Retirement and disposition predicates

The fixed operation slot follows this transition vocabulary:

| Disposition | Permitted transition and physical ownership                                                                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vacant      | `try_begin` may register one operation after fresh eligibility; root keeps selected store/lease.                                                                                                                                                          |
| Active      | Only matching stages may progress under the original budget. Cancellation, stop, deadline expiry, caller drop or failure moves toward Retiring; uncertain ownership/token/poison goes to Quarantined.                                                     |
| Retiring    | Observations deny. Only matched cleanup and durable/probe reconciliation may progress. No new operation or replacement lane.                                                                                                                              |
| Quarantined | No action admission, new budget or clean release. Only the original operation's cleanup/reconciliation may establish quiescence; any durable uncertainty still denies. Terminal native timeout never rearms the lane in this process, even after cleanup. |
| Retired     | All required cleanup has completed and the record is consumed. The slot may become Vacant only if root and native lane remain admissible; otherwise it stays closed to admissions.                                                                        |

Shutdown is a root state, not an operation success result. It permanently closes
admission before attempting retirement and cannot be undone by caller retry.
Retirement before the first native dispatch has absent begin/job tokens and
requires proof that no native request became visible; it cannot consume a
fabricated all-zero acknowledgment. The producer handles that exact no-dispatch
case internally. Once a job is published, its assigned identity is mandatory.

`NativeCleanupAck` is private, non-Clone, non-serializable and created only by
the actual native retirement producer. It binds operation ID, same original
budget allocation, exact optional root-begin identity, exact last job token/kind,
and complete accounting for all temporary and retained original descriptors.
Before publication, no queued request, result, root lease or unaccounted close
may remain for the operation. Acknowledgment is stored in the one bounded slot,
moved directly into root-owned consumption and invalid after consumption. It
cannot be reconstructed from elapsed time, an error, a job cleanup enum, thread
body return, SQLite commit, response body or journal phase. Unknown/failed close,
panic, poison, stale identity or incomplete accounting retains quarantine.
Exact publication primitive and panic-safe native cleanup storage remain precode
gates; the existing job-scoped `Slots.cleanup` is not this implementation.

Native acknowledgment excludes store, recovery journal and probe-process cleanup.
Those remain separately verified under their existing specifications. Native
observation may complete without a valid comparison; comparison may deny while
physical cleanup remains pending. Neither outcome permits store release.

### Stop and release use the same actual authority mutex

All owner, credential, recovery, session, policy, nonce, generation, epoch, stop,
bootstrap and release authority writes must enter this same root mutex after
integration. Existing public ordinary-store methods are not automatically
covered; an exact call-site/constructor inventory and routing review is required.
Offline recovery remains separately lease-exclusive. Read-only inspection cannot
borrow its authority, and audit-only exceptions cannot mutate authorization.

For a stop already authorized by the existing owner/approval predicates, acquire
the mutex within the existing five-second, 100 ms monotonic polling contract.
Once acquired, invalidate the operation's original budget before the durable stop
transition. Commit the actual SQL state before reporting a durable stop; request
matching lane cancellation as a separate conservative step. Failed or ambiguous
commit leaves invalidation sticky and requires reconciliation, not a claimed
committed stop. Failure to acquire returns Busy/Denied, not durable-stop success.
Stop and dispatch use the same mutex, so committed stop before admission denies
dispatch. Cancellation cannot interrupt a syscall already entered.

The rule against native observation or worker waiting under the mutex does not
weaken the [existing release critical section](preparation-store-source-spec.md#installation-wide-release-synchronization).
Release checks and commit, followed by the exact potentially effectful frame
write, retain the actual authority mutex through that write and its unfinished
write retirement. No guard or SQLite owner transfers to the observation worker.
A future control-side frame writer must retain its own guarded ownership while
the write can still release an action. Write timeout is an acceptance cutoff,
not proof the write ended or permission to drop the lock. An invalidating writer
cannot commit between release commit and frame write. Stop may therefore return
Busy while that critical section is occupied. Release commit first is the grant
linearization; later stop cannot claim an already released action never occurred.
Exact frame-writer ownership and unfinished-write cleanup remain precode gates.

### Selected writable admission and final close

B6's exact selected path, owner, parent, exclusive lease, mount/ACL/ancestry,
SQLite/VFS, existing WAL, schema-18 manifest/seed and actual-byte requirements
remain governing predicates. This API neither selects missing genuine pins nor
implements them. Initial `query_only=ON` is a fuse; only the private eligible
immediate transaction phase may disable it, repeat checks and restore it before
inert preparation. C1 snapshots stay bound to the same actual credential scope
and connection/transaction. They are not portable step-up tokens. Ordinary
global schema-17 migration/open remains separate and rejects headless schema.
No sidecar open/dup/hash/close is permitted as a substitute for pinned VFS
coordination because it may interfere with POSIX locks. Current source custody
is not complete writable native admission.

The sole supervisor close path requires no active registration or in-flight
frame and matched actual native, durable and probe cleanup. Drop transactions
and statements before explicit connection close, retaining parent/lease until
that outcome is known. `Connection::close` consumes the connection and can
return it on error: that returned owner must be put back into root-held
quarantine, never handed to a caller. SQLite success alone is not proof of all
pinned VFS/OS close outcomes. Unknown close or unwind during authorized close
cannot promise the connection remains open; retain remaining custody, deny
reopen and require reconciliation. The concrete non-unwinding close/storage
protocol and actual VFS cleanup witness are still blocking precode obligations.
Unwind during an unfinished native operation, in contrast, must not enter this
close path at all. Connection cleanup must precede exclusive lease release.

Process death requires fresh recovery: lease acquisition is not proof of old
resource cleanup. Durable intent precedes probe creation; partial, nonterminal,
malformed or ambiguous records deny new admission until actual reconciliation.
No new-budget retry, evidence deletion, pointer reset or command resend follows
uncertainty. These rules do not implement atomic owner/root/generation/audit/
pointer bootstrap or grant runtime/support/certification authority.

### Remaining module-precode gate

This contract closes the private method/disposition vocabulary and reconciles
crate visibility, stop ordering and release-lock retention. Before any control
implementation, one exact source packet must still provide complete expected
entry and confirmed-binding fields/bounds/constructors; genuine required pins;
selected writable/VFS admission and close witnesses; exact trusted module moves
and dependency graph; finite request/result/acknowledgment storage; original
budget binding for every job; trait/lifetime proofs; all-writer/constructor
coverage; frame-writer and panic-safe retirement protocols; durable recovery;
and whole-module independent precode review. A narrow inert type candidate can
be proposed separately with exact owned paths and acceptance, but cannot be
reported as the control root, full preparation or usable V1. No such candidate
is implemented by this document. Genuine Linux positive/unfinished-operation
proof, full native freeze, integration and selected packaging remain later,
separate gates.

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

The existing root-manifest v1 has no field for the current cached thermal list
or original source-type vector. The [private versioned layout record](root-layout-source-spec.md)
provides its required attestation home without widening v1. A recipe commitment
binds static predicates, not missing daemon-cache facts. The exact root capture
method and namespace/source-type correspondence remain positive-feasibility and
full-freeze gates; a newly enumerated host list or container mounts cannot
substitute for the actual named daemon cache.

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

Product recipe artifact inventory contains the normal action/preparation
adapter/probe and justified image dependencies only. The separate pressure
helper/driver, case selectors, test budgets and run inputs never enter the
product CompleteRecipe, profile, startup or preparation/action registry.
Pressure conformance remains independent proof required by the full freeze;
its evidence dependency creates no selectable product action or permission.

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
