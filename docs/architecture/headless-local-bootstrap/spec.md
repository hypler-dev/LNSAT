<!-- intent-driven-delivery:spec:v1 -->

# Specification: HCFG-5B atomic local bootstrap

Status: accepted
Intent: [HCFG-5B intent](intent.md)
Owner: LNSAT maintainers
Accepted by: human owner in development conversation on 2026-09-30
Last updated: 2026-09-30

## Behavior

The supported V1 initialization is one local `lnsatctl` operation against one fresh authority-empty SQLite store. It creates the sole owner, installation, first immutable deny-by-default configuration generation, active-generation pointer, initial authority epoch, and linked owner/configuration audit evidence in **one immediate SQLite transaction**. It reuses the existing owner-bootstrap validation and credential/event construction inside that transaction; calling today's separate `bootstrap_local_owner_v1` and later adding a first configuration is not a supported V1 sequence. There is no HTTP, MCP, agent, browser, or UI bootstrap route.

The existing owner-only source foundation remains useful for tests and historical stores but never qualifies as an initialized headless installation. A store with any earlier identity, owner event, session, approval, decision, nonce, execution authorization, operation, attempt, receipt, reconciliation, installation, or generation is not authority-empty. The implementation packet must enumerate every authority/evidence table in the schema and deny on unknown or unclassified rows; schema/migration metadata alone may pre-exist. A concurrent or repeated initialization loses the same transaction check. There is no `--force`, `--resume`, or diagnostic-to-active promotion.

## States and failure handling

| State            | Durable meaning                                                                                                          | Authority                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `uninitialized`  | Supported schema, authority/evidence tables empty                                                                        | Local one-time initialization only.                                 |
| `legacy_inert`   | Owner-only or other pre-existing experimental authority/evidence rows without a V1 installation                          | Inspection only; separate migration decision required.              |
| `initialized`    | One committed owner, installation, generation, binding, and audit chain                                                  | New admission only when current host/store/resource/OS checks pass. |
| `restored_inert` | Official restore of an initialized store at a fresh path whose stored bootstrap binding names another path/file identity | Inspection only; separate recovery activation decision required.    |
| `denied`         | Missing, conflicting, malformed, substituted, or unverifiable evidence                                                   | No new admission or bootstrap.                                      |

V1 trusts the local host owner, who controls the selected database and owner-only files. The path/file binding is an operational admission guard for a selected store and the official fresh-path restore. It is **not** an independent anti-copy or anti-rollback root: a trusted host owner with full database and filesystem control may defeat local history. LNSAT makes no claim to prevent that actor from manually replacing an older database at the same selected location. The scope does not add a sidecar, hardware root, remote checkpoint, or second human.

An official restore of an authority-empty snapshot contains no owner, installation, generation, or prior authority. It remains inert when published, but the host owner may explicitly initialize it as a **new** installation after all fresh-store checks. That is not activation or continuity of restored authority. A restored snapshot containing any prior authority/evidence rows is ineligible for first bootstrap even if it has no V1 installation binding.

### Local source and secret proof

Initialization requires a non-root local process, an explicitly supplied absolute canonical database path, a regular single-link owner-only database and owner-only parent directory, stable selected-platform file identity across open/commit, and the same exclusive `<database>.lnsat.lock` lease used by daemon and offline recovery. Symlink/reparse-point, hard link, broad permissions, path/mount substitution, wrong owner, competing daemon, or unsupported file-identity proof denies before mutation. The lease proves exclusion, not a credential or freshness. The owner supplies an explicit identity reference/display name and one HCFG-3 declaration path; there is no path discovery or automatic import from `lnsat.daemon.config.v1`.

The command accepts the new owner password only through `--owner-password-stdin` on non-terminal standard input supplied by the host owner. The bounded parser preserves password bytes, permits one terminal newline, rejects empty/NUL/embedded newline/oversized/non-UTF-8 input, and zeroizes memory after use, following the existing offline-recovery parser contract. Password arguments, environment variables, a terminal with echo, and serialized credential values are rejected. This is protected local input under host-owner custody, not biological human-presence proof. No password or verifier enters returned JSON, logs, declaration, installation binding, or configuration audit.

The command loads one explicitly named absolute regular non-symlink declaration using HCFG-3's bounded stable-file-identity loader; it reparses and recomposes the closed schema and requires the owner's typed `--confirm-digest` to equal the canonical candidate digest. `installation_ref`, resource refs, and digests inside the declaration are untrusted claims. The selected-platform verifier resolves every resource to exact observed identity and enforcement capability. Unsupported or unverifiable controls deny initialization. HCFG-6 must prove grant/use identity and OS restriction behavior before any target can admit work.

### Atomic first configuration

The command prepares **zero-authority restrictive** OS controls without opening a resource or granting action authority. Preparation must be idempotent or exactly reversible under the exclusive lease. Every noncommitted path attempts bounded cleanup; if cleanup cannot be proved, the selected resource is quarantined and new initialization/admission denies until an explicit offline host-owner cleanup verifies the observed OS state. The next attempt must detect and reject orphaned preparation before changing SQLite. A crash after preparation, before transaction, or before commit leaves the authority store empty and inert; it never treats an orphaned OS restriction as activation evidence.

