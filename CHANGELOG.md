# Changelog

## Unreleased

### Security

- Added fail-closed `lnsat.public_source_snapshot.v1` provenance validation for
  fresh public history. Marker enumerates immutable Phase 7 archival records;
  validators reject shallow or multiple-root history, tags, publication state,
  path overrides, working-tree drift, deletion, side-branch rewrite, and
  change-then-restore. Output explicitly lists private-history checks that
  cannot be replayed publicly. Supported-release evidence intentionally fails
  until public-history-native review provenance replaces snapshot mode and an
  exact release-source review gate exists.
  `source:check` now owns public CI/development validation; `release:check`
  adds the strict supported-release evidence gate.
- Updated fixable npm dependency findings for Next.js/PostCSS, Hono,
  `ip-address`, `fast-uri`, and the conformance SDK. Source verification now
  rejects every unexpected npm advisory through a tested fail-closed gate. One
  exact moderate upstream MCP Node/Hono Node Windows `serveStatic` advisory is
  temporarily accepted because LNSAT imports only `toNodeHandler`; any package,
  path, severity, range, source, lock-version, or advisory drift fails CI.

### Added

- Accepted Docker/OCI as first v1 runtime integration while preserving one
  runtime-neutral Gateway authority contract for later secure-VM, native-host,
  and remote profiles. ADR-0007 also fixes monotonic configuration inheritance,
  authority-managed emergency-stop semantics, Docker-socket/credential
  isolation, and exact authorization-to-runtime receipt binding. This is
  direction only; no adapter, image, package, route, or runtime support exists.
- Added a dated, source-revision-pinned comparison with Docker Agent, Docker
  MCP Gateway, Docker Sandboxes, and AI Governance. It records Docker's current
  runtime and isolation strengths, the narrower LNSAT authority/evidence
  boundary, exact public-source review limits, non-container substrate target,
  current unsupported modes, integration posture, and v1 build priority.
- Added public-source readiness and claims/maturity controls. Repository
  visibility is now explicitly separate from supported artifact release:
  audited source may become public before `v1.0.0`, while package, runtime,
  production, compatibility, signing, and support gates remain closed. Public
  cutover requires an exact fresh-history or reviewed-history candidate,
  secret/privacy/license/GitHub-metadata review, public CI/settings proof, and
  separate owner authorization. Direction tests fail closed when public source
  is described as a supported release.
- Added P10-A1 target-neutral product-surface source contract across `lnsatd`,
  new Rust `lnsatctl` diagnostics, TypeScript `lnsat`, and Control Center packet
  projection. Shared manifest freezes command ownership, configuration
  precedence, stable exit families, JSON output identity, read-only recovery
  inspection, service boundaries, completion/man source, version/build posture,
  non-root requirements, and CLI/API/MCP/UI evidence parity. No served recovery
  mutation, target/package claim, install/start, production consequence,
  migration `0018`, key/provider work, release, publication, or deployment opens.
- Added P10-A3 authenticated read-only `GET|HEAD /v1/health` and `/v1/status`
  while preserving unauthenticated `/healthz` bytes. New `lnsatctl`
  health/status transport accepts only an explicit owner-controlled
  macOS/Linux Unix socket and one opaque stdin session token. Client proves
  private parent, socket type/mode/owner, stable inode identity, and peer
  effective UID before bearer transmission. Bounded timeouts and response caps,
  no TCP bearer/proxy/DNS/redirect/retry/discovery/remote behavior, and no
  secret reflection apply. Doctor, config/recovery inspection, health, and
  status now share deterministic text/JSON/JSONL/YAML rendering; JSON remains
  compatible default and manifest remains canonical JSON only. Only bounded
  session activity evidence may change; P10-X1, Phase 11, package, release,
  service, and deployment lanes remain closed.
- Added P10-A4 non-root offline `lnsatctl backup`, fresh inert `restore`, and
  protected-stdin `recovery owner`. Backup and owner recovery prove daemon
  quiescence through the shared exclusive database lease; owner recovery
  preflights current schema and expected owner before password input, then
  atomically appends credential/audit evidence and revokes every owner session.
  Restore never overwrites or activates existing state. Daemon bind and offline
  mutations refuse effective UID zero on macOS/Linux. Exact
  `lnsat.operator_recovery.v1` parity keeps API routes, MCP tools, Control Center
  actions, served recovery, activation, schema changes, production use,
  deployment, and Phase 11 closed.
