# Audit, Privacy and Evidence Custody Design

Status: proposed design; owner acceptance, exact source contracts and
implementation pending. The canonical work record is
[Project Status](../PROJECT_STATUS.md#proposed-audit-privacy-and-evidence-custody-design).
This supports the accepted enterprise/government security direction. It selects
no collector, storage encryption module, key service, remote transport,
deployment or retention jurisdiction. It changes no source, schema or authority.

## Intent and source boundary

Operators need reliable evidence of mediated decisions and outcomes without
exposing credentials or unnecessary sensitive data. Local integrity, authorized
disclosure, durable collection and independent custody are separate properties.
Their claims must identify the exact evidence and threat boundary they cover.

The following facts were inspected at public source
`ae89f83a8de1ad10359a29ec61e1937befcf4160`:

| Surface            | Current evidence and limit                                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rust audit         | Audit events rederive their linked packet/policy/approval chain. Store append uses an immediate transaction and rejects identity or idempotency conflicts. Hashes establish content equality under that derivation, not a signature or independent custody.                                       |
| SQLite history     | Named immutable triggers and schema checks protect normal store operations. Current schema 17 retains 28 record families; retention planning returns zero cleanup candidates and performs no cleanup. These checks do not defeat a malicious host owner able to replace data and executable code. |
| Exact served reads | Accepted HCFG-4A returns one authenticated, rederived approval request, decision or audit event. `ReadEvidence` is installation-wide; recovered project scope is decoder scope, not project authorization. There is no general list/export permission in this contract.                           |
| TypeScript ledger  | Contracts bind canonical content, provenance references and exact replay. The source PostgreSQL writer invokes an injected executor; an attempted failure can be indeterminate. This is not proof of a deployed writer or trusted collector.                                                      |
| Telemetry          | The Gateway seam restricts keys and printable string bounds, and can call an injected sink. It is not durable audit or action authority. An allowed key can still carry a sensitive value; fixed privacy flags do not establish contextual privacy.                                               |
| Backup and restore | The store creates a consistent full database snapshot and verifies digest, size, schema and integrity. Restore produces an inert destination. These are not redacted exports, encryption or permission to activate restored authority.                                                            |

See [Rust audit contracts](../../crates/lnsat-contracts/src/audit.rs),
[store source](../../crates/lnsat-store/src/lib.rs),
[audit event derivation](../../packages/audit/src/audit-event-v1.ts),
[ledger digest](../../packages/audit/src/audit-ledger-record-digest.ts),
[writer](../../packages/audit/src/postgresql-audit-ledger-writer.ts),
[telemetry](../../packages/gateway/src/telemetry-contract.ts),
[exact read specification](headless-monitoring/spec.md),
[retention](SQLITE_RETENTION_POLICY.md) and
[backup/restore](SQLITE_BACKUP_AND_RESTORE.md).

## Separate data boundaries

The proposed design distinguishes four surfaces:

1. **Private authority store and backups.** Preserve the canonical records needed
   to authenticate, rederive decisions and recover safely. Password verifier
   material, session commitments, configuration and referenced packet evidence
   require private custody even when raw secrets are not stored.
2. **Authorized evidence disclosure.** Existing exact reads retain their accepted
   installation-wide permission. A future bounded export needs its own versioned
   schema, recipient, scope, field rules and permission contract. It cannot infer
   a project grant from a stored project reference or silently reuse read access
   for bulk collection.
3. **Optional operational telemetry.** Diagnostics may be sampled or dropped.
   Collection status and trace context grant no authorization and cannot replace
   durable authority evidence.
4. **Independent audit custody.** A separately selected collector or anchor may
   establish receipt of a specific covered history prefix. Its trust, transport,
   storage, freshness and failure contract must be proven before that claim.

Remote export or collection introduces an external data recipient. Exact trust,
authenticated channel, residency, access, revocation and incident ownership need
review before integration. No new external service is configured by this design.

## Minimize before disclosure

Classify each field by purpose, sensitivity, recipient and required lifetime.
IDs, actor/session/project references and digests can be identifying or linkable;
a hash of a predictable identifier is not reliable anonymization. Field names,
printable bounds, a caller's `safe` label or a generic secret detector cannot
decide whether a value is appropriate for its recipient.

Public exports and telemetry must exclude raw bearer/proof/capability tokens,
passwords or password verifier material, private keys, recovery secrets, raw
protocol frames, rejected input, commands, environment values and customer
payloads. Their private persistence requirements remain governed by the accepted
authority contracts. Do not remove canonical evidence merely to simplify an
export; do not send a full database snapshot as a redacted evidence view.

Prefer fixed semantic codes and producer-derived opaque references. Any retained
reference needs an explicit disclosure purpose and cross-recipient correlation
rule. The exact export schema must define an allowlist with value semantics,
finite size/count bounds, encoding and rejection behavior. Telemetry needs the
same contextual field review; the current allowlist alone does not prove it.
Secret and identifying-data canaries must test both allowed fields and error
paths. Rejected input and storage/provider error strings must not be reflected.

[OpenTelemetry's sensitive-data guidance](https://opentelemetry.io/docs/security/handling-sensitive-data/)
places contextual minimization responsibility with the implementer and explains
why hashing predictable data may still expose its meaning. It guides this
boundary; it does not validate the current telemetry seam.

## Export meaning and verification

A future export is a non-applicable disclosure view. It creates no approval,
configuration, session, runtime or replay authority and cannot be imported as
authority. Its exact accepted contract must bind source family/version, permitted
scope, recipient policy revision, collection window, coverage and explicit gaps.
Enumeration, pagination and watch remain separately gated; a future export cannot
bypass the unresolved HCFG-4B/4C enumeration and projection contracts.

Keep a view digest distinct from raw source identities and source digests.
Removing fields changes the hashed object. A verifier may establish exact view
integrity and a declared source reference, but cannot claim full source-chain
verification from unavailable redacted bytes. Missing, withheld, unsupported,
uncollected and indeterminate evidence need explicit distinct meanings. No empty
result may stand for a verified complete history. A filtered view must describe
its filter and cannot claim completeness beyond that scope.

Export identity, transport authentication and any signature or collection receipt
have different roles. Their future verifier must use independently trusted keys
and actual evidence under the selected crypto contract. A producer-supplied
boolean, digest or test fixture cannot establish external custody.

## Audit failure preserves authority uncertainty

The exact future event specification must name every required authority/security
transition and its atomic persistence boundary. For a new grant or release that
requires local durable audit, pre-commit failure must roll back the transition
and deny. Optional telemetry is never its fallback.

After committed consumption or an attempted dispatch, unavailable audit or
receipt storage must not erase the attempt, manufacture success/failure or permit
redispatch. Preserve consumed/unknown semantics and keep recovery inert until
the accepted reconciliation contract establishes an outcome. The current
source-only lifecycle and Phase 11 packet continue to control those semantics.
A later observation appends evidence; it does not rewrite the original record.

The selected implementation must test disk-full, I/O failure and crashes at each
commit/dispatch boundary. Stop/revocation must not wait on an optional collector.
If local storage cannot persist a required stop, the system must report that
failure honestly and deny affected new authority; it cannot claim a durable stop
or resume automatically. Exact shared serialization, already released attempts,
crash behavior and emergency capacity need a reviewed stop/audit contract before
implementation. This proposal does not add a parallel stop mechanism.

Optional diagnostics outages do not create or withdraw a permit. If a selected
profile requires fresh independent custody before further release, stale or
unverified receipt evidence denies that profile's affected transition. Network
waits cannot be introduced while holding the authority writer lock. Any future
precollection flow needs fresh serialized authority rechecks at final use; a
collector acknowledgement is never an execution permit.

## Independent custody and its limits

Per-object content hashes do not establish a global sequence, trusted timestamp,
complete event coverage or rollback detection. A future ordered stream requires
exact epoch/sequence rules, canonicalization, writer participation, duplicate and
fork handling, coverage and version reconciliation. None is supplied by current
object IDs or this proposal.

A selected independent collector or signed checkpoint must bind the covered
stream identity, epoch, sequence/prefix, content digest and trust revision.
Verification needs independently trusted receipt evidence and a known latest
checkpoint with a defined freshness bound. An old valid checkpoint alone cannot
detect deletion of an unacknowledged tail. Uncaptured intervals remain explicit
gaps; replacement, truncation, reordering and forks need distinct negative proof.

Custody can prove only the history actually observed under its trust assumptions.
It cannot prove that a compromised producer reported every action or that an
unmediated host action never happened. Local triggers, signed snapshots and
external acknowledgements do not eliminate the trusted-host-owner/kernel limit.
Specify collector administrative separation and residual compromise risks; do
not claim blanket tamper immunity.

## Retention, backup and recovery

Existing authority families remain preserved and immutable. This proposal
authorizes no deletion, in-place redaction or migration. A future disposition
contract must name jurisdiction/customer policy, legal holds, event families,
reference/lineage dependencies and a safe verifiable disposition process.
Minimize optional transient diagnostics independently; an expired credential
does not automatically make its authority history disposable.

Full backups need selected custody, access and transport controls. At-rest
encryption, key separation, rotation, recovery and erasure need actual provider
and storage evidence under the [strict crypto design](STRICT_CRYPTO_ADMISSION_DESIGN.md).
File mode and checksum alone are not encryption. Key destruction is not proof
that every copy, log, snapshot or export was erased.

Restore remains inert. Future activation must reconcile installation identity,
generation/epoch, stop/revocation, consumed attempts and independently known
history coverage without reviving superseded authority. Missing latest evidence
must deny or remain explicitly unknown under the accepted recovery contract.
Do not silently adopt a restored snapshot as current complete history.

## Acceptance and implementation sequence

[NIST SP 800-53](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final) provides a
tailorable security/privacy control catalog;
[NIST SP 800-92](https://csrc.nist.gov/pubs/sp/800/92/final) describes log-management
processes. These references guide the deployment control matrix. They do not
certify LNSAT or select an agency, information class or mandatory retention term.

Before source implementation, obtain acceptance of this boundary and exact
contracts for event coverage/failure atomicity, disclosure permissions/schema,
finite limits, retention, backup/key custody and any selected collector. Reuse
accepted local store, HCFG and recovery authority; do not open a replacement
engine or monitoring implementation through this design.

Required proof includes a nonempty legitimate evidence/read/export path; wrong
recipient/scope and sensitive-value negatives; digest/view distinction; missing,
reordered, duplicated, forked and truncated history; stale/substituted collector
receipts; disk and network outages; crashes around consumption; and inert
restore with revocation and unknown outcomes. Test doubles and fixture signatures
prove source behavior only. Claims about an actual collector, encrypted storage
or selected deployment require later separately authorized target proof.

Fresh independent review and proportional source validation remain mandatory.
Owner acceptance is not merge, runtime, artifact construction, provider intake,
release or production authorization. The Phase 11 operator packet remains the
runtime-proof authority; all of its closed gates remain closed.