Under the exclusive lease the command then begins one immediate SQLite transaction and rechecks schema, authority-empty state, database path/file/owner identity, declaration digest, resource identities, and enforcement preparation. It inserts one random store-instance ID and installation ID, canonical path and selected-platform file identity, host-owner UID, exact owner/credential generation, canonical declaration and composed least-privilege envelope, resource-evidence digest, compiled policy floor/version, initial stop/revocation floor, immutable first generation and active pointer, initial authority epoch, and linked owner/configuration audit events. A failed insert, rederivation, or audit append rolls back **all** owner and configuration writes. No external process or permission grant occurs inside the transaction.

The immutable `headless_bootstrap.v1` event is in that same transaction and binds: event type/version and previous configuration-audit head digest (or explicit genesis); store-instance and installation IDs; canonical path/file-binding digest and host-owner UID; owner identity-event ID/digest and credential generation; declaration/composed-envelope digests; verified resource-evidence digest; compiled policy/floor version; initial stop/revocation floor; first generation ID/digest and active pointer; initial authority epoch; trusted time; and event ID/digest over the canonical tuple. The implementation packet freezes canonical encoding and bounds. Before admission, Gateway rederives the event chain and compares this first event with the current installation binding and first generation; missing, mismatched, or unlinked evidence denies.

After commit, a lost response or crash is `unknown` until the host owner obtains exact local readback under the lease; it is never permission to rerun initialization. A precommit crash leaves the authority store empty and inert. A postcommit crash leaves the complete durable binding, but new admission still requires current selected-platform resource/OS proof. A malformed or ambiguous committed state denies, never selects an older generation. The result is fixed-schema and redacted: state, owner/installation/generation references and digests, authority epoch, and audit reference; no raw path, password/verifier, resource ref, or proof bytes.

### Admission, backup, and recovery

At daemon startup and before each new authority admission, Gateway must use the selected canonical database path and stable open-file identity, recheck the stored bootstrap binding and current generation/stop/revocation state under its held lease, and verify current resource identity and OS enforcement at grant and use. A copied database selected at another path/file identity, or an official restored copy at a fresh path, cannot pass that binding. A process pointing at an owner-only or otherwise uninitialized store has no headless admission authority. A failed check denies new work; already dispatched work retains receipt/reconciliation obligations and may remain `outcome_unknown`.

`create_online_backup_v1` remains an SQLite snapshot, not activation evidence. `restore_backup_v1` retains its no-clobber fresh-path publication and does not select a daemon target or rewrite bootstrap binding. An initialized-store restore remains inert at the fresh path. An authority-empty restore also publishes inert and may undergo explicit fresh initialization, creating entirely new owner/installation/authority records. A later separately accepted offline recovery contract must explicitly select a restored initialized store, use the daemon-shared lease, establish a new incarnation/binding, revoke prior sessions and unused authorization material, preserve receipts and unknown consequences, recheck stop/revocation floor and resource/OS proof, append durable recovery audit, and define any continuity claim. Until then restored prior authority remains inert. Neither initial bootstrap nor online apply can turn a restored initialized store active by reusing copied owner/installation rows.

The bootstrap binding and audit chain are SQLite evidence under the trusted host-owner boundary. No local row/digest is advertised as independent freshness proof. HCFG-5A online transitions must preserve the current owner, installation binding, stop/revocation floor, and monotonic authority epoch in one protected SQLite transaction. Rollback is a new constrained transition and cannot clear a stop or regrant revoked authority. Source downgrade may not silently admit a store whose schema, binding, or authority epoch it cannot verify.

## Source packet B1: read-only bootstrap-store eligibility inspection

The first accepted source packet (B1) is limited to a read-only, exhaustive schema-17 inspection against a fresh local store. It must use a private, fresh-store inspection method to enumerate all main SQLite object identities: exactly 31 tables and exactly 218 bounded main schema objects, with the exact immutable compiled migration, metadata, and retention seeds admitted only after full schema and policy verification. The 28 authority/evidence tables must be empty. The aggregate schema text is bounded to 256 KiB total, each SQL definition to 65,536 bytes, each object name to 1,024 bytes, and hashes compact JSON tuples `[type, name, tbl_name, sql-or-null]`, sorted by type and name, with raw SQLite DDL and SHA-256 domain `lnsat.headless_bootstrap.schema.v17` followed by one LF byte (`0x0a`); the independently recorded Python hash is `66911985ea6357018f9a55890e28e68394a59abdbc90d9cb4aa04f3a7c75b62a`. The inspection rejects unknown or altered tables, views, indexes, or triggers, including any `sqliteX`-prefixed object, temporary shadow object, or attached database. It performs one deferred read snapshot, performs no writes, obtains no serializable permit, and becomes stale immediately after another write.