- Added P7-X1 local-v1 source conformance freeze: one authenticated
  proposal-to-policy-to-local-approval-to-authorization-to-consume-to-disposable
  Git-receipt/reconciliation chain, inert backup/restore replay proof, 12-row
  evidence ledger, 12 required negatives, fail-closed validator, selected
  macOS 26 arm64/APFS source profile, and explicit update/rollback/uninstall/
  data-loss semantics. No runtime route, migration, signed-evidence lane,
  package, publication, deployment, or production authority opened.
- Added stable authenticated
  `GET|HEAD /v1/identities/{identity_ref}/events` source composition under
  `lnsat.gateway.identity_event_read.v1_0`. Exact route-only target validation,
  existing owner/operator/auditor `ReadEvidence` permission, schema-closed
  secret-free events, stable sequence order, nullable bootstrap/recovery
  actors, bodyless `HEAD`, and one generic
  `gateway.identity_event_read.denied` oracle are conformance-tested. Success
  and denial declare possible bounded session-activity evidence; identity
  state, session authority, execution authority, and mutation authority remain
  unchanged. Query/body/encoded or ambiguous path/mutation/`OPTIONS` requests
  fail closed. The session-event route remains unopened.
- Added experimental MCP 2026-07-28 read-only stdio and stateless HTTP-handler
  source through official TypeScript v2 split packages. Explicit negotiation
  keeps 2025-11-25 as bounded temporary compatibility, rejects implicit
  downgrade, and preserves exact Gateway evidence across REST, CLI, legacy MCP,
  and modern MCP. JSON Schema 2020-12 and transport-security negatives remain
  fail-closed; no public listener or state-changing tool was added.
- Added isolated FastMCP 3.4.5 legacy-profile and FastMCP 4.0.0b1 experimental
  modern-profile interoperability harnesses plus A2A 1.0 read-only mapping.
  Python stays outside authority packages, and framework/task/session/card
  metadata cannot approve, authorize, execute, or mint receipts.
- Added durable/test-only operation recovery with in-memory and atomic JSON-file
  stores; exact operation/idempotency binding; ambiguous, cancellation,
  expiry, orphan, reconciliation, and receipt-gated states; and blind-retry
  denial. Added OAuth admission, OTel correlation/redaction, SPIFFE workload
  identity, Registry quarantine/supply-chain verification, and provider-neutral
  software-vault/PKCS#11/cloud KMS-HSM signer interfaces with no live providers,
  keys, signing, trust activation, runtime dispatch, or migration `0016`.
- Added shared operation-reconciliation fixture, loopback read-only API, and
  Control Center operations view with browser/API/fixture equality and all
  retry controls disabled. Added official conformance `0.1.16` coverage for its
  available 2025-11-25 HTTP scenario, official v2 SDK modern/stdin tests, a
  25-case security conformance ledger, and closed-boundary Phase 7d truth check.
- Added Phase 7d-A7 inert nonce-consume-request idempotency schema evidence by
  extending the same unregistered candidate-v16 fixture. A scoped
  `project_ref`/`idempotency_key` composite result binds one exact 32-byte
  request digest to one unique consumption result under
  `lnsat.phase7d.nonce-consume-request.v1` for SHA-256 domain separation.
  Replay is exact and read-only; keyed scope and nonce/evidence/authorization
  conflicts fail closed; the same request under another key resolves to the
  original identity without a second row write. Request identity binds exact
  project, nonce, evidence, authorization reference, and authorization digest;
  `consumption_id`, `consumed_at`, `created_at`, and authority order remain
  result/server values. Raw authorization bytes are not stored. The same
  immediate-transaction strategy writes consumption, consumed event, and
  idempotency rows atomically, and any failure rolls all rows back. Four new
  tests cover replay/conflict/scope/immutability with exact columns, injected
  idempotency rollback, 32 writers with one create plus 31 exact replays, and
  request-digest tamper. Phase 7d candidate tests are now 30 total. `lnsat-store`
  tests are now 128. Runtime remains schema v15 with fifteen registered
  migrations; no `migrations/0016`, public store path, runtime consumption or
  idempotency behavior, operational authorization validation, execution
  authority, API, or deployment was added.
