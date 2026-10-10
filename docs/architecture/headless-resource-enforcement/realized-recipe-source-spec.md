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

## Stage-A original-budget and job binding contract

This controller-selected refinement follows the private control API and inert
identity candidate. [Project Status](../../PROJECT_STATUS.md#stage-a-original-budget-and-job-binding-contract)
owns implementation truth. It fixes association and cleanup semantics before
control source is added; it does not approve complete root storage, native
relocation, a budget implementation or the whole-module precode gate.

### One registration, shared opaque identity

The future anchored root retains its one `OperationIdentityAllocator` under the
actual authority mutex for its entire lifetime. At successful `try_begin`, issue
one identity, retain it in a private `Arc<OperationIdentity>` and register that
reference together with the original observation budget. The registered record,
non-Clone ticket and trusted native job envelope hold internal references to
that same issued identity. `Arc::clone` shares the existing object; it does not
issue another identity or require `OperationIdentity: Clone`. Identity comparison
still uses `same_operation` and the original budget uses `Arc::ptr_eq`.

Ticket and worker fields cannot borrow a mutex guard or a replaceable record.
They hold these private owned references, never store/lease custody. Retaining
them after cancellation keeps identity/budget allocations alive without making
either valid. Their constructors remain within the trusted boundary and obtain
references from the matching root registration, not from caller-supplied IDs or
budget values. No raw ordinal, address, digest or serialized deadline is an
association witness. Exact reference-count ceilings and Send/Sync/lifetime
proofs for all participating owners remain part of the storage precode gate;
the inert identity candidate's two trait checks do not establish them.

Before native visibility, allocation or registration failure closes admission
conservatively and preserves already held custody; it never refunds an issued
ordinal. Ordinary Rust allocation failure has no promised graceful recovery.
Identity exhaustion permanently quarantines the anchored root. No replacement
allocator, identity, root or budget is permitted for a pending or uncertain
operation. A later independently admitted operation needs verified whole-operation
retirement and admissible root/lane state, not a caller retry.

### Original observation budget remains one allocation

Reuse the existing private `ArtifactReadBudget` / `ArtifactBudgetState` semantics
through the separately reviewed trusted-boundary move; do not create a parallel
budget codec or copy mutable state into a new owner. Current definitions live
in `lnsatd`'s private artifact module and are not available to `lnsat-store`.
The future root owns one non-Clone budget owner and registers its existing
shared allocation before dispatch. Create it once before selected observation
construction/acquisition, using the earlier of observation start plus five
seconds and the enclosing uninterrupted preparation/startup deadline. Record
that absolute deadline once; every observational job uses it exactly, including
Procfs. Per-job admission cannot call `begin`, refresh five seconds or reset
manifest/byte accounting. This does not extend observation time to cover arbitrary
preparation work or replace other accepted preparation/startup limits.

Existing shared state contains an immutable deadline, checked all-content
counter, artifact/OCI counter, sticky invalid bit and one-use manifest claim.
Only the single original worker advances read counters. Preserve existing
purpose bounds: one root manifest at most 64 KiB, each OCI body at most 1 MiB,
each artifact snapshot at most 256 MiB, and 1 GiB aggregate artifact/OCI reads.
The all-content counter accounts successful actual content bytes with checked
arithmetic; it is not another 1 GiB cap. Metadata/ACL/Procfs calls require their
own existing finite call/object/body schedules under the same deadline; do not
charge their bytes against artifact/OCI allowance or treat that allowance as a
whole-worker heap, syscall or pressure bound. Complete combined call/byte/handle
schedules and bounded result storage remain blocking before worker integration.

Successful partial and late content returns charge actual returned bytes before
post-call acceptance/error handling. Invalidity never clears and no counter or
manifest claim refunds on Busy, cancellation or failure. Busy before registration
publishes nothing; once a one-use claim or token is assigned, failure follows
that candidate's sticky denial/cleanup rules. No blanket Busy retry undoes a
manifest claim. Stop, cancel, armed ticket drop, coordinator/worker unwind,
expiry and association uncertainty invalidate the registered allocation.

### Closed native association envelope

Future control dispatch uses one privately constructed envelope containing the
registered opaque operation reference, original budget reference, its exact
absolute observation deadline, assigned nonzero native job token and closed
request payload. Root-related payloads additionally retain the exact original
root-begin identity when assigned. Before dispatch, result take and observation
use, require operation equality, original budget allocation equality, exact
job token/kind, deadline equality and any assigned root-begin match. Optional
begin/job identities are allowed only in the producer's proven pre-dispatch
case; they are never matching wildcards. Admission/publication ordering and
actual authority mutex → nonwaiting native-slot lock order remain unchanged.

| Native job            | Current disconnected source                                                                                                                  | Required future root binding                                                                                                                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Procfs`              | Request carries held resource/proc-root references and a deadline; `Request::budget()` returns `None`                                        | Add the registered original budget and opaque operation association before publication; check sticky validity and exact deadline at fixed pre/post-call checkpoints and before consuming the bounded result. Existing descriptor/namespace comparisons remain mandatory. |
| `ArtifactRead`        | Request already carries shared artifact budget and exact deadline; native checkpoints and byte charging exist                                | Reuse that same allocation and checks; add the registered operation association and match token/kind before result use. Existing checks do not establish selected-store/root authority.                                                                                  |
| `RootManifestBegin`   | Shared budget, one-use manifest claim and retained begin/job identities exist                                                                | Register the same operation before publication; bind any returned begin identity to that registration. No second manifest claim or body reread under an old commitment.                                                                                                  |
| `RootManifestRecheck` | Requires retained begin, same budget/deadline and current held lease                                                                         | Add exact operation association; retain existing begin, budget, native custody and deadline checks. Successful recheck remains unverified observation data.                                                                                                              |
| `RootManifestRetire`  | Initiated while the original budget is live, then invalidates it; retirement receipt still requires original deadline and matching lease/job | Preserve this orderly candidate path. Its job receipt is not whole-operation acknowledgment, and it cannot be dispatched as expired-budget recovery.                                                                                                                     |

No public observer, injectable closure, `Any`, adapter constructor, borrowed
candidate assertion view, SQLite object, authority mutex guard or selected lease
crosses into a request. Finite payload/result/acknowledgment layouts, actual
producer placement and compiler proofs are still missing. The table does not
claim those shapes compile or that native requests currently carry operation IDs.

### Invalidated-operation cleanup is separate

Current `UnverifiedRootManifestCustody::try_retire` calls its live-budget
`check_basic` before preparing a retirement job; the job invalidates that same
budget but still uses its original deadline. Consequently late/cancelled cleanup
cannot be implemented by pretending this existing API accepts a dead budget.
The future whole-operation retirement producer observes original request/result/
lease disposal and accounts all retained and temporary descriptors under the
existing native hierarchy, after invalidation as well as before expiry. It
issues no new observational dispatch, budget, deadline extension or usable facts.
Physical disposal continues even when a receipt is ineligible. Expiry is an
acceptance cutoff, not evidence that I/O or close ended.

Polling cleanup is nonwaiting and does not require a valid observation budget.
It may return Pending indefinitely while native work or close is unfinished;
root custody and quarantine remain retained. A clean orderly root-retirement
receipt alone cannot supply `NativeCleanupAck`: queued request/result disposal,
root lease retirement, exact original identities and all native close outcomes
must also be established by the actual trusted producer. Unknown close, poison,
unwind, stale identity or missing accounting denies acknowledgment. Terminal
native timeout never rearms that lane, even after physical disposal completes.
Durable journal/probe cleanup and guarded effectful frame-write retirement
remain separate prerequisites; they cannot be inferred from native cleanup.

### Exact next precode and validation boundary

Before implementing control integration, freeze root/partial-owner field layouts
and fallible initialization storage, trusted native module moves/dependencies,
finite request/result/ack slots and all-writer/constructor routes. Provide actual
writable/VFS admission and close witnesses, effectful frame ownership, panic-safe
cleanup publication, durable recovery and complete entry/binding fields/pins.
The next bounded packet should define root/partial-owner storage against actual
selected store types, rather than introduce another inert budget implementation.
It must preserve already reviewed candidate source and obtain independent precode
review before adding authority code.

Its later source validators must cover: equal ordinals from different operation
domains; same-operation/wrong-budget and wrong-deadline substitution; wrong job
kind/token/begin; every Procfs pre/post-call and consumption checkpoint; no
per-job reset/refund; late actual-byte charging; manifest-claim publication
failure; cancellation/drop/unwind racing result publication; valid orderly
retirement versus expired cleanup; no-dispatch retirement; unfinished native
cleanup with retained store custody; stale/duplicate acknowledgment; permanent
lane/root quarantine and durable/probe/frame cleanup separation. Fixed native
producer tests cannot replace genuine Linux positive and unfinished-operation
evidence. Focused checks, full `npm run check` for meaningful source changes,
and fresh exact source/direct-child review remain mandatory. This documentation
adds no runtime, merge, support/certification, packaging or release authority.

## Stage-A anchored owner storage and borrowed access

This controller-selected ownership refinement follows the original-budget/job
contract. [Project Status](../../PROJECT_STATUS.md#stage-a-anchored-owner-storage-contract)
owns source truth. The following layout describes future private responsibilities,
not implemented Rust types, physical admission or complete module precode approval.

### One retained owner cell, without a self-borrow

Select one root-owned `SelectedOwnerCell` inside the same anchored
`Mutex<StoreAuthority>`. Its storage persists through Unadmitted, Admitting,
Ready, Closing, Closed and Quarantined dispositions. Change bookkeeping in place;
do not promote custody into a caller-owned wrapper, replace the cell, reconstruct
an ordinary store or move it to a worker. The existing allocator remains in
`StoreAuthority` for the root's entire lifetime. The static root anchor remains
established before custody I/O and is never taken or replaced.

Current `JournalCustody<'a>` embeds `SelectedPreparationParent<'a>`, which holds
`&'a mut SqliteStore`. It cannot be stored alongside the owned store it borrows
in this proposed root, nor kept alive while a second mutable store operation
runs. Select independently owned retained journal state plus short guarded
borrows for future integration. Do not use a self-referential struct, leaked
mutable reference, lifetime transmute, raw-pointer getter or `Pin` label as a
substitute for a compiler-valid ownership contract. Existing selected inspection
and journal candidates remain unchanged until exact private helper reuse is
independently reviewed.

The cell's responsibilities are fixed as follows. `Option` means acquisition
may not have returned an owner; it never proves absence of native effects or
successful closure. Field labels below are not approved constructors or witness
types. Their complete Rust layout and combined bound still require precode.

| Retained responsibility | Future storage and invariants                                                                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Selected binding        | One held independently confirmed owner/path binding; preserve B3B/B6 canonical UTF-8 selected-path bound of 4,096 bytes and exact derived names. Freeze derived-name/storage bounds before construction. No candidate declaration, filename-only mutex or installed UUID substitutes for physical selection. |
| Parent custody          | At most one original `File` owner returned for the selected parent, retained before subsequent fallible verification. Actual native ancestry/mount/ACL association remains mandatory.                                                                                                                        |
| Exclusive lease         | At most one original lease `File`, retained before SQLite open. It remains held through admission failure, quarantine, operation retirement and connection/VFS cleanup. Ordinary daemon lease is not selected custody.                                                                                       |
| SQLite connection       | At most one returned `Connection` owner, retained in the cell before later configuration/native/schema/integrity checks. No second connection, filename reopen, alias descriptor or ordinary-store conversion.                                                                                               |
| Credential scope        | One original `OwnerDecisionCredentialScopeV1` allocation for the selected connection lifetime. Initialize private inert scope before custody I/O; never replace it, copy a verified snapshot into another scope or authenticate row equality without exact connection binding.                               |
| Authentication fallback | Existing nonsecret dummy-verifier policy only, prepared before custody I/O; no password, verifier fetched from a user, session/CSRF secret or credential-intake buffer becomes long-lived root storage. Preserve zeroizing transient credential owners.                                                      |
| Journal custody         | At most one held preparation-root directory owner plus bounded name/owner/poison/baseline state, without a borrow of the cell or `SqliteStore`. Reuse existing root's 64-directory/64-revision/16-KiB-record/1-MiB bounds; exact aggregate baseline/name memory bounds remain required.                      |
| Operation               | The one registered original budget owner and shared opaque identity, optional actual begin/job association and finite disposition under the prior contract. Native request/result/root-lease storage remains in its reviewed hierarchy. Store custody never transfers with these references.                 |
| Cleanup bookkeeping     | Finite acquisition/close dispositions distinct from actual witnesses. Unknown effects or close outcome preserves quarantine and remaining owners; empty slots, Rust Drop, elapsed time and SQL success are not cleanup proof.                                                                                |

Do not assemble the cell into the current mandatory-field `SqliteStore` to reuse
methods. That would require transferring owners out of retained storage and
would still leave the journal borrow problem. Current public ordinary-store
constructors and read-only schema-17 inspection retain their existing behavior.
The selected headless path remains private, physically admitted and separately
schema-18 gated. This direction creates no public partial-storage API.

### Fixed borrowed access, with actual scope and connection

Future control-side helpers take short private views created only from a
matching Ready cell while the actual authority mutex guard remains held.
A selected view borrows the original connection, physical custody and original
credential scope from that cell; a journal access view additionally borrows
retained journal state. Neither view owns handles or contains another store
owner. Fields and constructors remain inside the trusted boundary, with no
Clone, Debug, serialization, public connection/descriptor getter, `Deref`,
callback or extensible SQL interface. The views must be compiler-proven
`!Send`/`!Sync`, cannot outlive their guard/cell, and cannot escape to a native
worker. No trait or compilation proof is supplied by this documentation.

Reuse the existing algorithms through exact private borrowed-interface changes,
not parallel validators. Bootstrap's lower checks already take `&Connection`;
that signature alone authenticates neither selected custody nor headless schema.
Selected-parent/journal helpers currently require the whole mutable store.
Credential prepare/recheck currently require `&SqliteStore`, and recheck compares
both the original scope allocation and the transaction's exact connection.
Future internal extraction must preserve both comparisons, row/version/profile/
verifier checks, unknown-user handling and zeroization. An arbitrary connection,
copied scope, identical credential rows or a read-only inspection is insufficient.

Password verification still occurs after its read transaction is explicitly
ended and before the later immediate authority transaction. Do not hold a SQL
transaction or selected/journal view across Argon2id. A bounded inert credential
snapshot may survive that computation; the later guarded selected transaction
rechecks the actual original scope and connection. Exact authority-mutex lifetime,
cancellation and snapshot retention during credential computation remain precode
items; this text does not grant a long-running mutex exception.

A transaction/statement borrows only the cell's original connection and stays
inside its fixed control operation. No transaction owner crosses into a ticket,
worker or journal field. Existing B2/C1 and schema predicates must be routed
through these views under the same mutex; public methods are not automatically
covered. Exact helper signatures, module visibility, ordinary/selected schema
routing and full writer/constructor inventory remain blocking before source.

### Partial admission and close obligations

The selected admission attempt first reserves the root's Admitting disposition.
Before each next fallible step, every actual returned parent/lease/connection/
journal owner must already occupy its designated anchored slot. Any failure or
unwind after custody I/O quarantines that attempt and retains available owners;
no local supervisor destructor, wrapper Drop, slot reset, automatic admission
retry or replacement connection may release them. A native constructor that
returns no owner can still have unknown effects; retain the lease and deny
reopen rather than claim a nonexistent returned connection remains open.

This is a required storage invariant, not an implemented acquisition protocol.
The exact source packet must show every native-return-to-slot handoff, all
fallible/allocating/unwinding boundaries and how bounded nonwaiting coordination
avoids waiting for a native observation worker under the authority mutex.
It must prove retained custody when acquisition itself is unfinished. This
refinement adds no exception to that rule or the separate retained release-frame
critical section. Missing native/VFS interfaces cannot be hidden by claiming
that an `Option<Connection>` or static anchor solves the I/O choreography.

Ready requires complete B6 physical/writable/VFS/schema admission, every required
owner present, exact native/current association and no poison or unknown effect.
It grants no installation, configuration approval or action authority. Admission
failure preserves quarantine even if no operation was dispatched. Installed
identifiers are still absent before bootstrap; no field fabricates them.

Before explicit close, admission is permanently shut, the operation/frame slots
are quiescent and native, durable and probe cleanup are separately verified.
Drop all statements and resolve transactions before the sole connection-close
attempt. Track CloseInProgress separately from an empty connection slot.
If `Connection::close` returns its owner on error, restore it directly into
anchored quarantine before any further fallible work. On unwind or an unknown
native close outcome, do not assert that the connection is held or closed;
retain remaining custody and deny reopen. SQLite success still requires the
actual pinned VFS/OS cleanup witness before journal/parent/lease release.
Explicit descriptor-close uncertainty never authorizes retrying a possibly reused
raw descriptor. Exact non-unwinding owner placement, close accounting and final
lease release remain unsolved implementation/precode gates.

### Next exact source boundary and validators

This closes retained-cell and transient-view direction only. The next bounded
packet must freeze the private helper/owner layouts and signatures against
actual source, allocation and I/O handoffs, partial-state/poison handling,
finite storage and trait/lifetime tests. Include pinned writable/VFS witnesses,
all-writer routes, actual native module placement/dependencies, frame ownership,
panic-safe cleanup publication, durable recovery and complete entry/binding
fields/pins before claiming whole-module precode. No cell/view implementation,
writable initializer or successful owner admission exists in this packet.

Later source tests must cover each returned-owner/fallible boundary, acquired
lease plus failed/unfinished open, admission unwind with retained owners,
forbidden self-borrow/view escape, guard and transaction lifetimes, unchanged
ordinary/read-only behavior, original-scope/wrong-connection substitution,
credential change during computation, journal poison/bounds, unknown slot/close
outcomes, returned connection on close error, no lease release before VFS/native/
durable/probe/frame cleanup, duplicate admission and permanent shutdown/poison.
Focused validation and full `npm run check` for meaningful source changes plus
fresh exact source/direct-child review remain required. Genuine Linux positive
and unfinished-operation proof, full native freeze, integration, packaging,
runtime, merge, support/certification and release remain separate closed gates.

## Stage-A guarded helper routing and lock-phase contract

This controller-selected refinement follows the accepted anchored ownership
and original-budget direction plus the implemented journal/C1 extraction
prerequisites. [Project Status](../../PROJECT_STATUS.md#stage-a-guarded-helper-routing-and-lock-phase-contract)
owns acceptance and implementation truth. It fixes helper provenance and phase
ordering before any authority-guard or writable-store source. It does not freeze
the complete owner layouts, native handoffs or whole module. The existing
no-native-operation/no-worker-wait rule under the actual authority mutex and the
separately retained release-frame critical section remain governing rules.

### Exact existing source and incompatible shortcuts

The inspected source checkpoint is the immutable C1 child
`8e030704dc3f3e40a6bcb791a508a40b3313d03b`. These are existing implementations,
not future selected-writable or Ready-cell interfaces:

| Existing source                                                    | Input and retained provenance                                                                                | Consequence for later guarded integration                                                                                                                                                                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `selected_store.rs`, `SelectedPreparationParent::borrow/verify`    | The original exclusive `&mut SqliteStore`; the actual selected custody owns held parent and lease files      | Calls `verify_selected_local_store_custody_v1`, including in-place native SQLite descriptor observation, metadata and current path/owner/lease rechecks. It is not a pure borrow constructor or a guard-only state check.                                     |
| `lib.rs`, `verify_selected_local_store_custody_v1`                 | The same actual connection and selected custody                                                              | Explicitly requires read-only MAIN_DB and matching connection path. It cannot admit B6 writable custody or be made to do so by relabeling its result.                                                                                                         |
| `headless_preparation_custody.rs`, `JournalCustody/JournalAccess`  | Legacy selected parent plus independently owned journal state; temporary access retains the original pairing | Open, inspect and append run synchronously in the caller. They perform native directory/file association, bounded reads, creation, writes, flushes and stable rescans. The extraction changes ownership, not execution phase or I/O provenance.               |
| `headless_bootstrap.rs`, `require_authority_empty_v1(&Connection)` | The supplied actual connection, possibly borrowed through an existing transaction                            | Reuses exact schema-17 digest/seed/namespace/integrity/empty-table algorithms; a connection argument does not prove selected custody or private schema-18 eligibility. The public inspection marker is unbound and stale, never Ready or bootstrap authority. |
| `owner_decision_credential.rs`, capture/compute/recheck            | Actual store connection, original credential scope and actual store fallback; captured rows are owned        | Capture releases its successful read transaction; compute takes no SQL owner; recheck compares original scope and exact transaction connection. These helpers still require the whole actual store at capture/recheck and do not construct a Ready view.      |

Current native jobs remain the closed `Procfs`, `ArtifactRead`,
`RootManifestBegin`, `RootManifestRecheck` and `RootManifestRetire` vocabulary.
No existing bridge routes preparation-journal I/O through that lane. Passing a
`JournalAccess`, connection, store, guard or borrowed selected parent to its
worker is prohibited. A filesystem association or `sqlite_filestat` observation
is native evidence even when its implementation is reached through a Rust
helper or SQLite query; SQL syntax does not remove that classification.

Consequently, do not wrap the current parent verifier or journal open/inspect/
append in an authority guard and call that integration complete. That would
introduce native observation or filesystem I/O in the forbidden critical phase.
Do not omit those checks, move a SQLite owner to the worker, add a second
connection/descriptor alias, replace actual observations with cached declarations,
or silently add a journal job to the closed lane. No mutex exception or native
job expansion is accepted by this refinement. Exact journal/native/VFS owner
placement, execution phases and return-to-retained-slot choreography remain
blocking before those helpers can become guarded selected interfaces.

### Guarded entry surface and lifetime requirements

Only the future anchored root's private path may acquire its actual authority
mutex and construct a selected access. A wrapper around a caller's mutex,
arbitrary `Connection`, ordinary store or inspection marker is insufficient.
The constructor must borrow the actual guard mutably for the full access
lifetime and project only that root's retained cell. Its guarded work is limited
to the fixed retained-state/SQL projections; it must not invoke the current
native parent verifier or perform filesystem association work. Ready bookkeeping
alone is not admission proof. Complete B6 physical/writable/VFS/schema and
current-association checks remain mandatory, with every required owner present
and no poison, shutdown, unfinished acquisition or uncertain close. Their
compatible acquisition/freshness/handoff protocol is not yet frozen: no selected
access constructor or protected writer may be implemented by substituting stale
cached observations, skipping a predicate or running native work under the guard.
Missing witnesses or that protocol deny integration.

The future fixed access vocabulary is limited to credential capture, exact
transactional credential recheck, the applicable complete schema/eligibility
check, and the individually reviewed bootstrap/control operation. It exposes no
connection, raw descriptor, transaction factory, generic SQL, `Deref`, callback
or observer injection. Transactions and statements stay inside their fixed
operation and borrow only the original connection. An access cannot escape to
a ticket, journal field, result, SDK or worker, or survive release of its guard.

Compiler tests must prove guard-to-access lifetime, no overlapping mutable
projection, no use after guard/cell drop, and no Send, Sync, Clone, Debug,
Serialize or Deref escape. Exact field and constructor review separately proves
actual-root provenance and retained owners; lifetime/trait assertions alone do
not authenticate the mutex. Long-lived root storage has separate Send/static
requirements for its anchor and mutex, which cannot be inferred from non-Send
transient views. No such types or compiler proofs are implemented here.

Retain the ordinary schema-17 wrappers and all existing public signatures,
error order and selected read-only behavior. The future selected schema-18
route needs its own private source-selected dispatcher and exact B5 manifest,
seeds, integrity and eligibility validation; it must not reuse the schema-17
marker, bypass `verify_schema`, raise the global version or let a request choose
its mode. Reuse validation algorithms through exact privately reviewed helper
changes; do not duplicate validators or construct an ordinary `SqliteStore`
from moved root owners to satisfy a legacy receiver type.

### Credential capture, unlocked computation, fresh guarded recheck

The later control-side credential operation must use these distinct phases:

1. Under the actual authority guard, require admissible selected/root state and
   matching original operation identity/budget where registered. Create only
   the fixed selected credential access. Preserve C1's autocommit-first rejection,
   actual-store fallback behavior and selection error families. On successful
   capture, explicitly end the read transaction and all statements/access views.
   Record the bounded transient credential-computation disposition before
   releasing the guard; a captured value is not approval or a portable permit.
2. Release the actual authority guard before Argon2id. The caller retains only
   the owned non-Send capture plus its existing bounded private operation
   association, never a selected/journal view, transaction or SQL owner. Run
   existing computation on the control-side caller; do not send a password,
   capture or verified snapshot into the native observation worker. This adds no
   credential intake or long-lived PHC root field.
3. Cancellation, stop, expiry, coordinator failure or root quarantine must not
   become a successful credential result. Reacquire only the same anchored
   authority mutex and match the same original registration/budget and disposition.
   Use the original absolute deadline and sticky invalidation; do not reset a
   budget or create a replacement operation to accept late computation. Failure
   to reacquire yields no approval or mutation. Any cleanup/retirement bookkeeping
   must still account for the original transient computation and PHC disposal.
4. The native/VFS selected-custody freshness protocol at this lock gap is an
   explicit unsolved integration gate. It must establish current physical
   association after unlocked computation and before the protected write without
   native work under the guard, SQLite/descriptor aliasing, borrowed-owner escape
   or stale cached-proof substitution. No compatible source protocol or witness
   currently supplies that step. Do not implement a selected writer from this
   phase list until the exact acquisition/observation/retention/validation handoff
   has been separately frozen and independently reviewed. Once that gate is
   satisfied, the fresh guarded access may perform only the fixed selected SQL
   schema/current-installation checks and C1's original-scope/exact-transaction-
   connection/current-row/fingerprint recheck in the selected immediate operation.
   This does not permit calling the current native parent/custody verifier there.
   Repeat applicable authenticated session/CSRF, policy, nonce, generation/epoch/
   stop and exact-change predicates. Password success or unchanged rows in another
   connection never replace them. First empty-store bootstrap retains distinct
   accepted host-owner proof; do not invent a pre-existing C1 owner for it.
5. End statements/transaction/access before releasing the guard, retaining the
   exact separately accepted release-frame exception when that operation applies.
   Commit uncertainty follows the existing durable reconciliation contract;
   password success or disposal is neither native cleanup nor a release witness.

An ordinary synchronous Argon2id call is not forcibly interrupted by these
bookkeeping rules. Expiry is an acceptance cutoff, not proof that computation
or zeroization has finished. The fixed registered transient state and actual
completion/disposal path need exact finite layout, panic/unwind behavior and
compiler/source review before source integration. Native cleanup acknowledgments
cannot certify control-side credential disposal. No callback, destructor-only
cleanup certificate or five-second computation/close guarantee follows.

### Retained admission and source precode gates

Acquire/return-to-slot remains a separate protocol: lease before open, every
returned physical owner retained before the next fallible check, unknown or
unfinished acquisition preserved, and returned connection on close error placed
back into quarantine before further fallible work. A borrowed helper projection
cannot perform or prove those transfers. No native wait under the authority
mutex, replacement owner, automatic retry, Drop-driven release or empty-slot
cleanup inference is permitted. SQLite success alone is not the pinned VFS/OS
close witness. The original release-frame critical section is not general
permission for other native or journal I/O under the guard.

This closes the route inventory, phase classification and credential lock-gap
requirements only. It deliberately does not claim exact concrete guard/cell/
writable-parent layouts or a complete source freeze. Before authority source,
provide those layouts/constructors, journal/native/VFS execution and retained
handoffs, finite combined storage and PHC retention, all-writer/constructor
routing, private schema dispatch, acquisition/close witnesses, frame ownership,
panic-safe retirement and durable recovery, then fresh whole-module precode.

Later tests must exercise ordinary/read-only compatibility; forged guard/root
or arbitrary connection denial; actual guard/view/transaction lifetime and trait
boundaries; stop/revocation/rotation/recovery racing unlocked computation;
late computation, failed reacquisition and disposal uncertainty; exact original
scope/connection recheck; no unknown-user fallback for corrupt credentials;
no journal/native observation inside the authority guard; original native lane
job vocabulary; and each unfinished/returned-owner/close-failure handoff.
Named focused checks, strict lint/format, full `npm run check` for meaningful
source changes, and fresh source/direct-child reviews remain required. This
documentation packet uses proportional docs/public/inventory/history/format/diff
checks. Genuine Linux positive/unfinished-operation evidence, full native freeze,
standalone CLI/API/SDK integration, packaging, merge, runtime, support/certification
and release remain separate unfinished gates. LNSAT stays neutral and standalone.

## Stage-A credential capture/compute/recheck contract

This bounded contract follows the accepted Stage-A source order and the anchored
owner direction above. [Project Status](../../PROJECT_STATUS.md#stage-a-credential-capturecomputerecheck-contract)
owns its implementation truth. It freezes an inert prerequisite in the existing
`owner_decision_credential` component, not a selected Ready view, root guard,
credential-intake path or complete control/native module precode. No Rust source
is changed by this contract.

### Exact component boundary

The later candidate owns only
`crates/lnsat-store/src/owner_decision_credential.rs` and its existing
`crates/lnsat-store/src/tests/owner_decision_credential.rs`. Keep the current
public store methods, schema 17, authentication primitives, SQL selectors,
credential-row validator, fingerprint domain and error families unchanged.
Do not move or duplicate those validators or change password/profile policy.

Add one opaque `pub(super) CapturedCurrentOwnerCredentialV1` with private fields:
one private material enum and zero-sized `PhantomData<Rc<()>>`. Its closed
material alternatives are:

- `Unknown`: one owned `String` copied from that actual store's existing
  nonsecret `authentication_dummy_verifier` for every existing dummy-verifier
  branch: a syntactically invalid reference, or a successful current-row selection
  returning `None` for an absent or validator-accepted inactive identity. The
  valid-reference branches end their read transaction before returning capture.
  Do not substitute the global constant, validate it early, or accept a caller's
  fallback. Production already initializes that policy; malformed fixture
  fallback behavior must still follow the existing password verifier's order.
  Selection errors keep their existing error and never become Unknown.
  Empty/malformed credentials and unsupported disabled-owner evidence retain
  `EvidenceDrift`.
- `Known`: the original scope `Arc<()>`, one existing owned
  `LocalIdentityRecordV1` and one existing `StoredLocalPasswordCredentialRow`.
  Clone only the original scope reference; move the identity/row without
  cloning its `Zeroizing<String>` PHC. Never allocate a replacement scope.

The material enum, fields and construction stay private to this component.
There is no lifetime parameter, store/connection/transaction/statement/view
reference, raw pointer, password, session/CSRF secret, getter, public constructor
or decoder. Do not add Clone, Debug, Serialize, Deref, callbacks or a worker
interface. Compiler checks must establish the captured type is `'static` and
neither Send nor Sync; exact field review separately establishes ownership and
the absence of raw or borrowed handles. A static bound alone proves neither
ownership nor memory zeroization.

The capture temporarily owns an existing PHC only until computation or drop.
The existing `Zeroizing<String>` owner remains responsible on success, mismatch,
error and unwind. The verified snapshot retains only existing row metadata and
fingerprint, never that PHC or the password. This contract adds no verifier-size,
row-allocation, aggregate root-storage or cancellation-retention bound; those
remain separate precode work. Do not call the existing row/profile validator a
complete allocation-budget proof.

The exact proposed internal signatures are:

```rust
pub(super) fn capture_current_owner_credential_v1(
    store: &SqliteStore,
    identity_ref: &str,
) -> Result<CapturedCurrentOwnerCredentialV1, LocalIdentityStoreErrorV1>;

pub(super) fn compute_current_owner_credential_v1(
    captured: CapturedCurrentOwnerCredentialV1,
    password: &str,
) -> Result<Option<VerifiedCurrentOwnerCredentialV1>, LocalIdentityStoreErrorV1>;
```

Keep `prepare_current_owner_credential_v1(&SqliteStore, &str, &str)` as the
existing compatibility wrapper: capture, then consume that value in compute.
Its signature, callers and returned private snapshot remain unchanged. Capture
takes no password; compute takes no store, selected/journal view, connection,
transaction or caller-supplied verified evidence. These signatures are a
contract, not a compilation claim.

### Preserved order and failure semantics

1. Capture first rejects any active caller transaction, including deferred,
   with `AuthorizationRejected`, before identity or password work. An invalid
   identity produces Unknown without adding a schema read. A syntactically valid
   identity follows the same schema verification, original-connection read
   transaction, existing active-row selection and complete credential validation.
2. A successful row read must explicitly roll back its transaction before
   returning either Unknown or Known. A selection error returns its existing
   error and follows existing transaction-drop behavior; it must not reach
   compute or claim an explicit successful rollback. A successful `None`
   selection maps to Unknown with the actual-store fallback after rollback;
   a selected active identity with an empty or malformed credential set remains
   `EvidenceDrift`, never Unknown. Rollback failure remains
   `PersistenceFailed` and returns no captured value. No SQL write is introduced.
3. Compute consumes Unknown by calling the existing `verify_local_password_v1`
   on its captured fallback, maps verifier failure to `EvidenceDrift`, ignores
   the match boolean and returns `None`. Invalid password input remains a normal
   mismatch before verifier validation, exactly as the existing primitive does.
4. Compute consumes Known through the existing verifier and error mapping.
   Preserve password verification before the Owner-role check; a valid non-owner
   still yields no owner snapshot. Only a verified Owner produces the current
   snapshot, moving the captured original scope and metadata and using the
   unchanged verifier fingerprint. Moving scope capture before computation
   supplies provenance only, not authority.
5. Preserve `recheck_current_owner_credential_v1(&SqliteStore, &Transaction<'_>,
&VerifiedCurrentOwnerCredentialV1)` and its algorithm unchanged: original
   scope allocation equality, the transaction's exact connection equality with
   the actual receiver, non-autocommit, current identity/Owner status, credential
   ID/version/profile/creation and constant-time fingerprint comparison.
   Do not record a store or connection address in the captured snapshot: moving
   the same store must still work, while another instance or reopen must deny.

The legacy public owner-verification wrapper still creates its later read
transaction, verifies schema, rechecks and rolls back, mapping authorization
rejection to generic `Rejected`. Generic credential verification, session
issuance, rotation and offline recovery are not refactored by this candidate.
No verified password result becomes approval, human presence or an action permit.

### Future control integration remains blocking

Capture and recheck still require the actual whole `SqliteStore`. This candidate
does not let a partial anchored cell assemble that store, transfer its physical
owners, or authenticate an arbitrary connection. Future Ready-cell extraction
must freeze original connection/scope/schema/custody views with actual guard
lifetimes before changing these signatures again.

A selected/journal view and SQL transaction must end before Argon2id. The new
owned capture makes a later split possible; the ordinary compatibility wrapper
still borrows its store for the whole call and is not proof of a selected-root
lock lifetime. Exact authority-mutex ownership, original operation budget,
deadline/cancellation checkpoints, captured-PHC disposal, concurrent revocation
and mandatory recheck before any later protected transaction remain unresolved
control integration. Do not move capture or credential computation into the
native worker, invent a long-running mutex exception, or treat this split as a
whole-operation deadline or cleanup proof.

### Exact later source acceptance

Fresh independent exact component precode review precedes implementation. Keep
all eleven existing focused C1 cases and their actual scope/connection, mutation,
role, recovery, profile and fingerprint denials. Add focused cases for successful
capture restoring autocommit before compute; capture producing no writes/session
activity; capture/compute followed by wrong-store and wrong-connection rejection;
credential rotation/recovery/substitution between capture and compute followed
by denial at recheck; original scope surviving a store move but denying reopen;
and malformed captured fallback preserving bounded versus invalid-password
error ordering for invalid references and valid absent/validator-accepted
inactive non-owner identities, including successful rollback for valid lookups.
Preserve disabled-owner/empty/malformed evidence as `EvidenceDrift` rather than
adding a dummy-verifier fallback. Compile-time checks and field review cover owned lifetime,
non-copying, non-printing, non-serialization, non-dereference and thread bounds.
Do not add callbacks or fake Argon results merely to instrument order. Source
inspection and ownership checks establish the compute signature carries no SQL
owner; ordinary tests do not independently prove memory zeroization.

The later two-file candidate requires focused C1 tests, strict Rust format/lint,
full `npm run check`, public/docs/inventory/history/diff gates and fresh exact
source/direct-child review. This documentation contract uses proportional docs
validation. Selected writable admission, root/storage/native handoffs, VFS/close
witnesses, complete module precode/native freeze, genuine Linux evidence,
bootstrap/control/CLI/API/SDK integration and packaging remain unfinished.
Project Status owns source truth; Phase 11 owns runtime proof. No runtime,
merge, support/certification or release gate opens.

## Stage-A private operation identity candidate

This narrow inert prerequisite follows the independently reviewed private control
API direction above. [Project Status](../../PROJECT_STATUS.md#stage-a-private-operation-identity-source-candidate)
owns its source evidence. The private `lnsat-store` module
`headless_operation_identity` provides only process-local identity bookkeeping;
it has no product caller, physical store owner, native observer, budget, permit,
dispatch, cancellation, acknowledgment producer or retirement method.

Each `OperationIdentityAllocator` owns one fresh `Arc<IdentityDomain>` allocation
and one `Option<NonZeroU64>` next ordinal. `new` starts at one and accepts no seed.
`issue(&mut self)` checks the successor before returning an opaque identity;
`u64::MAX - 1` is the final issuable ordinal. `u64::MAX` is reserved as the
exhaustion boundary, never issued; overflow changes the allocator to permanent
`None` exhaustion and returns the fixed `IdentityExhausted` error. No reset,
refill, wrap or same-domain ordinal reuse is exposed.

`OperationIdentity` retains a strong reference to its domain plus the ordinal.
`same_operation` requires `Arc::ptr_eq` for the domain and equal ordinals.
Equal ordinals from different live allocator domains cannot match. A retained
identity keeps its allocation alive across allocator drop, preventing pointer
reuse while that identity exists. The allocator and identity have no Clone,
Debug, serialization, raw number/pointer getter, decoder, callback or public
constructor. Types and methods are `pub(super)` inside a private module;
there is no cross-crate export. These finite layouts contain no unbounded
collection, credential, path, resource owner, validity flag or deadline. Shared
domain references do not create or reset an observation budget.

Six host tests cover self-match and monotonic issuance, equal-ordinal domain
separation, retained-identity/new-domain separation after allocator drop,
last issuance and sticky exhaustion, already-exhausted denial, and compile-time
Send/Sync bounds for only these two inert types. Near-boundary seed access is
confined to module tests. Host trait checks do not prove control-root/store/job
traits or Linux native behavior. Rust's usual allocation failure semantics apply;
no bounded or graceful allocation guarantee is claimed.

Allocator allocation provenance is not actual root/store/native provenance.
Future control integration must hold exactly one allocator under its anchored
authority mutex, never replace it, and permanently quarantine the root on
exhaustion. Identity equality alone cannot admit an operation, bind the original
budget or validate a cleanup acknowledgment. All actual owner/budget/root-begin/
job/native cleanup and durable/probe predicates remain required. This candidate
closes only identity representation and issuance; full control types, trusted
module placement, writable/VFS witnesses, finite request/result/ack storage,
all-writer coverage, pins, complete precode/freeze and integration remain open.

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

## Stage-A selected-store phase feasibility

This is a feasibility record under the existing Stage-A source order, not a
selected ownership amendment or an executable source contract.
[Project Status](../../PROJECT_STATUS.md#stage-a-selected-store-phase-feasibility)
owns current implementation truth and decision state. The guarded-helper rules
above remain binding, including no native observation or worker wait under the
actual authority mutex, no selected view/transaction surviving its guard, and
no SQL owner, borrowed parent or guard crossing the existing native worker.
No mutex exception, second executor or sixth native job is accepted here.

### Exact source evidence and incompatible requirements

The inspected base is the guarded-helper contract child
`dae00c9f44005bf339c236ef98befb2a958f9a59`. Its documentation constrains future
integration; the following implementation facts do not establish that integration:

- `selected_store.rs` retains original parent and lease files and selected path,
  owner and device/inode identities. `verify_connection` calls the actual
  connection's `sqlite_filestat('main')`, observes its borrowed descriptor in
  place with `fstat`, and repeats current filesystem/lease association checks.
  The descriptor/VFS observations are transient; retained fields contain no
  current native/VFS witness that can replace those calls. The current selected
  connection and parent verifier require read-only MAIN_DB.
- `headless_preparation_custody.rs` retains an actual selected-parent borrow and
  owned journal state. Its native open, inspect, append and flush work executes
  synchronously in the caller. The journal owner/view extraction does not supply
  an executor, selected-writable parent or asynchronous custody bridge.
- `headless_native_root_bootstrap.rs` retains its own directory/manifest owners
  in the existing native lane. Root-manifest recheck re-observes those owners,
  not SQLite's original MAIN_DB or journal state. Root facts and cleanup results
  cannot certify selected-store/VFS or preparation-journal cleanup.
- `owner_decision_credential.rs` supplies the implemented non-Send owned C1
  capture and original-scope/exact-transaction-connection recheck. It supplies
  neither a control executor nor a native freshness protocol after computation.

[B6](../headless-local-bootstrap/selected-write-source-spec.md) requires actual
selected-writable/VFS custody checks after immediate transaction acquisition and
before commit, as well as other acquisition/reconciliation/close boundaries.
Its proposed writable contract has not been implemented. A guard-only SQL
projection cannot perform those native checks, and ending the guard to call a
native observer cannot preserve a transaction under the current guard lifetime.
A stale cached observation, another connection, duplicated/reopened descriptor,
or a manifest recheck does not resolve this conflict. SQLite's authorized
transaction/coordination I/O remains distinct from explicit native custody
observation; this record does not forbid ordinary SQLite transaction I/O.

### Options and decision state

| Option                                                                         | Assessment against current requirements                                                                                                                                                                                     | Decision state                                                                                   |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Cached native facts followed by guarded SQL                                    | No current physical/VFS freshness or continuous owner-phase witness; B6 post-acquisition and pre-commit observations are still missing.                                                                                     | Rejected as a completion shortcut.                                                               |
| Existing root-manifest job or extra SQLite handle                              | Existing jobs observe different original owners; aliases/another connection do not prove the original connection and may disturb POSIX lock custody.                                                                        | Rejected as a completion shortcut; no job expansion.                                             |
| Separate custody mutex with transaction spanning authority unlock              | Would change owner placement, lock order and selected-view/transaction lifetime. It still needs an exact executor, current witness and all-writer protocol; a second mutex alone does not provide them.                     | Unselected architecture candidate; incompatible with current contract unless explicitly amended. |
| Dedicated retained control actor/context for fixed selected-store observations | May offer a place for original-connection observations, but is a new executor and ownership decision. It must establish construction, retention, writer routing, stop races and cleanup before any claimed mutex exception. | Unselected architecture candidate; no feasibility PASS or source authorization.                  |

The first bounded design candidate should cover only fixed read-only
selected-store custody observations using the original connection and retained
owners. This is a design recommendation, not a new read-only implementation or
proof that it solves the later writable transaction phase. Preparation-journal
creation, append, flush and mutation are excluded from that first candidate.
Their later phase requires its own original-owner retention, effect disposition,
pre/post budget checks, close witness and durable reconciliation. B6's journal
`bound` transition still follows exact committed SQL/audit readback; later
journal failure quarantines rather than rewriting a successful SQL commit.

### Required decision and precode packet

Before selecting either architecture candidate, provide one exact source design
that names the actual root, executor, mutex and connection owners; construction
and failure retention before first custody I/O; fixed request/result layouts and
finite retained slots; all constructors and invalidating writers; lock order;
and acquisition, observation, result acceptance, retirement and close owners.
A generic blocking pool, detached task, renamed control-side caller or timeout
is not a retained-custody proof. The existing native observer lane's ownership
and terminal no-rearm rules cannot silently be inherited by a second executor.
Any actor-owned root, second executor, changed guarded-view lifetime or native
mutex exception requires an explicit amendment and independent review before
source implementation. Exact writable MAIN_DB/coordination-file/VFS lifecycle,
mount/ACL association and native close witnesses remain separate blockers.

Keep cancellation and durable stop distinct. Out-of-lock invalidation of the
original budget closes result acceptance/admission only; it does not commit a
durable stop or prove that issued work did not execute. While native work retains
the required control context, durable stop can remain Busy/Pending. Freeze exact
pre-transaction, pre-commit and later journal-write fences, the commit-issued
linearization point, and the owner of uncertain completion/readback. Cancellation
after a write/commit is issued cannot certify rollback. Late or uncertain
completion retains quarantine and the original association; no replacement
operation, fresh deadline or automatic retry may accept it.

C1 capture and computation must stay on the same explicitly retained control
context without relaxing the capture's non-Send contract. Capture ends all SQL
and selected views and releases the authority guard before Argon2id. Freeze
bounded computation/disposal state, scheduling, panic/unwind disposition and
original-scope/connection re-entry before integration. Credential completion is
not native cleanup. A stuck native call may retain its mutex/owners indefinitely;
expiry is an acceptance cutoff, not a bounded return or release guarantee.

Fresh independent review must assess the exact proposed amendment against the
current contract and B6/C1 requirements before an owner decision. Later compiler
and focused conformance tests must prove the selected layout, actual guard/view
lifetimes, original-owner provenance, race dispositions and independent cleanup
witnesses. Documentation review and existing source fixtures supply none of that
native execution evidence. Full native freeze, whole-module source integration,
genuine Linux proof and Phase11 runtime authority remain closed.

## Stage-A read-only control observer proposal

Canonical authority: [Project Status](../../PROJECT_STATUS.md#stage-a-read-only-control-observer-proposal),
under the accepted Stage-A source order and the preceding selected-store phase
feasibility checkpoint. The inspected base is
`1b26e08440551debfacdd3adc0030ed50bfbbd95`. PHR-0088 tracks this documentation
slice's exact source/direct-child validation and independent review.

At PHR-0088 this was one recommended **PROPOSED** architecture amendment,
pending explicit acceptance and exact source precode. The human owner accepted
its narrow observer amendment on October 9, 2026; the [current component precode](#stage-a-read-only-observer-rust-precode)
and Project Status record that acceptance and remaining gates. This historical
proposal does not authorize implementation. Guard-bound lifetimes still bind;
only the fixed original-read-only-connection observation/required cleanup has
the accepted native-under-guard exception. No root, observer, private bridge,
owner admission or Rust/schema/API/native/runtime behavior is implemented here.

The exact implementation evidence is
[`selected_store.rs`](../../../crates/lnsat-store/src/selected_store.rs),
[`lib.rs`](../../../crates/lnsat-store/src/lib.rs),
[`headless_operation_identity.rs`](../../../crates/lnsat-store/src/headless_operation_identity.rs),
and the existing daemon artifact budget/native lane. The selected store retains
the original connection, parent and lease; its descriptor observations are
transient. Its current native producer applies the temporary SQLite length limit
before producing `FILESTAT` JSON and restores the original limit on ordinary returned Result paths; it does not
prove restoration on panic/unwind. Operation identity is private to `lnsat-store`, while the artifact
budget and native lane are private to `lnsatd`. No private cross-crate bridge or
complete shared call/handle accounting currently exists.

## Scope and explicit amendments

Recommend one separately retained read-only control observer, in addition to existing single native observer. Total proposed dedicated contexts: one control observer + one native observer; never represent both as current one-worker containment. Both retain independent construction/retirement records and never share cleanup certificates. No general blocking pool or replacement thread.

Propose one narrow exception to no-native-under-authority-guard: only fixed original-connection read-only selected-store custody observation on this control observer. Root authority mutex remains actual physical-owner mutex; selected/SQL views still cannot outlive guard; original SQLite/parent/lease owners remain in anchored cell. No owner moves to either worker. Existing native observer receives no SQL/view/guard. Coordinator still performs no native observation or worker wait while holding guard.

Propose distinct cell purpose ObservationOnly (schema17, actual MAIN_DB read-only), never Ready/writable schema18 admission. This purpose can be established only by separately reviewed original-owner acquisition/retention protocol; existing mandatory-field SqliteStore constructor cannot install it. No caller-selected mode, ordinary-store adoption, read-only-to-writable upgrade, implicit migration/reopen or second root. First component has no product caller. No C1 capture/compute, credential intake, journal operation, authorized writer, release frame or durable stop mutation is included. These exclusions mean this component does NOT solve B6 pre-commit custody, all-writer integration or full native freeze.

### Owner/storage topology

1. Existing one process-lifetime `OnceLock` root, established inert before custody I/O. Its actual `Mutex<StoreAuthority>` retains existing allocator, SelectedOwnerCell and original registered operation/budget. No root replacement/take/deallocation. Physical cell contains original optional returned connection, parent and lease owners, binding/identity data, original credential scope and existing bounded journal-owner state. Observing never transfers or reconstructs them into SqliteStore.
2. Separate process-lifetime OnceLock control-observer header exists before thread creation. Fixed header retains root reference, atomic closed/start flags, one `Mutex<Mailbox>`, and one retained JoinHandle slot. Constructor obtains mailbox construction guard outside authority mutex, reserves construction once, spawns one fixed thread behind closed start barrier, moves returned JoinHandle immediately into retained slot before fallible work, then enables start. Failure/poison/unwind never rearms construction; no custody I/O until retained-handle/start publication is proven. Exact spawn-return/unwind proof remains precode gate.
3. Mailbox owns exactly one request slot and one completion slot. Request has only private shared original OperationIdentity reference, same original ArtifactBudgetState allocation reference and fixed ReadOnlyStoreObservation tag; no paths/strings/SQL/password/PHC/handles/callbacks. Completion holds same association references and fixed ObservedReadOnlySequence/Denied/Quarantined enum plus private entered-cleanup or unentered-frame disposition. No native facts, fd, serialized witness or approval result.
4. One finite mailbox lifecycle records Vacant, Reserved, Published, Retiring/Published, InFrame, CompletionPending, Retiring/NoDispatch, Retiring/InFrame, Quarantined and consumed Retired. Transferring a request atomically installs matching InFrame marker before request leaves slot; empty request/result fields never mean Vacant. Worker frame holds at most one transferred request and one unpublished completion. Association markers contain only same shared private operation/budget references and fixed tag. No queue or new admission while any reserved, frame, completion or retirement state exists. Root registered disposition remains authoritative; mailbox markers track real ownership, not authority.
5. Use fixed thread stack reservation 2 MiB and fixed-size request/result fields. SQLite/stdlib producer scratch, TLS/guard pages and aggregate process memory are not certified by that number. FILESTAT result uses existing temporary `SQLITE_LIMIT_LENGTH` of 4096 and parser bounds, with mandatory restoration even on error. Exact native/library allocation/stack and combined owner/payload bounds remain source-precode blockers, not a hard RSS or return-time claim.

### Registration, publication and lock order

Only actual root-private entry can register observation. Use existing monotonic allocator and one original budget allocation; no child `ArtifactReadBudget::begin`, raw-ID import, replacement deadline, or per-observer budget. Under authority try_lock: require ObservationOnly purpose, all original retained owners, eligible nonpoisoned/nonclosing root, original association and live budget, no active native job/unfinished control frame; reserve root operation and mailbox through nonblocking try_lock in authority->mailbox order. No native calls at this entry.

Publication has two guarded phases. Reservation stores complete immutable request and root association as Reserved under authority then mailbox; both guards end without visibility to worker. Actual publication reacquires authority then nonblocking mailbox and checks same root registration, operation reference, original budget allocation, fixed tag, Reserved state and live budget in that same transition before Reserved -> Published. Wake occurs only after both guards end. Failed reacquisition cancels original budget and retains reservation for retirement; no publication retry, queue, replacement request or budget. A supervisor must acquire authority then mailbox and seal exact Reserved -> Retiring/NoDispatch before creating private sealed-no-dispatch proof. A later stale publisher cannot match sealed state or a later operation, so cannot publish. Cancellation racing successful publication invalidates acceptance immediately; Published is never reclassified as no-dispatch. Cancellation of worker-visible Published changes it to Retiring/Published, never Retiring/NoDispatch. The worker must drain this exact visible request even after admission closes; invalid budget permits only its bounded unentered/cleanup disposition, never a new observation. Published/Retiring/Published ownership cannot be cleared by a supervisor or admission-close flag.

Worker atomically changes matching Published -> InFrame or Retiring/Published -> Retiring/InFrame under mailbox guard before transferring request to its frame, then releases mailbox before any authority access. The retirement bit and exact association remain visible throughout transfer. Supervisor observes InFrame even when request/result fields are empty and cannot claim no dispatch or clear slot. Cancellation changes matching occupied state to Retiring/InFrame without hiding outstanding worker ownership. If already retiring or invalid before guard entry, worker performs no authority acquisition, projection, native call, statement or SQLite limit change. Otherwise it uses nonblocking authority try_lock; contention produces fixed Busy denial with the same unentered disposition, no replacement request or retry. Only this actual worker may create a private non-Clone/nonserializable ControlFrameUnenteredAck after proving its frame never acquired authority guard and never created projection/native/statement/limit obligations. Ack binds the original root registration, operation/budget/tag and explicit never-entered phase. If guard was acquired even once, this ack is forbidden and the guarded cleanup path must account for that frame, including unchanged limit/no statements where applicable. Unknown entry, worker panic or lost completion quarantines and cannot synthesize either ack. All future mutex-taking producers keep authority->mailbox ordering; worker never takes authority while mailbox held. Worker performs no wait on existing native lane. Atomic budget invalidation and admission closure never need either mutex.

### Fixed observation and acceptance

Under original authority guard worker rechecks exact root/operation/budget/purpose/retained-owner association and unchanged original connection scope. Only then constructs private non-Send guarded read-only observation projection. Reuse current selected_store native algorithms through separately reviewed field-projection extraction, preserving exact owner/path/lease and original `FILESTAT`/`fstat` rules; no arbitrary Connection, borrowed-parent wrapper or descriptor alias.

Execute current fixed sequence: current parent/database/lease association; native MAIN_DB FILESTAT and in-place fstat; association; second `FILESTAT`/`fstat`; descriptor equality; final association; exact original connection path and actual is_readonly predicate. Current function/module/source-ID/DEBUG/unix checks and 4096-byte producer/parse limit remain mandatory. Pre/post original-budget checkpoints apply to every fixed custody primitive, including failed calls, and post-call accounting occurs before propagating error. No success accepted after invalidation/absolute cutoff. Call-unit definition, maximum exact count and shared whole-operation call/handle accounting must be frozen before source; current ArtifactBudgetState lacks them. Do not manufacture fresh allowance or call metadata queries ordinary SQL authority to skip checkpoints.

Before a temporary SQLite limit change or statement-producing call, root operation records finite cleanup obligation while original guard is held: prior-limit knowledge, LimitUnchanged/LimitMayHaveChanged/LimitRestorationPending/LimitRestored(prior), statement creation/finalization disposition and projection lifetime. Retain actual prior limit immediately after set_limit returns, before another fallible observation; a pre-recorded may-change state covers nonreturn/error uncertainty. Exact capture-before-change and guarded restoration layout remains precode requirement; never guess prior limit from default or another connection. Each created statement must have explicit checked finalization; query_row return or Rust Drop alone cannot certify it.

Every exit after a limit change, including failed native result, invalid budget, cancellation, expiry, typed error or controlled unwind, stops new observations and enters fixed cleanup-only path while original authority guard remains held. Invalid budget does not block statement finalization or exact prior-limit restoration; these retain original association and never mint live budget or new observation allowance. Only after all statement obligations resolved, LimitUnchanged or exact LimitRestored(prior), and projection ended may actual private producer create non-Clone/nonserializable ControlFrameCleanupAck. Ack binds same root registration, operation/budget/tag and explicit statement/limit disposition. Sealed never-published request has distinct NoDispatch proof; it cannot fabricate an entered-frame cleanup ack. Uncertain prior value, restore/finalizer failure, panic or unknown completion quarantines observer/root, retains outstanding obligation and produces no success ack/admission. Controlled cleanup attempts after failure do not remove quarantine or certify uncertain work.

After successful entered-frame cleanup, end guard, then publish completion plus ControlFrameCleanupAck through matching InFrame or Retiring/InFrame -> CompletionPending under mailbox mutex. A genuinely unentered frame instead publishes only Denied plus its actual ControlFrameUnenteredAck through those same occupied states; it never creates a guarded cleanup ack or success observation. Busy and cancellation are denial reasons, not certificates. NoDispatch remains only the supervisor-sealed never-published branch. A retiring/invalid original operation can publish only cleanup/denial, never successful observation acceptance. Root result-consumer holds authority then mailbox and cannot consume another association or a fabricated local ack. If completion publication cannot finish, InFrame marker and worker-owned bounded completion remain retained; no slot clearing or replacement. If a native call/finalizer/restore never returns, worker frame/guard and original root owners stay retained indefinitely. Expiry permanently closes observer admission and invalidates original budget; no timeout rearm, thread interruption, force unlock, replacement root or five-second return/close promise. Poison/unwind never derives cleanup from body return or destructor.

Result consumption uses authority->nonblocking mailbox, matches same private operation reference, original budget allocation and fixed tag before and after extraction. ObservedReadOnlySequence is historical unverified observation status, not retained current witness/Ready/approval/permission for later SQL or execution. Mutation after observation must not inherit it. Invalid/late completion never advances protected stage. Root retirement may consume actual matching ControlFrameCleanupAck, ControlFrameUnenteredAck or sealed NoDispatch proof without a live-budget requirement, according to the exact branch: entered-frame projection/statement/prior-limit cleanup; visible worker frame proven never entered; or supervisor-sealed never-published reservation. Unentered acknowledges only this control frame had no guard/projection/native/statement/limit obligations; it does not claim the operation was never dispatched, global nonexecution or another context cleanup. All three require the exact original root/operation/budget/tag and retained occupancy. Completion cannot move through consumed Retired until exact request/frame/completion ownership is accounted once. Control cleanup is not native-worker/store/VFS/journal/probe/durable cleanup; it releases no original connection/lease and cannot retire whole operation. Healthy control storage can become Vacant only after original operation retirement independently proves every other required cleanup; expired/poisoned/quarantined observer never rearms in process. Stale producers only dispose their own nonnative metadata and never publish into, consume, clear or retire a later operation.

### Stop, failure and missing proof

Lock-free original-budget invalidation/admission closure is cancellation only. Durable stop still needs actual guarded authorized SQL transition; while observer holds guard it can return Busy/Pending, never durable-stop success. This first read-only component issues no write/commit/journal effect, so no rollback/commit guarantee follows. Exact pretransaction/precommit/journal/commit-issued fences and all invalidating writers remain later required design work. C1 non-Send capture remains excluded; later same-control-context Argon scheduling/disposal needs its own retained layout and re-entry proof.

Source implementation remains blocked until explicit owner amendment acceptance, exact private Rust layouts/constructors and aggregate bounds, original-owner read-only acquisition/close protocol, native primitive/call ledger, private module/dependency placement, original budget/identity sharing bridge, compiler traits and fresh exact precode review. Identity currently belongs privately to lnsat-store; artifact budget/native primitives privately to lnsatd; no cross-crate bridge or complete whole-operation budget currently exists. Changing visibility or moving trusted modules requires its own exact source ownership review; this packet does not pretend protocol field labels are compilable Rust.

Later focused validators: original readonly/schema17/public-wrapper compatibility; genuine positive original-connection observation and drift denials; nonforgeable root/association, fixed slot/transfer peak bounds, no view/guard/handle crossing; sealed reservation/publication race and visible InFrame while slots empty; worker root contention with actual unentered ack; cancellation after publication/before transfer and after transfer/before guard with visible retiring occupancy; admission closure drains already-published request; timeout during each native/check/finalize phase; late/mismatched completion; poisoned/unwinding construction and callback absence; cancel/expiry/failed-call cleanup-only exact prior-limit restoration and checked finalization; separate control-frame/native/store/journal cleanup; original budget no reset/new allowance. Native positive/blocked-call/close evidence remains separately authorized Linux proof. Synthetic scheduler tests cannot certify that native behavior.

## Stage-A read-only observer Rust precode

Canonical authority: [Project Status](../../PROJECT_STATUS.md#stage-a-read-only-observer-rust-precode). On October 9, 2026, the human owner accepted the narrow D88 amendment: one separately retained read-only control observer alongside the existing native observer, the fixed original-read-only-connection custody observation under the actual authority guard, and an ObservationOnly purpose distinct from Ready. This supersedes only D88's pending-acceptance state. PHR-0089 records this documentation/precode slice. Acceptance does not authorize production Rust changes, original-owner acquisition/close, writable B6, C1 integration, journal effects, native job expansion, full native freeze, runtime, merge or release.

The following is exact component precode: selected private placement, field ownership, function boundaries and finite lifecycle obligations for later review. Rust declaration blocks describe future private source; signature blocks are not complete implementations or a compilable module. No Rust compiler, trait, genuine original-connection observation, native cleanup or source-feasibility PASS is claimed. Construction, admission and shared full-native accounting remain separate gates; this component cannot acquire owners or become a product caller.

### Private placement and prerequisite source order

Use the already selected `lnsat-store` trusted boundary. A separately reviewed prerequisite must move/reuse the existing private daemon native closure, without copying implementations or exporting a proof constructor. Exact move set: `headless_native.rs`, `headless_native_acl.rs`, `headless_native_fdinfo.rs`, `headless_native_mountinfo.rs`, `headless_native_procfs.rs`, `headless_native_readable.rs`, `headless_native_artifact.rs`, `headless_native_root_bootstrap.rs`, `headless_native_tests.rs`, `headless_native_fdinfo_tests.rs`, `headless_native_mountinfo_tests.rs`, `headless_native_procfs_tests.rs`, `headless_native_readable_tests.rs`, `headless_native_artifact_tests.rs`, and `headless_native_root_bootstrap_tests.rs`, each from `crates/lnsatd/src/` to `crates/lnsat-store/src/`. Preserve relative `#[path]`, private dependency edges, platform gates and tests; ACL cases live in `headless_native_tests.rs`; the ACL module retains its cfg(test) `entries` helper. Remove the old private daemon module declaration and add the store-private declaration. No public re-export, store-to-daemon dependency, duplicated observer or new consumer.

The moved Linux closure needs the existing pinned `rustix = 1.1.5` dependency with its existing `std`, `alloc`, `fs` features and disabled defaults in store Cargo metadata/lock edges. Existing store `nix` filesystem/user support is available; no evidence supports adding daemon socket/poll capabilities. Preserve workspace Rust 1.97.1, edition 2024, unsafe-code forbid and dependency versions. Exact dependency compilation remains required; this document performs no migration, dependency update or installation.

After that prerequisite, extract/reuse the one actual `ArtifactBudgetState`, `ArtifactReadBudget`, `ArtifactReadPurpose` and `ArtifactError` definitions into store-root-private `headless_control_budget.rs`. Move their existing implementations/constants together; retain the native-error conversion at its native boundary. Internal `pub(super)` imports/aliases preserve migrated artifact/root-bootstrap use. The original native `NativeError` needs only store-internal parent visibility for that conversion. Move/reuse the exact deadline helper into the same private budget boundary, preserving its five-second/enclosing-deadline behavior. Replace artifact references to private budget fields with narrowly scoped internal methods, not public fields or copied state. No second budget type, fresh per-observer `begin`, caller-supplied identity, public bridge or broadened Rust API.

Place the observation component as a private child of `selected_store`: `#[path = "headless_readonly_control.rs"] mod readonly_control;`. This child can use the actual selected custody fields and store-root private scope/identity/budget types without sibling-private field shortcuts. Native and ordinary selected-store callers remain unchanged until their separately reviewed source packets. Exact observation helper extraction must preserve the original algorithms, not manufacture a `SqliteStore` from borrowed fields.

### Private native relocation and package-isolated Linux validator precode

On October 10, 2026, the human owner authorized this documentation-only erratum and validator precode, tracked by PHR-0090 under the same [Project Status work record](../../PROJECT_STATUS.md#stage-a-read-only-observer-rust-precode). The earlier relocation review is advisory; its frozen reports and reviewed commits remain intact. The canonical ACL erratum is corrected above: ten `headless_native_acl_*` cases are in the root native test module, not inline in the ACL module. The fifteen-file closure has fourteen relative `#[path]` edges and 131 lexical `#[test]` annotations across seven test files. These are static counts, not compiled, selected or passing tests. No ACL-specific test file is invented.

**Existing blocker.** The current `scripts/sqlite-native-build-policy.mjs` requires exactly one incoming rustix dependency edge, from `lnsatd`. Adding a store edge while retaining the daemon edge, as proposed by the earlier metadata precode, fails `sqlite_native.graph_rejected` before any selected Cargo build command. The earlier fifteen moves plus four metadata edits are therefore insufficient with the unchanged policy. Package isolation must preserve the full locked/offline metadata graph guard, including workspace feature unification; `--no-deps` metadata cannot replace it.

A future, separately accepted source packet must transition that guard and its existing negative tests to one exact post-move topology: one registry rustix package at existing version 1.1.5, unchanged locked checksum and features exactly `alloc,fs,std`; exactly two incoming edges; distinct owners exactly the single `lnsatd` and single `lnsat-store` package IDs; each dependency named `rustix`, each with exactly `[{kind:null,target:'cfg(target_os = "linux")'}]`. Reject missing, duplicate, alternate or third edges, extra owners, alternate sources, version/checksum/feature drift and target/kind changes. Preserve every existing SQLite, rusqlite, nix_stat, environment and config assertion. This is a fixed transition, not an owner allowlist or automatic legacy-or-dual fallback. Ordinary source checks use the same transitioned guard; the new validator cannot bypass a failing legacy guard.

Future relocation ownership is the exact fifteen source/destination pairs above plus `crates/lnsatd/src/lib.rs`, `crates/lnsat-store/src/lib.rs`, `crates/lnsat-store/Cargo.toml` and `Cargo.lock`. Adding `scripts/sqlite-native-build-policy.mjs` and `scripts/sqlite-native-build-policy.test.mjs` makes 21 logical owned items / 36 path endpoints. Separately reviewed validator ownership is `scripts/run-rust-workspace.mjs` and a new `scripts/run-rust-workspace.test.mjs`. No other production path, dependency version, public export, budget extraction or observer admission is included. Their source order, exact accepted base/patch tuples and Linux execution permission must be frozen in the later implementation packet. Neither source packet is authorized here.

**Fixed future runner contract.** Extend the existing hardened runner rather than introduce direct Cargo bypass. Proposed actions are `native-daemon-baseline` and `native-store-proof`; the existing exactly-one-action CLI remains binding. No caller package, target, feature, config or extra command argument passes through. Baseline is collected in an isolated pre-move checkout with the daemon-only graph guard; store proof is collected in an isolated post-move checkout with the reviewed dual-edge guard. Do not choose graph policy from an action, environment variable, fixture or caller claim. Each checkout's accepted immutable source tuple selects its single reviewed policy implementation.

Both actions require native Linux x64, pinned Cargo/rustc 1.97.1 and `rustc -vV` release 1.97.1 with host exactly `x86_64-unknown-linux-gnu`. This is a proposed single validator row, not a distro support claim or an established CI architecture: the current Ubuntu CI label does not declare architecture. Reject other hosts, cross execution or unavailable tools; never install or fetch. Retain physical-repository/config-path and environment rejection before invoking tools, `RUSTUP_AUTO_INSTALL=0`, `CARGO_NET_OFFLINE=true`, forced exact `SQLITE_ENABLE_FILESTAT`, and full `cargo metadata --format-version 1 --locked --offline` graph verification before package commands. A separately accepted harness creates an empty, uniquely owned target directory outside source checkouts and other caches; the runner sets `CARGO_TARGET_DIR` to that directory after rejecting ambient overrides. There is no caller target-directory CLI option or reused build output. Existing verified dependency/tool caches remain read-only inputs. Trusted developer host/toolchain remains an assumption, not release-artifact authentication or hostile-host protection.

After preflight, use these exact arrays, with fixed `P = "lnsatd"` for baseline or `P = "lnsat-store"` for post-move proof; no user-supplied substitution:

```javascript
const target = "x86_64-unknown-linux-gnu";
const check = [
  "check",
  "--package",
  P,
  "--lib",
  "--locked",
  "--offline",
  "--target",
  target,
];
const clippy = [
  "clippy",
  "--package",
  P,
  "--all-targets",
  "--locked",
  "--offline",
  "--target",
  target,
  "--",
  "-D",
  "warnings",
];
const buildTests = [
  "test",
  "--package",
  P,
  "--lib",
  "--no-run",
  "--locked",
  "--offline",
  "--target",
  target,
  "--message-format=json",
];
const listTests = ["--list", "--format=terse"];
```

Package isolation means the selected package and necessary dependencies are compiled; full metadata still inspects the workspace. Clippy checks all targets of that selected package. These actions do not select workspace-wide compilation or `--all-features`. Test listings include ignored test registrations in the exact native-case comparison; no test body, including an ignored test body, is executed. Building and listing executables are themselves future Linux tool/process execution and remain gated now. Later actual native test-body/positive/blocked-call/cleanup proof belongs to its separately authorized Phase11 lane.

**Bound evidence and honest selection.** Before each action, require the accepted immutable checkout HEAD/tree, clean tracked state, original fifteen source blob OIDs/SHA-256 and exact relocation map, all fourteen path edges, config/lock/policy blobs, pinned tool outputs, native host, fixed argv and the fresh owned target directory. Refuse changed or missing inputs. Baseline output binds those inputs and raw compiler/listing outputs, actual process exits and executable digest. The later source packet must pin the exact baseline receipt path and SHA-256 as a private harness input; the runner accepts no arbitrary receipt, count or baseline through CLI/environment. No baseline exists from this docs-only checkpoint. Before/after receipt schemas and the harness binding must pass independent source review before running either action. Cross-phase comparison preserves mapped native module blobs, config, tools, host and profile; changed root declarations, manifests, lock and graph-policy blobs must match their respective reviewed phase tuples, not each other. No accepted baseline may be inferred from static source counts.

Parse bounded Cargo JSON output (8 MiB maximum) and require exactly one selected library test `compiler-artifact`, exact package ID from the verified metadata, library source/kind and test profile, and a regular executable whose resolved path stays beneath this action's fresh owned target directory. Reject duplicates, wrong package/target, symlink escapes, absent artifacts, nonzero exit or truncated/malformed output. Invoke only that executable with the fixed listing arguments; capture raw stdout/stderr with an 8 MiB limit per stream and actual exit. No test body is invoked by listing. Independently pin the baseline's compiled, fully qualified `headless_native::` test names; require nonempty baseline selection, ten root ACL cases and exact same native test-name set after byte-preserving relocation. Reject duplicate, missing or additional native cases and any target/config/tool/profile mismatch or mismatch against the phase-specific accepted blobs. Non-native package tests may differ and must remain visible in the full raw listing. Never equate 131 lexical annotations with a target's compiled count or treat zero selected tests as PASS. Listing equivalence proves registration on this row, not behavior, native correctness, resource bounds or whole-module feasibility.

Every stage stops on its first failed assertion/process exit. Retain a failed/partial receipt, never a success certificate, retry, network fallback, install or rewritten prior report. Cleanup removes only verified action-owned build/evidence scratch when authorized; it never edits original caches, other checkouts or accepted receipts.

**Required future mocked checks.** The runner test file uses a pure injected process/config seam with fixed fixture results; it launches no Cargo, compiler or native process. Cover unknown/extra CLI arguments; wrong OS/architecture/host/version; absent tools/caches; config symlinks/ancestor/home config; forbidden environment and target overrides; package/workspace/feature/target argument drift; malformed/oversized graph/artifact/list output; wrong or escaping artifacts; no artifact; zero, duplicate or mismatched native names; missing baseline, digest or immutable-source mismatch; failed stages and no later execution. Existing policy tests must add exact dual-owner positive fixtures and negative missing/duplicate/third/alternate-owner/name/kind/target/source/version/checksum/feature edges while preserving current invariant tests. Fixture PASS does not prove actual Cargo behavior. Meaningful later source changes require full `npm run check`, these focused mocked/policy checks, exact Linux package evidence where separately authorized, and fresh independent source/direct-child attestations.

**Current outcome and next gate.** Only the ACL prose correction and this precode are complete. Runner actions, harness/receipt binding, graph transition/tests, module relocation and actual baseline/store Linux evidence are missing. The next safe step is acceptance of exact validator/graph-transition source ownership and execution boundaries; production source remains closed until separately authorized. Original budget extraction, read-only owner acquisition/close, native admission/dispatch, full native accounting/freeze, writable B6/C1/journal/writers, Docker/host/ACL/pressure/credentials/provider calls/installs and push/main/merge/release/publication/deploy remain closed. Project Status owns implementation truth; Phase11 owns runtime proof. LNSAT remains neutral and standalone.

### Exact owner and association shape

These declarations live inside that private selected-store child after prerequisites. `OwnerDecisionCredentialScopeV1`, `SelectedStoreCustodyV1`, `OperationIdentityAllocator`, `OperationIdentity` and the original budget are reused types. Imports and platform-specific selected custody behavior must compile on every existing target before source acceptance. No type below derives Clone, Debug, serialization or Deref; no external constructor, raw getter, callback or arbitrary SQL entry exists.

```rust
static ROOT: OnceLock<ControlRoot> = OnceLock::new();
static OBSERVER: OnceLock<ObserverHeader> = OnceLock::new();

struct ControlRoot {
    authority: Mutex<StoreAuthority>,
    admission_closed: AtomicBool,
}
struct StoreAuthority {
    identities: OperationIdentityAllocator,
    owner: ObservationOwnerState,
    operation: Option<OperationRecord>,
}
enum ObservationOwnerState {
    Unadmitted,
    ObservationOnly(ObservationOwner),
}
struct ObservationOwner {
    connection: Connection,
    custody: SelectedStoreCustodyV1,
    original_scope: OwnerDecisionCredentialScopeV1,
}
struct Association {
    root: &'static ControlRoot,
    identity: Arc<OperationIdentity>,
    budget: Arc<ArtifactBudgetState>,
    tag: ReadOnlyTag,
}
enum ReadOnlyTag { OriginalConnectionCustody }
struct OperationRecord {
    association: Association,
    control_issued: bool,
    disposition: RootDisposition,
    obligation: FrameObligation,
}
enum RootDisposition { Reserved, Published, Outstanding, AwaitingControlCompletion, Retiring, Retired, Quarantined }
struct ObservationTicket {
    association: Association,
    observer: &'static ObserverHeader,
}
```

Quarantine is recorded in the operation and root/header flags while the owner variant remains retained. There is no owner-replacing quarantine variant. Connection/custody fields are owned inside the actual authority mutex, never in tickets, mailbox, frame association or native worker. Drop order is not cleanup proof. Root/observer anchors are established inert before any custody I/O and never taken/replaced/deallocated in-process.

No producer for `ObservationOwner` is supplied here. Actual original read-only admission must retain every partial return and verify original scope, schema17, MAIN_DB read-only, path/parent/lease identity, finite path storage and original association before this variant can exist. It requires a separate acquisition/retention/close packet; the accepted under-guard exception does not permit opening/closing SQLite, parent or lease owners. Ordinary store adoption, reconstructed custody, borrowed-parent owner wrappers, reopen/migration and writable schema18 are forbidden. Until admission and native non-dispatch/accounting producers are reviewed, the root remains Unadmitted and cannot dispatch a positive observation.

Match association using the same static root, `Arc::ptr_eq` on original identity and budget allocations, `same_operation` in the original allocator domain, and the closed tag. Issue one control request per original operation; no sequence reset, reused identity or frame ABA. Identity exhaustion, mismatch and budget invalidation close admission. Historical status never carries current custody, approval or execution authority.

### Retained construction and mailbox

```rust
struct ObserverHeader {
    root: &'static ControlRoot,
    closed: AtomicBool,
    started: AtomicBool,
    slots: Mutex<ObserverSlots>,
    wake: Condvar,
}
struct ObserverSlots {
    construction: Construction,
    handle: Option<JoinHandle<()>>,
    mailbox: Mailbox,
}
enum Construction { Inert, Reserved, Retained, Failed }
struct Request { association: Association }
struct Completion { outcome: Outcome, disposition: ControlDisposition }
enum Outcome { ObservedReadOnlySequence, Denied(Denial) }
enum Denial { Busy, Cancelled, InvalidAssociation, NativeRejected }
enum ControlDisposition {
    Entered(ControlFrameCleanupAck),
    Unentered(ControlFrameUnenteredAck),
}
struct ControlFrameCleanupAck { association: Association }
struct ControlFrameUnenteredAck { association: Association }
struct SealedNoDispatch { association: Association }
enum Mailbox {
    Vacant,
    Reserved(Request),
    Published(Request),
    RetiringPublished(Request),
    InFrame { association: Association, retiring: bool },
    CompletionPending(Completion),
    RetiringNoDispatch(SealedNoDispatch),
    Quarantined { association: Association },
    Retired,
}
```

One construction reservation; one 2 MiB requested thread stack; one actual retained JoinHandle; no replacement or general pool. Hold only the construction/mailbox mutex across spawn, outside authority. Worker waits behind the start barrier without custody access. Move the returned handle immediately into the fixed slot before another fallible step; then publish start. Spawn failure, poison or unwind permanently closes admission. The exact stdlib spawn-return/unwind and retained-handle source proof is still required; stack size does not bound TLS, guard pages, SQLite heap or RSS.

Mailbox enum carries occupancy even when the worker owns the request/completion. At most one request, one unpublished completion and one visible marker. Request association moves into the retained authority frame on entry; it is not cloned into an additional concurrent request/frame owner. Peak association copies: root record, ticket, mailbox marker, worker request-or-frame and worker completion: five identity Arc references and five original-budget Arc references, excluding preexisting original budget/native owners. No paths, SQL strings, descriptors, secret material, dynamic queue, callback or result body crosses these slots. Types above contain finite metadata; actual `size_of` and aggregate library/owner allocation validators remain required, not assumed byte caps.

### Exact private entry boundaries

These are signatures for the future private component, not executable stubs:

```rust
fn reserve(root: &'static ControlRoot, observer: &'static ObserverHeader)
    -> Result<ObservationTicket, Denial>;
fn publish(ticket: &ObservationTicket) -> Result<(), Denial>;
fn invalidate(ticket: &ObservationTicket);
fn seal_never_published(ticket: &ObservationTicket)
    -> Result<(), Denial>;
fn worker_main(observer: &'static ObserverHeader);
fn consume(ticket: &ObservationTicket) -> Result<Outcome, Denial>;
fn retire_control_frame(ticket: ObservationTicket) -> Result<(), Denial>;
```

Reservation/publication/consumption/retirement use authority then nonblocking mailbox acquisition. Reserve requires actual ObservationOnly admission, original retained owners and root/budget, no outstanding native work and an actual native-lane non-dispatch disposition; absence of a native request is not that proof. The native producer/whole-operation integration is missing, so these checks cannot be replaced with booleans or zero counters to enable source execution.

Publish rechecks the exact live original association and Reserved state atomically under both guards, then transitions to Published. Wake after both guards end. Failure invalidates/retains, without retry. Supervisor can create SealedNoDispatch only by sealing matching never-published Reserved under both guards. Published cancellation becomes RetiringPublished. Worker installs InFrame before moving Request, releases mailbox before trying authority and drains already-published requests after admission closes. Busy or pre-entry cancellation produces only actual worker-created Unentered acknowledgment; after any guard acquisition it must use entered cleanup. Quarantined occupancy is never cleared from empty slots, body return, Drop or a stale producer.

Consumption rechecks matching root operation, identity, budget and tag before/after extraction. Only live nonretiring operations accept ObservedReadOnlySequence. Invalid operations may consume their exact cleanup disposition for retirement, without accepting observation success or resetting budget. Control retirement is not whole-operation/native/store/VFS/journal/probe/durable retirement; Vacant reuse requires independent original-operation retirement. Expired/quarantined observers never rearm. Tickets invalidate on abandonment without acquiring either mutex and cannot mint acknowledgment.

### Guard, projection and terminal retention

```rust
struct RetainedAuthorityFrame {
    guard: Option<MutexGuard<'static, StoreAuthority>>,
    association: Association,
    observer: &'static ObserverHeader,
    completion_transferred: bool,
}
struct GuardedReadonly<'g> {
    connection: &'g Connection,
    custody: &'g SelectedStoreCustodyV1,
    original_scope: &'g OwnerDecisionCredentialScopeV1,
    obligation: &'g mut FrameObligation,
    not_send_sync: PhantomData<Rc<()>>,
}
struct FrameObligation {
    limit: LimitObligation,
    statement: StatementObligation,
    projection_live: bool,
    uncertain: bool,
}
enum LimitObligation {
    Unchanged,
    MayHaveChanged,
    PriorKnown(i32),
    Restoring(i32),
    Restored(i32),
}
enum StatementObligation { None, Creating, Active, Finalizing, Finalized, Uncertain }
```

Projection is a private borrow of the actual retained guard's fields, with its lifetime tied to `&mut RetainedAuthorityFrame`; no self-referential owner/view struct and no detached Connection constructor. A statement/Rows lifetime cannot escape that projection or release the guard. Operation bookkeeping owns no borrowed Statement. A frame acquired but rejected before projection still uses entered cleanup, with Unchanged/no-statement facts, never Unentered.

Normal checked completion has an exact retained sequence: end Rows/statements/projection and verify all original obligations under the actual guard; construct the original-association cleanup acknowledgment and bounded Completion before releasing the guard; set the original operation to AwaitingControlCompletion; release only that checked guard while retaining the frame with `completion_transferred == false`; then atomically publish the exact Completion from matching InFrame/RetiringInFrame into CompletionPending under mailbox. Only after actual transfer, while the same mailbox guard is still held, may the worker set `completion_transferred = true`. No fallible call or callback occurs between that transition and disarming. A panic before disarming closes acceptance even if Completion reached the slot; it cannot invent success. AwaitingControlCompletion remains occupied and forbids new operation/witness permission.

The retained frame lives through publication, not merely through native observation. Its terminal destructor closes root/header admission and invalidates the same original budget whenever publication was not disarmed, including after guard release. With a held guard it also marks the actual matching original operation Quarantined, then intentionally forgets that guard. After checked release it takes no new mutex: terminal root/header flags are authoritative quarantine, while the root record remains occupied AwaitingControlCompletion until an actual guarded consumer mirrors Quarantined. No guardless Drop manufactures a root-record update or cleanup acknowledgment. Mismatch never changes another operation; closing this observer/root still prevents new admission. A complete transfer with no held guard is the only disarmed frame disposition.

The planned terminal destructor is safe Rust, with no native calls or mutex acquisition. `same_association` is the fixed private root/identity-domain/identity-Arc/budget-Arc/tag comparison defined above, not an injectable predicate:

```rust
impl Drop for RetainedAuthorityFrame {
    fn drop(&mut self) {
        if self.completion_transferred && self.guard.is_none() {
            return;
        }
        self.association.root.admission_closed.store(true, Ordering::SeqCst);
        self.observer.closed.store(true, Ordering::SeqCst);
        self.association.budget.invalidate();
        if let Some(mut guard) = self.guard.take() {
            if let Some(operation) = guard.operation.as_mut() {
                if same_association(&operation.association, &self.association) {
                    operation.disposition = RootDisposition::Quarantined;
                }
            }
            std::mem::forget(guard);
        }
    }
}
```

Guard-present unresolved drop/unwind retains the actual mutex forever; the process-lifetime root retains original connection/custody owners. Guardless post-cleanup publication failure still closes admission permanently and preserves outstanding mailbox/root occupancy, without promising that an already checked/released guard remains locked. There is no force unlock, wait under guard, recover-and-reuse poison, replacement root or destructor-derived cleanup. Worker lifetime failure separately closes the retained observer; actual construction/thread-exit proof remains required. Abort/process termination is not in-process retention or crash-recovery proof.

A caught panic may permit best-effort known cleanup while the retained frame remains outside the unwind boundary; it never restores clean status. If unwind destroys a statement or Rows, its unchecked Drop disposition is uncertain. No unsafe FFI, ManuallyDrop extraction, public raw pointer or relaxed unsafe-code policy is allowed. Cleanup that blocks retains frame/guard/owners indefinitely; deadline is acceptance cutoff, not return/close guarantee.

### Original-budget API-unit ledger

The planned extension is one private field `readonly_control: ReadonlyControlQuota` in the existing `ArtifactBudgetState`, initialized only with that original budget. No standalone quota constructor is exposed:

```rust
struct ReadonlyControlQuota {
    reserved: AtomicBool,
    observation_units: AtomicU32,
    cleanup_units: AtomicU32,
    statement_attempts: AtomicU32,
}
const READONLY_OBSERVATION_UNITS: u32 = 16_384;
const READONLY_CLEANUP_UNITS: u32 = 64;
const READONLY_STATEMENT_ATTEMPTS: u32 = 8;
```

Reservation uses one checked false-to-true transition. Counts begin at zero only when the original budget is allocated. Checked monotonic charge refuses overflow or cap excess and invalidates that budget; no increment failure can silently authorize a call. Cleanup charges require the same original root/identity/budget/tag and a recorded outstanding obligation, not a caller-selected cleanup flag. Private visibility and extraction compilation remain prerequisite proofs.

The component extends the one original budget allocation with a one-shot read-only reservation and monotonic control counters. Reserve at most 16,384 observation API units, 64 cleanup API units and eight statement-creation attempts for the single request. No refund/reset/fresh budget. Reserve before publication; failure denies and invalidates. A unit is one named Rust wrapper API invocation, including its internal library work; it is not a kernel syscall, VFS operation, allocation or hard execution-time bound. Check/charge before every invocation and recheck original budget after every observation call, including errors before propagation. Invalid budget permits only the pre-reserved original-association cleanup counters, never new observation work.

Fixed planned ledger, per original-connection sequence:

| Invocation family                                                                                                                                                                        | Maximum observation units |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------: |
| Three custody association passes: UID/eUID, canonicalize, held/named parent metadata, named database metadata, held/named lease metadata                                                 |                        24 |
| Two in-place descriptor fstat calls; exact connection path and MAIN_DB read-only checks                                                                                                  |                         4 |
| Two FILESTAT producer passes, each including length-limit change/check, SQLite version, bounded function-list inspection, source-ID/DEBUG/FILESTAT queries, checked restoration/readback |                    12,342 |
| Total planned ceiling                                                                                                                                                                    |                    12,370 |

Each producer pass is at most 6,171 units: set/check limit and version (3); function-list prepare/query/finalize (3), at most 1,025 Rows::next and 5,120 Row::get calls (6,145 combined); source-ID, DEBUG and FILESTAT each prepare/query/two next/one get/finalize (18); restoration/readback (2). Function list permits at most 1,024 rows, as current code does; extra/early failure is denial. Eight statement-creation attempts cover four per pass; only one live statement. The 16,384 cap has slack, not permission to add SQL or additional observations. Cleanup allowance covers explicit outstanding finalization and exact limit restoration/readback; cleanup does not run a new function-list or FILESTAT observation. Count natural successful-path finalization/restoration once as observation; abnormal cleanup draws only cleanup quota. An operation-level precode test must bind every actual wrapper to this table and fail on added invocation paths.

This is a control-component wrapper ledger, not completed whole-native accounting. Existing procfs requests still have no budget; existing artifact/root jobs have byte/deadline bookkeeping but no complete shared native call/handle ledger. The first component cannot dispatch any of those jobs through the control root or certify their cleanup. Their registration, retained-handle accounting and original-operation budget participation remain full-native gates. Native observer absence/non-dispatch needs its actual private producer, never an invented zero-count witness.

### Checked SQL cleanup and known upstream limitation

Use only fixed literals and explicitly owned `Statement`, never prepare_cached/query_row as cleanup proof. At most one live statement. For normal SQL completion, consume final Rows::next yielding Ok(None), which checks rusqlite reset; end Rows and explicitly consume Statement::finalize with a checked Ok result. Every scalar query checks exactly one bounded value then EOF. Function-list predicate rules, SQLite 3.53.2/source-ID/DEBUG/unix origin checks and FILESTAT JSON/parser bounds remain unchanged; producer length bound stays 4,096.

Rusqlite 0.40.1 offers no safe public checked early Rows reset. Rows Drop discards reset result; step error also discards reset result before returning its error. Thus cancellation/expiry, decode/row-cap errors, native step/reset error or panic with active Rows permanently marks cleanup uncertain. Attempt explicit finalization and known prior-limit restoration under the same guard when possible, but neither later finalize Ok nor body return repairs that unknown reset. No clean acknowledgment, guard release or observer rearm follows. This is a conservative availability cost, not a newly implemented runtime fix or reason to introduce unsafe FFI/vendor patches.

Record MayHaveChanged before set_limit. Its returned previous value is the only exact restoration target and is retained before another fallible call. An optional initial limit read cannot replace that returned value; disagreement quarantines while restoring the actual returned prior. Restore with set_limit(prior), then verify limit()==prior. Unknown prior, failed/unknown restore, unchecked statement/Rows cleanup or panic yields no acknowledgment. Cancellation after possible change runs only fixed cleanup with original association and retained guard; it does not bypass restoration because the live observation budget expired. Existing selected_store.rs ordinary-result restoration is not panic/unwind proof.

### Exact remaining packets and validators

1. Private placement prerequisite: only the fifteen move pairs, `crates/lnsatd/src/lib.rs`, `crates/lnsat-store/src/lib.rs`, store Cargo metadata/lock edges and canonical status/inventory/review records. Preserve existing private interfaces and tests; no control root, observer, acquisition, public caller or mutation activation. Named validators: all moved native unit modules on existing supported targets, store/daemon compilation and strict Clippy with pinned offline toolchain, meaningful-source `npm run check`, public/docs/inventory/history/diff checks, fresh exact staged/immutable source and direct-child review. Failed compilation returns to controller; no install.
2. Private budget extraction/component precode: exact budget module, migrated artifact/procfs/root-bootstrap imports/deadline helper and original `OperationIdentity` reuse; no physical admission. Freeze original-begin ownership, private visibility, one-shot quota and existing fixture compatibility. Compiler/negative trait checks must prove nonforgeable tickets/acks, static anchored root, actual guard-borrow lifetimes, no Send/Sync projection, no Clone/Debug/Serialize/Deref authority types, finite mailbox/Arc peaks and sticky exhaustion. Safe frame terminal retention, construction unwind and every reservation/publication/transfer/cancellation/cleanup phase require focused race/conformance tests. Existing tests alone supply none of these new proofs.
3. Original-owner admission/retention/close and shared native non-dispatch/full call/handle accounting remain separately designed and reviewed before an observation component can be source-integrated or acquire/dispatch. Genuine Linux positive, drift, blocked-call/finalizer/close and original-owner evidence require separate runtime authority. Writable B6, C1 scheduling, journal writes/commit-issued fences, stop/recovery/release and full-module freeze stay closed.

No broader integration, runtime/support/certification, merge, push, release, publication, deploy, host change, credential intake, install or external source transfer is authorized. Project Status remains implementation truth; Phase11 remains runtime proof. LNSAT stays neutral and standalone.