The public diagnostic `inspect_headless_bootstrap_store_v1` exposes only private-field inspection methods and returns `authority_empty=true`, `initialization_available=false`, and `grants_action_authority=false` when the snapshot classification passes. Static error codes are `headless_bootstrap.not_authority_empty` and `headless_bootstrap.unverifiable_store`. B1 creates no schema, migration, owner, installation, configuration, audit record, CLI, or route. The later initializer must repeat a private gate inside its own immediate transaction and additionally prove the host owner, canonical path/file identity, exclusive lease, declaration, and HCFG-6 selected-platform controls. No fake proof is accepted; future source packets must freeze the actual initialization schema, lease, and OS enforcement evidence.

## Source packet B2: transaction-local owner preparation seam

B2 freezes the private owner portion that a later headless initializer may reuse
inside its larger atomic transaction. Preparation validates and copies the
identity reference, display name, and creation time, derives the credential ID,
and holds the verifier in a zeroizing private field. The prepared value has no
`Debug` or `Clone` implementation, no wire representation, and no plaintext
password field. The caller may drop its password bytes after preparation; the
original metadata cannot be swapped before insertion.

The private insert helper accepts `&rusqlite::Transaction` only. It never begins,
commits, or rolls back a transaction. The caller must use an immediate
transaction and abort that entire transaction on any error. The helper writes
the existing three owner rows (identity, credential, and identity event),
preserving current validation, public API and error behavior, and single-owner
semantics. It is a reusable owner credential/event construction seam, not
headless initialization: it creates no installation, configuration, generation,
binding, route, migration, CLI, OS proof, or new authority.

### B2 focused acceptance

- Prepared metadata remains the validated original after caller buffers are
  changed; password bytes may be dropped before the transaction begins.
- An independent reader observes zero rows before caller commit and all three
  owner rows after commit.
- Caller rollback erases identity, credential, and identity-event rows.
- An injected credential or audit insert failure may expose earlier partial rows
  inside the open transaction, but outer rollback erases all three tables.
- Existing owner validation, public bootstrap API/errors, and exactly-one-owner
  behavior remain unchanged.

The focused acceptance set is four existing owner-bootstrap tests plus three B2
transaction tests. Full repository checks and independent review remain separate
gates recorded by the task owner in Project Status; this design artifact does
not claim those gates are complete.

## Interfaces and contracts

The proposed command is `lnsatctl bootstrap initialize --database <absolute-path> --declaration <absolute-path> --owner-ref <identity-ref> --owner-name <display-name> --confirm-digest <sha256:...> --owner-password-stdin`. Exact spelling and private schema versions are frozen in the later accepted source packet; the transport, one-time semantics, denial conditions, and secret channel above are part of this design. There is no online bootstrap fallback or alternate identity authority.

## Data, privacy, and permissions

Owner credentials, declaration contents, resource identities, and audit evidence stay in the protected local store. The owner-only path/lease checks protect access under the accepted host-owner model. Public logs and generic denial results omit raw paths, principal/resource details, password/verifier material, session tokens, and authorization proofs. A diagnostics reader may show a fixed state/reason code only after its existing authentication and redaction rules. No agent or adapter receives filesystem or SQLite bootstrap control.

## Compatibility and migration

This is an accepted pre-1.0 design contract. Existing schema-17 stores have no V1 installation binding or active headless generation. They remain experimental/diagnostic and must not be backfilled from an owner row, HCFG-3 diagnostic declaration, startup config, or restored snapshot. A later migration may add inactive tables/defaults, but it cannot create authority. Existing owner-only installations need a separately accepted transition or a genuinely fresh store; they cannot call this first-bootstrap command on their old database.

## Acceptance mapping

- Store tests: empty-table inventory, single-transaction owner/install/generation/audit commit and `headless_bootstrap.v1` rederivation, concurrent duplicate denial, repeated/replayed invocation, injected failure at each insert and audit edge, crash before/after commit, exact unknown-result readback, old owner-only and active-row denial.
- CLI/filesystem tests: non-root and owner-only path/parent/lease requirements; symlink/hard-link/path/mount/file replacement; copied new-path and restored initialized-store denial; explicit new initialization from an authority-empty restored snapshot; explicit declaration digest; protected bounded stdin and rejection of argv/env/TTY secret channels; no secret output.
- OS-preparation fault tests: before/after preparation, before transaction, before commit, after commit, cleanup failure and offline cleanup; no permission opens before durable commit and no orphaned preparation is mistaken for authority.
- Gateway/OS tests: no owner-only admission, current path/open-file binding at startup/use, HCFG-6 grant/use target identity, unsupported control denial, stop/revocation precedence, no false cancellation claim for in-flight work.
- Phase 13 repeats recovery, interruption, and selected-target tests. Source conformance is not runtime, Docker, package, or release proof.

## Non-goals and open questions

Human owner acceptance of this design occurred in the 2026-09-30 development conversation and authorizes bounded source implementation within the stated boundaries. It does not authorize merge, Docker proof, runtime proof, package, release, or production action. The later source packet must freeze selected-platform file identity, the exhaustive authority-empty table inventory, exact schema/CLI/error codes, and HCFG-6 verifier interface. General restored-store activation and trusted-host-owner rollback resistance remain separate decisions; neither is implied by this design.