- Added Phase 7d-A6 inert single-use nonce-consumption persistence evidence by
  extending the same unregistered candidate-v16 fixture. Canonical `nsc_`
  identities bind one approved nonce/evidence pair and one safe lowercase
  external authorization reference to `consumed_at` and its exact content
  digest. Each record uses `lnsat.phase7d.authorization-bundle.v1` and
  `lnsat.phase7d.nonce-consumption.v1` for SHA-256 domain separation, enforces
  independent uniqueness for authorization, evidence, and nonce identities,
  active material-status and expiry-window checks, and an immediate transaction
  that appends both consumption and terminal `consumed` nonce-event rows. Raw
  authorization bytes are not stored. Terminal-event failure rolls both writes
  back. Four new tests cover binding/immutability, injected terminal-event
  failure rollback, 32-writer one-winner concurrency, and digest tamper
  detection. Phase 7d candidate tests are now 26 total. Runtime remains schema
  v15 with fifteen registered migrations; no `migrations/0016`, public store
  path, runtime consumption behavior, execution authority, API, or deployment
  was added.
- Added Phase 7d-A5 inert verification-attempt persistence evidence by
  extending the same unregistered candidate-v16 fixture. Canonical `vat_`
  identities bind domain-separated project-scope and bounded hostile-input
  digests to one closed verified/rejected result, exact bounded reason, trusted
  observation time, and authority-chain position. An optional child relation
  records only safely resolved evidence/material identities; raw input and
  unbounded errors are never stored. The test-only append boundary returns only
  after its immediate transaction commits, and injected audit failure rolls
  back both attempt and authority rows. Twenty-two total Phase 7d tests now
  cover the complete 34-code rejection taxonomy, resolved/unresolved subjects,
  enum/time/scope binding, preserve-only triggers, digest tamper, the timeline
  query plan, and 32 same-time competing writers. Runtime remains schema v15
  with fifteen registered migrations; no
  operational verifier, retention worker, public store path, crypto wiring,
  signer, consumption, execution authority, API, or deployment was added.
- Added Phase 7d-A4 inert signed-evidence issuance-idempotency schema evidence
  by extending the same unregistered candidate-v16 fixture. A
  project-scoped composite key binds one 32-byte domain-separated request
  digest to one unique signed-evidence result and canonical creation time.
  Exact replay is read-only, digest change conflicts, the same request under
  another key returns the original identity without another row, and
  cross-project lookup or result claiming fails closed. Seventeen total Phase
  7d tests now cover request-digest tamper, the composite-key query plan, and a
  32-connection race yielding one binding plus 31 replays. Runtime remains
  schema v15 with fifteen registered migrations; no issuance path, runtime
  idempotency API, signer, nonce generator, consumption, execution authority,
  dependency, API, or deployment was added.
- Added Phase 7d-A3 inert signed-approval-evidence schema evidence by extending
  the same unregistered candidate-v16 fixture. One immutable row binds exact
  canonical payload bytes, their frozen preimage SHA-256 identity, one
  64-byte structural signature, approved project decision, active public
  material, issued nonce, inherited expiry, and fixed non-authorizing fields.
  Database constraints and triggers enforce one evidence row per decision and
  nonce, exact `sae_` identity/digest correspondence, byte bounds, relational
  scope/time/material/nonce bindings, immutability, and authority-chain
  ownership. The test-only verifier reuses the existing closed wrapper parser
  to rederive canonical bytes and normalized bindings. Fourteen total Phase 7d
  candidate tests cover rollback, tamper, query plans, and 32-connection
  evidence races. Runtime remains schema v15 with fifteen registered
  migrations; no signer, private material, cryptographic verification wiring,
  public store path, runtime idempotency path, execution authority, dependency,
  API, or deployment was added.
- Added Phase 7d-A2 inert nonce-lifecycle schema evidence by extending the same
  unregistered candidate-v16 fixture. Exact `nonce_<64 lowercase hex>`
  identities bind one approved decision per project to a unique SHA-256 nonce
  digest and append-only `issued` plus one terminal `cancelled`, `expired`, or
  future-schema-only `consumed` event. Database constraints, triggers, a unique
  partial terminal index, collision-free authority ordering, and the test-only
  verifier enforce identity, decision/time binding, immutability, lifecycle,
  digest, and owner correspondence. Eleven total Phase 7d candidate tests now
  cover rollback, tamper, query plans, and 32-connection terminal races.
  Runtime remains schema v15 with fifteen registered migrations; no public
  store path, nonce generator, operational verification, consumption
  implementation, execution authority, dependency, API, or deployment was
  added.
