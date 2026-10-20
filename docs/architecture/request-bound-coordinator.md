# Private Request-Bound Coordinator

- Status: private source conformance; 36 groups and independent source/test review passed
- Scope: trusted synthetic ports under `cfg(test)`; no production entry or public API
- Compatibility: existing request-bound Git adapter/protocol and SQLite schema 18

This coordinator composes the existing immutable request, one-use reservation,
fresh dispatch guard, independently verified synthetic observation, and atomic
result/reconciliation seams. It changes their composition for tests, not their
authority semantics. The module lives below
`phase7_consumption/request_admission.rs`; no production feature or export
selects it. [Project Status](../PROJECT_STATUS.md) owns implementation truth.

## Authority and phase boundaries

Fresh admission returns the existing move-only, original-store-bound reservation
only after its transaction commits. A later lock phase consumes it through the
existing guard and rechecks the exact durable lineage, current paired
authentication, roles, nonce, clock and expiry. An outer
`Arc<Mutex<SqliteStore>>` does not identify a replaced inner store: the original
inner marker must match in each phase.

Each phase attempts `try_lock` once. Contention, poison or store replacement
returns failure or uncertainty without spinning, replacing the store or bypassing
poison. The guard transaction and outer mutex are released before either trusted
synthetic port runs. This proves modeled lock composition only; SQLite calls and
arbitrary trusted closures do not acquire a physical deadline guarantee.

The dispatch port consumes one existing guard and can acknowledge a synthetic
handoff or report ambiguity. It cannot return consequence evidence, choose the
observer or construct proof. The separately supplied observer reports at most
once per invocation. Its report is verified by the existing test-only verifier
after the coordinator reacquires the expected store. Only the existing result
transaction can persist a receipt and, for an unknown attempt, its matched
reconciliation.

## Uncertainty and recovery

Dispatch error or unwinding panic does not automatically invoke observation.
Absent, uncertain, invalid or panicking observation cannot complete an attempt.
A private, non-cloneable cleanup ticket can attempt exact conservative unknown
marking only for the original attempt. Because the core helper discards write
errors, the coordinator reports the marker as attempted but unconfirmed; a helper
return alone never proves durable unknown.

A failed result transaction preserves the existing atomic ledger boundary. Lost
result acknowledgement may coexist with durable completion: it cannot justify
redispatch, a replacement reservation or a blind downgrade to unknown.

Explicit recovery accepts exact request/derived/operation/attempt identities and
an observation port, with no dispatch port, capability secret or opaque
pre-reopen token. It composes existing parent reconstruction, binding validation
and public operation readback in one read transaction. Valid completed entry is
read-only with zero observer/proof calls. Valid failed entry rejects before
observation. Only dispatching or unknown entry permits one explicit observation.
Later explicit inspection may observe an unchanged unknown attempt again; there
is no automatic retry or global durable observer quota.

A writer can change state after the read snapshot is released. Proof construction
and result persistence therefore revalidate their current binding. Snapshot
classification does not provide atomic authority across an unlocked callback.

## Synthetic conformance and limits

The reviewed matrix contains 36 groups, C01–C36: approved/denied/changed/repeated
admission; authentication/time drift; phase ordering and unlocked ports; foreign
or replaced stores; contention/poison; independent observation; callback
error/unwind; lost handoffs; unknown-write failure; rollback and lost result
acknowledgement; exact replay/conflict; reopen and historical resolution; corrupt
or old protocols; production closure; post-check mutation limits; authenticated
redacted readback; repeated explicit inspection; completed/failed terminal
recovery; and coherent entry snapshots. All 36 groups passed on the exact
reviewed source: 35 behavioral groups and C30 structural production closure.
Strict Clippy and workspace Rustfmt passed without current compiler warnings.
Fresh independent source/test review passed after preserved corrections.

The fixtures use controlled timestamps, including the year 9999 convention;
these do not prove physical clocks or deadlines. Completed/failed recovery
observer counts and ledger stability are measured. Their zero proof-construction
property is established by reviewed control flow, not a verifier-call counter.
Existing Node contract evidence is reused only through unchanged identities;
it is not a new execution. Full local npm checks remain blocked by Node 24.21.0
versus required 22.22.3, and history validation by missing `smol-toml`.
No install or download bypassed those gates. At source qualification closeout,
this candidate was uncommitted and unpublished. Its separately authorized public
PR milestone preserves this source-only boundary; merge and runtime authority
remain separate.

Trusted closures, valid in-process values and controlled temporary databases are
fixture assumptions, not adversarial isolation. No real Git action, production
observer, native process, host operation, physical custody, deadline,
containment, cleanup, crash durability or runtime compatibility is qualified.
Post-guard revocation before a real effect remains a separate temporal gap.
Abort, undefined behavior, process death and a blocking callback are not caught
or bounded by modeled unwinding behavior.

The [existing result contract](request-bound-git-result.md) and authenticated
linked-evidence projection retain their original semantics. There is no new
public result route, schema, protocol, permission, SDK, OpenShell adapter or
Rangoon authority path. Phase 10 exit, Phase 11 runtime, native enforcement,
installation, packaging, release and support remain separate gates.

## OpenSSF engineering evidence

Applicable [OpenSSF Passing criteria](https://www.bestpractices.dev/en/criteria/0)
include contribution requirements, test policy and actual additions, build/test
invocation, warnings, documentation, analysis and finding disposition. This
packet must bind exact current source, substantive positive/negative tests,
strict lint/format and appropriate source checks, independent findings and
remaining gaps. Existing authentication, hashing and random interfaces are
reused unchanged; synthetic callbacks do not authenticate physical entropy or
loaded code.

Source fixture success does not establish broad coverage, a fuzz campaign,
human secure-development competency, report-response performance, complete
cryptography/credential scope or release-wide analysis. Those requirements keep
their accountable owners and evidence gates. No badge, certification or
compliance claim follows.