- Added Phase 7d-A1 inert public-material schema evidence: an unregistered
  candidate-v16 SQL fixture for collision-free authority order, immutable
  Ed25519 public material, and append-only key-status history, plus a test-only
  SHA-256 content/chain verifier. Eight focused tests cover direct relational
  negatives, 10,000 timestamp collisions, a 32-connection active-key race,
  pre-commit and `SQLITE_FULL` rollback, tamper/drift/future refusal, and index
  plans. Runtime remains schema v15 with fifteen registered migrations; no
  public store path, signer, operational verification, nonce state,
  consumption, execution authority, dependency, API, or deployment was added.
- Proposed ADR-0005 Phase 7d enterprise local persistence: a bounded
  single-host SQLite decision with measurable PostgreSQL/HA gates, normalized
  append-only public-key/status/evidence/nonce design, exact relational and
  idempotency invariants, stable collision-free ordering, transaction and
  migration controls, backup RPO/RTO, retention/security rules, and
  fault/concurrency acceptance tests. This docs-only proposal adds no schema,
  migration, store code, signer, operational verification, nonce state,
  consumption, execution authority, dependency, API, or deployment.
- Added Phase 7c public-only pure Ed25519 verification-primitive conformance:
  one generic TypeScript provider boundary, a Node 22
  `crypto.verify(null, ...)` conformance provider, and Rust
  `ed25519-dalek` `3.0.0` with default features disabled. The exact shared
  RFC 8410 SPKI and canonical base64url profile passes 28 selected public
  vectors (4 accepted, 24 rejected) from RFC 8032, pinned C2SP Wycheproof, and
  bounded encoding-substitution negatives. The existing signed-approval
  wrapper remains non-operational and returns
  `signed_approval.verification_unavailable`; no signer, private material,
  nonce state, endpoint, database change, or execution authority was added.
- Accepted ADR-0004 Phase 7a signed approval-evidence design and added the
  Phase 7b verification-only contract foundation: closed wrapper, public
  material, and result schemas; TypeScript/Rust full-chain parsers; exact
  canonical payload/preimage/digest derivation; and 26 shared JSONL
  conformance cases with exact error-taxonomy parity and suffix-form
  secret-field rejection. Public RFC signature bytes remain structural fixtures;
  no signing, cryptographic verification, private material, key custody,
  dependency, endpoint, or execution authority was added.
- Accepted ADR-0003 open-core, downstream extension, governed agent-content,
  advisory-model, visual-management, and OS CLI boundaries.
- Executable product-direction alignment across every tracked Markdown file,
  fourteen roadmap phases, and critical architecture, security, SDK, UI,
  onboarding, operations, and governance docs.
- Expanded threat controls for instruction/profile/skill substitution, overlay
  downgrade, shared-library poisoning, context misclassification, model false
  allow, module compromise, entitlement confusion, and CLI/local IPC abuse.
- Accepted open-core and downstream repository boundaries for commercial
  management, connectors, governed model packs, and commercial release
  composition without a private authority-core fork.
- Proposed versioned agent configuration, instruction, skill, context,
  universal/model-specific overlay, shared-library, visual graph, and request
  grouping architecture.
- Accepted OS-level `lnsat`, `lnsatctl`, and `lnsatd` direction with safe
  command taxonomy, Gateway-only mutation, non-root service, automation output,
  extension namespaces, and Phase 10/14 evidence gates.
- Stable source-level `GET|HEAD /v1` contract negotiation with exact
  `LNSAT-Contract-Version: lnsat.contracts.v1_0`, no deprecated downgrade,
  shared version-error envelopes, bodyless `HEAD`, and zero authority.
- API-wide exact-version gating for every `/v1/` subroute before route,
  authentication, policy, store, or mutation work, with accepted-version
  response headers without implicitly promoting subroutes.
- Stable authenticated `GET|HEAD /v1/session` with current-session-only scope,
  one generic oracle-free denial, secret-free output, exact bodyless `HEAD`,
  and explicit bounded activity-evidence side-effect disclosure.
- Stable local-password `POST /v1/session` with closed secret input,
  same-origin/non-simple intent controls, fresh-session replay semantics, one
  generic denial, and exact limiter/session/event/cookie side-effect disclosure.
- Stable authenticated `PATCH /v1/session` with exact empty framing,
  double-submit CSRF, one-time current-session rotation, preserved absolute
  expiry, one generic denial, and exact replacement/revocation/evidence/cookie
  side-effect disclosure.
- Stable authenticated `DELETE /v1/session` with exact empty framing,
  double-submit CSRF, atomic same-identity session-family revocation,
  forced reauthentication, one-time active-family replay, one generic denial,
  and exact revocation/evidence/cookie side-effect disclosure.
- Stable authenticated `PATCH /v1/identity/password` with closed secret input,
  latest-password reverification, bounded limiter disclosure, append-only
  credential evidence, atomic same-identity family revocation, forced
  reauthentication, and one generic denial.
- Stable owner-only `POST /v1/identities` with closed
  identity/name/role/password input, operator/auditor-only creation,
  create-once identity scope, actor-session-bound identity evidence, exact
  limiter/activity/identity/credential/event effects, and one generic denial.
- Stable owner-only `DELETE /v1/identities/{identity_ref}` with exact empty
  framing, validated route-only target selection, operator/auditor-only scope,
  permanent one-time disablement, atomic target-session-family closure, exact
  activity/status/event/revocation effects, and one generic zero-side-effect
  denial.
- Stable authenticated `POST /v1/approval-requests` with closed project/policy
  input, exact persisted actor/session binding, server-owned content identity,
  created/replayed outer effects, one generic denial, atomic SQLite rollback,
  and zero approval, signing, or execution authority.
- Phase 5 local identity and approval-authentication exit, with approval
  signing retained in Phase 7 and stable recovery commands retained in Phase 10.
- Source-local offline owner recovery with daemon-shared exclusive lease,
  append-only credential generation, full active-owner-session revocation,
  recovery-only actorless audit evidence, and schema-v15 migration/rollback
  proof.
- Accepted authority-layer architecture, complete synthetic reference workflow,
  dedicated threat model, and transport-neutral source contract.
- Superseding ADR and mandatory fourteen-phase v1 roadmap.
- Mandatory Phase 14 canonical-artifact, thin-installer, trust-evidence, and
  compatibility requirements for Homebrew, tarballs, install script, deb, rpm,
  OCI, and Cargo bootstrap distribution.
- Pinned Rust contract/conformance workspace.
- Loopback local-control-plane session, packet, policy, and pending-approval
  foundations.
- Read-only nine-route Control Center backed by public synthetic fixtures.
- Public-readiness validation and project-only repository layout.
- Source-release metadata validator and pinned GitHub source-verification
  workflow.
- Professional source release, security-reporting, contribution, and maintainer
  documentation.
- Reproducible machine-readable legacy identifier inventory with ownership,
  compatibility-consumer, migration, and rollback evidence.
- Canonical v1 roadmap and accepted scope decision covering deployment,
  platform, storage, auth, API stability, package, support, threat-model, and
  release boundaries.
- Stable `lnsat.contracts.v1_0` exact-match version policy with deprecated
  `v0_1` compatibility and shared TypeScript/Rust golden vectors.
- Parallel stable v1 packet envelope with closed-field validation, canonical
  UTF-8 JSON, deterministic SHA-256 hashing, and a shared golden digest.
- Stable v1 policy decision evidence bound to packet digest, identity, scope,
  idempotency, evaluation window, and deny-first capability/risk rules.
- Stable v1 approval request and human decision evidence with content-bound
  identities, requester/approver separation, expiry rejection, and no execution
  authority.
- Stable v1 audit events that rebuild exact packet-policy-approval chains,
  preserve deterministic source/event digests and idempotency, and request no
  persistence or execution.
- Shared TypeScript/Rust golden preimages for the stable packet, policy,
  approval-request, approval-decision, and terminal audit-event identities.
- Stable v1 error envelope shared by version, packet, policy, approval, and
  audit failures, with closed schema and six-family conformance vectors.
- Executable stable v1 compatibility matrix covering all seven contract
  families, exact negotiation, evidence identity, replay, stale evidence, and
  migration posture.
- Rust stable packet JSON parser and closed schema validator with shared
  positive/negative TypeScript parity vectors, boundary property coverage, and
  a no-panic byte fuzz entry.
- Rust stable packet canonical serializer with recursive UTF-16 key ordering,
  preserved arrays, safe-integer enforcement, and exact TypeScript byte parity.
- Rust stable packet SHA-256 integration over canonical UTF-8 bytes with exact
  TypeScript digest parity and fail-closed invalid-packet handling.
- Rust stable permission-envelope validation with sorted unique allow/block
  sets, overlap rejection, shared parity vectors, and permutation coverage.
- Rust stable policy evaluation with deny-first capability/profile rules,
  validity-window enforcement, exact decision identities, shared parity cases,
  deterministic replay, and risk-boundary property coverage.
- Rust stable approval request and human-decision evidence with exact content
  identities, semantic tamper rejection, validity windows, self-approval
  prevention, shared parity cases, and zero execution authority.
- Rust stable audit evidence with exact source-chain rebuilds, source/event
  identities, observation ordering, terminal idempotency, shared parity cases,
  deterministic replay, and zero persistence or execution authority.
- Stable TypeScript/Rust audit-event idempotency classification for append
  proposals, exact replay, collision rejection, malformed/duplicate bounded
  prior state, and zero write authority.
- Rust six-family error-envelope mapping with public-safe messages, exact
  code/path identity, null failed results, empty side effects, shared vectors,
  and separate audit-idempotency error items.
- Embedded Rust SQLite foundation with explicit durable paths, owner-only Unix
  creation, WAL/foreign-key/full-sync hardening, defensive schema settings,
  atomic digest-bound bootstrap migration, exact reopen/integrity checks,
  future/unknown schema refusal, and transaction rollback proof.
- Source-only Rust `lnsatd` foundation with explicit SQLite configuration,
  storage-before-listener startup, numeric loopback-only binding, bounded
  concurrent read-only readiness, fast overload refusal, cooperative
  shutdown/restart proof, fail-closed process-signal handling, public-safe
  errors, and zero mutation authority.
- SQLite recovery-inspection events with schema-v8 migration, deployment/target
  scope, path fingerprinting, deterministic identity/idempotency, quarantine
  recommendation, immutable retention, and zero action/activation authority.
- Versioned Rust Argon2id local-password profile with exact work factors,
  random salts, bounded candidates, fail-closed verifier validation, and no
  secret-bearing public result.
- SQLite schema-v9 exact-one immutable local human-owner bootstrap with atomic
  credential persistence, competing-connection serialization, preserve-only
  retention, verification, migration, interruption, and tamper evidence.
- Rust session-secret primitives with independent operating-system-random
  bearer/anti-CSRF material, domain-separated digests, strict parsing, and
  constant-time comparison.
- SQLite schema-v10 password-authenticated hash-only owner sessions with
  absolute expiry, content binding, append-only revocation, preserve-only
  retention, migration/interruption, reopen, negative, and tamper evidence.
- Transport-neutral Rust browser-API preflight requiring exact numeric
  loopback peer/Host, same-origin Fetch Metadata, read-only GET/HEAD, and
  Origin/JSON/CSRF proof for mutations without opening an HTTP route.
- Source-local `POST|GET|HEAD /v1/session` with closed 4 KiB login JSON,
  exact Origin/Fetch Metadata/custom intent, process-wide authentication
  limits, generic credential denial, fresh host-only bearer/CSRF cookies,
  secret-buffer zeroization, and authenticated secret-free readback.
- Authenticated same-origin `DELETE /v1/session` with exact zero-length JSON
  framing, CSRF proof, atomic same-identity session-family revocation, generic
  replay denial, and host-only bearer/CSRF cookie clearing.
- Authenticated same-origin `PATCH /v1/session` with exact zero-length JSON
  framing, CSRF proof, atomic current-session secret rotation, unchanged
  absolute expiry, generic prior-token/replay denial, and fresh host-only
  bearer/CSRF cookies.
- Authenticated same-origin `PATCH /v1/identity/password` with a closed
  secret-bearing JSON body, per-session attempt limits, latest-password
  reverification, atomic append-only credential rotation and session-family
  revocation, generic denial, cookie clearing, and explicit reauthentication.
- Owner-only same-origin `POST /v1/identities` with a closed secret-bearing
  schema, operator/auditor-only roles, server-owned creation time, immutable
  credential evidence, generic denial, and secret-free readback.
- Owner-only same-origin `DELETE /v1/identities/{identity_ref}` with exact
  empty framing, permanent non-owner disablement, atomic target-session
  revocation, secret-free evidence, and generic scope/replay denial.
- Authenticated same-origin
  `POST /v1/approval-requests/{approval_request_id}/decision` with a closed
  scope/outcome/reason schema, distinct-human enforcement, server-owned time,
  immutable terminal decision evidence, exact replay/terminal conflict
  semantics, stable generic denial, and zero execution authority.

### Changed

- Replaced experimental `lnsat.gateway.local_identity_creation.v1_0` response
  with stable `lnsat.gateway.identity_creation.v1_0`; added exact version,
  success/failure, authorization, replay, side-effect, and state-change fields.
  Pre-release consumers must update atomically; no compatibility alias remains.
- Replaced experimental `lnsat.gateway.local_identity_disablement.v1_0`
  response with stable `lnsat.gateway.identity_disablement.v1_0`; added exact
  version, success/failure, authorization, replay, permanence, target-family,
  side-effect, and state-change fields. Pre-release consumers must update
  atomically; no compatibility alias remains.
- Replaced experimental `lnsat.gateway.local_approval_request.v1_0` response
  with stable `lnsat.gateway.approval_request.v1_0`; added exact wire version,
  closed success/failure, server-time replay, outer persistence effects, and
  authority-state fields. Pre-release consumers must update atomically; no
  compatibility alias remains.
- Replaced experimental `lnsat.gateway.local_approval_decision.v1_0` response
  with stable `lnsat.gateway.approval_decision.v1_0`; added exact wire version,
  closed recorded/replayed success and generic failure, distinct-human/request
  binding, terminal replay semantics, conditional outer persistence effects,
  and explicit authority closure. Pre-release consumers must update
  atomically; no compatibility alias remains.
- Closed the Phase 4 source checkpoint with a test-evidence matrix, corrected
  fresh source-local bootstrap versus Phase 14 packaged-install ownership, and
  assigned authentication, recovery, service, and package work to later phases.
- Replaced core build-phase exports with neutral product lifecycle status
  metadata; no compatibility alias was needed because no source consumer used
  the legacy exports.
- Replaced 80 milestone-coded packet source-status values with neutral
  source-only, contract-only, or read-only inspection metadata while preserving
  versioned contract identifiers and serialized evidence references.
- Replaced four milestone-coded policy status values with neutral source-only
  metadata while preserving contract IDs and serialized policy decisions.
- Replaced ten milestone-coded audit status values with neutral source-only
  metadata while preserving ledger contracts, digests, and persistence behavior.
- Replaced 33 milestone-coded Gateway/API status exports with neutral metadata;
  preserved four local-beta wire values under tested compatibility constants
  and left the project-state alias for its dedicated migration.
- Replaced 57 milestone-coded MCP status exports with neutral read-only
  metadata while preserving protocol-visible status values under private,
  tested compatibility constants.
- Replaced the milestone-coded CLI status export with neutral source-only
  metadata while preserving command names and output behavior.
- Added versioned `lnsat.project.state.inspect.v0_1` MCP inspection in parallel
  with the read-only legacy alias, including fail-closed behavior and a `2.0.0`
  removal floor.
- Added canonical `lnsat.gateway.project_state.v0_1` API inspection and neutral
  synthetic project-state identifiers, fixture paths, request fields, response
  fields, and error codes. The canonical MCP tool delegates to this Gateway
  contract; the deprecated legacy API and MCP tool retain exact compatibility.
- Reorganized README and documentation around contributor, integrator,
  maintainer, architecture, and maturity entry points.
- Added explicit project-status and architecture catalogs separating current
  source from implementation notes and future proposals.
- Expanded local-development guidance with focused workspace commands,
  contract-change workflow, and reproducible troubleshooting.
- Reduced `.env.example` to actual loopback local-beta overrides; removed
  unused database, Redis, and site variables.
- Removed internal milestone identifiers from public examples and made the
  public scanner reject every case variant across non-fixture project Markdown.
- Marketing application moved to private `LNSAT-Site` repository.
- Internal packet ledgers, handoff state, generated evidence routes, release
  placeholders, and operator-only documentation removed from tracked HEAD.
- Workspace and Rust package metadata now identify canonical repository while
  remaining explicitly non-publishable.
- Public architecture and SDK documentation now describe stable product
  contracts instead of internal build chronology.
- Knowledge-source heading registration and public-safe inventory assertions now
  match release-facing documentation and fixtures.

No package, binary, container, installer, or hosted runtime has been published.
